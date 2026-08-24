const express = require("express");

const router = express.Router();
const SportsTournament = require("../database/models/SportsTournament");
const sportsTournamentService = require("../services/sportsTournamentService");
const { authorizeUser } = require("../middleware/auth");

/**
 * ⚽ Spor Turnuvası — Kullanıcı (JWT) API. `sportsTournamentApi.js`'teki
 * API-key korumalı, kullanıcı adı MASKELENMİŞ dış-site endpoint'inden
 * FARKLI bir yüzeydir: bu endpoint'ler sitenin KENDİ giriş yapmış
 * kullanıcıları için — gerçek kullanıcı adlarını gösterir ve kullanıcının
 * kendi sırasını (`me`) döner.
 *
 * Bkz. doküman: BONUS_MERKEZI_API.md
 */

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
 * GET /api/user/sports-tournaments
 * Auth: Zorunlu (JWT)
 * Aktif (isActive) turnuvaların listesini döndürür.
 */
router.get("/", authorizeUser(true), async (req, res) => {
	try {
		const tournaments = await SportsTournament.find({ isActive: true }).sort({ createdAt: -1 }).lean();
		res.json({ success: true, data: tournaments.map(serializeTournament) });
	} catch (error) {
		console.error("❌ Spor Turnuvası kullanıcı API listeleme hatası:", error.message);
		res.status(500).json({ success: false, message: "Turnuvalar alınamadı." });
	}
});

/**
 * GET /api/user/sports-tournaments/:id
 * Auth: Zorunlu (JWT)
 * Tekil turnuva detayı.
 */
router.get("/:id", authorizeUser(true), async (req, res) => {
	try {
		const tournament = await SportsTournament.findById(req.params.id).lean();
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });
		res.json({ success: true, data: serializeTournament(tournament) });
	} catch (error) {
		console.error("❌ Spor Turnuvası kullanıcı API detay hatası:", error.message);
		res.status(500).json({ success: false, message: "Turnuva alınamadı." });
	}
});

/**
 * GET /api/user/sports-tournaments/:id/leaderboard
 * Auth: Zorunlu (JWT)
 * Gerçek kullanıcı adlarıyla sıralama + giriş yapan kullanıcının kendi
 * sırası (`me`, top N'e girmese de hesaplanır; hiç uygun bahsi yoksa null).
 */
router.get("/:id/leaderboard", authorizeUser(true), async (req, res) => {
	try {
		const { id } = req.params;
		const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));

		const tournament = await SportsTournament.findById(id).lean();
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });

		const [entries, me] = await Promise.all([
			sportsTournamentService.getLeaderboard(id, limit),
			sportsTournamentService.getUserRank(id, req.user._id),
		]);

		const leaderboard = entries.map((entry) => ({
			rank: entry.rank,
			userId: entry.user?._id || null,
			username: entry.user?.username || "—",
			totalStake: Math.floor(entry.totalStake || 0),
			betCount: entry.betCount || 0,
			prizeAmount: entry.prizeAmount || 0,
			prizeAwarded: Boolean(entry.prizeAwarded),
		}));

		res.json({
			success: true,
			tournament: serializeTournament(tournament),
			leaderboard,
			me,
		});
	} catch (error) {
		console.error("❌ Spor Turnuvası kullanıcı API leaderboard hatası:", error.message);
		res.status(500).json({ success: false, message: "Sıralama alınamadı." });
	}
});

module.exports = router;
