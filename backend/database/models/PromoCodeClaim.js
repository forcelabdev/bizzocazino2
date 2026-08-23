const mongoose = require("mongoose");

const promoCodeClaimSchema = new mongoose.Schema({
	promoCode: { type: mongoose.Schema.ObjectId, ref: "PromoCode", required: true, index: true },
	user: { type: mongoose.Schema.ObjectId, ref: "User", required: true, index: true },
	code: { type: String, required: true },
	reward: { type: Number, required: true },
	affiliateCode: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
});

promoCodeClaimSchema.index({ promoCode: 1, user: 1, createdAt: -1 });

module.exports = mongoose.models.PromoCodeClaim || mongoose.model("PromoCodeClaim", promoCodeClaimSchema);
