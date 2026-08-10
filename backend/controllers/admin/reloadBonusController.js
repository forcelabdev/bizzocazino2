const mongoose = require("mongoose");

const reloadBonusService = require("../../services/reloadBonusService");

const ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	RELOAD_BONUS_DISABLED: "Reload Bonusu şu anda aktif değil.",
	USER_HAS_ACTIVE_RELOAD: "Kullanıcının zaten aktif bir Reload Bonusu var.",
	INVALID_REFERENCE_LOSS: "Geçersiz referans kayıp tutarı.",
	INVALID_PERCENTAGE: "Oran 0-100 arasında olmalı.",
	TOTAL_AMOUNT_BELOW_MINIMUM: "Hesaplanan toplam tutar minimumun altında.",
	TOTAL_AMOUNT_ABOVE_MAXIMUM: "Hesaplanan toplam tutar maksimumun üzerinde.",
	ASSIGNMENT_NOT_FOUND: "Reload ataması bulunamadı.",
	ASSIGNMENT_NOT_ACTIVE: "Bu Reload ataması artık aktif değil.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Reload bonus error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Reload Bonusu genel ayarlarını getirir
 * @route   GET /admin/reload-bonus/settings
 */
exports.getSettings = async (req, res) => {
	try {
		const settings = await reloadBonusService.getSettings();
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Reload Bonusu genel ayarlarını günceller
 * @route   PUT /admin/reload-bonus/settings
 */
exports.updateSettings = async (req, res) => {
	try {
		const settings = await reloadBonusService.updateSettings(
			req.body || {},
			req.adminUser,
		);
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir tutar/oran/aralık kombinasyonu için canlı önizleme hesaplar.
 *          Veritabanına hiçbir kayıt yapmaz.
 * @route   POST /admin/reload-bonus/preview
 */
exports.preview = async (req, res) => {
	try {
		const preview = reloadBonusService.computeAssignmentPreview(req.body || {});
		res.status(200).json({ success: true, data: preview });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Tüm Reload atamalarını listeler (filtre: userId, status)
 * @route   GET /admin/reload-bonus/assignments
 */
exports.listAssignments = async (req, res) => {
	try {
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const limit = Math.max(
			parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
			1,
		);
		const { status, userId } = req.query;

		const result = await reloadBonusService.listAssignments({
			userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
			status: ["active", "completed", "expired", "cancelled"].includes(status)
				? status
				: undefined,
			page,
			limit,
		});

		res.status(200).json({
			success: true,
			data: result.items,
			total: result.total,
			page: result.page,
			totalPages: Math.ceil(result.total / result.limit),
		});
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir kullanıcıya manuel Reload Bonusu ataması oluşturur
 * @route   POST /admin/users/:id/reload-bonus
 */
exports.createAssignment = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		const {
			referenceLossAmount,
			percentage,
			intervalType,
			intervalMinutes,
			totalPeriods,
			wageringMultiplier,
			note,
		} = req.body || {};

		const assignment = await reloadBonusService.createAssignment({
			userId: id,
			actorUser: req.adminUser,
			referenceLossAmount,
			percentage,
			intervalType,
			intervalMinutes,
			totalPeriods,
			wageringMultiplier,
			note,
		});

		res.status(201).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir kullanıcının Reload Bonusu özetini (aktif atama + son
 *          atamalar + referans kayıp önizlemesi) döner. Kullanıcı profili
 *          "Bonuslar" sekmesinde kullanılır.
 * @route   GET /admin/users/:id/reload-bonus
 */
exports.getUserSummary = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		const [status, assignments, referenceLoss] = await Promise.all([
			reloadBonusService.getStatus(id),
			reloadBonusService.listAssignments({ userId: id, limit: 10 }),
			reloadBonusService.getReferenceLossPreview(id).catch(() => null),
		]);

		res.status(200).json({
			success: true,
			data: {
				status,
				assignments: assignments.items,
				referenceLoss,
			},
		});
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Aktif bir Reload atamasını iptal eder
 * @route   POST /admin/reload-bonus/assignments/:id/cancel
 */
exports.cancelAssignment = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const assignment = await reloadBonusService.cancelAssignment(
			id,
			req.adminUser,
			reason,
		);
		res.status(200).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};
