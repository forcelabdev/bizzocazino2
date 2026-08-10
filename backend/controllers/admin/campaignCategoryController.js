const CampaignCategory = require("../../database/models/CampaignCategory");

/**
 * @desc    Get all campaign categories
 * @route   GET /admin/campaign-categories
 */
exports.getAllCategories = async (req, res) => {
	try {
		const categories = await CampaignCategory.find()
			.sort({ order: 1, createdAt: -1 })
			.lean();
		res.status(200).json({ success: true, data: categories });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Create a new campaign category
 * @route   POST /admin/campaign-categories
 */
exports.createCategory = async (req, res) => {
	try {
		const { slug, label, icon, order, active } = req.body;
		if (!slug || !label) {
			return res.status(400).json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		const existing = await CampaignCategory.findOne({ slug: slug.toLowerCase().trim() });
		if (existing) {
			return res.status(400).json({ success: false, message: "CATEGORY_SLUG_EXISTS" });
		}

		const category = await CampaignCategory.create({
			slug: slug.toLowerCase().trim(),
			label,
			icon: icon || "🎁",
			order: order || 0,
			active: active !== undefined ? active : true,
		});

		res.status(201).json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Update a campaign category
 * @route   PUT /admin/campaign-categories/:id
 */
exports.updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const { slug, label, icon, order, active } = req.body;

		const category = await CampaignCategory.findById(id);
		if (!category) {
			return res.status(404).json({ success: false, message: "CATEGORY_NOT_FOUND" });
		}

		if (slug !== undefined) {
			const normalizedSlug = slug.toLowerCase().trim();
			const duplicate = await CampaignCategory.findOne({ slug: normalizedSlug, _id: { $ne: id } });
			if (duplicate) {
				return res.status(400).json({ success: false, message: "CATEGORY_SLUG_EXISTS" });
			}
			category.slug = normalizedSlug;
		}
		if (label !== undefined) category.label = label;
		if (icon !== undefined) category.icon = icon;
		if (order !== undefined) category.order = order;
		if (active !== undefined) category.active = active;

		await category.save();

		res.status(200).json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Delete a campaign category
 * @route   DELETE /admin/campaign-categories/:id
 */
exports.deleteCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const category = await CampaignCategory.findByIdAndDelete(id);
		if (!category) {
			return res.status(404).json({ success: false, message: "CATEGORY_NOT_FOUND" });
		}
		res.status(200).json({ success: true, message: "CATEGORY_DELETED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};
