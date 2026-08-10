const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
	},
	{ _id: false }
);

// Kayıp Bonusu talep geçmişi. Her talep bir dönemi (periodStart -> periodEnd)
// kapsar ve o dönemdeki net kaybın belirlenen yüzdesini hesaplar.
const lossBonusClaimSchema = new mongoose.Schema(
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
		totalWithdrawal: { type: Number, required: true, default: 0 },
		netLoss: { type: Number, required: true, default: 0 },

		percentage: { type: Number, required: true },
		calculatedAmount: { type: Number, required: true }, // limit uygulanmadan önceki tutar
		appliedAmount: { type: Number, required: true }, // gerçekten ödenen/onaylanan tutar

		status: {
			type: String,
			enum: ["pending", "approved", "rejected"],
			default: "pending",
		},

		autoApproved: { type: Boolean, default: false },

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

		// Bonus onaylandığında çevrim (wagering) şartı yoksa (multiplier=0)
		// ve zaman bazlı kilit uygulandıysa, kilidin bitiş tarihi (sadece
		// kayıt/rapor amaçlıdır; asıl kilit User.bonusLock üzerinden
		// yürütülür).
		otherBonusesBlockedUntil: { type: Date, default: null },
	},
	{ timestamps: true }
);

lossBonusClaimSchema.index({ user: 1, createdAt: -1 });
lossBonusClaimSchema.index({ status: 1, createdAt: -1 });
lossBonusClaimSchema.index({ user: 1, periodEnd: -1 });

module.exports = mongoose.model("LossBonusClaim", lossBonusClaimSchema);
