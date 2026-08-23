const crmReportService = require("../../services/crmReportService");

const parseQuery = (req) => ({
	startDate: req.query.startDate,
	endDate: req.query.endDate,
	depositMin: req.query.depositMin,
	depositMax: req.query.depositMax,
	bucket: req.query.bucket,
	bonusOrigin: req.query.bonusOrigin,
	search: req.query.search,
	page: req.query.page,
	limit: req.query.limit,
});

/**
 * @desc    CRM raporu özet kartları (toplam üye, yatırım, bonus, bakiye)
 * @route   GET /admin/crm-report/summary
 */
exports.getSummary = async (req, res) => {
	try {
		const summary = await crmReportService.getSummary(parseQuery(req));
		return res.status(200).json({ success: true, data: summary });
	} catch (err) {
		console.error("[crmReport] getSummary error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Özet hesaplanamadı." });
	}
};

/**
 * @desc    Yatırım aralığı segmentlerine göre kırılım tablosu
 * @route   GET /admin/crm-report/buckets
 */
exports.getBuckets = async (req, res) => {
	try {
		const buckets = await crmReportService.getBuckets(parseQuery(req));
		return res.status(200).json({ success: true, data: buckets });
	} catch (err) {
		console.error("[crmReport] getBuckets error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Segment verileri hesaplanamadı." });
	}
};

/**
 * @desc    Aranabilir / sayfalanabilir üye listesi (limit=-1 tüm kayıtları
 *          döner, Excel dışa aktarımı için kullanılır)
 * @route   GET /admin/crm-report/members
 */
exports.getMembers = async (req, res) => {
	try {
		const result = await crmReportService.getMembers(parseQuery(req));
		return res.status(200).json({ success: true, ...result });
	} catch (err) {
		console.error("[crmReport] getMembers error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Üye listesi alınamadı." });
	}
};
