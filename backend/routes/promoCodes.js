// routes/promoCodes.js
//
// Harici/dış frontend'lerin promosyon kodu talep edebilmesi için REST/HTTP
// endpoint'i. Bkz. PROMO_CODE_API.md.
//
// Not: Site içi (Socket.IO bağlı) frontend hâlâ `sockets/general/promo`
// (event: "sendPromoClaim") akışını kullanır — bu route onun yerine geçmez,
// sadece REST üzerinden entegre olması gereken harici istemciler için
// eklenmiştir. İş mantığının tamamı `services/promoCodeService.js`'de.
const express = require("express");
const router = express.Router();

const { authorizeUser } = require("../middleware/auth");
const { claimPromoCode } = require("../services/promoCodeService");

router.post("/claim", authorizeUser(true), async (req, res) => {
	try {
		const { code } = req.body || {};

		if (!code || typeof code !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "CODE_REQUIRED",
					message: "Promosyon kodu gerekli.",
				},
			});
		}

		const result = await claimPromoCode(req.user._id, code);

		if (!result.success) {
			return res.status(400).json({
				success: false,
				error: {
					code: result.errorCode,
					message: result.message,
				},
			});
		}

		return res.json({
			success: true,
			data: {
				code: result.code,
				reward: result.reward,
				balance: result.balance,
				claimedAt: result.claimedAt,
			},
		});
	} catch (err) {
		console.error("[promo-codes/claim] error:", err);
		return res.status(500).json({
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.",
			},
		});
	}
});

module.exports = router;
