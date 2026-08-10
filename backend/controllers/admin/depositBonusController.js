const mongoose = require("mongoose");

const DepositBonusClaim = require("../../database/models/DepositBonusClaim");
const depositBonusService = require("../../services/depositBonusService");

const ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	DEPOSIT_BONUS_DISABLED: "Yatırım bonusu şu anda aktif değil.",
	OTHER_BONUS_BLOCKED:
		"Yakın zamanda alınan bir bonus nedeniyle şu anda başka bonus talep edilemez.",
	BET_PLACED_SINCE_DEPOSIT:
		"Yatırımdan sonra bir oyuna/bahse katıldığı için bu bonus talep edilemez.",
	NO_DEPOSIT_IN_PERIOD: "Bu dönemde talep edilebilecek bir yatırım yok.",
	DEPOSIT_BELOW_MINIMUM: "Yatırım tutarı minimumun altında.",
	DEPOSIT_ABOVE_MAXIMUM: "Yatırım tutarı maksimumun üzerinde.",
	CLAIM_IN_PROGRESS: "Talep işleniyor, lütfen tekrar deneyin.",
	CLAIM_NOT_FOUND: "Talep bulunamadı.",
	CLAIM_NOT_PENDING: "Bu talep zaten işleme alınmış.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Deposit bonus error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Yatırım Bonusu ayarlarını getirir
 * @route   GET /admin/deposit-bonus/settings
 */
exports.getSettings = async (req, res) => {
	try {
		const settings = await depositBonusService.getSettings();
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Yatırım Bonusu ayarlarını günceller
 * @route   PUT /admin/deposit-bonus/settings
 */
exports.updateSettings = async (req, res) => {
	try {
		const settings = await depositBonusService.updateSettings(
			req.body || {},
			req.adminUser,
		);
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Yatırım Bonusu taleplerini listeler
 * @route   GET /admin/deposit-bonus/claims
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
			DepositBonusClaim.find(query)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean(),
			DepositBonusClaim.countDocuments(query),
			DepositBonusClaim.countDocuments({ status: "pending" }),
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
 * @desc    Bir kullanıcının Yatırım Bonusu özetini (güncel potansiyel,
 *          geçmiş talepleri) döner. Kullanıcı profili "Kontroller"
 *          sekmesinde kullanılır.
 * @route   GET /admin/users/:id/deposit-bonus
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
			depositBonusService.getPotential(id),
			DepositBonusClaim.find({ user: id })
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
 * @route   POST /admin/deposit-bonus/claims/:id/approve
 */
exports.approveClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await depositBonusService.approveClaim(id, req.adminUser);
		res.status(200).json({ success: true, data: result.claim });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bekleyen bir talebi reddeder
 * @route   POST /admin/deposit-bonus/claims/:id/reject
 */
exports.rejectClaim = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const claimDoc = await depositBonusService.rejectClaim(
			id,
			req.adminUser,
			reason,
		);
		res.status(200).json({ success: true, data: claimDoc });
	} catch (err) {
		errorResponse(res, err);
	}
};
