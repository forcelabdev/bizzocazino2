const express = require("express");
const { authorizeUser } = require("../middleware/auth");
const { claimPromoCode } = require("../services/promoCodeService");

const router = express.Router();

router.post("/claim", authorizeUser(), async (req, res) => {
	try {
		const data = await claimPromoCode({ code: req.body?.code, userId: req.user._id });
		res.status(200).json({ success: true, data });
	} catch (error) {
		res.status(error.status || 500).json({
			success: false,
			error: { code: error.code || "INTERNAL_ERROR", message: error.status ? error.message : "Sunucu hatası." },
		});
	}
});

module.exports = router;
