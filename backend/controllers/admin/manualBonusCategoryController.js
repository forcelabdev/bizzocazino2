const ManualBonusCategory = require("../../database/models/ManualBonusCategory");
const AdminManualAdjustment = require("../../database/models/AdminManualAdjustment");

// Koleksiyon boşsa, eskiden kod içinde sabit duran bonus adlarıyla
// bir kereliğine ilk verileri oluşturur (mevcut veriyi kaybetmemek için).
const DEFAULT_MANUAL_BONUS_CATEGORIES = [
	"CALL DAVET",
	"İLK 3 YATIRIMA SİGORTA",
	"İLK ÇEKİM ÖDÜLÜ",
	"5X KAZANC BONUSU",
	"YATIR 2X BAŞLA",
	"%20 DİSCOUNT",
	"%25 KRİPTO YATIRIM BONUSU",
	"1000X PRAGMATİC",
	"100X EGT",
	"KUMBARA BONUSU",
	"JEST",
	"%5 RELOAD",
];

let seedPromise = null;

const ensureSeeded = async () => {
	if (seedPromise) return seedPromise;

	seedPromise = (async () => {
		const count = await ManualBonusCategory.estimatedDocumentCount();
		if (count > 0) return;

		await ManualBonusCategory.insertMany(
			DEFAULT_MANUAL_BONUS_CATEGORIES.map((name, index) => ({
				name,
				order: index,
				active: true,
			})),
			{ ordered: false },
		).catch(() => {});
	})();

	return seedPromise;
};

/**
 * @desc    Kullanıcı düzenleme diyaloğundaki "Bonus Adı" seçim listesi için
 *          sadece aktif bonus adlarını döner.
 * @route   GET /admin/manual-bonus-categories
 */
exports.getActiveCategoryNames = async (req, res) => {
	try {
		await ensureSeeded();

		const categories = await ManualBonusCategory.find({ active: true })
			.sort({ order: 1, createdAt: 1 })
			.select("name")
			.lean();

		res.status(200).json({
			success: true,
			data: categories.map((category) => category.name),
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Promosyonlar > Bonus Adları yönetim sayfası için tüm kayıtları
 *          (aktif + pasif) döner.
 * @route   GET /admin/manual-bonus-categories/manage
 */
exports.getAllCategories = async (req, res) => {
	try {
		await ensureSeeded();

		const categories = await ManualBonusCategory.find()
			.sort({ order: 1, createdAt: 1 })
			.lean();

		res.status(200).json({ success: true, data: categories });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Yeni bonus adı ekle
 * @route   POST /admin/manual-bonus-categories
 */
exports.createCategory = async (req, res) => {
	try {
		const { name, order, active } = req.body;
		const trimmedName = String(name || "").trim();

		if (!trimmedName) {
			return res
				.status(400)
				.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		const existing = await ManualBonusCategory.findOne({ name: trimmedName });
		if (existing) {
			return res
				.status(400)
				.json({ success: false, message: "CATEGORY_NAME_EXISTS" });
		}

		const category = await ManualBonusCategory.create({
			name: trimmedName,
			order: order || 0,
			active: active !== undefined ? active : true,
		});

		res.status(201).json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Bonus adını güncelle
 * @route   PUT /admin/manual-bonus-categories/:id
 */
exports.updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, order, active } = req.body;

		const category = await ManualBonusCategory.findById(id);
		if (!category) {
			return res
				.status(404)
				.json({ success: false, message: "CATEGORY_NOT_FOUND" });
		}

		if (name !== undefined) {
			const trimmedName = String(name).trim();
			const duplicate = await ManualBonusCategory.findOne({
				name: trimmedName,
				_id: { $ne: id },
			});
			if (duplicate) {
				return res
					.status(400)
					.json({ success: false, message: "CATEGORY_NAME_EXISTS" });
			}
			category.name = trimmedName;
		}
		if (order !== undefined) category.order = order;
		if (active !== undefined) category.active = active;

		await category.save();

		res.status(200).json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Bonus adını sil
 * @route   DELETE /admin/manual-bonus-categories/:id
 */
exports.deleteCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const category = await ManualBonusCategory.findByIdAndDelete(id);
		if (!category) {
			return res
				.status(404)
				.json({ success: false, message: "CATEGORY_NOT_FOUND" });
		}
		res.status(200).json({ success: true, message: "CATEGORY_DELETED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * Manual adjustment oluştururken kategori doğrulaması için kullanılır.
 */
exports.isValidCategoryName = async (name) => {
	await ensureSeeded();
	const category = await ManualBonusCategory.findOne({
		name: String(name || "").trim(),
		active: true,
	}).lean();

	return !!category;
};

exports.getActiveCategoryNamesRaw = async () => {
	await ensureSeeded();
	const categories = await ManualBonusCategory.find({ active: true })
		.select("name")
		.lean();

	return categories.map((category) => category.name);
};

/**
 * @desc    Bir bonus adına (kategoriye) ait tüm manuel bonus eklemelerini
 *          (kullanıcı, tutar, tarih, işlemi yapan) listeler. "Bonus Adları"
 *          sayfasındaki "Raporla" ikonu ve toplu bonus sonuç ekranındaki
 *          "Bu toplu işlemi Excel'e aktar" butonu tarafından kullanılır.
 * @route   GET /admin/manual-bonus-categories/:name/report
 * @query   batchId, dateFrom, dateTo
 */
exports.getCategoryReport = async (req, res) => {
	try {
		const categoryName = String(req.params.name || "").trim();
		if (!categoryName) {
			return res.status(400).json({ success: false, message: "MISSING_CATEGORY_NAME" });
		}

		const { batchId, dateFrom, dateTo } = req.query;
		const match = {
			kind: "bonus",
			direction: "credit",
			category: categoryName,
		};

		if (batchId) {
			match["metadata.batchId"] = batchId;
		}

		const createdAtFilter = {};
		if (dateFrom) createdAtFilter.$gte = new Date(dateFrom);
		if (dateTo) createdAtFilter.$lte = new Date(dateTo);
		if (Object.keys(createdAtFilter).length) match.createdAt = createdAtFilter;

		const adjustments = await AdminManualAdjustment.find(match)
			.sort({ createdAt: -1 })
			.select("targetUser targetSnapshot actorSnapshot appliedAmount requestedAmount note metadata createdAt")
			.lean();

		const totalAmount = adjustments.reduce((sum, row) => sum + Number(row.appliedAmount || 0), 0);

		res.status(200).json({
			success: true,
			data: {
				category: categoryName,
				count: adjustments.length,
				totalAmount,
				rows: adjustments.map((row) => ({
					_id: row._id,
					username: row.targetSnapshot?.username || "",
					name: row.targetSnapshot?.name || "",
					amount: row.appliedAmount,
					note: row.note || "",
					actorUsername: row.actorSnapshot?.username || "Sistem",
					batchId: row.metadata?.batchId || null,
					createdAt: row.createdAt,
				})),
			},
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};
