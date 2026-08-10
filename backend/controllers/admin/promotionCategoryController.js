const PromotionCategory = require("../../database/models/PromotionCategory");

// Tüm kategorileri getir
exports.getAllCategories = async (req, res) => {
	try {
		const categories = await PromotionCategory.find().sort({ order: 1, createdAt: -1 });
		res.json({ success: true, data: categories });
	} catch (error) {
		console.error("PromotionCategory getAllCategories error:", error);
		res.status(500).json({ success: false, message: "Kategoriler alınamadı." });
	}
};

// Yeni kategori oluştur
exports.createCategory = async (req, res) => {
	try {
		const { slug, label, icon, order, active } = req.body;

		if (!slug || !label) {
			return res.status(400).json({ success: false, message: "Slug ve label zorunludur." });
		}

		// Slug kontrolü
		const existing = await PromotionCategory.findOne({ slug: slug.toLowerCase().trim() });
		if (existing) {
			return res.status(400).json({ success: false, message: "Bu slug zaten mevcut." });
		}

		const category = await PromotionCategory.create({
			slug: slug.toLowerCase().trim(),
			label,
			icon: icon || "🎁",
			order: order || 0,
			active: active !== undefined ? active : true,
		});

		res.json({ success: true, data: category });
	} catch (error) {
		console.error("PromotionCategory createCategory error:", error);
		res.status(500).json({ success: false, message: "Kategori oluşturulamadı." });
	}
};

// Kategori güncelle
exports.updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const { slug, label, icon, order, active } = req.body;

		// Slug değişiyorsa çakışma kontrolü
		if (slug) {
			const existing = await PromotionCategory.findOne({
				slug: slug.toLowerCase().trim(),
				_id: { $ne: id },
			});
			if (existing) {
				return res.status(400).json({ success: false, message: "Bu slug zaten mevcut." });
			}
		}

		const updateData = {};
		if (slug !== undefined) updateData.slug = slug.toLowerCase().trim();
		if (label !== undefined) updateData.label = label;
		if (icon !== undefined) updateData.icon = icon;
		if (order !== undefined) updateData.order = order;
		if (active !== undefined) updateData.active = active;

		const category = await PromotionCategory.findByIdAndUpdate(id, updateData, { new: true });
		if (!category) {
			return res.status(404).json({ success: false, message: "Kategori bulunamadı." });
		}

		res.json({ success: true, data: category });
	} catch (error) {
		console.error("PromotionCategory updateCategory error:", error);
		res.status(500).json({ success: false, message: "Kategori güncellenemedi." });
	}
};

// Kategori sil
exports.deleteCategory = async (req, res) => {
	try {
		const { id } = req.params;

		const category = await PromotionCategory.findByIdAndDelete(id);
		if (!category) {
			return res.status(404).json({ success: false, message: "Kategori bulunamadı." });
		}

		res.json({ success: true, message: "Kategori silindi." });
	} catch (error) {
		console.error("PromotionCategory deleteCategory error:", error);
		res.status(500).json({ success: false, message: "Kategori silinemedi." });
	}
};
