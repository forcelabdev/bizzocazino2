const BET_ACCESS_BLOCKED_CODE = "BET_ACCESS_BLOCKED";
const BET_ACCESS_BLOCKED_MESSAGE =
	"Şu anda oyunlara erişiminiz kapalı, lütfen destek ekibimizle iletişime geçin.";

const isUserBetAccessBlocked = (user) =>
	user?.betAccess?.blocked === true;

const getProviderVisibleBalance = (user, balance) =>
	isUserBetAccessBlocked(user) ? 0 : Number(balance) || 0;

// 🎯 Bet Limitleme: kategori bazlı tam blokaj + maksimum bahis tutarı kontrolü.
// "slots" ve "originals" ortak "casino" limitine tabidir; "liveCasino" ve
// "sportsBook" kendi ayrı limitlerine sahiptir.
const CATEGORY_BET_LIMIT_BLOCKED_CODE = "CATEGORY_BLOCKED";
const CATEGORY_BET_LIMIT_EXCEEDED_CODE = "CATEGORY_LIMIT_EXCEEDED";

const BET_CATEGORY_LIMIT_MAP = {
	slots: "casino",
	originals: "casino",
	liveCasino: "liveCasino",
	sportsBook: "sportsBook",
};

/**
 * @param {Object} user - Mongoose User dökümanı veya lean object.
 * @param {"slots"|"liveCasino"|"sportsBook"|"originals"} rawCategory - Bahsin ait olduğu granüler kategori (tam blokaj anahtarı).
 * @param {number} amount - Bahis (çevrim) tutarı.
 * @returns {{ allowed: boolean, reason?: string, max?: number }}
 */
const evaluateCategoryBetLimit = (user, rawCategory, amount) => {
	if (!rawCategory) return { allowed: true };

	// Tam blokaj — categoryRestrictions granüler anahtara (slots/liveCasino/sportsBook/originals) bakar.
	if (user?.controls?.categoryRestrictions?.[rawCategory]) {
		return { allowed: false, reason: CATEGORY_BET_LIMIT_BLOCKED_CODE };
	}

	// Maksimum tutar — categoryBetLimits birleşik gruba (casino/liveCasino/sportsBook) bakar.
	const limitKey = BET_CATEGORY_LIMIT_MAP[rawCategory] || "casino";
	const max = Number(user?.controls?.categoryBetLimits?.[limitKey] || 0);
	if (max > 0 && Number(amount) > max) {
		return { allowed: false, reason: CATEGORY_BET_LIMIT_EXCEEDED_CODE, max };
	}

	return { allowed: true };
};

module.exports = {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	CATEGORY_BET_LIMIT_BLOCKED_CODE,
	CATEGORY_BET_LIMIT_EXCEEDED_CODE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
	evaluateCategoryBetLimit,
};
