const express = require("express");

const router = express.Router();
const mongoose = require("mongoose");
const Notice = require("../database/models/Notice");

/**
 * 📣 Dış Site İçi Mesaj (Notice) API — sitenin KENDİ frontend'i için değil,
 * dışarıdaki bahis sitesinin frontend'inin çekeceği herkese açık (fakat
 * API-key korumalı) mesaj endpoint'i. `raceApi.js` ile AYNI kimlik
 * doğrulama deseni: Bearer/x-api-key ile `NOTICE_API_KEY` env değişkenine
 * karşı doğrulanır (tanımlı değilse TOKEN_SECRET'a düşer).
 *
 * Bkz. doküman: docs/site-notice-api.md
 */
const requireApiToken = (req, res, next) => {
	const configuredToken = process.env.NOTICE_API_KEY || process.env.TOKEN_SECRET;
	if (!configuredToken) {
		return res.status(503).json({
			success: false,
			message: "Site İçi Mesaj API henüz yapılandırılmadı.",
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

/**
 * GET /api/notices?userId=<id>
 * Kullanıcıya görünen mesajları döndürür:
 * - recipientId === userId (tekil hedeflenmiş)
 * - recipients boş VE recipientId boş (herkese açık "all" mesajı)
 * - recipients dizisi userId'yi içeriyor (online/offline/segment hedeflemesi)
 * Yanıt her mesaj için `isRead` (bu kullanıcı için) alanını içerir.
 */
router.get("/", requireApiToken, async (req, res) => {
	try {
		const { userId } = req.query;
		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ success: false, message: "Geçerli bir userId parametresi zorunludur." });
		}

		const userObjectId = new mongoose.Types.ObjectId(userId);

		const notices = await Notice.find({
			$or: [
				{ recipientId: userObjectId },
				{ recipientId: { $exists: false }, recipients: { $size: 0 } },
				{ recipientId: null, recipients: { $size: 0 } },
				{ recipients: userObjectId },
			],
		})
			.sort({ createdAt: -1 })
			.lean();

		const data = notices.map((notice) => ({
			id: notice._id,
			title: notice.title,
			message: notice.message,
			image: notice.image || null,
			createdAt: notice.createdAt,
			isRead: Array.isArray(notice.readBy) && notice.readBy.some((r) => String(r.user) === String(userObjectId)),
		}));

		res.json({ success: true, data });
	} catch (error) {
		console.error("❌ Notice API listeleme hatası:", error.message);
		res.status(500).json({ success: false, message: "Mesajlar alınamadı." });
	}
});

/**
 * POST /api/notices/:id/read
 * Body: { userId }
 * Mesajı bu kullanıcı için "okundu" işaretler (idempotent — tekrar
 * çağrılırsa yeni kayıt eklenmez).
 */
router.post("/:id/read", requireApiToken, async (req, res) => {
	try {
		const { id } = req.params;
		const { userId } = req.body;

		if (!mongoose.Types.ObjectId.isValid(id) || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ success: false, message: "Geçerli bir mesaj id ve userId zorunludur." });
		}

		const notice = await Notice.findById(id);
		if (!notice) {
			return res.status(404).json({ success: false, message: "Mesaj bulunamadı." });
		}

		const alreadyRead = notice.readBy.some((r) => String(r.user) === String(userId));
		if (!alreadyRead) {
			notice.readBy.push({ user: userId, readAt: new Date() });
			await notice.save();
		}

		res.json({ success: true, message: "Mesaj okundu olarak işaretlendi." });
	} catch (error) {
		console.error("❌ Notice API okundu işaretleme hatası:", error.message);
		res.status(500).json({ success: false, message: "Mesaj okundu olarak işaretlenemedi." });
	}
});

module.exports = router;
