const express = require("express");
const mongoose = require("mongoose");

const User = require("../database/models/User");
const ShopItem = require("../database/models/ShopItem");
const ShopPurchase = require("../database/models/ShopPurchase");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const { authorizeUser } = require("../middleware/auth");
const { getWallet, emitUserBalance } = require("../utils/wallet");

const router = express.Router();

const RIVO_WALLET = Object.freeze({
	coinType: "Rivo",
	chain: "TRON",
	type: "trc-20",
});

const getRivoWallet = (user) =>
	getWallet(
		user,
		RIVO_WALLET.coinType,
		RIVO_WALLET.chain,
		RIVO_WALLET.type
	);

router.post("/purchase", authorizeUser(true), async (req, res) => {
	try {
		const { itemId } = req.body;

		if (!mongoose.Types.ObjectId.isValid(itemId)) {
			return res.status(400).json({
				success: false,
				message: "Geçersiz ürün id.",
			});
		}

		const item = await ShopItem.findOne({
			_id: itemId,
			isActive: true,
		}).lean();

		if (!item) {
			return res.status(404).json({
				success: false,
				message: "Ürün bulunamadı.",
			});
		}

		const user = await User.findById(req.user._id).select("wallets currency");
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Kullanıcı bulunamadı.",
			});
		}

		const rivoWallet = getRivoWallet(user);
		if (!rivoWallet) {
			return res.status(400).json({
				success: false,
				message: "Rivo cüzdanı bulunamadı.",
			});
		}

		const coinsBefore = Number(user.currency?.coins || 0);
		if (coinsBefore < item.coinCost) {
			return res.status(400).json({
				success: false,
				message: "Yetersiz coin bakiyesi.",
				coinBalance: coinsBefore,
			});
		}

		const balanceBefore = Number(rivoWallet.balance || 0);
		const updatedUser = await User.findOneAndUpdate(
			{
				_id: user._id,
				"currency.coins": { $gte: item.coinCost },
				wallets: {
					$elemMatch: {
						coinType: RIVO_WALLET.coinType,
						chain: RIVO_WALLET.chain,
						type: RIVO_WALLET.type,
					},
				},
			},
			{
				$inc: {
					"currency.coins": -item.coinCost,
					"wallets.$[target].balance": item.rewardAmount,
				},
			},
			{
				new: true,
				arrayFilters: [
					{
						"target.coinType": RIVO_WALLET.coinType,
						"target.chain": RIVO_WALLET.chain,
						"target.type": RIVO_WALLET.type,
					},
				],
			}
		).select("wallets currency");

		if (!updatedUser) {
			return res.status(400).json({
				success: false,
				message: "Coin bakiyesi güncellenemedi.",
			});
		}

		const updatedRivoWallet = getRivoWallet(updatedUser);
		const balanceAfter = Number(updatedRivoWallet?.balance || 0);
		const coinsAfter = Number(updatedUser.currency?.coins || 0);

		const purchase = await ShopPurchase.create({
			user: user._id,
			shopItem: item._id,
			title: item.title,
			banner: item.banner,
			coinCost: item.coinCost,
			rewardAmount: item.rewardAmount,
			coinsBefore,
			coinsAfter,
			balanceBefore,
			balanceAfter,
			wallet: RIVO_WALLET,
			state: "completed",
		});

		await BalanceTransaction.create({
			amount: item.rewardAmount,
			type: "shopReward",
			user: user._id,
			state: "completed",
		});

		emitUserBalance(null, {
			_id: user._id,
			wallets: updatedUser.wallets,
			currency: updatedUser.currency,
		});

		return res.status(200).json({
			success: true,
			message: "Ürün başarıyla satın alındı.",
			purchase,
			coinBalance: coinsAfter,
			walletBalance: balanceAfter,
		});
	} catch (error) {
		console.error("Shop purchase error:", error);
		return res.status(500).json({
			success: false,
			message: "Ürün satın alınırken hata oluştu.",
		});
	}
});

router.get("/purchases", authorizeUser(true), async (req, res) => {
	try {
		const page = Math.max(1, Number(req.query.page) || 1);
		const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
		const skip = (page - 1) * limit;

		const [total, purchases] = await Promise.all([
			ShopPurchase.countDocuments({ user: req.user._id }),
			ShopPurchase.find({ user: req.user._id })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.select(
					"title banner coinCost rewardAmount coinsBefore coinsAfter balanceBefore balanceAfter state createdAt"
				)
				.lean(),
		]);

		return res.status(200).json({
			success: true,
			data: purchases,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit) || 1,
			},
		});
	} catch (error) {
		console.error("Shop purchases error:", error);
		return res.status(500).json({
			success: false,
			message: "Satın alma geçmişi alınırken hata oluştu.",
		});
	}
});

module.exports = router;