const mongoose = require("mongoose");

/**
 * AdminRole Model
 *
 * Admin kullanıcıları için rol tanımları.
 * Her rol, birden fazla permission içerebilir.
 */
const adminRoleSchema = new mongoose.Schema(
	{
		// Rol adı (benzersiz)
		name: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},

		// Görüntüleme adı
		displayName: {
			type: String,
			required: true,
			trim: true,
		},

		// Açıklama
		description: {
			type: String,
			trim: true,
		},

		// Bu role ait permission'lar
		permissions: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Permission",
			},
		],

		// Süper admin mi? (tüm yetkilere sahip)
		isSuperAdmin: {
			type: Boolean,
			default: false,
		},

		// Sistem rolü mü? (silinemez)
		isSystem: {
			type: Boolean,
			default: false,
		},

		// Aktif mi?
		isActive: {
			type: Boolean,
			default: true,
		},

		// Renk (UI için)
		color: {
			type: String,
			default: "primary",
		},

		// İkon (UI için)
		icon: {
			type: String,
			default: "tabler-user-shield",
		},

		// Oluşturan kullanıcı
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

// Populate permissions on find
adminRoleSchema.pre(/^find/, function (next) {
	this.populate({
		path: "permissions",
		select: "code name resource action",
	});
	next();
});

adminRoleSchema.index({ isActive: 1, createdAt: -1 });
adminRoleSchema.index({ createdBy: 1 });

module.exports = mongoose.model("AdminRole", adminRoleSchema);
