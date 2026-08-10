const Promotion = require("../../database/models/Promotion");
const mongoose = require("mongoose");

/**
 * @desc    Get all promotions (admin, with pagination)
 * @route   GET /admin/promotions
 */
exports.getAllPromotions = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 50;
		const skip = (page - 1) * limit;

		const [promotions, total] = await Promise.all([
			Promotion.find()
				.sort({ order: 1, createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Promotion.countDocuments(),
		]);

		res.status(200).json({
			success: true,
			data: promotions.map((p) => ({ ...p, id: p._id.toString() })),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Get single promotion by ID
 * @route   GET /admin/promotions/:id
 */
exports.getPromotionById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "INVALID_PROMOTION_ID" });
		}

		const promotion = await Promotion.findById(id).lean();
		if (!promotion) {
			return res.status(404).json({ success: false, message: "PROMOTION_NOT_FOUND" });
		}

		res.status(200).json({ success: true, data: promotion });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Create promotion
 * @route   POST /admin/promotions
 */
exports.createPromotion = async (req, res) => {
	try {
		const { title, subtitle, banner, category, content, order, active } = req.body;

		if (!title || !banner) {
			return res.status(400).json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		const promotion = new Promotion({
			title,
			subtitle: subtitle || "",
			banner,
			category: category || null,
			content: content || "",
			order: order || 0,
			active: active !== undefined ? (active === true || active === "true") : true,
		});

		await promotion.save();
		res.status(201).json({ success: true, data: promotion });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Update promotion
 * @route   PUT /admin/promotions/:id
 */
exports.updatePromotion = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "INVALID_PROMOTION_ID" });
		}

		const { title, subtitle, banner, category, content, order, active } = req.body;

		const promotion = await Promotion.findById(id);
		if (!promotion) {
			return res.status(404).json({ success: false, message: "PROMOTION_NOT_FOUND" });
		}

		if (title !== undefined) promotion.title = title;
		if (subtitle !== undefined) promotion.subtitle = subtitle;
		if (banner !== undefined) promotion.banner = banner;
		if (category !== undefined) promotion.category = category;
		if (content !== undefined) promotion.content = content;
		if (order !== undefined) promotion.order = order;
		if (active !== undefined) promotion.active = active === true || active === "true";

		await promotion.save();
		res.status(200).json({ success: true, data: promotion });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Delete promotion
 * @route   DELETE /admin/promotions/:id
 */
exports.deletePromotion = async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "INVALID_PROMOTION_ID" });
		}

		const promotion = await Promotion.findByIdAndDelete(id);
		if (!promotion) {
			return res.status(404).json({ success: false, message: "PROMOTION_NOT_FOUND" });
		}

		res.status(200).json({ success: true, message: "PROMOTION_DELETED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};
