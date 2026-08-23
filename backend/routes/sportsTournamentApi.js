const express = require("express");

const router = express.Router();
const SportsTournament = require("../database/models/SportsTournament");
const sportsTournamentService = require("../services/sportsTournamentService");

/**
 * ⚽ Dış Spor Turnuvası API — sitenin KENDİ frontend'i için değil, dışarıdaki
 * bahis sitesinin frontend'inin çekeceği herkese açık (fakat API-key
 * korumalı) turnuva/sıralama endpoint'i. `raceApi.js` / `noticeApi.js` ile
 * AYNI kimlik doğrulama deseni: Bearer/x-api-key ile `SPORTS_TOURNAMENT_API_KEY`
 * env değişkenine karşı doğrulanır (tanımlı değilse TOKEN_SECRET'a düşer).
 *
 * Bkz. doküman: SPORTS_TOURNAMENT_API.md
 */
const requireApiToken = (req, res, next) => {
	const configuredToken = process.env.SPORTS_TOURNAMENT_API_KEY || process.env.TOKEN_SECRET;
	if (!configuredToken) {
		return res.status(503).json({
			success: false,
			message: "Spor Turnuvası API henüz yapılandırılmadı.",
		});
	}

	const header = req.headers.authorization || "";
	const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
	const apiKeyHeader = req.headers["x-api-key"];
	const providedToken = bearerToken || apiKeyHeader || req.query.token;

	if (!providedToken || providedToken !== configuredToken) {
		return res.status(401).json({ success: false, message: "Geçersiz veya eksik API anahtarı." });
	}

	next();
};

// Kullanıcı adını dış sitede kısmen maskeler (gizlilik): "ahmet123" -> "ahm***23"
const maskUsername = (username) => {
	const value = String(username || "").trim();
	if (value.length <= 4) return `${value.slice(0, 1)}***`;
	return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

const serializeTournament = (tournament) => ({
	id: tournament._id,
	name: tournament.name,
	description: tournament.description || "",
	state: tournament.state,
	startsAt: tournament.startsAt,
	endsAt: tournament.endsAt,
	minOdds: tournament.minOdds,
	minBetAmount: tournament.minBetAmount,
	prizes: tournament.prizes || [],
	prizePoolDescription: tournament.prizePoolDescription || "",
});

/**
 * GET /api/sports-tournaments
 * Aktif (isActive) turnuvaların listesini döndürür.
 */
router.get("/", requireApiToken, async (req, res) => {
	try {
		const tournaments = await SportsTournament.find({ isActive: true }).sort({ createdAt: -1 }).lean();
		res.json({ success: true, data: tournaments.map(serializeTournament) });
	} catch (error) {
		console.error("❌ Spor Turnuvası API listeleme hatası:", error.message);
		res.status(500).json({ success: false, message: "Turnuvalar alınamadı." });
	}
});

/**
 * GET /api/sports-tournaments/:id
 * Tekil turnuva detayı.
 */
router.get("/:id", requireApiToken, async (req, res) => {
	try {
		const tournament = await SportsTournament.findById(req.params.id).lean();
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });
		res.json({ success: true, data: serializeTournament(tournament) });
	} catch (error) {
		console.error("❌ Spor Turnuvası API detay hatası:", error.message);
		res.status(500).json({ success: false, message: "Turnuva alınamadı." });
	}
});

/**
 * GET /api/sports-tournaments/:id/leaderboard
 * Dönen response şekli sabittir ve dış sitenin entegrasyonu buna göre yapılır:
 * { success, tournament: {...}, leaderboard: [{ rank, displayName, totalStake, betCount, prizeAmount, prizeAwarded }] }
 */
router.get("/:id/leaderboard", requireApiToken, async (req, res) => {
	try {
		const { id } = req.params;
		const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));

		const tournament = await SportsTournament.findById(id).lean();
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });

		const entries = await sportsTournamentService.getLeaderboard(id, limit);

		const leaderboard = entries.map((entry) => ({
			rank: entry.rank,
			displayName: entry.user?.username ? maskUsername(entry.user.username) : "—",
			totalStake: Math.floor(entry.totalStake || 0),
			betCount: entry.betCount || 0,
			prizeAmount: entry.prizeAmount || 0,
			prizeAwarded: Boolean(entry.prizeAwarded),
		}));

		res.json({ success: true, tournament: serializeTournament(tournament), leaderboard });
	} catch (error) {
		console.error("❌ Spor Turnuvası API leaderboard hatası:", error.message);
		res.status(500).json({ success: false, message: "Sıralama alınamadı." });
	}
});

module.exports = router;
