const mongoose = require("mongoose");

const promotionCategorySchema = new mongoose.Schema({
	// Benzersiz slug (örn: "hosgeldin", "freespin", "kayip")
	slug: { type: String, required: true, unique: true, lowercase: true, trim: true },

	// Görünen isim (örn: "Hoşgeldin Bonusu")
	label: { type: String, required: true, trim: true },

	// Emoji veya ikon (örn: "🎁", "🎰")
	icon: { type: String, default: "🎁" },

	// Sıralama (küçük sayı önce)
	order: { type: Number, default: 0 },

	// Aktif mi?
	active: { type: Boolean, default: true },

	createdAt: { type: Date, default: Date.now },
});

promotionCategorySchema.index({ active: 1, order: 1 });
promotionCategorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("PromotionCategory", promotionCategorySchema);
