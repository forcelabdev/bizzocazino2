const express = require("express");

const router = express.Router();
const RaceTournament = require("../database/models/RaceTournament");
const raceService = require("../services/raceService");

/**
 * 🏁 Dış Race API — sitenin KENDİ frontend'i için değil, dışarıdaki bahis
 * sitesinin frontend'inin çekeceği herkese açık (fakat API-key korumalı)
 * sıralama endpoint'i. Bearer/x-api-key ile `RACE_API_TOKEN` env değişkenine
 * karşı doğrulanır — betcolabs/betinovi/drakon entegrasyonlarındaki
 * `AGENT_TOKEN` pattern'i ile aynı yaklaşım.
 */
const requireApiToken = (req, res, next) => {
	// RACE_API_TOKEN tanımlı değilse TOKEN_SECRET'a düşer, böylece kullanıcı
	// ek bir env değişkeni eklemeden de bu endpoint korunmuş olarak çalışır.
	const configuredToken = process.env.RACE_API_TOKEN || process.env.TOKEN_SECRET;
	if (!configuredToken) {
		return res.status(503).json({
			success: false,
			message: "Race API henüz yapılandırılmadı.",
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

/**
 * GET /api/race/:tournamentId/leaderboard
 * Dönen response şekli sabittir ve dış sitenin entegrasyonu buna göre yapılır:
 * { success, tournament: { id, name, state, startsAt, endsAt, pointsPerWager },
 *   leaderboard: [{ rank, displayName, points, prizeAmount, prizeAwarded, isManual }] }
 */
router.get("/:tournamentId/leaderboard", requireApiToken, async (req, res) => {
	try {
		const { tournamentId } = req.params;
		const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));

		const tournament = await RaceTournament.findById(tournamentId).lean();
		if (!tournament) {
			return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });
		}

		const entries = await raceService.getLeaderboard(tournamentId, limit);

		const leaderboard = entries.map((entry, index) => ({
			rank: index + 1,
			displayName: entry.user?.username ? maskUsername(entry.user.username) : entry.displayName || "—",
			points: Math.floor(entry.points || 0),
			prizeAmount: entry.prizeAmount || 0,
			prizeAwarded: Boolean(entry.prizeAwarded),
			isManual: Boolean(entry.isManual),
		}));

		res.json({
			success: true,
			tournament: {
				id: tournament._id,
				name: tournament.name,
				state: tournament.state,
				startsAt: tournament.startsAt,
				endsAt: tournament.endsAt,
				pointsPerWager: tournament.pointsPerWager,
			},
			leaderboard,
		});
	} catch (error) {
		console.error("❌ Race API leaderboard hatası:", error.message);
		res.status(500).json({ success: false, message: "Sıralama alınamadı." });
	}
});

module.exports = router;
