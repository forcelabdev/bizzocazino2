const mongoose = require("mongoose");

const WingoBet = require("../database/models/WingoBet");
const RollBet = require("../database/models/RollBet");
const CrashBet = require("../database/models/CrashBet");
const BlackjackBet = require("../database/models/BlackjackBet");
const BattlesBet = require("../database/models/BattlesBet");
const DuelsBet = require("../database/models/DuelsBet");
const FuturesBet = require("../database/models/FuturesBet");
const SportsBet = require("../database/models/SportsBet");
const MinesGame = require("../database/models/MinesGame");
const UnboxGame = require("../database/models/UnboxGame");
const TowersGame = require("../database/models/TowersGame");
const UpgraderGame = require("../database/models/UpgraderGame");
const Transaction = require("../database/models/Transaction");

// İç oyunlar (Wingo, Roll, Crash, Blackjack, Battles, Duels, Futures,
// SportsBet, Mines, Unbox, Towers, Upgrader): hepsi `user` (ObjectId) +
// `amount` (Number) + `createdAt` alanlarını ortak kullanıyor.
const INTERNAL_BET_MODELS = [
	WingoBet,
	RollBet,
	CrashBet,
	BlackjackBet,
	BattlesBet,
	DuelsBet,
	FuturesBet,
	SportsBet,
	MinesGame,
	UnboxGame,
	TowersGame,
	UpgraderGame,
];

/**
 * Kullanıcının belirtilen tarihten (dahil) itibaren HERHANGİ bir oyunda /
 * bahiste en az 1 birim tutar oynayıp oynamadığını kontrol eder.
 * İç oyunlar (Wingo, Roll, Crash, Blackjack, Battles, Duels, Futures,
 * SportsBet, Mines, Unbox, Towers, Upgrader) VE dış sağlayıcı (slot vb.)
 * bahisleri (Transaction koleksiyonu, bet_money > 0) taranır.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Date} since
 * @returns {Promise<boolean>}
 */
const hasUserBetSince = async (userId, since) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) return false;

	const objectId = new mongoose.Types.ObjectId(userId);
	const createdAtFilter = since ? { $gte: since } : {};

	const internalChecks = INTERNAL_BET_MODELS.map((Model) =>
		Model.exists({
			user: objectId,
			amount: { $gt: 0 },
			...(since ? { createdAt: createdAtFilter } : {}),
		})
	);

	// Dış sağlayıcı (drakon/nexus/betcolabs/betinovi vb.) bahisleri tek bir
	// `Transaction` koleksiyonunda `user_code` (string) + `bet_money` ile
	// tutuluyor.
	const externalCheck = Transaction.exists({
		user_code: userId.toString(),
		bet_money: { $gt: 0 },
		...(since ? { created_at: createdAtFilter } : {}),
	});

	const results = await Promise.all([...internalChecks, externalCheck]);

	return results.some(Boolean);
};

module.exports = {
	hasUserBetSince,
	INTERNAL_BET_MODELS,
};
