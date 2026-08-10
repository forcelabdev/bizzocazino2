const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
	},
	{ _id: false }
);

// Yatırım Bonusu talep geçmişi. Her talep, kullanıcının son talebinden
// (veya kayıt tarihinden) bugüne kadarki dönemde yaptığı, HENÜZ hiçbir
// bahisle "kirlenmemiş" yatırımları kapsar.
const depositBonusClaimSchema = new mongoose.Schema(
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

		periodStart: { type: Date, required: true },
		periodEnd: { type: Date, required: true },

		totalDeposit: { type: Number, required: true, default: 0 },

		percentage: { type: Number, required: true },
		calculatedAmount: { type: Number, required: true }, // limit uygulanmadan önceki tutar
		appliedAmount: { type: Number, required: true }, // gerçekten ödenen/onaylanan tutar

		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},

		autoApproved: { type: Boolean, default: false },

		// Bu talep onaylandığında diğer bonusların engellendiği tarih.
		otherBonusesBlockedUntil: { type: Date, default: null },

		reviewedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		reviewedAt: { type: Date },
		rejectionReason: { type: String, default: "", trim: true },

		// Onaylandığında oluşturulan bakiye hareketi ile ilişki.
		adjustmentRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AdminManualAdjustment",
			default: null,
		},
	},
	{ timestamps: true }
);

depositBonusClaimSchema.index({ user: 1, createdAt: -1 });
depositBonusClaimSchema.index({ status: 1, createdAt: -1 });
depositBonusClaimSchema.index({ user: 1, periodEnd: -1 });

module.exports = mongoose.model("DepositBonusClaim", depositBonusClaimSchema);
