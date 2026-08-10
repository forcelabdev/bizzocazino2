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

const auditChangeSchema = new mongoose.Schema(
	{
		field: {
			type: String,
			required: true,
			trim: true,
		},
		from: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
		to: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
	},
	{ _id: false }
);

const adminUserAuditLogSchema = new mongoose.Schema(
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
		action: {
			type: String,
			required: true,
			trim: true,
		},
		summary: {
			type: String,
			default: "",
			trim: true,
		},
		changes: {
			type: [auditChangeSchema],
			default: [],
		},
		source: {
			type: String,
			default: "admin-user-profile",
			trim: true,
		},
		metadata: {
			type: Object,
			default: () => ({}),
		},
	},
	{ timestamps: true }
);

adminUserAuditLogSchema.index({ targetUser: 1, createdAt: -1 });
adminUserAuditLogSchema.index({ actorUser: 1, createdAt: -1 });
adminUserAuditLogSchema.index({ action: 1, createdAt: -1 });
adminUserAuditLogSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model("AdminUserAuditLog", adminUserAuditLogSchema);