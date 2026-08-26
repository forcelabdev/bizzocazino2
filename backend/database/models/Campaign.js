const mongoose = require("mongoose");

/**
 * Requirement schema for campaign eligibility
 * Example: { type: "reg_date", operator: ">=", value: "2025-11-01" }
 * Supported types: reg_date (user registration date)
 * Supported operators: >=, >, <=, <, ==
 */
const requirementSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			required: true,
			enum: ["reg_date"], // Gelecekte: deposit_count, wagered_amount, vb.
		},
		operator: {
			type: String,
			required: true,
			enum: [">=", ">", "<=", "<", "=="],
		},
		value: {
			type: mongoose.Schema.Types.Mixed, // String (tarih) veya Number
			required: true,
		},
	},
	{ _id: false }
);

const campaignSchema = new mongoose.Schema({
	title: { type: String, required: true },
	description: { type: String, required: true },
	banner: { type: String, required: true },

	// Kampanya kategorisi (slug referansı, CampaignCategory koleksiyonundan)
	category: {
		type: String,
		default: null,
	},

	// Kampanya modu: auto = kullanıcı kendi alabilir, manual = sadece admin atayabilir
	mode: {
		type: String,
		enum: ["auto", "manual"],
		default: "auto",
	},

	// Kullanıcıya verilecek bakiye
	rewardAmount: { type: Number, default: 0, min: 0 },

	// Maksimum kullanım limiti (0 = sınırsız)
	maxClaims: { type: Number, default: 0, min: 0 },

	// Kampanya geçerlilik tarihleri (opsiyonel)
	startDate: { type: Date, default: null },
	endDate: { type: Date, default: null },

	// Dinamik gereksinimler (sadece auto modda kullanılır)
	requirements: { type: [requirementSchema], default: [] },

	// Kullanıcının onaylaması gereken şartlar (HTML)
	terms: { type: String, default: null },

	// Kampanyayı alan kullanıcılar
	claimedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

	// Kampanya aktif mi?
	active: { type: Boolean, default: true, required: true },

	// Sıralama (küçük sayı önce görünür)
	order: { type: Number, default: 0 },

	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// updatedAt otomatik güncelleme
campaignSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	next();
});

requirementSchema.index({ type: 1 });

campaignSchema.index({ active: 1, order: 1, createdAt: -1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ type: 1 });
campaignSchema.index({ category: 1, active: 1 });

module.exports = mongoose.model("Campaign", campaignSchema);
