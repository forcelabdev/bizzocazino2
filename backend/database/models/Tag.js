const mongoose = require("mongoose");

/**
 * Tag Model
 *
 * Admin panelinden oluşturulup oyunculara atanabilen etiketler.
 * "risk" ve "bonus_abuse" kategorileri, Oyuncu Segmentleri sayfasındaki
 * "Riskli oyuncular" ve "Bonus suistimalcileri" segmentlerini besler.
 */
const tagSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},

		color: {
			type: String,
			default: "#9155FD",
		},

		category: {
			type: String,
			enum: ["general", "risk", "bonus_abuse"],
			default: "general",
		},

		description: {
			type: String,
			trim: true,
			default: "",
		},

		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

tagSchema.index({ category: 1 });

module.exports = mongoose.model("Tag", tagSchema);
