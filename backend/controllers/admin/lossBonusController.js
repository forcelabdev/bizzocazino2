const mongoose = require("mongoose");

const LossBonusClaim = require("../../database/models/LossBonusClaim");
const lossBonusService = require("../../services/lossBonusService");

const ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	LOSS_BONUS_DISABLED: "Kayıp bonusu şu anda aktif değil.",
	NO_LOSS_IN_PERIOD: "Bu dönemde kaybınız olmadığı için bonus talep edemezsiniz.",
	LOSS_BELOW_MINIMUM: "Net kaybınız minimum tutarın altında.",
	CLAIM_IN_PROGRESS: "Talebiniz işleniyor, lütfen tekrar deneyin.",
	CLAIM_NOT_FOUND: "Talep bulunamadı.",
	CLAIM_NOT_PENDING: "Bu talep zaten işleme alınmış.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Loss bonus error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Kayıp Bonusu ayarlarını getirir
 * @route   GET /admin/loss-bonus/settings
 */
exports.getSettings = async (req, res) => {
	try {
		const settings = await lossBonusService.getSettings();
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Kayıp Bonusu ayarlarını günceller
 * @route   PUT /admin/loss-bonus/settings
 */
exports.updateSettings = async (req, res) => {
	try {
		const settings = await lossBonusService.updateSettings(
			req.body || {},
			req.adminUser,
		);
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Kayıp Bonusu taleplerini listeler
 * @route   GET /admin/loss-bonus/claims
 */
exports.listClaims = async (req, res) => {
	try {
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const limit = Math.max(
			parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
			1,
		);
		const { q = "", status, userId } = req.query;

		const query = {};
		if (["pending", "approved", "rejected"].includes(status)) {
			query.status = status;
		}
		if (userId && mongoose.Types.ObjectId.isValid(userId)) {
			query.user = userId;
		}

		const trimmedSearch = String(q || "").trim();
		if (trimmedSearch) {
			const regex = new RegExp(trimmedSearch, "i");
			query.$or = [
				{ "userSnapshot.username": regex },
				{ "userSnapshot.name": regex },
				{ "userSnapshot.email": regex },
			];
		}

		const [data, total, pendingCount] = await Promise.all([
			LossBonusClaim.find(query)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean(),
			LossBonusClaim.countDocuments(query),
			LossBonusClaim.countDocuments({ status: "pending" }),
		]);

		res.status(200).json({
			success: true,
			data,
			total,
			page,
			totalPages: Math.ceil(total / limit),
			pendingCount,
		});
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir kullanıcının Kayıp Bonusu özetini (son talep tarihi, güncel
 *          potansiyel, geçmiş talepleri) döner. Kullanıcı profili
 *          "Kontroller" sekmesinde kullanılır.
 * @route   GET /admin/users/:id/loss-bonus
 */
exports.getUserSummary = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		const [potential, claims] = await Promise.all([
			lossBonusService.getPotential(id),
			LossBonusClaim.find({ user: id })
				.sort({ createdAt: -1 })
				.limit(10)
				.lean(),
		]);

		res.status(200).json({ success: true, data: { potential, claims } });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bekleyen bir talebi onaylar ve bonus tutarını bakiyeye ekler
 * @route   POST /admin/loss-bonus/claims/:id/approve
 */
exports.approveClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await lossBonusService.approveClaim(id, req.adminUser);
		res.status(200).json({ success: true, data: result.claim });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bekleyen bir talebi reddeder
 * @route   POST /admin/loss-bonus/claims/:id/reject
 */
exports.rejectClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const claimDoc = await lossBonusService.rejectClaim(
			id,
			req.adminUser,
			reason,
		);
		res.status(200).json({ success: true, data: claimDoc });
	} catch (err) {
		errorResponse(res, err);
	}
};
