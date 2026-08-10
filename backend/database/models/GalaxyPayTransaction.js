const mongoose = require("mongoose");

const galaxyPayTransactionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		externalTransactionId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		paymentId: {
			type: String,
			default: "",
			trim: true,
		},
		type: {
			type: String,
			enum: ["deposit", "withdraw"],
			required: true,
		},
		method: {
			type: String,
			enum: ["lobby", "bank-transfer", "papara"],
			required: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		currency: {
			type: String,
			default: "TRY",
		},
		lang: {
			type: String,
			default: "tr",
		},
		status: {
			type: String,
			enum: [
				"pending",
				"processing",
				"approved",
				"rejected",
				"cancelled",
				"failed",
			],
			default: "pending",
		},
		paymentUrl: {
			type: String,
			default: "",
		},
		methodId: {
			type: String,
			default: "",
		},
		providerHash: {
			type: String,
			default: "",
		},
		bankInfo: {
			iban: { type: String, default: "" },
			accountHolder: { type: String, default: "" },
			accountNumber: { type: String, default: "" },
			bankId: { type: String, default: "" },
			bankName: { type: String, default: "" },
			branchCode: { type: String, default: "" },
			tcno: { type: String, default: "" },
		},
		paparaInfo: {
			accountNumber: { type: String, default: "" },
			accountHolder: { type: String, default: "" },
		},
		oldBalance: {
			type: Number,
			default: 0,
		},
		newBalance: {
			type: Number,
			default: 0,
		},
		metadata: {
			type: Object,
			default: {},
		},
		providerResponse: {
			type: Object,
			default: {},
		},
		callbackRawData: {
			type: Object,
			default: {},
		},
		rejectionReason: {
			type: String,
			default: "",
		},
		approvedAt: {
			type: Date,
		},
		rejectedAt: {
			type: Date,
		},
	},
	{ timestamps: true },
);

galaxyPayTransactionSchema.index({ createdAt: -1 });
galaxyPayTransactionSchema.index({ status: 1, createdAt: -1 });
galaxyPayTransactionSchema.index({ externalTransactionId: 1 }, { unique: true });
galaxyPayTransactionSchema.index({ paymentId: 1 });
galaxyPayTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
galaxyPayTransactionSchema.index({ method: 1, createdAt: -1 });

module.exports = mongoose.model(
	"GalaxyPayTransaction",
	galaxyPayTransactionSchema,
);
