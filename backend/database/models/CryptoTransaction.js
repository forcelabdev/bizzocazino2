// models/CryptoTransaction.js
const mongoose = require("mongoose");

const cryptoTransactionSchema = new mongoose.Schema({
	amount: Number,
	data: {
		providerId: String,
		transaction: String,
		sender: String,
		receiver: String,
		currency: String, // Coin (BTC, ETH, USDT)
		fiatcurrency: { type: String, default: "USD" }, // Fiat para birimi
		cryptoAmount: Number,
		bonusAmount: Number,
		bonusType: String,
	},
	type: String, // örn: "deposit,withdrawal"
	user: { type: mongoose.Schema.ObjectId, ref: "User" },
	state: String,
	updatedAt: { type: Date, default: Date.now },
	createdAt: { type: Date, default: Date.now },
});

cryptoTransactionSchema.index({ createdAt: -1 });
cryptoTransactionSchema.index({ state: 1, type: 1 });
cryptoTransactionSchema.index({ state: 1, createdAt: -1 });

cryptoTransactionSchema.index({ user: 1 });
cryptoTransactionSchema.index({ "data.providerId": 1 });
cryptoTransactionSchema.index({ user: 1, state: 1 });

module.exports = mongoose.model("CryptoTransaction", cryptoTransactionSchema);
