const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
	},
	{ _id: false }
);

// Çağrı Senaryosu Ataması: bir CallScenarioTemplate'in belirli bir üyeye
// uygulanmasının kaydı. Şablon sonradan değişse/silinse bile bu kayıttaki
// değerler (atama anındaki kopya) sabit kalır — geçmiş bozulmaz.
//
// "Aynı senaryo aynı üyeye tekrar verilmesin" kuralı, template+user
// kombinasyonu üzerinden servis katmanında (status !== 'cancelled' olan
// bir kayıt varsa yeni atamayı reddet) ve bu index ile garanti edilir.
const callScenarioAssignmentSchema = new mongoose.Schema(
	{
		template: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "CallScenarioTemplate",
			required: true,
		},
		templateNameSnapshot: { type: String, default: "" },

		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		userSnapshot: {
			type: userSnapshotSchema,
			default: () => ({}),
		},

		// Atama anındaki şablon değerlerinin kopyası.
		bonusAmount: { type: Number, default: 0, min: 0 },
		requiredDepositAmount: { type: Number, default: 0, min: 0 },
		wageringMultiplier: { type: Number, default: 0, min: 0 },
		minWithdrawalAmount: { type: Number, default: 0, min: 0 },
		maxWithdrawalAmount: { type: Number, default: 0, min: 0 },
		allowedProviders: { type: String, default: "" },
		excludedCategories: { type: String, default: "" },
		rulesText: { type: String, default: "" },

		// "active"    -> bonus tanımlandı, üye süreci devam ediyor
		// "completed" -> temsilci/finans süreci tamamlandı olarak işaretledi
		// "cancelled" -> admin yanlışlıkla atadı, iptal etti (tekrar denemeye izin verir)
		// "violated"  -> üye kural ihlali yaptı, bakiye/kazanç iptal edildi
		status: {
			type: String,
			enum: ["active", "completed", "cancelled", "violated"],
			default: "active",
		},

		note: { type: String, default: "", trim: true },

		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},

		cancelledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		cancelledAt: { type: Date, default: null },
		cancellationReason: { type: String, default: "", trim: true },

		violatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		violatedAt: { type: Date, default: null },
		violationReason: { type: String, default: "", trim: true },

		completedAt: { type: Date, default: null },

		// Bonus kredisinin işlendiği AdminManualAdjustment kaydına referans.
		adjustmentRef: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AdminManualAdjustment",
			default: null,
		},
	},
	{ timestamps: true }
);

callScenarioAssignmentSchema.index({ template: 1, user: 1 });
callScenarioAssignmentSchema.index({ user: 1, createdAt: -1 });
callScenarioAssignmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
	"CallScenarioAssignment",
	callScenarioAssignmentSchema
);
