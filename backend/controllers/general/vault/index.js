// ✅ vault.controller.js — Exploit korumalı sürüm
// ====================================================

// Load database models
const mongoose = require("mongoose");
const User = require("../../../database/models/User");
const BalanceTransaction = require("../../../database/models/BalanceTransaction");

// Load utils
const { socketRemoveAntiSpam } = require("../../../utils/socket");
const {
	generalCheckSendVaultDepositData,
	generalCheckSendVaultDepositUser,
	generalCheckSendVaultWithdrawData,
	generalCheckSendVaultWithdrawUser,
	generalCheckSendVaultLockData,
	generalCheckSendVaultLockUser,
} = require("../../../utils/general/vault");
const {
	getActiveWalletIndex,
	getWalletKeyFromIndex,
} = require("../../../utils/wallet");

// ✅ VAULT DEPOSIT (atomik & güvenli)
const generalSendVaultDepositSocket = async (
	io,
	socket,
	user,
	data,
	callback
) => {
	const session = await mongoose.startSession();
	try {
		generalCheckSendVaultDepositData(data);
		generalCheckSendVaultDepositUser(data, user);

		const amt = Math.floor(data.amount);
		if (!Number.isFinite(amt) || amt <= 0)
			throw new Error("Geçersiz tutar");

		const freshUser = await User.findById(user._id).session(session).lean();
		if (!freshUser) throw new Error("User not found");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Seçili cüzdan bulunamadı");

		const walletPath = `wallets.${walletIndex}.balance`;
		const vaultPath = "vault.balances";
		const vaultKey = getWalletKeyFromIndex(freshUser, walletIndex);

		let updatedUser;

		// Ön kontrol: ilgili vault kaydı ve bakiye kontrolü (race condition öncesi daha iyi hata mesajı)
		const vaultEntry =
			freshUser.vault?.balances && Array.isArray(freshUser.vault.balances)
				? freshUser.vault.balances.find(
					(v) =>
						v.coinType === vaultKey.coinType &&
						v.chain === vaultKey.chain &&
						v.type === vaultKey.type
					)
				: null;
		if (!vaultEntry || (vaultEntry.amount || 0) < amt) {
			throw new Error("Vault bakiyesi yetersiz veya eşleşen vault kaydı yok");
		}
		if (vaultEntry.expireAt && new Date(vaultEntry.expireAt).getTime() >= Date.now()) {
			throw new Error("Vault şu anda kilitli, çekim yapılamaz");
		}

		await session.withTransaction(async () => {
			// 1️⃣ Eğer vault kaydı varsa artır
			const res1 = await User.updateOne(
				{
					_id: user._id,
					[walletPath]: { $gte: amt },
					[vaultPath]: { $elemMatch: vaultKey },
				},
				{
					$inc: {
						[walletPath]: -amt,
						"vault.balances.$[vb].amount": amt,
					},
					$set: { updatedAt: new Date() },
				},
				{
					arrayFilters: [
						{
							"vb.coinType": vaultKey.coinType,
							"vb.chain": vaultKey.chain,
							"vb.type": vaultKey.type,
						},
					],
					session,
				}
			);

			if (res1.modifiedCount === 0) {
				// 2️⃣ Yoksa yeni vault kaydı oluştur
				const res2 = await User.updateOne(
					{
						_id: user._id,
						[walletPath]: { $gte: amt },
					},
					{
						$inc: { [walletPath]: -amt },
						$push: { [vaultPath]: { ...vaultKey, amount: amt } },
						$set: { updatedAt: new Date() },
					},
					{ session }
				);
				if (res2.modifiedCount === 0)
					throw new Error(
						"Yetersiz bakiye veya vault güncellenemedi"
					);
			}

			updatedUser = await User.findById(user._id)
				.select("wallets vault")
				.session(session)
				.lean();

			// 💾 İsteğe bağlı: transaction kaydı
			await BalanceTransaction.create(
				[
					{
						userId: user._id,
						type: "VAULT_DEPOSIT",
						amount: amt,
						coinType: vaultKey.coinType,
						chain: vaultKey.chain,
						direction: "out",
						createdAt: new Date(),
					},
				],
				{ session }
			);
		});

		callback({ success: true, user: updatedUser });
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		console.error("❌ VaultDeposit error:", err);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	} finally {
		session.endSession();
	}
};

// ✅ VAULT WITHDRAW (atomik & güvenli)
const generalSendVaultWithdrawSocket = async (
	io,
	socket,
	user,
	data,
	callback
) => {
	const session = await mongoose.startSession();
	try {
		generalCheckSendVaultWithdrawData(data);
		generalCheckSendVaultWithdrawUser(data, user);

		const amt = Math.floor(data.amount);
		if (!Number.isFinite(amt) || amt <= 0)
			throw new Error("Geçersiz tutar");

		const freshUser = await User.findById(user._id).session(session).lean();
		if (!freshUser) throw new Error("User not found");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Seçili cüzdan bulunamadı");

		const walletPath = `wallets.${walletIndex}.balance`;
		const vaultKey = getWalletKeyFromIndex(freshUser, walletIndex);
		let updatedUser;

		await session.withTransaction(async () => {
			const res = await User.updateOne(
				{
					_id: user._id,
					"vault.balances": {
						$elemMatch: { ...vaultKey, amount: { $gte: amt } },
					},
				},
				{
					$inc: {
						[walletPath]: amt,
						"vault.balances.$[vb].amount": -amt,
					},
					$set: { updatedAt: new Date() },
				},
				{
					arrayFilters: [
						{
							"vb.coinType": vaultKey.coinType,
							"vb.chain": vaultKey.chain,
							"vb.type": vaultKey.type,
						},
					],
					session,
				}
			);

			if (res.modifiedCount === 0) {
				// Daha açıklayıcı hata mesajı vermek için güncelleme sonrası durumu kontrol et
				const freshAfter = await User.findById(user._id)
					.select("vault.balances")
					.session(session)
					.lean();
				const vaultAfter =
					freshAfter?.vault?.balances && Array.isArray(freshAfter.vault.balances)
						? freshAfter.vault.balances.find(
							(v) =>
								v.coinType === vaultKey.coinType &&
								v.chain === vaultKey.chain &&
								v.type === vaultKey.type
						)
						: null;
				if (!vaultAfter) {
					throw new Error("Eşleşen vault kaydı bulunamadı");
				}
				if ((vaultAfter.amount || 0) < amt) {
					throw new Error("Vault bakiyesi yetersiz");
				}
				throw new Error("Vault güncellemesi başarısız (bilinmeyen durum)");
			}

			updatedUser = await User.findById(user._id)
				.select("wallets vault")
				.session(session)
				.lean();

			// 💾 Transaction kaydı
			await BalanceTransaction.create(
				[
					{
						userId: user._id,
						type: "VAULT_WITHDRAW",
						amount: amt,
						coinType: vaultKey.coinType,
						chain: vaultKey.chain,
						direction: "in",
						createdAt: new Date(),
					},
				],
				{ session }
			);
		});

		callback({ success: true, user: updatedUser });
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		console.error("❌ VaultWithdraw error:", err);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	} finally {
		session.endSession();
	}
};

// ✅ VAULT LOCK (güvenli, doğru anahtar & expire tipinde düzeltme)
const generalSendVaultLockSocket = async (io, socket, user, data, callback) => {
	try {
		generalCheckSendVaultLockData(data);
		generalCheckSendVaultLockUser(user);

		const { time, rate } = data;
		if (!Number.isFinite(time) || !Number.isFinite(rate))
			throw new Error("Geçersiz parametreler");

		const freshUser = await User.findById(user._id).lean();
		if (!freshUser) throw new Error("User not found");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Seçili cüzdan bulunamadı");

		const vaultKey = getWalletKeyFromIndex(freshUser, walletIndex);
		const vaultEntry = freshUser.vault.balances.find(
			(v) =>
				v.coinType === vaultKey.coinType &&
				v.chain === vaultKey.chain &&
				v.type === vaultKey.type
		);
		if (!vaultEntry) throw new Error("Vault kaydı bulunamadı");

		const gain = Math.floor(vaultEntry.amount * rate);
		const expireAt = new Date(Date.now() + Math.floor(time));

		const res = await User.updateOne(
			{
				_id: user._id,
				"vault.balances": { $elemMatch: vaultKey },
			},
			{
				$inc: { "vault.balances.$[vb].amount": gain },
				$set: {
					"vault.balances.$[vb].expireAt": expireAt,
					updatedAt: new Date(),
				},
			},
			{
				arrayFilters: [
					{
						"vb.coinType": vaultKey.coinType,
						"vb.chain": vaultKey.chain,
						"vb.type": vaultKey.type,
					},
				],
			}
		);

		if (res.modifiedCount === 0)
			throw new Error("Vault kaydı güncellenemedi");

		const updatedUser = await User.findById(user._id)
			.select("wallets vault")
			.lean();

		callback({ success: true, user: updatedUser });
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		console.error("❌ VaultLock error:", err);
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

// ====================================================
// EXPORTS
// ====================================================
module.exports = {
	generalSendVaultDepositSocket,
	generalSendVaultWithdrawSocket,
	generalSendVaultLockSocket,
};
