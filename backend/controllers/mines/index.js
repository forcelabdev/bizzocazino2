const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const UserSeed = require("../../database/models/UserSeed");
const MinesGame = require("../../database/models/MinesGame");
const Leaderboard = require("../../database/models/Leaderboard");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const Rain = require("../../database/models/Rain");
const Setting = require("../../database/models/Setting");
const { getActiveWalletIndex } = require("../../utils/wallet");
const { onBetSettled } = require("../../utils/wagerHooks");

// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const {
	minesCheckSendBetData,
	minesCheckSendBetUser,
	minesCheckSendBetGame,
	minesCheckSendBetSeed,
	minesCheckSendRevealData,
	minesCheckSendRevealGame,
	minesCheckSendCashoutGame,
	minesGetGamePayout,
	minesGetGameDeck,
	minesSanitizeGame,
} = require("../../utils/mines");
const {
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

// Mines variables
let minesGames = [];

const minesGetGame = (user) => {
	// Get users mines game index
	const index = minesGames.findIndex(
		(element) => element.user.toString() === user._id.toString()
	);

	// Get users mines game
	const minesGame =
		index !== -1 ? minesSanitizeGame(minesGames[index]) : null;

	// Return users mines game
	return minesGame;
};

const minesSendBetSocket = async (io, socket, user, data, callback) => {
	try {
		minesCheckSendBetData(data);
		minesCheckSendBetUser(data, user);

		const minesGame = minesGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		minesCheckSendBetGame(minesGame);

		const seedDatabase = await UserSeed.findOne({
			user: user._id,
			state: "active",
		}).select("seedClient seedServer nonce user state");
		minesCheckSendBetSeed(seedDatabase);

		const leaderboardDatabase = await Leaderboard.findOne({
			state: "running",
		})
			.select("state")
			.lean();
		const amount = Math.floor(data.amount);
		const minesCount = Math.floor(data.minesCount);
		const rakeback = generalUserGetRakeback(user);

		// ✅ Kullanıcıyı yeniden al
		const freshUser = await User.findById(user._id)
			.select(
				"wallets currency stats rakeback mute ban verifiedAt updatedAt username avatar rank level limits affiliates createdAt anonymous"
			)
			.lean();

		if (!freshUser) throw new Error("User not found.");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Selected wallet not found.");

		const walletPath = `wallets.${walletIndex}.balance`;
		const walletBalance = freshUser.wallets[walletIndex].balance;

		if (walletBalance < amount) {
			throw new Error("Yetersiz bakiye");
		}

		const amountRakeback =
			freshUser.limits.blockSponsor !== true
				? amount * rakeback.percentage
				: 0;

		// ✅ Settings'i DB'den çek
		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");

		const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || {
			level1: 7,
			level2: 3,
			level3: 1,
		};
		const exchangeRates = settingsDoc.exchangeRates || {};
		console.log("📊 ExchangeRates from DB:", exchangeRates);

		// ✅ Affiliate zinciri
		const affiliateDistributions = [];
		const level1Ref = freshUser.affiliates.referrer;
		let level2Ref = null;
		let level3Ref = null;

		if (level1Ref) {
			const level1User = await User.findById(level1Ref)
				.select("affiliates.referrer")
				.lean();
			level2Ref = level1User?.affiliates?.referrer;

			if (level2Ref) {
				const level2User = await User.findById(level2Ref)
					.select("affiliates.referrer")
					.lean();
				level3Ref = level2User?.affiliates?.referrer;
			}
		}

		// ✅ Bahis yapanın para birimi ve oranı
		const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
		const bettorRate = exchangeRates[bettorCurrency] || 1;
		const betInUSD = amount / bettorRate;

		console.log(
			`➡️ Bettor Currency: ${bettorCurrency} Amount: ${amount} Rate: ${bettorRate}`
		);
		console.log(`💵 Bet in USD: ${betInUSD}`);

		if (level1Ref) affiliateDistributions.push({ id: level1Ref, level: 1 });
		if (level2Ref) affiliateDistributions.push({ id: level2Ref, level: 2 });
		if (level3Ref) affiliateDistributions.push({ id: level3Ref, level: 3 });

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

			console.log(`👤 Ref Level: ${ref.level}`);
			console.log(`Ref Currency: ${refCurrency} Rate: ${refRate}`);
			console.log(
				`💰 Commission in USD: ${commissionInUSD} => Final Commission: ${commissionFinal} ${refCurrency}`
			);

			if (commissionFinal > 0) {
				await User.findByIdAndUpdate(ref.id, {
					$inc: {
						"affiliates.earned": commissionFinal,
						"affiliates.available": commissionFinal,
					},
					updatedAt: new Date().getTime(),
				});

				await BalanceTransaction.create({
					amount: commissionFinal,
					type: "affiliateCommission",
					user: ref.id,
					fromUser: user._id,
					state: "completed",
				});
			}
		}

		// ✅ Deck üret
		const combined = `${seedDatabase.seedServer}-${seedDatabase.nonce}-${seedDatabase.seedClient}`;
		const hash = crypto.createHash("sha256").update(combined).digest("hex");
		const deck = minesGetGameDeck(minesCount, hash);

		// ✅ Veritabanı işlemleri
		const promises = [
			User.findOneAndUpdate(
				{ _id: user._id, [walletPath]: { $gte: amount } },
				{
					$inc: {
						[walletPath]: -amount,
						xp:
							freshUser.limits.blockSponsor !== true
								? parseFloat(
										(
											betInUSD *
											settingsDoc.general.reward
												.multiplier
										).toFixed(2)
								  )
								: 0,
						"stats.bet": amount,
						"leaderboard.points":
							leaderboardDatabase !== null &&
							freshUser.limits.blockSponsor !== true &&
							freshUser.limits.blockLeaderboard !== true
								? amount
								: 0,
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

			UserSeed.findByIdAndUpdate(
				seedDatabase._id,
				{ $inc: { nonce: 1 } },
				{}
			),

			MinesGame.create({
				amount,
				minesCount,
				deck,
				fair: { seed: seedDatabase._id, nonce: seedDatabase.nonce },
				user: user._id,
				state: "created",
				fiatCurrency: freshUser.currency.fiatCurrency,
				coinType: freshUser.currency.coinType,
				chain: freshUser.currency.chain,
				walletType: freshUser.currency.type,
			}),
		];

		const dataDatabase = await Promise.all(promises);
		const updatedUser = dataDatabase[0];
		const createdGame = dataDatabase[2].toObject();

		minesGames.push(createdGame);

		callback({
			success: true,
			user: updatedUser,
			game: minesSanitizeGame(createdGame),
		});
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		console.error("❌ minesSendBetSocket error:", err);
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const minesSendRevealSocket = async (io, socket, user, data, callback) => {
	try {
		minesCheckSendRevealData(data);

		let minesGame = minesGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		minesCheckSendRevealGame(minesGame, data);

		const tile = Math.floor(data.tile);
		minesGame.revealed.push({ tile: tile, value: minesGame.deck[tile] });

		if (
			minesGame.deck[tile] === "mine" ||
			25 - minesGame.minesCount <= minesGame.revealed.length
		) {
			const rawPayout =
				minesGame.deck[tile] !== "mine"
					? minesGetGamePayout(minesGame)
					: 0;
			const amountPayout = parseFloat(rawPayout.toFixed(2)); // ✅ 2 basamaklı kesin değer
			const multiplier = Math.floor(
				(amountPayout / minesGame.amount) * 100
			);
			const amountLimits =
				amountPayout === 0 || multiplier >= 125
					? minesGame.amount
					: amountPayout;
			const amountBetRain =
				user.limits.blockSponsor !== true ? minesGame.amount : 0;

			const freshUser = await User.findById(user._id)
				.select("wallets currency limits")
				.lean();
			const walletIndex = getActiveWalletIndex(freshUser);
			if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");
			const walletPath = `wallets.${walletIndex}.balance`;

			const promises = [
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
								Math.floor(
									user.limits.betToRain - amountLimits
								) <= 0
									? -user.limits.betToRain
									: -amountLimits,
						},
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"wallets xp stats rakeback mute ban verifiedAt updatedAt"
					)
					.lean(),

				MinesGame.findByIdAndUpdate(
					minesGame._id,
					{
						payout: amountPayout,
						multiplier: multiplier,
						revealed: minesGame.revealed,
						state: "completed",
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"amount payout multiplier minesCount deck revealed user state updatedAt"
					)
					.lean(),
			];

			if (amountPayout > 0) {
				promises.push(
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
						.lean()
				);
			}

			const dataDatabase = await Promise.all(promises);
			minesGames.splice(
				minesGames.findIndex(
					(element) =>
						element._id.toString() ===
						dataDatabase[1]._id.toString()
				),
				1
			);

			// 🎯 Bilet çevrimi + Race puanı hook'u (mines bombaya basıldı, tur sonlandı)
			onBetSettled({ userId: user._id, amount: amountLimits, category: "originals" });

			io.of("/general")
				.to(user._id.toString())
				.emit("user", { user: dataDatabase[0] });
			if (amountPayout > 0)
				io.of("/general").emit("rain", { rain: dataDatabase[2] });
			generalAddBetsList(io, {
				...dataDatabase[1],
				user: generalUserGetFormated(user),
				method: "mines",
			});

			minesGame = dataDatabase[1];
		} else {
			minesGame = await MinesGame.findByIdAndUpdate(
				minesGame._id,
				{
					revealed: minesGame.revealed,
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select("amount minesCount deck revealed user state")
				.lean();

			minesGames.splice(
				minesGames.findIndex(
					(element) =>
						element._id.toString() === minesGame._id.toString()
				),
				1,
				minesGame
			);
		}

		callback({ success: true, game: minesSanitizeGame(minesGame) });
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const minesSendCashoutSocket = async (io, socket, user, data, callback) => {
	try {
		let minesGame = minesGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		minesCheckSendCashoutGame(minesGame);

		const rawPayout = minesGetGamePayout(minesGame);
		const amountPayout = parseFloat(rawPayout.toFixed(2)); // ✅ 2 basamaklı kesin değer
		const multiplier = Math.floor((amountPayout / minesGame.amount) * 100);
		const amountLimits =
			multiplier >= 125 ? minesGame.amount : amountPayout;
		const amountBetRain =
			user.limits.blockSponsor !== true ? minesGame.amount : 0;

		const freshUser = await User.findById(user._id)
			.select("wallets currency limits")
			.lean();
		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");
		const walletPath = `wallets.${walletIndex}.balance`;

		const dataDatabase = await Promise.all([
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
					"wallets xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean(),

			MinesGame.findByIdAndUpdate(
				minesGame._id,
				{
					payout: amountPayout,
					multiplier: multiplier,
					state: "completed",
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"amount payout multiplier minesCount deck revealed user state updatedAt"
				)
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
		]);

		minesGames.splice(
			minesGames.findIndex(
				(element) =>
					element._id.toString() === dataDatabase[1]._id.toString()
			),
			1
		);

		// 🎯 Bilet çevrimi + Race puanı hook'u (mines cashout)
		onBetSettled({ userId: user._id, amount: amountLimits, category: "originals" });

		io.of("/general").emit("rain", { rain: dataDatabase[2] });
		generalAddBetsList(io, {
			...dataDatabase[1],
			user: generalUserGetFormated(user),
			method: "mines",
		});

		callback({
			success: true,
			user: dataDatabase[0],
			game: minesSanitizeGame(dataDatabase[1]),
		});
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const minesInit = async (io) => {
	try {
		// Get towers games and add to towers game array
		minesGames = await MinesGame.find({ state: "created" })
			.select("amount minesCount deck revealed user state")
			.lean();
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	minesGetGame,
	minesSendBetSocket,
	minesSendRevealSocket,
	minesSendCashoutSocket,
	minesInit,
};
