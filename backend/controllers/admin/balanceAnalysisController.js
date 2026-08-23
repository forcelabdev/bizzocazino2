const balanceAnalysisService = require("../../services/balanceAnalysisService");

const ERROR_MESSAGES = {
	INVALID_USER_ID: "Geçersiz kullanıcı ID.",
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
};

const errorResponse = (res, err) => {
	const message = ERROR_MESSAGES[err.message] || err.message || "Sunucu hatası.";
	const status = ERROR_MESSAGES[err.message] ? 400 : 500;
	if (status === 500) console.error("Balance analysis error:", err);
	return res.status(status).json({ success: false, message });
};

/**
 * @desc    Bakiye Analizi özet kartlarını getirir
 * @route   GET /admin/balance-analysis/summary
 */
exports.getSummary = async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		const summary = await balanceAnalysisService.getSummary({
			startDate,
			endDate,
		});
		res.status(200).json({ success: true, data: summary });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Üye bazlı bakiye analizi listesini getirir
 * @route   GET /admin/balance-analysis/members
 */
exports.getMembers = async (req, res) => {
	try {
		const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
		const limit = Math.max(
			parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
			1,
		);
		const { search = "", startDate, endDate } = req.query;

		const result = await balanceAnalysisService.getMembers({
			search,
			page,
			limit,
			startDate,
			endDate,
		});

		res.status(200).json({ success: true, ...result });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Tek bir üyenin bakiye hareket detaylarını getirir
 * @route   GET /admin/balance-analysis/members/:id
 */
exports.getMemberDetail = async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		const detail = await balanceAnalysisService.getMemberDetail(
			req.params.id,
			{ startDate, endDate },
		);
		res.status(200).json({ success: true, data: detail });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Kalan Agent/Bonus Bakiyesi ayarlarını getirir
 * @route   GET /admin/balance-analysis/settings
 */
exports.getSettings = async (req, res) => {
	try {
		const settings = await balanceAnalysisService.getSettings();
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};

/**
 * @desc    Kalan Agent/Bonus Bakiyesi ayarlarını günceller
 * @route   PUT /admin/balance-analysis/settings
 */
exports.updateSettings = async (req, res) => {
	try {
		const settings = await balanceAnalysisService.updateSettings(
			req.body || {},
			req.adminUser,
		);
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		errorResponse(res, err);
	}
};
