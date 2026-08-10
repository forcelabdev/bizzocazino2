const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
		phone: { type: String, default: "" },
		rank: { type: String, default: "user" },
	},
	{ _id: false }
);

const walletSnapshotSchema = new mongoose.Schema(
	{
		coinType: { type: String, required: true },
		chain: { type: String, required: true },
		type: { type: String, required: true },
	},
	{ _id: false }
);

const adminManualAdjustmentSchema = new mongoose.Schema(
	{
		actorUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		actorSnapshot: {
			type: userSnapshotSchema,
			default: () => ({}),
		},
		targetUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		targetSnapshot: {
			type: userSnapshotSchema,
			required: true,
		},
		wallet: {
			type: walletSnapshotSchema,
			required: true,
		},
		kind: {
			type: String,
			enum: ["balance", "bonus"],
			required: true,
		},
		direction: {
			type: String,
			enum: ["credit", "debit"],
			required: true,
		},
		category: {
			type: String,
			required: true,
			trim: true,
		},
		note: {
			type: String,
			default: "",
			trim: true,
		},
		requestedAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		appliedAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		balanceBefore: {
			type: Number,
			required: true,
		},
		balanceAfter: {
			type: Number,
			required: true,
		},
		source: {
			type: String,
			default: "manual",
			trim: true,
		},
		sourceRef: {
			type: Object,
			default: null,
		},
		metadata: {
			type: Object,
			default: () => ({}),
		},
	},
	{ timestamps: true }
);

adminManualAdjustmentSchema.index({ targetUser: 1, createdAt: -1 });
adminManualAdjustmentSchema.index({ actorUser: 1, createdAt: -1 });
adminManualAdjustmentSchema.index({ kind: 1, createdAt: -1 });
adminManualAdjustmentSchema.index({ direction: 1, createdAt: -1 });
adminManualAdjustmentSchema.index({ source: 1, createdAt: -1 });
adminManualAdjustmentSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model(
	"AdminManualAdjustment",
	adminManualAdjustmentSchema
);