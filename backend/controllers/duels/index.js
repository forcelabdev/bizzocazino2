const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const DuelsGame = require("../../database/models/DuelsGame");
const DuelsBet = require("../../database/models/DuelsBet");
const Rain = require("../../database/models/Rain");
const Leaderboard = require("../../database/models/Leaderboard");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const { getActiveWalletIndex } = require("../../utils/wallet");
const { getRateFromCacheOrAPI } = require("../../utils/fiat"); // Bu util fonksiyon döviz kurunu getirir
const Setting = require("../../database/models/Setting");
// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const { fairGetData } = require("../../utils/fair");
const {
	duelsCheckGetGameDataData,
	duelsCheckGetGameDataGame,
	duelsCheckSendCreateData,
	duelsCheckSendCreateUser,
	duelsCheckSendBotData,
	duelsCheckSendBotGame,
	duelsCheckSendJoinData,
	duelsCheckSendJoinGame,
	duelsCheckSendJoinUser,
	duelsCheckSendCancelData,
	duelsCheckSendCancelGame,
	duelsGenerateGame,
	duelsGetGameIndex,
	duelsSanitizeGames,
	duelsSanitizeGame,
} = require("../../utils/duels");
const {
	generalUserGetLevel,
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

// Duels variables
let duelsGames = [];
let duelsHistory = [];
let duelsBlockGame = [];
let duelsBlockJoin = [];
let duelsBlockCancel = [];

const duelsGetData = () => {
	return { games: duelsSanitizeGames(duelsGames), history: duelsHistory };
};

const duelsGetGameDataSocket = async (io, socket, user, data, callback) => {
	try {
		// Validate sent data
		duelsCheckGetGameDataData(data);

		// Get duels game from duels games array
		let duelsGame = duelsGames[duelsGetGameIndex(duelsGames, data.gameId)];

		// If duels game was not in duels games array try to get from database
		if (duelsGame === undefined) {
			duelsGame = await DuelsGame.findById(data.gameId)
				.select("amount playerCount winner fair state createdAt")
				.populate({
					path: "winner",
					populate: {
						path: "user",
						select: "roblox.id username avatar rank",
					},
				})
				.populate({
					path: "bets",
					populate: {
						path: "user",
						select: "roblox.id username avatar rank",
					},
				})
				.lean();
		}

		// Validate duels game
		duelsCheckGetGameDataGame(duelsGame);

		callback({ success: true, game: duelsSanitizeGame(duelsGame) });
	} catch (err) {
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const duelsSendCreateSocket = async (io, socket, user, data, callback) => {
	try {
		// ✅ Validate sent data
		duelsCheckSendCreateData(data);

		// ✅ Fetch latest user from DB to ensure up-to-date wallet info
		const freshUser = await User.findById(user._id)
			.select(
				"wallets currency stats rakeback mute ban verifiedAt updatedAt roblox username avatar rank level limits affiliates createdAt anonymous"
			)
			.lean();

		if (!freshUser) {
			throw new Error("User not found.");
		}

		// ✅ Get user's active wallet
		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) {
			console.warn("❌ Selected wallet not found:", {
				currency: freshUser.currency,
				wallets: freshUser.wallets,
			});
			throw new Error("Selected wallet not found.");
		}

		// ✅ Check balance and game limits
		const userGames = duelsGames.filter(
			(game) =>
				game.bets[0] !== undefined &&
				game.bets[0].user._id.toString() === freshUser._id.toString()
		);
		duelsCheckSendCreateUser(data, freshUser, userGames);

		const amount = Math.floor(data.amount);
		const playerCount = Math.floor(data.playerCount);

		if (freshUser.wallets[walletIndex].balance < amount) {
			throw new Error("Insufficient wallet balance.");
		}

		// ✅ Get fiatCurrency and its rate
		const fiatCurrency = freshUser.currency?.fiatCurrency || "USD";
		const fiatRate = await getRateFromCacheOrAPI(fiatCurrency); // 🔁 Kur oranı alınıyor

		if (!fiatRate || typeof fiatRate !== "number" || fiatRate <= 0) {
			throw new Error(`Could not retrieve fiat rate for ${fiatCurrency}`);
		}

		// ✅ Update wallet balance locally
		const updatedWallets = [...freshUser.wallets];
		updatedWallets[walletIndex].balance -= amount;

		// ✅ Generate new game
		let duelsGame = await duelsGenerateGame(amount, playerCount);

		// ✅ Create DB operations: update user + insert bet
		const promises = [
			User.findByIdAndUpdate(
				freshUser._id,
				{
					$set: {
						wallets: updatedWallets,
					},
					$inc: {
						"stats.bet": amount,
					},
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"wallets currency xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean(),

			DuelsBet.create({
				amount: amount,
				game: duelsGame._id,
				user: freshUser._id,
				fiatCurrency,
				fiatRate,
				bot: false,
			}),
		];

		// ✅ Await both DB operations
		const [updatedUser, createdBet] = await Promise.all(promises);

		// ✅ Assemble bet object
		const level = generalUserGetLevel(freshUser);
		const rakeback = generalUserGetRakeback(freshUser);

		const betWithUser = createdBet.toObject();
		betWithUser.user = {
			_id: freshUser._id,
			roblox: freshUser.roblox,
			username: freshUser.username,
			avatar: freshUser.avatar,
			rank: freshUser.rank,
			level: level,
			rakeback: rakeback,
			stats: freshUser.anonymous === true ? null : freshUser.stats,
			limits: freshUser.limits,
			affiliates: freshUser.affiliates,
			createdAt: freshUser.createdAt,
		};

		// ✅ Add bet to game
		duelsGame.bets = [betWithUser];
		duelsGames.push(duelsGame);

		// ✅ Notify frontend
		io.of("/general")
			.to(freshUser._id.toString())
			.emit("user", { user: updatedUser });
		io.of("/duels").emit("game", { game: duelsSanitizeGame(duelsGame) });

		callback({ success: true });
		socketRemoveAntiSpam(freshUser._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const duelsSendBotSocket = async (io, socket, user, data, callback) => {
	try {
		// Validate sent data
		duelsCheckSendBotData(data);

		// Validate duels game
		duelsCheckSendBotGame(
			user,
			duelsGames[duelsGetGameIndex(duelsGames, data.gameId)],
			duelsBlockGame,
			duelsBlockJoin
		);

		try {
			// Add game id to game block array
			duelsBlockGame.push(data.gameId.toString());

			// Get game bet amount
			const amountGameBet =
				duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].amount;

			// Create database query promises array
			let promises = [];

			// Add create duels bet queries to promises array
			for (
				let i = 0;
				i <
				duelsGames[duelsGetGameIndex(duelsGames, data.gameId)]
					.playerCount -
					duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].bets
						.length;
				i++
			) {
				promises.push(
					DuelsBet.create({
						amount: amountGameBet,
						game: duelsGames[
							duelsGetGameIndex(duelsGames, data.gameId)
						]._id,
						bot: true,
					})
				);
			}

			// Execute promise queries in database
			let betsDatabase = await Promise.all(promises);

			// Convert bet objects to javascript objects
			betsDatabase = betsDatabase.map((bet) => bet.toObject());

			// Add bets to game object
			duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].bets = [
				...duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].bets,
				...betsDatabase,
			];

			// Send duels game to frontend
			io.of("/duels").emit("game", {
				game: duelsSanitizeGame(
					duelsGames[duelsGetGameIndex(duelsGames, data.gameId)]
				),
			});

			// If duels game is full and the state is created start rolling game
			if (
				duelsGames[duelsGetGameIndex(duelsGames, data.gameId)]
					.playerCount <=
					duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].bets
						.length &&
				duelsGames[duelsGetGameIndex(duelsGames, data.gameId)].state ===
					"created"
			) {
				duelsGameCountdown(
					io,
					duelsGames[duelsGetGameIndex(duelsGames, data.gameId)]
				);
			}

			callback({ success: true });

			// Remove game id from game block array
			duelsBlockGame.splice(
				duelsBlockGame.indexOf(data.gameId.toString()),
				1
			);

			socketRemoveAntiSpam(user._id);
		} catch (err) {
			socketRemoveAntiSpam(socket.decoded._id);
			duelsBlockGame.splice(
				duelsBlockGame.indexOf(data.gameId.toString()),
				1
			);
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

const duelsSendJoinSocket = async (io, socket, user, data, callback) => {
	try {
		duelsCheckSendJoinData(data);

		const gameIndex = duelsGetGameIndex(duelsGames, data.gameId);
		const game = duelsGames[gameIndex];
		duelsCheckSendJoinGame(user, game, duelsBlockGame, duelsBlockJoin);

		try {
			duelsBlockJoin.push(game._id.toString());

			// Güncel user bilgisini çek
			const freshUser = await User.findById(user._id)
				.select(
					"wallets currency stats rakeback mute ban verifiedAt updatedAt roblox username avatar rank level limits affiliates createdAt anonymous"
				)
				.lean();

			if (!freshUser) throw new Error("User not found");

			const walletIndex = getActiveWalletIndex(freshUser);
			if (walletIndex === -1) throw new Error("Active wallet not found");

			const userWallet = freshUser.wallets[walletIndex];
			const gameAmount = game.amount;

			// Kullanıcının fiat para birimi ve kuru
			const fiatCurrency = freshUser.currency?.fiatCurrency || "USD";
			const fiatRate = await getRateFromCacheOrAPI(fiatCurrency);

			if (!fiatRate || fiatRate <= 0) {
				throw new Error(
					`Exchange rate unavailable for ${fiatCurrency}`
				);
			}

			const gameFiatRate = game.bets[0]?.fiatRate || 1; // Güvenli kontrol
			const requiredAmount = Math.floor(
				(game.amount / gameFiatRate) * fiatRate
			);

			if (user.wallets[walletIndex].balance < requiredAmount) {
				throw new Error("Insufficient balance");
			}

			// Bakiye düşür
			const updatedWallets = [...freshUser.wallets];
			updatedWallets[walletIndex].balance -= gameAmount;

			const userUpdatePromise = User.findByIdAndUpdate(
				freshUser._id,
				{
					$set: { wallets: updatedWallets },
					$inc: { "stats.bet": gameAmount },
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"wallets currency xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean();

			const betCreatePromise = DuelsBet.create({
				amount: gameAmount,
				game: game._id,
				user: freshUser._id,
				fiatCurrency,
				fiatRate,
				fiatCurrency: user.currency?.fiatCurrency || "USD",
				fiatRate: fiatRate,
				bot: false,
			});

			const [updatedUser, createdBet] = await Promise.all([
				userUpdatePromise,
				betCreatePromise,
			]);

			// Kullanıcı bilgisiyle birlikte bet objesini birleştir
			const level = generalUserGetLevel(freshUser);
			const rakeback = generalUserGetRakeback(freshUser);

			const betWithUser = createdBet.toObject();
			betWithUser.user = {
				_id: freshUser._id,
				roblox: freshUser.roblox,
				username: freshUser.username,
				avatar: freshUser.avatar,
				rank: freshUser.rank,
				level,
				rakeback,
				stats: freshUser.anonymous ? null : freshUser.stats,
				limits: freshUser.limits,
				affiliates: freshUser.affiliates,
				createdAt: freshUser.createdAt,
			};

			duelsGames[gameIndex].bets.push(betWithUser);

			io.of("/general")
				.to(freshUser._id.toString())
				.emit("user", { user: updatedUser });
			io.of("/duels").emit("game", {
				game: duelsSanitizeGame(duelsGames[gameIndex]),
			});

			// Oyun doluysa başlat
			if (
				duelsGames[gameIndex].playerCount <=
					duelsGames[gameIndex].bets.length &&
				duelsGames[gameIndex].state === "created"
			) {
				duelsGameCountdown(io, duelsGames[gameIndex]);
			}

			callback({ success: true });

			duelsBlockJoin.splice(
				duelsBlockJoin.indexOf(game._id.toString()),
				1
			);
			socketRemoveAntiSpam(freshUser._id);
		} catch (err) {
			duelsBlockJoin.splice(
				duelsBlockJoin.indexOf(data.gameId.toString()),
				1
			);
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

const duelsSendCancelSocket = async (io, socket, user, data, callback) => {
	try {
		// Validate sent data
		duelsCheckSendCancelData(data);

		// Validate duels game
		duelsCheckSendCancelGame(
			user,
			duelsGames[duelsGetGameIndex(duelsGames, data.gameId)],
			duelsBlockGame,
			duelsBlockJoin
		);

		try {
			// Add game id to game block array
			duelsBlockGame.push(data.gameId.toString());

			callback({ success: true });

			// Remove game id from join block array
			duelsBlockGame.splice(
				duelsBlockGame.indexOf(data.gameId.toString()),
				1
			);

			socketRemoveAntiSpam(user._id);
		} catch (err) {
			socketRemoveAntiSpam(socket.decoded._id);
			duelsBlockGame.splice(
				duelsBlockGame.indexOf(data.gameId.toString()),
				1
			);
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

const duelsGameCountdown = (io, duelsGame) => {
	// Update duels game state to countdown and updated at
	duelsGame.state = "countdown";
	duelsGame.updatedAt = new Date().getTime();

	// Update game object in duels games array
	duelsGames.splice(
		duelsGetGameIndex(duelsGames, duelsGame._id),
		1,
		duelsGame
	);

	// Send duels game to frontend
	io.of("/duels").emit("game", { game: duelsSanitizeGame(duelsGame) });

	setTimeout(() => {
		duelsGameValidate(io, duelsGame);
	}, 4000);
};

const duelsGameValidate = async (io, duelsGame) => {
	try {
		// Update duels game state to pending
		duelsGame.state = "pending";

		// Update game object in duels games array
		duelsGames.splice(
			duelsGetGameIndex(duelsGames, duelsGame._id),
			1,
			duelsGame
		);

		// Send duels game to frontend
		io.of("/duels").emit("game", { game: duelsSanitizeGame(duelsGame) });

		// Get public seed data from eos provider
		const dataFair = await fairGetData();

		// Add public seed data to duels game object
		duelsGame.fair.seedPublic = dataFair.data.head_block_id;
		duelsGame.fair.blockId = dataFair.data.head_block_num;

		// Update game object in duels games array
		duelsGames.splice(
			duelsGetGameIndex(duelsGames, duelsGame._id),
			1,
			duelsGame
		);

		setTimeout(() => {
			duelsGameRoll(io, duelsGame);
		}, 1000);
	} catch (err) {
		console.error(err);
		setTimeout(() => {
			duelsGameValidate(io, duelsGame);
		}, 1000 * 15);
	}
};

const duelsGameRoll = async (io, duelsGame) => {
	try {
		for (const [index, bet] of duelsGame.bets.entries()) {
			// Combine duels game id, server seed, bet index and sha256 hash the combined string
			const combined = crypto
				.createHash("sha256")
				.update(
					`${duelsGame._id}-${duelsGame.fair.seedServer}-${duelsGame.fair.seedPublic}-${index}`
				)
				.digest("hex");

			// Get roll outcome for bet from combined hash
			const roll = parseInt(combined.substr(0, 8), 16) % 10000;

			// Add roll outcome to bet
			duelsGame.bets[index].roll = roll;
		}

		// Get winner bet from duels game object
		let winnerBet = duelsGame.bets.reduce((winner, bet) =>
			winner.roll > bet.roll ? winner : bet
		);

		// Update winner payout amount
		winnerBet.payout = Math.floor(
			duelsGame.amount * duelsGame.playerCount * 0.95
		);

		// Update duels game winner, state, winner bet payout amount and updated at
		duelsGame.state = "rolling";
		duelsGame.winner = winnerBet;
		duelsGame.bets[
			duelsGame.bets.findIndex(
				(element) => element._id.toString() === winnerBet._id.toString()
			)
		] = winnerBet;
		duelsGame.updatedAt = new Date().getTime();

		// Update game object in duels games array
		duelsGames.splice(
			duelsGetGameIndex(duelsGames, duelsGame._id),
			1,
			duelsGame
		);

		// Send duels game to frontend
		io.of("/duels").emit("game", { game: duelsSanitizeGame(duelsGame) });

		setTimeout(() => {
			duelsGameComplete(io, duelsGame);
		}, duelsGame.bets.length * 5000);
	} catch (err) {
		console.error(err);
	}
};

const duelsGameComplete = async (io, duelsGame) => {
	try {
		duelsGame.state = "completed";

		const leaderboardDatabase = await Leaderboard.findOne({
			state: "running",
		})
			.select("state")
			.lean();
		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");

		const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || {
			level1: 7,
			level2: 3,
			level3: 1,
		};
		const exchangeRates = settingsDoc.exchangeRates || {};

		let promisesUsers = [];
		let promisesBets = [];
		let promisesAffiliates = [];

		let amountBetTotal = 0;
		let amountBetRain = 0;

		for (const bet of duelsGame.bets) {
			const amountPayout =
				duelsGame.winner._id.toString() === bet._id.toString()
					? duelsGame.winner.payout
					: 0;

			if (bet.bot !== true) {
				amountBetTotal += bet.amount;
				amountBetRain +=
					bet.user.limits.blockSponsor !== true ? bet.amount : 0;

				const amountRakeback =
					bet.user.limits.blockSponsor !== true
						? parseFloat(
								(
									bet.amount * bet.user.rakeback.percentage
								).toFixed(2)
						  )
						: 0;

				// === Get 3-level referrer IDs ===
				const level1Ref = bet.user?.affiliates?.referrer || null;
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
				const bettorCurrency = bet.user.currency?.fiatCurrency || "USD";
				const bettorRate = exchangeRates[bettorCurrency] || 1;
				const betInUSD = bet.amount / bettorRate;

				// ✅ Affiliate ödemeleri
				for (const dist of affiliateDistributions) {
					const refUser = await User.findById(dist.id)
						.select("currency")
						.lean();
					if (!refUser) continue;

					const refCurrency = refUser.currency?.fiatCurrency || "USD";
					const refRate = exchangeRates[refCurrency] || 1;

					const commissionInUSD =
						betInUSD *
						(affiliateLevels[`level${dist.level}`] / 100);
					const commissionFinal = commissionInUSD * refRate;

					if (commissionFinal > 0) {
						promisesAffiliates.push(
							User.findByIdAndUpdate(dist.id, {
								$inc: {
									"affiliates.earned": commissionFinal,
									"affiliates.available": commissionFinal,
								},
								updatedAt: new Date().getTime(),
							})
						);

						promisesAffiliates.push(
							BalanceTransaction.create({
								amount: commissionFinal,
								type: "affiliateCommission",
								user: dist.id,
								fromUser: bet.user._id,
								state: "completed",
							})
						);
					}
				}

				// ✅ Kullanıcının payout’unu doğru wallet’a ekle
				const freshUser = await User.findById(bet.user._id)
					.select("wallets currency")
					.lean();
				const walletIndex = getActiveWalletIndex(freshUser);
				if (walletIndex === -1) {
					console.warn(`Wallet not found for user ${freshUser._id}`);
					continue;
				}

				let adjustedPayout = amountPayout;

				// Eğer bet.fiatRate varsa ve geçerliyse normalize et
				if (bet.fiatRate && bet.fiatRate > 0) {
					const currentFiatRate =
						exchangeRates[
							freshUser.currency?.fiatCurrency || "USD"
						] || 1;
					adjustedPayout = parseFloat(
						(
							(amountPayout / bet.fiatRate) *
							currentFiatRate
						).toFixed(2)
					);
				}

				freshUser.wallets[walletIndex].balance += adjustedPayout;

				const xpToAdd =
					bet.user.limits.blockSponsor !== true
						? parseFloat(
								(
									betInUSD *
									settingsDoc.general.reward.multiplier
								).toFixed(2)
						  )
						: 0;

				promisesUsers.push(
					User.findByIdAndUpdate(
						freshUser._id,
						{
							$set: { wallets: freshUser.wallets },
							$inc: {
								xp: xpToAdd,
								"stats.won": amountPayout,
								"limits.betToWithdraw":
									bet.user.limits.betToWithdraw <= bet.amount
										? -bet.user.limits.betToWithdraw
										: -bet.amount,
								"limits.betToRain":
									bet.user.limits.betToRain <= bet.amount
										? -bet.user.limits.betToRain
										: -bet.amount,
								"leaderboard.points":
									leaderboardDatabase !== null &&
									bet.user.limits.blockSponsor !== true &&
									bet.user.limits.blockLeaderboard !== true
										? bet.amount
										: 0,
								"affiliates.generated": bet.amount,
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
						.lean()
				);
			}

			promisesBets.push(
				DuelsBet.findByIdAndUpdate(
					bet._id,
					{
						payout: amountPayout,
						multiplier: Math.floor(
							(amountPayout / duelsGame.amount) * 100
						),
						roll: bet.roll,
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select("amount payout multiplier user bot updatedAt")
					.populate({
						path: "user",
						select: "roblox.id username avatar rank xp stats rakeback anonymous createdAt",
					})
					.lean()
			);
		}

		const dataDatabase = await Promise.all([
			DuelsGame.findByIdAndUpdate(
				duelsGame._id,
				{
					winner: duelsGame.winner._id,
					fair: duelsGame.fair,
					state: "completed",
					updatedAt: new Date().getTime(),
				},
				{}
			),
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
			...promisesBets,
			...promisesAffiliates,
		]);

		duelsHistory.unshift(duelsSanitizeGame(duelsGame));
		if (duelsHistory.length > 25) duelsHistory.pop();

		duelsGames.splice(duelsGetGameIndex(duelsGames, duelsGame._id), 1);
		io.of("/duels").emit("game", { game: duelsSanitizeGame(duelsGame) });
		io.of("/general").emit("rain", { rain: dataDatabase[1] });

		for (const user of dataDatabase.slice(2, promisesUsers.length + 2)) {
			io.of("/general").to(user._id.toString()).emit("user", { user });
		}

		for (const bet of dataDatabase.slice(
			promisesUsers.length + 2,
			promisesUsers.length + promisesBets.length + 2
		)) {
			if (bet.bot !== true) {
				generalAddBetsList(io, {
					...bet,
					user: generalUserGetFormated(bet.user),
					method: "duels",
				});
			}
		}
	} catch (err) {
		console.error(err);
	}
};

const duelsInit = async (io) => {
	try {
		// Get all uncompleted duels games and last 25 completed duels games from database
		const dataDatabase = await Promise.all([
			DuelsGame.find({
				$or: [
					{ state: "created" },
					{ state: "pending" },
					{ state: "rolling" },
				],
			})
				.select("amount playerCount fair state updatedAt createdAt")
				.populate({
					path: "bets",
					populate: {
						path: "user",
						select: "roblox.id username avatar rank xp limits stats.total affiliates anonymous createdAt",
					},
				})
				.lean(),
			DuelsGame.find({ state: "completed" })
				.sort({ createdAt: -1 })
				.limit(25)
				.select("amount playerCount winner fair state createdAt")
				.populate({
					path: "winner",
					populate: {
						path: "user",
						select: "roblox.id username avatar rank createdAt",
					},
				})
				.populate({
					path: "bets",
					populate: {
						path: "user",
						select: "roblox.id username avatar rank createdAt",
					},
				})
				.lean(),
		]);

		// Add history games to duels history variable
		duelsHistory = dataDatabase[1];

		// Create promises array
		let promises = [];

		// Handle all uncompleted crash games
		for (const game of dataDatabase[0]) {
			if (game.playerCount === game.bets.length) {
				// Add update duels game query to promises array
				promises.push(
					DuelsGame.findByIdAndUpdate(
						game._id,
						{
							state: "canceled",
							updatedAt: new Date().getTime(),
						},
						{}
					)
				);

				// Add update user queries to promises array
				for (const bet of game.bets) {
					promises.push(
						User.findByIdAndUpdate(
							bet.user,
							{
								$inc: {
									balance: game.amount,
									"stats.total.bet": -game.amount,
									"stats.duels.bet": -game.amount,
								},
								updatedAt: new Date().getTime(),
							},
							{}
						)
					);
				}
			} else {
				for (let bet of game.bets) {
					// Get user level
					const level = generalUserGetLevel(bet.user);

					// Check if user exists
					if (!bet.user) continue;

					// Get user rakeback rank
					const rakeback = generalUserGetRakeback(bet.user);

					// Update bet user
					bet.user = {
						_id: bet.user._id,
						roblox: bet.user.roblox,
						username: bet.user.username,
						avatar: bet.user.avatar,
						rank: bet.user.rank,
						level: level,
						rakeback: rakeback,
						stats:
							bet.user.anonymous === true ? null : bet.user.stats,
						limits: bet.user.limits,
						affiliates: bet.user.affiliates,
						createdAt: bet.user.createdAt,
					};
				}

				// Add uncompleted game to duels games array
				duelsGames.push(game);
			}
		}

		// Execute database queries
		await Promise.all(promises);
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	duelsGetData,
	duelsGetGameDataSocket,
	duelsSendCreateSocket,
	duelsSendBotSocket,
	duelsSendJoinSocket,
	duelsSendCancelSocket,
	duelsInit,
};
