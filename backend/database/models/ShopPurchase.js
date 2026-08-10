const mongoose = require("mongoose");

const shopPurchaseSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		shopItem: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "ShopItem",
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		banner: {
			type: String,
		},
		coinCost: {
			type: Number,
			required: true,
			min: 0,
		},
		rewardAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		coinsBefore: {
			type: Number,
			required: true,
		},
		coinsAfter: {
			type: Number,
			required: true,
		},
		balanceBefore: {
			type: Number,
			required: true,
		},
		balanceAfter: {
			type: Number,
			required: true,
		},
		wallet: {
			coinType: { type: String, required: true },
			chain: { type: String, required: true },
			type: { type: String, required: true },
		},
		state: {
			type: String,
			default: "completed",
		},
		reason: {
			type: String,
		},
	},
	{ timestamps: true }
);

shopPurchaseSchema.index({ user: 1, createdAt: -1 });
shopPurchaseSchema.index({ shopItem: 1, createdAt: -1 });
shopPurchaseSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model("ShopPurchase", shopPurchaseSchema);