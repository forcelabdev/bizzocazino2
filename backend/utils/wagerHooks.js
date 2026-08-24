const ticketService = require("../services/ticketService");
const raceService = require("../services/raceService");
const trialBonusService = require("../services/trialBonusService");

/**
 * 🎯 Merkezi "bahis sonuçlandı" hook'u.
 *
 * Bir bahis kabul edilip kullanıcının bakiyesinden düşüldüğü HER noktadan
 * (iç oyun controller'ları: crash/mines/roll/towers/upgrader/unbox/battles/...
 * ve sağlayıcı callback route'ları: betinoviApi/betcolabsApi/goldApi/drakonApi)
 * çağrılır. Ana bahis akışını asla bloklamaması/başarısız etmemesi için
 * hatalar burada yutulup sadece loglanır — ticket/race güncellemesi
 * başarısız olsa da kullanıcının bahsi geçerliliğini korur.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount - Bahis (çevrim) tutarı, TL
 * @param {"slots"|"liveCasino"|"sportsBook"|"originals"} [params.category] - Race kapsam eşlemesi için
 * @param {string} [params.providerCode] - GameProvider.code (dış sağlayıcı bahisleri için)
 */
const onBetSettled = ({ userId, amount, category = "originals", providerCode = null }) => {
	const wagerAmount = Number(amount);
	if (!userId || !Number.isFinite(wagerAmount) || wagerAmount <= 0) return;

	// Fire-and-forget: bahis akışını asla bloklamaz veya başarısız kılmaz.
	ticketService.progressWageringForUser(userId, wagerAmount).catch((err) => {
		console.error("❌ onBetSettled → progressWageringForUser hatası:", err.message);
	});

	raceService
		.recordWagerForRaces({ userId, wagerAmount, providerCode, gameCategory: category })
		.catch((err) => {
			console.error("❌ onBetSettled → recordWagerForRaces hatası:", err.message);
		});

	trialBonusService
		.checkTrialBonusWageringCompletion(userId)
		.catch((err) => {
			console.error("❌ onBetSettled → trial bonus çevrim kontrolü hatası:", err.message);
		});
};

module.exports = { onBetSettled };
