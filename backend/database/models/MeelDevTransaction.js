const mongoose = require("mongoose");

const meelDevTransactionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		// MeelDev tarafındaki process_no
		processNo: {
			type: String,
			default: null,
		},
		// Bizim tarafımızda oluşturulan benzersiz transaction ID
		transactionId: {
			type: String,
			required: true,
			unique: true,
		},
		// deposit veya withdraw
		type: {
			type: String,
			enum: ["deposit", "withdraw"],
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
		// Deposit: payment_url veya iban bilgisi
		paymentUrl: {
			type: String,
			default: "",
		},
		paymentType: {
			type: String,
			default: "",
		},
		// Deposit direct_account=1 ise dönen hesap bilgileri
		accountInfo: {
			type: Object,
			default: null,
		},
		// Withdraw: banka bilgileri
		bankInfo: {
			iban: { type: String, default: "" },
			accountHolder: { type: String, default: "" },
			bankName: { type: String, default: "" },
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

meelDevTransactionSchema.index({ createdAt: -1 });
meelDevTransactionSchema.index({ status: 1, createdAt: -1 });
meelDevTransactionSchema.index({ transactionId: 1 }, { unique: true });
meelDevTransactionSchema.index({ processNo: 1 });
meelDevTransactionSchema.index({ user: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("MeelDevTransaction", meelDevTransactionSchema);
