const mongoose = require("mongoose");
const Tag = require("../../../database/models/Tag");
const User = require("../../../database/models/User");

const VALID_CATEGORIES = ["general", "risk", "bonus_abuse"];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * @desc    Tüm tag'leri kullanım sayısı ile birlikte döner (Tag Manager listesi)
 * @route   GET /admin/tags
 */
exports.listTags = async (req, res) => {
	try {
		const tags = await Tag.find({}).sort({ createdAt: -1 }).lean();

		const usageCounts = await User.aggregate([
			{ $match: { tags: { $exists: true, $ne: [] } } },
			{ $unwind: "$tags" },
			{ $group: { _id: "$tags", count: { $sum: 1 } } },
		]);
		const countByTagId = new Map(
			usageCounts.map((row) => [row._id.toString(), row.count]),
		);

		const data = tags.map((tag) => ({
			...tag,
			usageCount: countByTagId.get(tag._id.toString()) || 0,
		}));

		res.status(200).json({ success: true, data });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Yeni tag oluştur
 * @route   POST /admin/tags
 */
exports.createTag = async (req, res) => {
	try {
		const { name, color, category, description } = req.body;
		const trimmedName = String(name || "").trim();

		if (!trimmedName) {
			return res
				.status(400)
				.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		if (category && !VALID_CATEGORIES.includes(category)) {
			return res
				.status(400)
				.json({ success: false, message: "INVALID_CATEGORY" });
		}

		const existing = await Tag.findOne({ name: trimmedName });
		if (existing) {
			return res
				.status(400)
				.json({ success: false, message: "TAG_NAME_EXISTS" });
		}

		const tag = await Tag.create({
			name: trimmedName,
			color: color || undefined,
			category: category || "general",
			description: description || "",
			createdBy: req.adminUser?._id,
		});

		res.status(201).json({ success: true, data: { ...tag.toObject(), usageCount: 0 } });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Tag güncelle
 * @route   PUT /admin/tags/:id
 */
exports.updateTag = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, color, category, description } = req.body;

		const tag = await Tag.findById(id);
		if (!tag) {
			return res.status(404).json({ success: false, message: "TAG_NOT_FOUND" });
		}

		if (name !== undefined) {
			const trimmedName = String(name).trim();
			if (!trimmedName) {
				return res
					.status(400)
					.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
			}
			const duplicate = await Tag.findOne({ name: trimmedName, _id: { $ne: id } });
			if (duplicate) {
				return res
					.status(400)
					.json({ success: false, message: "TAG_NAME_EXISTS" });
			}
			tag.name = trimmedName;
		}

		if (category !== undefined) {
			if (!VALID_CATEGORIES.includes(category)) {
				return res
					.status(400)
					.json({ success: false, message: "INVALID_CATEGORY" });
			}
			tag.category = category;
		}

		if (color !== undefined) tag.color = color;
		if (description !== undefined) tag.description = description;

		await tag.save();

		res.status(200).json({ success: true, data: tag });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Tag sil (kullanıcılardan da kaldırılır)
 * @route   DELETE /admin/tags/:id
 */
exports.deleteTag = async (req, res) => {
	try {
		const { id } = req.params;
		const tag = await Tag.findByIdAndDelete(id);
		if (!tag) {
			return res.status(404).json({ success: false, message: "TAG_NOT_FOUND" });
		}

		await User.updateMany({ tags: id }, { $pull: { tags: id } });

		res.status(200).json({ success: true, message: "TAG_DELETED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Bir tag'e atanmış kullanıcıları döner (arama + sayfalama)
 * @route   GET /admin/tags/:id/users
 */
exports.getTagUsers = async (req, res) => {
	try {
		const { id } = req.params;
		const { search = "", page = 1, limit = 20 } = req.query;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "INVALID_TAG_ID" });
		}

		const query = { tags: id };
		const normalizedSearch = String(search || "").trim();
		if (normalizedSearch) {
			const regex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
			query.$or = [{ username: regex }, { "local.email": regex }];
		}

		const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
		const safePage = Math.max(Number(page) || 1, 1);

		const [users, total] = await Promise.all([
			User.find(query)
				.select("username name local.email avatar")
				.sort({ username: 1 })
				.skip((safePage - 1) * safeLimit)
				.limit(safeLimit)
				.lean(),
			User.countDocuments(query),
		]);

		res.status(200).json({
			success: true,
			data: {
				users: users.map((u) => ({
					_id: u._id,
					username: u.username || u.name || "—",
					email: u.local?.email || "",
					avatar: u.avatar || null,
				})),
				total,
				page: safePage,
				limit: safeLimit,
				totalPages: Math.max(1, Math.ceil(total / safeLimit)),
			},
		});
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Kullanıcılara tag ata
 * @route   POST /admin/tags/:id/assign
 * @body    { userIds: string[] }
 */
exports.assignUsers = async (req, res) => {
	try {
		const { id } = req.params;
		const { userIds } = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "INVALID_TAG_ID" });
		}

		const tag = await Tag.findById(id);
		if (!tag) {
			return res.status(404).json({ success: false, message: "TAG_NOT_FOUND" });
		}

		const validUserIds = (Array.isArray(userIds) ? userIds : []).filter(isValidObjectId);
		if (!validUserIds.length) {
			return res
				.status(400)
				.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		await User.updateMany(
			{ _id: { $in: validUserIds } },
			{ $addToSet: { tags: id } },
		);

		res.status(200).json({ success: true, message: "USERS_TAGGED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

/**
 * @desc    Kullanıcılardan tag kaldır
 * @route   POST /admin/tags/:id/unassign
 * @body    { userIds: string[] }
 */
exports.unassignUsers = async (req, res) => {
	try {
		const { id } = req.params;
		const { userIds } = req.body;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "INVALID_TAG_ID" });
		}

		const validUserIds = (Array.isArray(userIds) ? userIds : []).filter(isValidObjectId);
		if (!validUserIds.length) {
			return res
				.status(400)
				.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
		}

		await User.updateMany(
			{ _id: { $in: validUserIds } },
			{ $pull: { tags: id } },
		);

		res.status(200).json({ success: true, message: "USERS_UNTAGGED" });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};
