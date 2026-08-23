const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const UserSeed = require("../../database/models/UserSeed");
const Box = require("../../database/models/Box");
const UnboxGame = require("../../database/models/UnboxGame");
const Leaderboard = require("../../database/models/Leaderboard");
const Rain = require("../../database/models/Rain");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const Setting = require("../../database/models/Setting");
const { onBetSettled } = require("../../utils/wagerHooks");
const {
	evaluateCategoryBetLimit,
	CATEGORY_BET_LIMIT_EXCEEDED_CODE,
} = require("../../utils/userBetAccess");
// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const {
	unboxCheckGetBoxDataData,
	unboxCheckGetBoxDataBox,
	unboxCheckSendBetData,
	unboxCheckSendBetBox,
	unboxCheckSendBetUser,
	unboxCheckSendBetSeed,
	unboxGetOutcomeItem,
} = require("../../utils/unbox");
const {
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Wallet utils
const { getActiveWalletIndex } = require("../../utils/wallet");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

const unboxGetData = () => {
	return new Promise(async (resolve, reject) => {
		try {
			const boxesDatabase = await Box.find({ state: "active" })
				.select("name slug amount categories type state")
				.lean();

			resolve({ boxes: boxesDatabase });
		} catch (err) {
			reject(err);
		}
	});
};

const unboxGetBoxDataSocket = async (io, socket, user, data, callback) => {
	try {
		unboxCheckGetBoxDataData(data);

		const boxDatabase = await Box.findById(data.boxId)
			.select("name slug amount items categories type state")
			.populate({ path: "items.item", select: "name image amountFixed" })
			.lean();

		unboxCheckGetBoxDataBox(boxDatabase);

		callback({ success: true, box: boxDatabase });
	} catch (err) {
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const unboxSendBetSocket = async (io, socket, user, data, callback) => {
	try {
		unboxCheckSendBetData(data);

		const boxDatabase = await Box.findById(data.boxId)
			.select("amount items state")
			.populate({ path: "items.item", select: "name image amountFixed" })
			.lean();
		unboxCheckSendBetBox(boxDatabase);

		const unboxCount = Math.floor(data.unboxCount);
		const amountBetTotal = Math.floor(boxDatabase.amount * unboxCount);

		// Kullanıcıyı taze çek
		const freshUser = await User.findById(user._id)
			.select("wallets currency stats rakeback limits controls affiliates")
			.lean();

		if (!freshUser) throw new Error("User not found.");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Active wallet not found.");

		const walletPath = `wallets.${walletIndex}.balance`;
		const walletBalance = freshUser.wallets[walletIndex].balance;

		if (walletBalance < amountBetTotal) {
			throw new Error("Insufficient balance");
		}

		// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
		const limitCheck = evaluateCategoryBetLimit(freshUser, "originals", amountBetTotal);
		if (!limitCheck.allowed) {
			throw new Error(
				limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
					? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
					: "Bu oyun kategorisine erişiminiz kısıtlanmıştır."
			);
		}

		const seedDatabase = await UserSeed.findOne({
			user: user._id,
			state: "active",
		}).select("seedClient seedServer nonce user state");
		unboxCheckSendBetSeed(seedDatabase);

		const leaderboardDatabase = await Leaderboard.findOne({
			state: "running",
		})
			.select("state")
			.lean();
		const amountBetRain =
			freshUser.limits.blockSponsor !== true ? amountBetTotal : 0;

		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");

		const rakeback = generalUserGetRakeback(freshUser);
		const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || {
			level1: 7,
			level2: 3,
			level3: 1,
		};
		const exchangeRates = settingsDoc.exchangeRates || {};

		const amountRakeback =
			freshUser.limits.blockSponsor !== true
				? parseFloat((amountBetTotal * rakeback.percentage).toFixed(2))
				: 0;

		// ✅ Bettor currency → USD normalize
		const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
		const bettorRate = exchangeRates[bettorCurrency] || 1;
		const betInUSD = amountBetTotal / bettorRate;

		// === Referrer zinciri
		const level1Ref = freshUser?.affiliates?.referrer || null;
		let level2Ref = null;
		let level3Ref = null;

		if (level1Ref) {
			const level1User = await User.findById(level1Ref)
				.select("affiliates.referrer")
				.lean();
			level2Ref = level1User?.affiliates?.referrer || null;

			if (level2Ref) {
				const level2User = await User.findById(level2Ref)
					.select("affiliates.referrer")
					.lean();
				level3Ref = level2User?.affiliates?.referrer || null;
			}
		}

		const affiliateDistributions = [];
		if (level1Ref) affiliateDistributions.push({ id: level1Ref, level: 1 });
		if (level2Ref) affiliateDistributions.push({ id: level2Ref, level: 2 });
		if (level3Ref) affiliateDistributions.push({ id: level3Ref, level: 3 });

		let promises = [];
		let amountPayout = 0;

		// === Kutular açılıyor
		for (let i = 0; i < unboxCount; i++) {
			const combined = `${seedDatabase.seedServer}-${
				seedDatabase.nonce + i
			}-${seedDatabase.seedClient}`;
			const hash = crypto
				.createHash("sha256")
				.update(combined)
				.digest("hex");
			const outcome = parseInt(hash.substr(0, 8), 16) % 100000;
			const outcomeItem = unboxGetOutcomeItem(boxDatabase, outcome);

			amountPayout += outcomeItem.amountFixed;

			promises.push(
				UnboxGame.create({
					amount: boxDatabase.amount,
					payout: outcomeItem.amountFixed,
					multiplier: Math.floor(
						(outcomeItem.amountFixed / boxDatabase.amount) * 100
					),
					outcome,
					box: boxDatabase._id,
					fair: {
						seed: seedDatabase._id,
						nonce: seedDatabase.nonce + i,
					},
					user: user._id,
					fiatCurrency: freshUser.currency.fiatCurrency,
					coinType: freshUser.currency.coinType,
					chain: freshUser.currency.chain,
					walletType: freshUser.currency.type,
					state: "completed",
				})
			);
		}

		const xpToAdd =
			freshUser.limits.blockSponsor !== true
				? parseFloat(
						(
							betInUSD * settingsDoc.general.reward.multiplier
						).toFixed(2)
				  )
				: 0;

		// 1. ADIM → Sadece kutu maliyetini düş
		const userUpdatePromise = User.findOneAndUpdate(
			{
				_id: user._id,
				[walletPath]: { $gte: amountBetTotal },
			},
			{
				$inc: {
					[walletPath]: -amountBetTotal,
					xp: xpToAdd,
					"stats.bet": amountBetTotal,
					"limits.betToWithdraw":
						Math.floor(
							freshUser.limits.betToWithdraw - amountBetTotal
						) <= 0
							? -freshUser.limits.betToWithdraw
							: -amountBetTotal,
					"limits.betToRain":
						Math.floor(
							freshUser.limits.betToRain - amountBetTotal
						) <= 0
							? -freshUser.limits.betToRain
							: -amountBetTotal,
					"leaderboard.points":
						leaderboardDatabase !== null &&
						freshUser.limits.blockSponsor !== true &&
						freshUser.limits.blockLeaderboard !== true
							? amountBetTotal
							: 0,
					"affiliates.generated": amountBetTotal,
					"rakeback.earned": amountRakeback,
					"rakeback.available": amountRakeback,
				},
				updatedAt: new Date().getTime(),
			},
			{ new: true }
		)
			.select("wallets xp stats rakeback mute ban verifiedAt updatedAt")
			.lean();

		promises = [
			userUpdatePromise,
			UserSeed.findByIdAndUpdate(seedDatabase._id, {
				$inc: { nonce: unboxCount },
			}),
			Rain.findOneAndUpdate(
				{
					type: "site",
					$or: [
						{ state: "created" },
						{ state: "pending" },
						{ state: "running" },
					],
				},
				{ $inc: { amount: Math.floor(amountBetRain * 0.001) } },
				{ new: true }
			)
				.select("amount participants type state updatedAt")
				.lean(),
			...promises,
		];

		// ✅ Affiliate dağıtımı (USD → Referrer currency)
		for (const ref of affiliateDistributions) {
			const refUser = await User.findById(ref.id)
				.select("currency")
				.lean();
			if (!refUser) continue;

			const refCurrency = refUser.currency?.fiatCurrency || "USD";
			const refRate = exchangeRates[refCurrency] || 1;

			const commissionInUSD =
				betInUSD * (affiliateLevels[`level${ref.level}`] / 100);
			const commissionFinal = commissionInUSD * refRate;

			if (commissionFinal > 0) {
				promises.push(
					User.findByIdAndUpdate(ref.id, {
						$inc: {
							"affiliates.earned": commissionFinal,
							"affiliates.available": commissionFinal,
						},
						updatedAt: new Date().getTime(),
					})
				);

				promises.push(
					BalanceTransaction.create({
						amount: commissionFinal,
						type: "affiliateCommission",
						user: ref.id,
						fromUser: user._id,
						state: "completed",
					})
				);
			}
		}

		const dataDatabase = await Promise.all(promises);
		let gamesDatabase = dataDatabase
			.slice(3, 3 + unboxCount)
			.map((game) => game.toObject());

		// 🎯 Bilet çevrimi + Race puanı hook'u (kutu maliyeti = çevrim tutarı)
		onBetSettled({ userId: user._id, amount: amountBetTotal, category: "originals" });

		io.of("/general").emit("rain", { rain: dataDatabase[2] });

		// Callback anında → sadece maliyet düşmüş kullanıcı bilgisi
		callback({
			success: true,
			user: dataDatabase[0],
			games: gamesDatabase,
		});

		// 2. ADIM → 5 saniye sonra kazanç ekle
		setTimeout(async () => {
			const payoutUser = await User.findByIdAndUpdate(
				user._id,
				{
					$inc: {
						[walletPath]: amountPayout,
						"stats.won": amountPayout,
					},
				},
				{ new: true }
			)
				.select(
					"wallets xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean();

			io.of("/general")
				.to(user._id.toString())
				.emit("user", { user: payoutUser });

			for (const bet of gamesDatabase) {
				generalAddBetsList(io, {
					...bet,
					user: generalUserGetFormated(user),
					method: "unbox",
				});
			}
		}, 5000);

		socketRemoveAntiSpam(user._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

module.exports = {
	unboxGetData,
	unboxGetBoxDataSocket,
	unboxSendBetSocket,
};
