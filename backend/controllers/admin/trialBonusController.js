const mongoose = require("mongoose");

const TrialBonusClaim = require("../../database/models/TrialBonusClaim");
const trialBonusService = require("../../services/trialBonusService");

const ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	TRIAL_BONUS_DISABLED: "Deneme bonusu şu anda aktif değil.",
	OTHER_BONUS_BLOCKED:
		"Yakın zamanda alınan bir bonus nedeniyle şu anda başka bonus talep edilemez.",
	ALREADY_CLAIMED: "Deneme bonusu daha önce talep edilmiş.",
	TRIAL_BONUS_AMOUNT_INVALID: "Deneme bonusu tutarı geçersiz.",
	CLAIM_NOT_FOUND: "Talep bulunamadı.",
	CLAIM_NOT_PENDING: "Bu talep zaten işleme alınmış.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Trial bonus error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Deneme Bonusu ayarlarını getirir
 * @route   GET /admin/trial-bonus/settings
 */
exports.getSettings = async (req, res) => {
	try {
		const settings = await trialBonusService.getSettings();
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Deneme Bonusu ayarlarını günceller
 * @route   PUT /admin/trial-bonus/settings
 */
exports.updateSettings = async (req, res) => {
	try {
		const settings = await trialBonusService.updateSettings(
			req.body || {},
			req.adminUser,
		);
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Deneme Bonusu taleplerini listeler
 * @route   GET /admin/trial-bonus/claims
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
			TrialBonusClaim.find(query)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean(),
			TrialBonusClaim.countDocuments(query),
			TrialBonusClaim.countDocuments({ status: "pending" }),
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
 * @desc    Bir kullanıcının Deneme Bonusu özetini döner. Kullanıcı profili
 *          "Kontroller" sekmesinde kullanılır.
 * @route   GET /admin/users/:id/trial-bonus
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
			trialBonusService.getPotential(id),
			TrialBonusClaim.find({ user: id }).sort({ createdAt: -1 }).limit(10).lean(),
		]);

		res.status(200).json({ success: true, data: { potential, claims } });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bekleyen bir talebi onaylar ve bonus tutarını bakiyeye ekler
 * @route   POST /admin/trial-bonus/claims/:id/approve
 */
exports.approveClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await trialBonusService.approveClaim(id, req.adminUser);
		res.status(200).json({ success: true, data: result.claim });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bekleyen bir talebi reddeder
 * @route   POST /admin/trial-bonus/claims/:id/reject
 */
exports.rejectClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const claimDoc = await trialBonusService.rejectClaim(id, req.adminUser, reason);
		res.status(200).json({ success: true, data: claimDoc });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Verilen kullanıcı ID listesi (Betinovi userCode = Mongo User
 *          _id) için onaylanmış Deneme Bonusu bilgisini (tutar + tarih)
 *          döner. Call Management (control-game) ekranındaki rozet/filtre
 *          için kullanılır — RTP/oyun sonucu hesaplaması YAPMAZ.
 * @route   POST /admin/trial-bonus/lookup
 */
exports.lookup = async (req, res) => {
	try {
		const { userIds } = req.body || {};
		if (!Array.isArray(userIds) || !userIds.length) {
			return res.status(200).json({ success: true, data: {} });
		}
		const map = await trialBonusService.getApprovedClaimsMap(userIds);
		res.status(200).json({ success: true, data: map });
	} catch (err) {
		errorResponse(res, err);
	}
};
