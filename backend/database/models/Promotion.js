const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
	// Promosyon başlığı
	title: { type: String, required: true, trim: true },

	// Kısa açıklama (kart altında gösterilir)
	subtitle: { type: String, default: "", trim: true },

	// Banner görseli (dosya yolu veya URL)
	banner: { type: String, required: true },

	// Kategori (slug)
	category: { type: String, default: null },

	// Modal içinde gösterilecek HTML içerik
	content: { type: String, default: "" },

	// Sıralama (küçük sayı önce)
	order: { type: Number, default: 0 },

	// Aktif mi?
	active: { type: Boolean, default: true },

	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

promotionSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	next();
});

promotionSchema.index({ active: 1, order: 1, createdAt: -1 });
promotionSchema.index({ category: 1, active: 1 });

module.exports = mongoose.model("Promotion", promotionSchema);
