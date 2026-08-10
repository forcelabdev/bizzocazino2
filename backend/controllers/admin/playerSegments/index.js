const {
	getSegmentSummary,
	getSegmentUsers,
} = require("../../../services/playerSegmentsService");

/**
 * @desc    CRM > Oyuncu segmentleri özet kartları (14 segment, count + percent)
 * @route   GET /admin/player-segments/summary
 */
exports.getSummary = async (req, res) => {
	try {
		const segments = await getSegmentSummary();
		res.status(200).json({ success: true, data: segments });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Bir segmente ait kullanıcı listesi (arama + sayfalama)
 * @route   GET /admin/player-segments/:key/users
 */
exports.getUsers = async (req, res) => {
	try {
		const { key } = req.params;
		const { search = "", page = 1, limit = 20 } = req.query;

		const result = await getSegmentUsers(key, { search, page, limit });
		res.status(200).json({ success: true, data: result });
	} catch (err) {
		res
			.status(err.statusCode || 500)
			.json({ success: false, message: err.message });
	}
};
