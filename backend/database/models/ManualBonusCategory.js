const mongoose = require("mongoose");

const manualBonusCategorySchema = new mongoose.Schema({
	// Bonus adı (örn: "CALL DAVET", "%20 DİSCOUNT")
	name: { type: String, required: true, unique: true, trim: true },

	// Sıralama (küçük sayı önce)
	order: { type: Number, default: 0 },

	// Aktif mi? (pasif olanlar Bonus Adı listesinde görünmez)
	active: { type: Boolean, default: true },

	createdAt: { type: Date, default: Date.now },
});

manualBonusCategorySchema.index({ active: 1, order: 1 });
manualBonusCategorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model(
	"ManualBonusCategory",
	manualBonusCategorySchema,
);
