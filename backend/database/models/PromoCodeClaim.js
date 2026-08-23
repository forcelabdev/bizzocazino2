const mongoose = require("mongoose");

const promoCodeClaimSchema = new mongoose.Schema({
	promoCode: { type: mongoose.Schema.ObjectId, ref: "PromoCode", required: true, index: true },
	user: { type: mongoose.Schema.ObjectId, ref: "User", required: true, index: true },
	code: { type: String, required: true },
	reward: { type: Number, required: true },
	affiliateCode: { type: String, default: "" },
	conditions: {
		levelMin: { type: Number, default: 0 },
		userLevel: { type: Number, default: 0 },
		minLastDeposit: { type: Number, default: 0 },
		lastDepositAmount: { type: Number, default: null },
		applyWageringLock: { type: Boolean, default: false },
		wageringMultiplier: { type: Number, default: 0 },
		minWithdraw: { type: Number, default: 0 },
	},
	// 🎯 Segment/koşul motoru (PromoCode.conditions) değerlendirme anlık görüntüsü.
	// Her koşulun karşılanıp karşılanmadığı ve o anki gözlemlenen değer saklanır.
	evaluatedConditions: {
		type: [{
			metric: { type: String },
			operator: { type: String },
			value: { type: Number },
			observedValue: { type: Number },
			passed: { type: Boolean },
		}],
		default: [],
	},
	createdAt: { type: Date, default: Date.now },
});

promoCodeClaimSchema.index({ promoCode: 1, user: 1, createdAt: -1 });

module.exports = mongoose.models.PromoCodeClaim || mongoose.model("PromoCodeClaim", promoCodeClaimSchema);
