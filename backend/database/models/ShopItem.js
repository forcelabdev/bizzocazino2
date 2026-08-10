const mongoose = require("mongoose");

const shopItemSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			default: "",
			trim: true,
		},
		banner: {
			type: String,
			required: true,
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
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

shopItemSchema.index({ isActive: 1, createdAt: -1 });
shopItemSchema.index({ createdAt: -1 });
shopItemSchema.index({ title: 1 });

module.exports = mongoose.model("ShopItem", shopItemSchema);