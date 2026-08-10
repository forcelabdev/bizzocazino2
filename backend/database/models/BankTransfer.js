const mongoose = require("mongoose");

const bankTransferSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		amount: { type: Number, required: true },
		bankId: { type: String, required: true },
		bankName: { type: String, required: true },
		accountName: { type: String, required: true },
		accountNumber: { type: String, required: true },
		iban: { type: String, required: true },
		note: { type: String },
		status: {
			type: String,
			enum: ["pending", "processing", "approved", "rejected"],
			default: "pending",
		},
		type: { type: String, enum: ["deposit", "withdraw"], required: true },
		metadata: { type: Object },
	},
	{ timestamps: true }
);

bankTransferSchema.index({ createdAt: -1 });
bankTransferSchema.index({ status: 1, type: 1 });
bankTransferSchema.index({ status: 1, createdAt: -1 });

bankTransferSchema.index({ user: 1 });
bankTransferSchema.index({ status: 1 });

module.exports = mongoose.model("BankTransfer", bankTransferSchema);
