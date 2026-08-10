const mongoose = require("mongoose");

const forcelabFinanceTransactionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		uuid: {
			type: String,
			trim: true,
			default: undefined,
			set: (value) => {
				if (value === null || value === undefined) return undefined;

				const normalizedValue = String(value).trim();
				return normalizedValue || undefined;
			},
		},
		externalTransactionId: {
			type: String,
			required: true,
		},
		providerSlug: {
			type: String,
			required: true,
		},
		providerName: {
			type: String,
			default: "",
		},
		providerType: {
			type: String,
			default: "deposit",
		},
		amount: {
			type: Number,
			required: true,
		},
		providerAmount: {
			type: Number,
			required: true,
		},
		currency: {
			type: String,
			default: "TRY",
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
				"expired",
			],
			default: "pending",
		},
		redirectUrl: {
			type: String,
			default: "",
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
		lastCheckedAt: {
			type: Date,
		},
		processedAt: {
			type: Date,
		},
	},
	{ timestamps: true }
);

forcelabFinanceTransactionSchema.index({ createdAt: -1 });
forcelabFinanceTransactionSchema.index({ status: 1, createdAt: -1 });
forcelabFinanceTransactionSchema.index({ user: 1, status: 1 });
forcelabFinanceTransactionSchema.index(
	{ uuid: 1 },
	{ unique: true, partialFilterExpression: { uuid: { $type: "string" } } },
);
forcelabFinanceTransactionSchema.index({ externalTransactionId: 1 }, { unique: true });
forcelabFinanceTransactionSchema.index({ providerSlug: 1, createdAt: -1 });

module.exports = mongoose.model(
	"ForcelabFinanceTransaction",
	forcelabFinanceTransactionSchema
);