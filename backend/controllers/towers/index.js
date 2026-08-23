const crypto = require("crypto");

// Load database models
const User = require("../../database/models/User");
const UserSeed = require("../../database/models/UserSeed");
const TowersGame = require("../../database/models/TowersGame");
const Leaderboard = require("../../database/models/Leaderboard");
const Rain = require("../../database/models/Rain");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const { getActiveWalletIndex } = require("../../utils/wallet");
	const { onBetSettled } = require("../../utils/wagerHooks");
	const {
		evaluateCategoryBetLimit,
		CATEGORY_BET_LIMIT_EXCEEDED_CODE,
	} = require("../../utils/userBetAccess");
const Setting = require("../../database/models/Setting");

// Load utils
const { socketRemoveAntiSpam } = require("../../utils/socket");
const { settingGet } = require("../../utils/setting");
const {
	towersCheckSendBetData,
	towersCheckSendBetUser,
	towersCheckSendBetGame,
	towersCheckSendBetSeed,
	towersCheckSendRevealData,
	towersCheckSendRevealGame,
	towersCheckSendCashoutGame,
	towersGetGamePayout,
	towersGenerateDeck,
	towersShuffleDeck,
	towersSanitizeGame,
} = require("../../utils/towers");
const {
	generalUserGetRakeback,
	generalUserGetFormated,
} = require("../../utils/general/user");

// Load controllers
const { generalAddBetsList } = require("../general/bets");

// Towers variables
let towersGames = [];

const towersGetGame = (user) => {
	// Get users towers game index
	const index = towersGames.findIndex(
		(element) => element.user.toString() === user._id.toString()
	);

	// Get users towers game
	const towersGame =
		index !== -1 ? towersSanitizeGame(towersGames[index]) : null;

	// Return users mines game
	return towersGame;
};

const towersSendBetSocket = async (io, socket, user, data, callback) => {
	try {
		towersCheckSendBetData(data);
		towersCheckSendBetUser(data, user);

		const towersGame = towersGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		towersCheckSendBetGame(towersGame);

		const seedDatabase = await UserSeed.findOne({
			user: user._id,
			state: "active",
		}).select("seedClient seedServer nonce user state");
		towersCheckSendBetSeed(seedDatabase);

		const leaderboardDatabase = await Leaderboard.findOne({
			state: "running",
		})
			.select("state")
			.lean();

		const amount = parseFloat(parseFloat(data.amount).toFixed(2));

		const settingsDoc = await Setting.findOne().lean();
		if (!settingsDoc) throw new Error("Settings bulunamadı!");

		const rakeback = generalUserGetRakeback(user);
		const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || {
			level1: 7,
			level2: 3,
			level3: 1,
		};
		const exchangeRates = settingsDoc.exchangeRates || {};

		// ✅ Güncel user (wallets ve currency için)
		const freshUser = await User.findById(user._id)
			.select(
				"wallets currency stats rakeback mute ban verifiedAt updatedAt roblox username avatar rank level limits controls affiliates createdAt anonymous"
			)
			.lean();

		if (!freshUser) throw new Error("User not found");

		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");

		const wallet = freshUser.wallets[walletIndex];
		const walletPath = `wallets.${walletIndex}.balance`;

		if (wallet.balance < amount) throw new Error("Yetersiz bakiye");

		// 🎯 Bet Limitleme: kategori bazlı tam blokaj / maksimum tutar kontrolü.
		const limitCheck = evaluateCategoryBetLimit(freshUser, "originals", amount);
		if (!limitCheck.allowed) {
			throw new Error(
				limitCheck.reason === CATEGORY_BET_LIMIT_EXCEEDED_CODE
					? `Bu kategori için maksimum bahis tutarı ${limitCheck.max} ile sınırlıdır.`
					: "Bu oyun kategorisine erişiminiz kısıtlanmıştır."
			);
		}

		const amountRakeback =
			freshUser.limits.blockSponsor !== true
				? parseFloat((amount * rakeback.percentage).toFixed(2))
				: 0;

		// ✅ Bettor currency → USD normalize
		const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
		const bettorRate = exchangeRates[bettorCurrency] || 1;
		const betInUSD = amount / bettorRate;

		// ✅ Referrer zinciri
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

		const combined = `${seedDatabase.seedServer}-${seedDatabase.nonce}-${seedDatabase.seedClient}`;
		let deck = towersShuffleDeck(towersGenerateDeck(data.risk), combined);

		// ✅ USD bazlı XP hesaplama
		const xpToAdd =
			freshUser.limits.blockSponsor !== true
				? parseFloat(
						(
							betInUSD * settingsDoc.general.reward.multiplier
						).toFixed(2)
				  )
				: 0;

		const promises = [
			User.findByIdAndUpdate(
				user._id,
				{
					$inc: {
						[walletPath]: -amount,
						xp: xpToAdd,
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
				.select(
					"wallets xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean(),

			UserSeed.findByIdAndUpdate(seedDatabase._id, {
				$inc: { nonce: 1 },
			}),

			TowersGame.create({
				amount,
				risk: data.risk,
				deck,
				fair: {
					seed: seedDatabase._id,
					nonce: seedDatabase.nonce,
				},
				user: user._id,
				state: "created",
				fiatCurrency: freshUser.currency.fiatCurrency,
				coinType: freshUser.currency.coinType,
				chain: freshUser.currency.chain,
				walletType: freshUser.currency.type,
			}),
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
		dataDatabase[2] = dataDatabase[2].toObject();

		towersGames.push(dataDatabase[2]);
		callback({
			success: true,
			user: dataDatabase[0],
			game: towersSanitizeGame(dataDatabase[2]),
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

const towersSendRevealSocket = async (io, socket, user, data, callback) => {
	try {
		towersCheckSendRevealData(data);
		let towersGame = towersGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		towersCheckSendRevealGame(towersGame);

		const tile =
			towersGame.risk === "medium" && Math.floor(data.tile) === 2
				? 1
				: Math.floor(data.tile);
		towersGame.revealed.push({
			tile: tile,
			row: towersGame.deck[towersGame.revealed.length],
		});

		const isGameOver =
			towersGame.revealed[towersGame.revealed.length - 1].row[tile] ===
				"lose" || towersGame.revealed.length >= 8;

		if (isGameOver) {
			const amountPayout =
				towersGame.revealed[towersGame.revealed.length - 1].row[
					tile
				] !== "lose"
					? towersGetGamePayout(towersGame)
					: 0;
			const multiplier = parseFloat(
				((amountPayout / towersGame.amount) * 100).toFixed(2)
			);

			const amountLimits =
				amountPayout === 0 || multiplier >= 125
					? towersGame.amount
					: amountPayout;

			const freshUser = await User.findById(user._id).lean();
			const walletIndex = getActiveWalletIndex(freshUser);
			if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");
			const walletPath = `wallets.${walletIndex}.balance`;

			const amountBetRain =
				freshUser.limits.blockSponsor !== true ? towersGame.amount : 0;

			const promises = [
				User.findByIdAndUpdate(
					user._id,
					{
						$inc: {
							[walletPath]: amountPayout,
							"stats.won": amountPayout,
							"limits.betToWithdraw": Math.min(
								-amountLimits,
								-freshUser.limits.betToWithdraw
							),
							"limits.betToRain": Math.min(
								-amountLimits,
								-freshUser.limits.betToRain
							),
						},
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"wallets xp stats rakeback mute ban verifiedAt updatedAt"
					)
					.lean(),

				TowersGame.findByIdAndUpdate(
					towersGame._id,
					{
						payout: amountPayout,
						multiplier,
						revealed: towersGame.revealed,
						state: "completed",
						updatedAt: new Date().getTime(),
					},
					{ new: true }
				)
					.select(
						"amount payout multiplier risk deck revealed user state updatedAt"
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
						{
							$inc: { amount: Math.floor(amountBetRain * 0.001) },
						},
						{ new: true }
					)
						.select("amount participants type state updatedAt")
						.lean()
				);
			}

			const dataDatabase = await Promise.all(promises);

			towersGames.splice(
				towersGames.findIndex(
					(e) => e._id.toString() === dataDatabase[1]._id.toString()
				),
				1
			);

			// 🎯 Bilet çevrimi + Race puanı hook'u (towers turu sonlandı)
			onBetSettled({ userId: user._id, amount: amountLimits, category: "originals" });

			io.of("/general")
				.to(user._id.toString())
				.emit("user", { user: dataDatabase[0] });
			if (amountPayout > 0)
				io.of("/general").emit("rain", { rain: dataDatabase[2] });

			generalAddBetsList(io, {
				...dataDatabase[1],
				user: generalUserGetFormated(dataDatabase[0]),
				method: "towers",
			});

			towersGame = dataDatabase[1];
		} else {
			towersGame = await TowersGame.findByIdAndUpdate(
				towersGame._id,
				{
					revealed: towersGame.revealed,
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select("amount risk deck revealed user state")
				.lean();

			towersGames.splice(
				towersGames.findIndex(
					(element) =>
						element._id.toString() === towersGame._id.toString()
				),
				1,
				towersGame
			);
		}

		callback({ success: true, game: towersSanitizeGame(towersGame) });
		socketRemoveAntiSpam(user._id);
	} catch (err) {
		socketRemoveAntiSpam(socket.decoded._id);
		callback({
			success: false,
			error: { type: "error", message: err.message },
		});
	}
};

const towersSendCashoutSocket = async (io, socket, user, data, callback) => {
	try {
		let towersGame = towersGames.find(
			(element) => element.user._id.toString() === user._id.toString()
		);
		towersCheckSendCashoutGame(towersGame);

		const amountPayout = towersGetGamePayout(towersGame);
		const multiplier = Math.floor((amountPayout / towersGame.amount) * 100);
		const amountLimits =
			multiplier >= 125 ? towersGame.amount : amountPayout;

		const freshUser = await User.findById(user._id).lean();
		const walletIndex = getActiveWalletIndex(freshUser);
		if (walletIndex === -1) throw new Error("Aktif cüzdan bulunamadı");
		const walletPath = `wallets.${walletIndex}.balance`;

		const amountBetRain =
			freshUser.limits.blockSponsor !== true ? towersGame.amount : 0;

		const dataDatabase = await Promise.all([
			User.findByIdAndUpdate(
				user._id,
				{
					$inc: {
						[walletPath]: amountPayout,
						"stats.won": amountPayout,
						"limits.betToWithdraw": Math.min(
							-amountLimits,
							-freshUser.limits.betToWithdraw
						),
						"limits.betToRain": Math.min(
							-amountLimits,
							-freshUser.limits.betToRain
						),
					},
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"wallets xp stats rakeback mute ban verifiedAt updatedAt"
				)
				.lean(),

			TowersGame.findByIdAndUpdate(
				towersGame._id,
				{
					payout: amountPayout,
					multiplier,
					state: "completed",
					updatedAt: new Date().getTime(),
				},
				{ new: true }
			)
				.select(
					"amount payout multiplier risk deck revealed user state updatedAt"
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
				{
					$inc: { amount: Math.floor(amountBetRain * 0.001) },
				},
				{ new: true }
			)
				.select("amount participants type state updatedAt")
				.lean(),
		]);

		towersGames.splice(
			towersGames.findIndex(
				(e) => e._id.toString() === dataDatabase[1]._id.toString()
			),
			1
		);

		// 🎯 Bilet çevrimi + Race puanı hook'u (towers cashout)
		onBetSettled({ userId: user._id, amount: amountLimits, category: "originals" });

		io.of("/general").emit("rain", { rain: dataDatabase[2] });
		generalAddBetsList(io, {
			...dataDatabase[1],
			user: generalUserGetFormated(dataDatabase[0]),
			method: "towers",
		});

		callback({
			success: true,
			user: dataDatabase[0],
			game: towersSanitizeGame(dataDatabase[1]),
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

const towersInit = async (io) => {
	try {
		// Get towers games and add to towers game array
		towersGames = await TowersGame.find({ state: "created" })
			.select("amount risk deck revealed user state")
			.lean();
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	towersGetGame,
	towersSendBetSocket,
	towersSendRevealSocket,
	towersSendCashoutSocket,
	towersInit,
};
