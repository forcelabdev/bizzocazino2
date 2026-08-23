const crmReportService = require("../../services/crmReportService");

// bonusCategory çoklu seçime izin verir. Express/qs tekrarlanan query key'lerini
// (bonusCategory=A&bonusCategory=B) zaten diziye çevirir; tekil değeri de
// diziye normalize ederiz ki servis katmanı her zaman aynı şekli görsün.
const toArray = (value) => {
	if (value === undefined || value === null || value === "") return undefined;
	const arr = Array.isArray(value) ? value : [value];
	const cleaned = arr.filter((v) => v !== undefined && v !== null && v !== "");
	return cleaned.length ? cleaned : undefined;
};

const parseQuery = (req) => ({
	startDate: req.query.startDate,
	endDate: req.query.endDate,
	depositMin: req.query.depositMin,
	depositMax: req.query.depositMax,
	bucket: req.query.bucket,
	bonusOrigin: req.query.bonusOrigin,
	bonusCategory: toArray(req.query.bonusCategory),
	search: req.query.search,
	page: req.query.page,
	limit: req.query.limit,
	gameType: req.query.gameType,
	providerCode: req.query.providerCode,
	gameCode: req.query.gameCode,
	vipLevel: req.query.vipLevel,
	country: req.query.country,
	activityStatus: req.query.activityStatus,
	tag: req.query.tag,
	partner: req.query.partner,
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
 * @desc    Oyun türüne (Slot / Canlı Casino / Spor Bahisi / Diğer) göre
 *          kırılım tablosu
 * @route   GET /admin/crm-report/game-buckets
 */
exports.getGameTypeBuckets = async (req, res) => {
	try {
		const buckets = await crmReportService.getGameTypeBuckets(parseQuery(req));
		return res.status(200).json({ success: true, data: buckets });
	} catch (err) {
		console.error("[crmReport] getGameTypeBuckets error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Oyun türü verileri hesaplanamadı." });
	}
};

/**
 * @desc    Filtre dropdown'ları için seçenek listeleri (ülke, VIP seviyesi,
 *          etiket, partner, oyun türü, aktivite durumu)
 * @route   GET /admin/crm-report/filter-options
 */
exports.getFilterOptions = async (req, res) => {
	try {
		const options = await crmReportService.getFilterOptions();
		return res.status(200).json({ success: true, data: options });
	} catch (err) {
		console.error("[crmReport] getFilterOptions error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Filtre seçenekleri alınamadı." });
	}
};

/**
 * @desc    Seçilen oyun türü/sağlayıcı için bağlı sağlayıcı ve oyun listesi
 * @route   GET /admin/crm-report/game-options
 */
exports.getGameOptions = async (req, res) => {
	try {
		const options = await crmReportService.getGameOptions(
			req.query.gameType,
			req.query.providerCode,
		);
		return res.status(200).json({ success: true, data: options });
	} catch (err) {
		console.error("[crmReport] getGameOptions error:", err);
		return res
			.status(500)
			.json({ success: false, message: "Oyun seçenekleri alınamadı." });
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
