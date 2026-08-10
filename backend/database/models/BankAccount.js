const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
	{
		bankName: { type: String, required: true },
		accountName: { type: String, required: true },
		accountNumber: { type: String, default: "" },
		iban: { type: String, required: true },
		note: { type: String, default: "" },
		logo: { type: String, default: null },
		minAmount: { type: Number, default: 0 },
		maxAmount: { type: Number, default: null },
		active: { type: Boolean, default: true },
		order: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

bankAccountSchema.index({ type: 1 });
bankAccountSchema.index({ active: 1, order: 1 });

module.exports = mongoose.model("BankAccount", bankAccountSchema);
