const mongoose = require("mongoose");

const campaignCategorySchema = new mongoose.Schema({
	// Benzersiz slug (örn: "casino", "spor", "yatirim")
	slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

	// Görünen isim (örn: "Casino Bonusları")
	label: { type: String, required: true, trim: true },

	// Emoji veya ikon (örn: "🎲", "⚽")
	icon: { type: String, default: "🎁" },

	// Sıralama (küçük sayı önce)
	order: { type: Number, default: 0 },

	// Aktif mi?
	active: { type: Boolean, default: true },

	createdAt: { type: Date, default: Date.now },
});

campaignCategorySchema.index({ active: 1, order: 1 });
campaignCategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("CampaignCategory", campaignCategorySchema);
