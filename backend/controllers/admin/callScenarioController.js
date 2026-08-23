const mongoose = require("mongoose");

const callScenarioService = require("../../services/callScenarioService");

const ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	TEMPLATE_NOT_FOUND: "Senaryo şablonu bulunamadı.",
	TEMPLATE_NOT_ACTIVE: "Bu senaryo şablonu şu anda aktif değil.",
	INVALID_TEMPLATE_NAME: "Senaryo adı gerekli.",
	TEMPLATE_NAME_ALREADY_EXISTS: "Bu isimde bir senaryo şablonu zaten var.",
	USER_ALREADY_HAS_SCENARIO:
		"Bu üyeye bu senaryo daha önce verilmiş. Aynı senaryo bir üyeye yalnızca bir kez atanabilir.",
	ASSIGNMENT_NOT_FOUND: "Senaryo ataması bulunamadı.",
	ASSIGNMENT_NOT_ACTIVE: "Bu senaryo ataması artık aktif değil.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Call scenario error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Tüm çağrı senaryosu şablonlarını listeler
 * @route   GET /admin/call-scenarios/templates
 */
exports.listTemplates = async (req, res) => {
	try {
		const activeOnly = String(req.query.activeOnly || "") === "true";
		const templates = await callScenarioService.listTemplates({ activeOnly });
		res.status(200).json({ success: true, data: templates });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Yeni bir çağrı senaryosu şablonu oluşturur
 * @route   POST /admin/call-scenarios/templates
 */
exports.createTemplate = async (req, res) => {
	try {
		const template = await callScenarioService.createTemplate(
			req.body || {},
			req.adminUser,
		);
		res.status(201).json({ success: true, data: template });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir çağrı senaryosu şablonunu günceller
 * @route   PUT /admin/call-scenarios/templates/:id
 */
exports.updateTemplate = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz şablon ID." });
		}

		const template = await callScenarioService.updateTemplate(id, req.body || {});
		res.status(200).json({ success: true, data: template });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir üye+şablon kombinasyonunun daha önce verilip verilmediğini
 *          kontrol eder (atama formunda canlı uyarı için kullanılır)
 * @route   GET /admin/call-scenarios/check-duplicate?userId=&templateId=
 */
exports.checkDuplicate = async (req, res) => {
	try {
		const { userId, templateId } = req.query;
		if (
			!mongoose.Types.ObjectId.isValid(userId) ||
			!mongoose.Types.ObjectId.isValid(templateId)
		) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı veya şablon ID." });
		}

		const result = await callScenarioService.checkDuplicate(userId, templateId);
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Tüm çağrı senaryosu atamalarını listeler (filtre: userId,
 *          templateId, status)
 * @route   GET /admin/call-scenarios/assignments
 */
exports.listAssignments = async (req, res) => {
	try {
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const limit = Math.max(
			parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
			1,
		);
		const { status, userId, templateId } = req.query;

		const result = await callScenarioService.listAssignments({
			userId: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
			templateId:
				templateId && mongoose.Types.ObjectId.isValid(templateId)
					? templateId
					: undefined,
			status: ["active", "completed", "cancelled", "violated"].includes(status)
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
 * @desc    Bir üyeye çağrı senaryosu ataması oluşturur (bonus kredisi dahil)
 * @route   POST /admin/users/:id/call-scenarios
 */
exports.createAssignment = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		const { templateId, note } = req.body || {};
		if (!mongoose.Types.ObjectId.isValid(templateId)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz şablon ID." });
		}

		const assignment = await callScenarioService.createAssignment({
			userId: id,
			templateId,
			actorUser: req.adminUser,
			note,
		});

		res.status(201).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir kullanıcıya daha önce verilmiş çağrı senaryolarının özetini
 *          döner (kullanıcı profili "Bonuslar" sekmesinde kullanılır)
 * @route   GET /admin/users/:id/call-scenarios
 */
exports.getUserSummary = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		const summary = await callScenarioService.getUserSummary(id);
		res.status(200).json({ success: true, data: summary });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Aktif bir çağrı senaryosu atamasını iptal eder
 * @route   POST /admin/call-scenarios/assignments/:id/cancel
 */
exports.cancelAssignment = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const assignment = await callScenarioService.cancelAssignment(
			id,
			req.adminUser,
			reason,
		);
		res.status(200).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir atamayı kural ihlali olarak işaretler (bakiye/kazanç iptali
 *          finans/temsilci tarafından manuel ayrıca yapılır)
 * @route   POST /admin/call-scenarios/assignments/:id/violate
 */
exports.markViolated = async (req, res) => {
	try {
		const { id } = req.params;
		const { reason } = req.body || {};
		const assignment = await callScenarioService.markViolated(
			id,
			req.adminUser,
			reason,
		);
		res.status(200).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Bir atamayı tamamlandı olarak işaretler
 * @route   POST /admin/call-scenarios/assignments/:id/complete
 */
exports.completeAssignment = async (req, res) => {
	try {
		const { id } = req.params;
		const assignment = await callScenarioService.completeAssignment(
			id,
			req.adminUser,
		);
		res.status(200).json({ success: true, data: assignment });
	} catch (err) {
		errorResponse(res, err);
	}
};
