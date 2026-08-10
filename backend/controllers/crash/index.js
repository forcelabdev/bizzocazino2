const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const CrashGame = require("../../database/models/CrashGame");
const CrashBet = require("../../database/models/CrashBet");
const Rain = require("../../database/models/Rain");
const Leaderboard = require("../../database/models/Leaderboard");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const { getActiveWalletIndex } = require("../../utils/wallet");
const Setting = require("../../database/models/Setting");
// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const {
	crashCheckSendBetData,
	crashCheckSendBetUser,
	crashCheckSendBetGame,
	crashCheckSendCashoutGame,
	crashCheckSendCashoutBet,
	crashGetGameMultiplier,
	crashGenerateGame,
	crashGetOutcome,
	crashSanitizeGame,
	crashSanitizeBets,
	crashSanitizeBet,
} = require("../../utils/crash");
const {
	generalUserGetLevel,
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

// Crash variables
let crashGame = null;
let crashBets = [];
let crashHistory = [];
let crashBetPendingCount = 0;

const crashGetData = () => {
	return {
		game: crashSanitizeGame(crashGame),
		bets: crashSanitizeBets(crashBets),
		history: crashHistory,
	};
};

const crashSendBetSocket = async (io, socket, user, data, callback) => {
	try {
		crashCheckSendBetData(data);
		crashCheckSendBetUser(data, user, crashBets);
		crashCheckSendBetGame(crashGame);

		crashBetPendingCount++;

		const leaderboardDatabase = await Leaderboard.findOne({
			state: "running",
		})
			.select("state")
			.lean();
		const amount = parseFloat(data.amount); // ✅ Ondalık izin veriyoruz
		const autoCashout =
			Math.floor(data.autoCashout) <= 100
				? 0
				: Math.floor(data.autoCashout);
		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");

		const rakeback = generalUserGetRakeback(user);

		// ✅ Güncel kullanıcıyı al
		const freshUser = await User.findById(user._id)
			.select(
				"wallets currency stats rakeback mute ban verifiedAt roblox username avatar rank level limits affiliates createdAt anonymous"
			)
			.lean();
		if (!freshUser) throw new Error("User not found.");

		const level = generalUserGetLevel(freshUser);
		const amountRakeback =
			freshUser.limits.blockSponsor !== true
				? parseFloat((amount * rakeback.percentage).toFixed(2))
				: 0;

		// ✅ Aktif cüzdan kontrolü
		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Selected wallet not found.");

		const walletBalance = freshUser.wallets[walletIndex].balance;
		if (walletBalance < amount) throw new Error("Yetersiz bakiye");

		const walletPath = `wallets.${walletIndex}.balance`;

		// ✅ Exchange Rates → USD dönüşüm
		const exchangeRates = settingsDoc.exchangeRates || {};
		const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
		const bettorRate = exchangeRates[bettorCurrency] || 1;
		const betInUSD = parseFloat((amount / bettorRate).toFixed(6)); // ✅ normalize edildi

		// ✅ Atomic bakiye düşme ve XP ekleme (sadece burada)
		const updateUser = await User.findOneAndUpdate(
			{ _id: user._id, [walletPath]: { $gte: amount } },
			{
				$inc: {
					[walletPath]: -amount,
					xp:
						freshUser.limits.blockSponsor !== true
							? Math.floor(
									betInUSD *
										settingsDoc.general.reward.multiplier
							  )
							: 0,
					"stats.bet": amount,
					"leaderboard.points":
						leaderboardDatabase !== null &&
						freshUser.limits.blockSponsor !== true &&
						freshUser.limits.blockLeaderboard !== true
							? amount
							: 0,
					"affiliates.generated": amount,
					"rakeback.earned": amountRakeback,
					"rakeback.available": amountRakeback,
				},
				updatedAt: new Date().getTime(),
			},
			{ new: true }
		)
			.select("wallets xp stats rakeback mute ban verifiedAt")
			.lean();

		if (!updateUser) throw new Error("Yetersiz bakiye");

		// ✅ CrashBet kaydı
		const crashBet = await CrashBet.create({
			amount,
			autoCashout,
			game: crashGame._id,
			user: user._id,
			fiatCurrency: freshUser.currency.fiatCurrency,
			coinType: freshUser.currency.coinType,
			chain: freshUser.currency.chain,
			walletType: freshUser.currency.type,
		});

		// ✅ Frontend’e bet gönder
		const betData = crashBet.toObject();
		betData.user = {
			_id: user._id,
			roblox: freshUser.roblox,
			username: freshUser.username,
			avatar: freshUser.avatar,
			rank: freshUser.rank,
			level,
			rakeback: rakeback.name,
			stats: freshUser.anonymous === true ? null : freshUser.stats,
			limits: freshUser.limits,
			createdAt: freshUser.createdAt,
		};

		crashBets.push(betData);
		io.of("/crash").emit("bet", { bet: crashSanitizeBet(betData) });

		callback({ success: true, user: updateUser });

		crashBetPendingCount--;
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		crashBetPendingCount--;
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const crashSendCashoutSocket = async (io, socket, user, data, callback) => {
	try {
		// Get elapsed for current crash game
		const elapsed = new Date().getTime() - crashGame.updatedAt;

		// Get current crash game multiplier
		const gameMultiplier = crashGetGameMultiplier(elapsed);

		// Validate if cashout is allowed for current game
		crashCheckSendCashoutGame(crashGame, gameMultiplier);

		// Get users crash bet from crash bets array if available
		const userBet =
			crashBets[
				crashBets.findIndex(
					(element) =>
						element.user._id.toString() === user._id.toString()
				)
			];

		// Validate users crash bet
		crashCheckSendCashoutBet(crashGame, gameMultiplier, userBet);

		// Cashout crash bet
		crashBetCashout(io, gameMultiplier, userBet);

		callback({ success: true });

		socketRemoveAntiSpam(user._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const crashGameStart = async (io) => {
	try {
		// Clear crash bets array
		crashBets = [];

		// Generate new crash game
		crashGame = await crashGenerateGame();

		// Send sanitized crash game object to frontend
		io.of("/crash").emit("game", { game: crashSanitizeGame(crashGame) });

		setTimeout(() => {
			crashGameValidate(io);
		}, 1000 * 6 - (new Date().getTime() - new Date(crashGame.createdAt).getTime()));
	} catch (err) {
		console.error(err);
	}
};

const crashGameValidate = async (io) => {
	try {
		// Set crash game state to rolling
		crashGame.state = "pending";

		// Send sanitized crash game object to frontend
		io.of("/crash").emit("game", { game: crashSanitizeGame(crashGame) });

		if (crashBetPendingCount <= 0) {
			// Combine crash game id and server seed and sha256 hash the combined string
			const combined = crypto
				.createHash("sha256")
				.update(`${crashGame._id}-${crashGame.fair.seed.seedServer}`)
				.digest("hex");

			// Get crash outcome for this game
			crashGame.outcome = crashGetOutcome(combined);

			// Set crash game state to rolling and updated at
			crashGame.state = "rolling";
			crashGame.updatedAt = new Date().getTime();

			// Send updated and sanitized game object to frontend
			io.of("/crash").emit("game", {
				game: crashSanitizeGame(crashGame),
			});

			crashGameTickCall(io, 0);
		} else {
			setTimeout(() => {
				crashGameValidate(io);
			}, 500);
		}
	} catch (err) {
		console.error(err);
	}
};

const crashGameTickCall = async (io, elapsed) => {
	try {
		const left =
			Math.ceil(16666.666667 * Math.log(0.01 * (crashGame.outcome + 1))) -
			elapsed;
		const nextTick = Math.max(0, Math.min(left, 150));

		setTimeout(() => {
			crashGameTickRun(io);
		}, nextTick);
	} catch (err) {
		console.error(err);
	}
};

const crashGameTickRun = async (io) => {
	try {
		// Get elapsed for current crash game
		const elapsed = new Date().getTime() - crashGame.updatedAt;

		// Get current crash game multiplier
		const gameMultiplier = crashGetGameMultiplier(elapsed);

		// Send current crash multiplier to frontend
		io.of("/crash").emit("tick", { multiplier: gameMultiplier });

		// Check bets with auto cashouts
		crashCheckCashouts(io, gameMultiplier);

		if (gameMultiplier > crashGame.outcome) {
			crashGameComplete(io);
		} else {
			crashGameTickCall(io, elapsed);
		}
	} catch (err) {
		console.error(err);
	}
};

const crashGameComplete = async (io) => {
	try {
		// Set crash game state to completed
		crashGame.state = "completed";

		// Send updated full crash game object to frontend
		io.of("/crash").emit("game", { game: crashGame });

		// Create promises arrays
		let promisesUsers = [];
		let promisesBets = [];

		// Create rain amount variable
		let amountBetRain = 0;

		for (const bet of crashBets) {
			// Add user bet amount to rain bet amount if user is not sponsored
			amountBetRain =
				amountBetRain +
				(bet.user.limits.blockSponsor !== true ? bet.amount : 0);

			if (bet.multiplier === undefined) {
				// Add update user query to users promises array
				promisesUsers.push(
					User.findByIdAndUpdate(
						bet.user._id,
						{
							$inc: {
								"limits.betToWithdraw":
									Math.floor(
										bet.user.limits.betToWithdraw -
											bet.amount
									) <= 0
										? -bet.user.limits.betToWithdraw
										: -bet.amount,
								"limits.betToRain":
									Math.floor(
										bet.user.limits.betToRain - bet.amount
									) <= 0
										? -bet.user.limits.betToRain
										: -bet.amount,
							},
							updatedAt: new Date().getTime(),
						},
						{ new: true }
					)
						.select(
							"balance xp stats rakeback mute ban verifiedAt updatedAt"
						)
						.lean()
				);

				// Add update bet query to bets promises array
				promisesBets.push(
					CrashBet.findByIdAndUpdate(
						bet._id,
						{
							payout: 0,
							updatedAt: new Date().getTime(),
						},
						{ new: true }
					)
						.select(
							"amount payout multiplier user updatedAt createdAt"
						)
						.populate({
							path: "user",
							select: "roblox.id username avatar rank xp stats rakeback anonymous createdAt",
						})
						.lean()
				);
			}
		}

		// Update crash game, rain and crash bets in database
		const dataDatabase = await Promise.all([
			CrashGame.findByIdAndUpdate(
				crashGame._id,
				{
					outcome: crashGame.outcome,
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
				{
					$inc: {
						amount: Math.floor(amountBetRain * 0.001),
					},
				},
				{ new: true }
			)
				.select("amount participants type state updatedAt")
				.lean(),
			...promisesUsers,
			...promisesBets,
		]);

		// Add updated crash game object to crash history and remove last element from crash history if its longer then 25
		crashHistory.unshift(dataDatabase[0]);
		if (crashHistory.length > 25) {
			crashHistory.pop();
		}

		// Send updated site rain to frontend
		io.of("/general").emit("rain", { rain: dataDatabase[1] });

		// Add updated bets to bet list
		for (const bet of dataDatabase.slice(promisesUsers.length + 2)) {
			generalAddBetsList(io, {
				...bet,
				user: generalUserGetFormated(bet.user),
				method: "crash",
			});
		}

		// Start crash game after 5s cooldown
		setTimeout(() => {
			crashGameStart(io);
		}, 1000 * 3);
	} catch (err) {
		console.error(err);
	}
};

const crashCheckCashouts = (io, multiplier) => {
	try {
		for (const bet of crashBets) {
			if (
				bet.multiplier === undefined &&
				bet.autoCashout >= 101 &&
				bet.autoCashout <= multiplier &&
				bet.autoCashout <= crashGame.outcome
			) {
				crashBetCashout(io, bet.autoCashout, bet);
			} else if (
				bet.multiplier === undefined &&
				Math.floor(bet.amount * (multiplier / 100)) >=
					Math.floor(process.env.CRASH_MAX_PROFIT * 1000) &&
				multiplier <= crashGame.outcome
			) {
				crashBetCashout(io, multiplier, bet);
			}
		}
	} catch (err) {
		console.error(err);
	}
};

const crashBetCashout = async (io, multiplier, bet) => {
	try {
		const betIndex = crashBets.findIndex(
			(element) => element._id.toString() === bet._id.toString()
		);

		if (betIndex === -1) return;

		const betData = crashBets[betIndex];

		// Hesaplama
		const amountPayout = parseFloat(
			(betData.amount * (multiplier / 100)).toFixed(2)
		);

		const amountLimits = multiplier >= 125 ? betData.amount : amountPayout;

		// Crash bet güncelle
		betData.payout = amountPayout;
		betData.multiplier = multiplier;

		io.of("/crash").emit("bet", { bet: crashSanitizeBet(betData) });

		// Güncel user'ı al (wallets ve currency için)
		const user = await User.findById(betData.user._id).lean();
		if (!user) throw new Error("User not found during cashout");

		const walletIndex = getActiveWalletIndex(user);
		if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");

		const walletPath = `wallets.${walletIndex}.balance`;

		const [updatedUser, updatedBet] = await Promise.all([
			User.findByIdAndUpdate(
				user._id,
				{
					$inc: {
						[walletPath]: amountPayout,
						"stats.won": amountPayout,
						"limits.betToWithdraw":
							Math.floor(
								user.limits.betToWithdraw - amountLimits
							) <= 0
								? -user.limits.betToWithdraw
								: -amountLimits,
						"limits.betToRain":
							Math.floor(user.limits.betToRain - amountLimits) <=
							0
								? -user.limits.betToRain
								: -amountLimits,
					},
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"roblox.id username avatar wallets rank xp stats rakeback anonymous mute ban verifiedAt updatedAt"
				)
				.lean(),

			CrashBet.findByIdAndUpdate(
				betData._id,
				{
					payout: amountPayout,
					multiplier: multiplier,
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select("amount payout actions user updatedAt createdAt")
				.lean(),
		]);

		// Güncel kullanıcıyı frontend'e gönder
		io.of("/general")
			.to(updatedUser._id.toString())
			.emit("user", { user: updatedUser });

		// Bet listesine ekle
		generalAddBetsList(io, {
			...updatedBet,
			user: generalUserGetFormated(updatedUser),
			method: "crash",
		});
	} catch (err) {
		console.error(err);
	}
};

const crashInit = async (io) => {
	try {
		// Get last crash game and last 25 completed crash games from database
		let dataDatabase = await Promise.all([
			CrashGame.findOne({})
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
			CrashGame.find({ state: "completed" })
				.sort({ createdAt: -1 })
				.limit(25)
				.select("outcome fair state createdAt")
				.populate({
					path: "fair.seed",
					select: "seedServer hash",
				})
				.lean(),
		]);

		// Add history games to crash history variable
		crashHistory = dataDatabase[1];

		// Handle last game if uncompleted
		if (dataDatabase[0] !== null && dataDatabase[0].state !== "completed") {
			// Create promise array
			let promises = [];

			// Add crash bet update querys and user update querys to promise array
			for (const bet of dataDatabase[0].bets) {
				if (bet.payout === undefined) {
					promises = [
						...promises,
						CrashBet.findByIdAndUpdate(bet._id, {
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

			// Combine crash game id and server seed and sha256 hash the combined string
			const combined = crypto
				.createHash("sha256")
				.update(
					`${dataDatabase[0]._id}-${dataDatabase[0].fair.seed.seedServer}`
				)
				.digest("hex");

			// Get crash outcome for this game
			dataDatabase[0].outcome = crashGetOutcome(combined);

			// Execute update crash game query, roll bet querys and user querys in database
			dataDatabase = await Promise.all([
				CrashGame.findByIdAndUpdate(
					dataDatabase[0]._id,
					{
						outcome: dataDatabase[0].outcome,
						state: "completed",
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select("outcome fair state createdAt")
					.populate({ path: "fair.seed", select: "seedServer hash" })
					.lean(),
				...promises,
			]);

			// Add updated crash game object to crash history and remove last element from roll history if its longer then 25
			crashHistory.unshift(dataDatabase[0]);
			if (crashHistory.length > 25) {
				crashHistory.pop();
			}
		}

		// Start crash game
		crashGameStart(io);
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	crashGetData,
	crashSendBetSocket,
	crashSendCashoutSocket,
	crashInit,
};
