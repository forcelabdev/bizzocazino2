const mongoose = require("mongoose");

const MFA_OTP_SCOPES = [
	"user-login",
	"admin-login",
	"enable",
	"disable",
	"change-phone",
];

const MFA_OTP_STATUSES = [
	"pending",
	"sent",
	"validated",
	"expired",
	"superseded",
	"failed",
	"cancelled",
];

const mfaOtpCodeSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		scope: {
			type: String,
			enum: MFA_OTP_SCOPES,
			required: true,
		},
		methodType: {
			type: String,
			enum: ["sms", "email"],
			default: "sms",
		},
		destination: {
			phone: { type: String },
			maskedPhone: { type: String },
			email: { type: String },
			maskedEmail: { type: String },
		},
		codeHash: { type: String, required: true },
		encryptedCode: { type: String, required: true },
		encryptionIv: { type: String, required: true },
		encryptionTag: { type: String, required: true },
		provider: {
			name: { type: String, default: "uipapp" },
			reportId: { type: String },
			messageId: { type: String },
		},
		status: {
			type: String,
			enum: MFA_OTP_STATUSES,
			default: "pending",
		},
		sentAt: { type: Date },
		expiresAt: { type: Date, required: true },
		resendAvailableAt: { type: Date, required: true },
		validatedAt: { type: Date },
		supersededAt: { type: Date },
		failedAt: { type: Date },
		attemptCount: { type: Number, default: 0 },
		maxAttempts: { type: Number, default: 5 },
		error: {
			code: { type: String },
			message: { type: String },
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{ timestamps: true }
);

mfaOtpCodeSchema.index({ user: 1, createdAt: -1 });
mfaOtpCodeSchema.index({ user: 1, scope: 1, status: 1, createdAt: -1 });
mfaOtpCodeSchema.index({ scope: 1, status: 1, createdAt: -1 });
mfaOtpCodeSchema.index({ expiresAt: 1 });
mfaOtpCodeSchema.index({ "provider.reportId": 1 }, { sparse: true });

const MfaOtpCode = mongoose.model("MfaOtpCode", mfaOtpCodeSchema);

module.exports = MfaOtpCode;
module.exports.MFA_OTP_SCOPES = MFA_OTP_SCOPES;
module.exports.MFA_OTP_STATUSES = MFA_OTP_STATUSES;