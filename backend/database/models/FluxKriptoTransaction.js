const mongoose = require("mongoose");

const fluxKriptoTransactionSchema = new mongoose.Schema(
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
		orderId: {
			type: String,
			default: "",
			trim: true,
		},
		financeId: {
			type: String,
			default: "",
			trim: true,
		},
		providerUserId: {
			type: String,
			required: true,
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
			enum: ["TRX", "USDT"],
			required: true,
		},
		cryptoAmount: {
			type: Number,
			default: 0,
		},
		rate: {
			type: Number,
			default: 0,
		},
		walletAddress: {
			type: String,
			default: "",
			trim: true,
		},
		receiverWallet: {
			type: String,
			default: "",
			trim: true,
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
			default: () => ({}),
		},
		providerResponse: {
			type: Object,
			default: () => ({}),
		},
		upstreamDiagnostic: {
			type: Object,
			default: () => ({}),
		},
		callbackRawData: {
			type: Object,
			default: () => ({}),
		},
		rejectionReason: {
			type: String,
			default: "",
		},
		expiresAt: Date,
		processedAt: Date,
		approvedAt: Date,
		rejectedAt: Date,
		balanceDebitedAt: Date,
		balanceCreditedAt: Date,
		balanceRefundedAt: Date,
	},
	{ timestamps: true },
);

fluxKriptoTransactionSchema.index({ createdAt: -1 });
fluxKriptoTransactionSchema.index({ status: 1, createdAt: -1 });
fluxKriptoTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });
fluxKriptoTransactionSchema.index({ financeId: 1 }, { sparse: true });
fluxKriptoTransactionSchema.index({ orderId: 1 }, { sparse: true });

module.exports = mongoose.model(
	"FluxKriptoTransaction",
	fluxKriptoTransactionSchema,
);
