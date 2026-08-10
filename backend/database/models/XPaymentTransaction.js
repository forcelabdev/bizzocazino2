const mongoose = require("mongoose");

const xPaymentTransactionSchema = new mongoose.Schema(
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
		providerUserId: {
			type: String,
			required: true,
			trim: true,
		},
		financeId: {
			type: String,
			default: "",
			trim: true,
		},
		type: {
			type: String,
			enum: ["deposit", "withdraw"],
			required: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		requestedAmount: {
			type: Number,
			min: 0,
			default: null,
		},
		providerAmount: {
			type: Number,
			min: 0,
			default: null,
		},
		currency: {
			type: String,
			default: "TRY",
			enum: ["TRY"],
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
		providerStatus: {
			type: String,
			default: "",
			trim: true,
		},
		isProcessing: {
			type: Boolean,
			default: false,
		},
		account: {
			bankName: { type: String, default: "" },
			accountHolderName: { type: String, default: "" },
			iban: { type: String, default: "" },
			methodType: { type: String, default: "" },
		},
		withdrawal: {
			accountHolder: { type: String, default: "" },
			iban: { type: String, default: "" },
		},
		oldBalance: {
			type: Number,
			default: 0,
		},
		newBalance: {
			type: Number,
			default: 0,
		},
		balanceCreditedAt: { type: Date },
		balanceDebitedAt: { type: Date },
		balanceRefundedAt: { type: Date },
		statsAppliedAt: { type: Date },
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
		submissionState: {
			type: String,
			enum: ["not_submitted", "submitting", "submitted", "unknown", "failed"],
			default: "not_submitted",
		},
		submissionAttemptedAt: { type: Date },
		submittedAt: { type: Date },
		lastCheckedAt: { type: Date },
		approvedAt: { type: Date },
		rejectedAt: { type: Date },
		cancelledAt: { type: Date },
		failedAt: { type: Date },
	},
	{ timestamps: true },
);

xPaymentTransactionSchema.index({ createdAt: -1 });
xPaymentTransactionSchema.index({ status: 1, createdAt: -1 });
xPaymentTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
xPaymentTransactionSchema.index({ financeId: 1 });

module.exports = mongoose.model(
	"XPaymentTransaction",
	xPaymentTransactionSchema,
);
