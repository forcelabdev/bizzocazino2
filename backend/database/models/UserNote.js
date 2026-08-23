const mongoose = require("mongoose");

/**
 * UserNote Model
 *
 * Üye profilinde admin/temsilcilerin bıraktığı serbest metin notları.
 * "Notlar + Etiketler" kartında (bkz. UserRiskNotesCard.vue) gösterilir.
 */
const userNoteSchema = new mongoose.Schema(
	{
		targetUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},

		authorSnapshot: {
			username: { type: String, default: "" },
		},

		text: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{ timestamps: true }
);

userNoteSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model("UserNote", userNoteSchema);
