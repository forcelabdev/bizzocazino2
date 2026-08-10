const mongoose = require("mongoose");

/**
 * Campaign Transaction Schema
 * Kullanıcının aldığı kampanya bonuslarının geçmişini tutar
 */
const campaignTransactionSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},

	campaign: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Campaign",
		required: true,
	},

	campaignTitle: {
		type: String,
		required: true,
	},

	rewardAmount: {
		type: Number,
		required: true,
		min: 0,
	},

	mode: {
		type: String,
		enum: ["auto", "manual"],
		required: true,
	},

	requirements: {
		type: mongoose.Schema.Types.Mixed,
		default: [],
	},

	terms: {
		type: String,
		default: null,
	},

	assignedByAdmin: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null,
	},

	status: {
		type: String,
		enum: ["completed", "cancelled"],
		default: "completed",
	},

	claimedAt: {
		type: Date,
		default: Date.now,
	},
});

campaignTransactionSchema.index({ user: 1, claimedAt: -1 });
campaignTransactionSchema.index({ campaign: 1 });
campaignTransactionSchema.index({ claimedAt: -1 });
campaignTransactionSchema.index({ status: 1, claimedAt: -1 });

module.exports = mongoose.model(
	"CampaignTransaction",
	campaignTransactionSchema
);
