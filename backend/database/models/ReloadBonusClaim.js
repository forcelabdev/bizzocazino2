const mongoose = require("mongoose");

// Bir Reload atamasından yapılan her tekil claim (aralık başı ödeme) kaydı.
// Raporlama ve denetim amaçlıdır; bakiyeye geçiş AdminManualAdjustment
// üzerinden işlenir (adjustmentRef).
const reloadBonusClaimSchema = new mongoose.Schema(
	{
		assignment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "ReloadBonusAssignment",
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		periodIndex: { type: Number, required: true, min: 1 },
		amount: { type: Number, required: true, min: 0 },

		wageringMultiplier: { type: Number, default: 0, min: 0 },
		wageringAdded: { type: Number, default: 0, min: 0 },

		adjustmentRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AdminManualAdjustment",
			default: null,
		},
	},
	{ timestamps: true }
);

reloadBonusClaimSchema.index({ assignment: 1, periodIndex: 1 }, { unique: true });
reloadBonusClaimSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ReloadBonusClaim", reloadBonusClaimSchema);
