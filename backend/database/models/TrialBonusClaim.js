const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
	},
	{ _id: false }
);

// Deneme Bonusu talep kaydı. Hesap başına en fazla BİR kayıt oluşur
// (aşağıdaki unique index ile korunur) — kullanıcı aynı bonusu ikinci kez
// talep edemez.
const trialBonusClaimSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		userSnapshot: {
			type: userSnapshotSchema,
			default: () => ({}),
		},

		amount: { type: Number, required: true },

		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},

		autoApproved: { type: Boolean, default: false },

		otherBonusesBlockedUntil: { type: Date, default: null },

		reviewedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		reviewedAt: { type: Date },
		rejectionReason: { type: String, default: "", trim: true },

		adjustmentRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AdminManualAdjustment",
			default: null,
		},
	},
	{ timestamps: true }
);

// Bir kullanıcının reddedilen talebi tekrar denemesine izin vermek için
// unique index'i sadece "approved"/"pending" durumlarında zorluyoruz.
// MongoDB partialFilterExpression $in operatörünü desteklemediği için
// (sadece $eq, $exists, $gt(e), $lt(e), $type, top-level $and) her durum
// için ayrı bir partial unique index tanımlıyoruz — birlikte aynı etkiyi
// (kullanıcı başına yalnızca 1 pending VEYA 1 approved kayıt) sağlarlar.
trialBonusClaimSchema.index(
	{ user: 1 },
	{
		unique: true,
		partialFilterExpression: { status: "pending" },
	}
);
trialBonusClaimSchema.index(
	{ user: 1 },
	{
		unique: true,
		partialFilterExpression: { status: "approved" },
	}
);
trialBonusClaimSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("TrialBonusClaim", trialBonusClaimSchema);
