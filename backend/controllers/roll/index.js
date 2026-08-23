const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const RollGame = require("../../database/models/RollGame");
const RollBet = require("../../database/models/RollBet");
const Rain = require("../../database/models/Rain");
const Leaderboard = require("../../database/models/Leaderboard");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const { getActiveWalletIndex } = require("../../utils/wallet");
const { onBetSettled } = require("../../utils/wagerHooks");
const Setting = require("../../database/models/Setting");
// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const {
	rollCheckSendBetData,
	rollCheckSendBetUser,
	rollCheckSendBetGame,
	rollGetUserGameStats,
	rollGenerateGame,
	rollGetOutcome,
	rollSanitizeGame,
	rollSanitizeBets,
	rollSanitizeBet,
} = require("../../utils/roll");
const {
	generalUserGetLevel,
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

// Roll variables
let rollGame = null;
let rollBets = [];
let rollHistory = [];
let rollBetPendingCount = [];

const rollGetData = () => {
	return {
		game: rollSanitizeGame(rollGame),
		bets: rollSanitizeBets(rollBets),
		history: rollHistory,
	};
};

const rollSendBetSocket = async (io, socket, user, data, callback) => {
	try {
		rollCheckSendBetData(data);

		const userStats = rollGetUserGameStats(user, rollBets);
		rollCheckSendBetUser(data, user, userStats);
		rollCheckSendBetGame(rollGame);

		try {
			rollBetPendingCount++;

			const amount = parseFloat(data.amount);
			const fixedAmount = parseFloat(amount.toFixed(2));

			const multiplier = parseFloat(
				parseFloat(data.multiplier).toFixed(2)
			);

			const level = generalUserGetLevel(user);
			const rakeback = generalUserGetRakeback(user);

			const settingsDoc = await Setting.findOne().lean();
			if (!settingsDoc) throw new Error("Settings bulunamadı!");

			const affiliateLevels = settingsDoc.general?.affiliate
				?.gameLevels || { level1: 7, level2: 3, level3: 1 };
			const exchangeRates = settingsDoc.exchangeRates || {};

			// ✅ Güncel kullanıcı
			const freshUser = await User.findById(user._id)
				.select(
					"wallets currency stats rakeback mute ban verifiedAt updatedAt roblox username avatar rank level limits affiliates createdAt anonymous"
				)
				.lean();
			if (!freshUser) throw new Error("User not found.");

			const walletIndex = getActiveWalletIndex(freshUser);
			if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");

			const walletPath = `wallets.${walletIndex}.balance`;
			const balance = freshUser.wallets[walletIndex].balance || 0;
			if (balance < amount) throw new Error("Yetersiz bakiye");

			const amountRakeback =
				freshUser.limits.blockSponsor !== true
					? parseFloat((amount * rakeback.percentage).toFixed(2))
					: 0;

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
			if (level1Ref)
				affiliateDistributions.push({ id: level1Ref, level: 1 });
			if (level2Ref)
				affiliateDistributions.push({ id: level2Ref, level: 2 });
			if (level3Ref)
				affiliateDistributions.push({ id: level3Ref, level: 3 });

			// ✅ Kullanıcının bet’ini USD’ye çevir
			const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
			const bettorRate = exchangeRates[bettorCurrency] || 1;
			const betInUSD = amount / bettorRate;

			const promises = [];

			// ✅ Affiliate ödemeleri
			for (const dist of affiliateDistributions) {
				const refUser = await User.findById(dist.id)
					.select("currency")
					.lean();
				if (!refUser) continue;

				const refCurrency = refUser.currency?.fiatCurrency || "USD";
				const refRate = exchangeRates[refCurrency] || 1;

				const commissionInUSD =
					betInUSD * (affiliateLevels[`level${dist.level}`] / 100);
				const commissionFinal = commissionInUSD * refRate;

				if (commissionFinal > 0) {
					promises.push(
						User.findByIdAndUpdate(dist.id, {
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
							user: dist.id,
							fromUser: user._id,
							state: "completed",
						})
					);
				}
			}

			// ✅ Kullanıcı bakiyesini düş + bet oluştur
			const [updatedUser, createdBet] = await Promise.all([
				User.findByIdAndUpdate(
					user._id,
					{
						$inc: {
							[walletPath]: -amount,
							"stats.bet": amount,
							"affiliates.generated": amount,
							"rakeback.earned": amountRakeback,
							"rakeback.available": amountRakeback,
						},
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"wallets xp stats rakeback mute ban verifiedAt updatedAt"
					)
					.lean(),

				RollBet.create({
					amount: amount,
					multiplier: multiplier,
					game: rollGame._id,
					user: user._id,
					fiatCurrency: freshUser.currency.fiatCurrency,
					coinType: freshUser.currency.coinType,
					chain: freshUser.currency.chain,
					walletType: freshUser.currency.type,
				}),

				...promises,
			]);

			// ✅ Bet objesi
			let bet = createdBet.toObject();
			bet.user = {
				_id: user._id,
				roblox: freshUser.roblox,
				username: freshUser.username,
				avatar: freshUser.avatar,
				rank: freshUser.rank,
				xp: freshUser.xp,
				level: level,
				rakeback: rakeback,
				affiliates: freshUser.affiliates,
				stats: freshUser.anonymous === true ? null : freshUser.stats,
				limits: freshUser.limits,
				createdAt: freshUser.createdAt,
			};

			rollBets.push(bet);
			io.of("/roll").emit("bet", { bet: rollSanitizeBet(bet) });

			callback({ success: true, user: updatedUser });

			rollBetPendingCount--;
			socketRemoveAntiSpam(user._id);
		} catch (err) {
			rollBetPendingCount--;
			socketRemoveAntiSpam(socket.decoded._id);
			callback({
				success: false,
				error: { type: "error", message: err.message },
			});
		}
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const rollGameStart = async (io) => {
	try {
		// Clear roll bets array
		rollBets = [];

		// Generate new roll game
		rollGame = await rollGenerateGame();

		// Send sanitized roll game object to frontend
		io.of("/roll").emit("game", { game: rollSanitizeGame(rollGame) });

		setTimeout(() => {
			rollGameValidate(io);
		}, 1000 * 13 - (new Date().getTime() - new Date(rollGame.createdAt).getTime()));
	} catch (err) {
		console.error(err);
	}
};

const rollGameValidate = async (io) => {
	try {
		// Set roll game state to pending
		rollGame.state = "pending";

		// Send sanitized roll game object to frontend
		io.of("/roll").emit("game", { game: rollSanitizeGame(rollGame) });

		if (rollBetPendingCount <= 0) {
			// Combine roll game id and server seed and sha256 hash the combined string
			const combined = crypto
				.createHash("sha256")
				.update(`${rollGame._id}-${rollGame.fair.seed.seedServer}`)
				.digest("hex");

			// Get roll outcome for this game
			rollGame.outcome = rollGetOutcome(combined);

			// Set roll game state to rolling
			rollGame.state = "rolling";
			rollGame.updatedAt = new Date().getTime();

			io.of("/roll").emit("game", { game: rollGame });

			setTimeout(() => {
				rollGameComplete(io);
			}, 5000);
		} else {
			setTimeout(() => {
				rollGameValidate(io);
			}, 500);
		}
	} catch (err) {
		console.error(err);
	}
};

const rollGameComplete = async (io) => {
	try {
		rollGame.state = "completed";

		const leaderboard = await Leaderboard.findOne({ state: "running" })
			.select("state")
			.lean();
		const settings = settingGet();
		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");
		const exchangeRates = settingsDoc.exchangeRates || {};
		const promisesUsers = [];
		const promisesAffiliates = [];
		const promisesBets = [];

		let amountBetRain = 0;

		for (let bet of rollBets) {
			const amountRakeback =
				bet.user.limits.blockSponsor !== true
					? Math.floor(
							bet.amount *
								bet.user.rakeback.percentage *
								settings.general.reward.multiplier
					  )
					: 0;

			const amountPayout =
				rollGame.outcome >= bet.multiplier
					? parseFloat(
							(
								parseFloat(bet.amount) *
								(parseFloat(bet.multiplier) / 100)
							).toFixed(2)
					  )
					: 0;

			const multiplier = bet.multiplier;
			const amountLimits =
				multiplier >= 125 || amountPayout === 0
					? bet.amount
					: amountPayout;

			const amountAffiliate =
				bet.user.affiliates.referrer &&
				bet.user.limits.blockSponsor !== true
					? Math.floor(bet.amount * 0.005)
					: 0;

			amountBetRain +=
				bet.user.limits.blockSponsor !== true ? bet.amount : 0;

			// Aktif cüzdan belirleme
			const user = await User.findById(bet.user._id)
				.select("wallets currency limits")
				.lean();
			const walletIndex = getActiveWalletIndex(user);
			if (walletIndex === -1) continue;

			const walletPath = `wallets.${walletIndex}.balance`;

			promisesUsers.push(
				User.findByIdAndUpdate(
					bet.user._id,
					{
						$inc: {
							[walletPath]: amountPayout,

							xp:
								bet.user.limits.blockSponsor !== true
									? parseFloat(
											(
												(bet.amount /
													(exchangeRates[
														user.currency
															?.fiatCurrency ||
															"USD"
													] || 1)) *
												settings.general.reward
													.multiplier
											).toFixed(2)
									  )
									: 0,

							"stats.won": amountPayout,
							"leaderboard.points":
								leaderboard &&
								bet.user.limits.blockSponsor !== true &&
								bet.user.limits.blockLeaderboard !== true
									? bet.amount
									: 0,
							"limits.betToWithdraw":
								Math.floor(
									bet.user.limits.betToWithdraw - amountLimits
								) <= 0
									? -bet.user.limits.betToWithdraw
									: -amountLimits,
							"limits.betToRain":
								Math.floor(
									bet.user.limits.betToRain - amountLimits
								) <= 0
									? -bet.user.limits.betToRain
									: -amountLimits,
							"rakeback.earned": amountRakeback,
							"rakeback.available": amountRakeback,
							"affiliates.generated": amountAffiliate,
						},
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"wallets xp stats rakeback mute ban verifiedAt updatedAt"
					)
					.lean()
			);

			// 🎯 Bilet çevrimi + Race puanı hook'u
			onBetSettled({ userId: bet.user._id, amount: amountLimits, category: "originals" });

			if (bet.user.affiliates.referrer && amountAffiliate > 0) {
				promisesAffiliates.push(
					User.findByIdAndUpdate(bet.user.affiliates.referrer, {
						$inc: {
							"affiliates.earned": amountAffiliate,
							"affiliates.available": amountAffiliate,
						},
						updatedAt: new Date().getTime(),
					})
				);
			}

			promisesBets.push(
				RollBet.findByIdAndUpdate(
					bet._id,
					{
						payout: amountPayout,
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select("amount payout multiplier user updatedAt createdAt")
					.populate({
						path: "user",
						select: "roblox.id username avatar rank xp stats rakeback anonymous createdAt",
					})
					.lean()
			);
		}

		const result = await Promise.all([
			RollGame.findByIdAndUpdate(
				rollGame._id,
				{
					outcome: rollGame.outcome,
					state: "completed",
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select("outcome fair state createdAt")
				.populate({ path: "fair.seed", select: "seedServer hash" })
				.lean(),
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
			...promisesUsers,
			...promisesAffiliates,
			...promisesBets,
		]);

		rollHistory.unshift(result[0]);
		if (rollHistory.length > 25) rollHistory.pop();

		io.of("/roll").emit("game", { game: result[0] });
		io.of("/general").emit("rain", { rain: result[1] });

		for (const updatedUser of result.slice(2, 2 + promisesUsers.length)) {
			io.of("/general")
				.to(updatedUser._id.toString())
				.emit("user", { user: updatedUser });
		}

		for (const bet of result.slice(
			2 + promisesUsers.length + promisesAffiliates.length
		)) {
			generalAddBetsList(io, {
				...bet,
				user: generalUserGetFormated(bet.user),
				method: "roll",
			});
		}

		setTimeout(() => rollGameStart(io), 3000);
	} catch (err) {
		console.error(err);
	}
};

const rollInit = async (io) => {
	try {
		// Get last roll game and last 25 completed roll games from database
		let dataDatabase = await Promise.all([
			RollGame.findOne({})
				.sort({ createdAt: -1 })
				.select("fair state createdAt")
				.populate({
					path: "fair.seed",
					select: "seedServer",
				})
				.populate({
					path: "bets",
					select: "amount payout game user",
				})
				.lean(),
			RollGame.find({ state: "completed" })
				.sort({ createdAt: -1 })
				.limit(25)
				.select("outcome fair state createdAt")
				.populate({
					path: "fair.seed",
					select: "seedServer hash",
				})
				.lean(),
		]);

		// Add history games to roll history variable
		rollHistory = dataDatabase[1];

		// Handle last game if uncompleted
		if (dataDatabase[0] !== null && dataDatabase[0].state !== "completed") {
			// Create promise array
			let promises = [];

			// Add roll bet update querys and user update querys to promise array
			for (const bet of dataDatabase[0].bets) {
				if (bet.payout === undefined) {
					promises = [
						...promises,
						RollBet.findByIdAndUpdate(bet._id, {
							payout: bet.amount,
							updatedAt: new Date().getTime(),
						}),
						User.findByIdAndUpdate(bet.user, {
							$inc: {
								balance: bet.amount,
								"stats.bet": -bet.amount,
							},
							updatedAt: new Date().getTime(),
						}),
					];
				}
			}

			// Combine roll game id and server seed and sha256 hash the combined string
			const combined = crypto
				.createHash("sha256")
				.update(
					`${dataDatabase[0]._id}-${dataDatabase[0].fair.seed.seedServer}`
				)
				.digest("hex");

			// Get roll outcome for this game
			dataDatabase[0].outcome = rollGetOutcome(combined);

			// Execute update roll game query, roll bet querys and user querys in database
			dataDatabase = await Promise.all([
				RollGame.findByIdAndUpdate(
					dataDatabase[0]._id,
					{
						outcome: dataDatabase[0].outcome,
						state: "completed",
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select("outcome fair state createdAt")
					.populate({
						path: "fair.seed",
						select: "seedServer hash",
					})
					.lean(),
				...promises,
			]);

			// Add updated roll game object to roll history and remove last element from roll history if its longer then 25
			rollHistory.unshift(dataDatabase[0]);
			if (rollHistory.length > 25) {
				rollHistory.pop();
			}
		}

		// Start roll game
		rollGameStart(io);
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	rollGetData,
	rollSendBetSocket,
	rollInit,
};
