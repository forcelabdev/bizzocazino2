const mongoose = require("mongoose");

const ALLOWED_TOP_LEVEL_RESOURCES = [
	"dashboard",
	"users",
	"finance",
	"games",
	"providers",
	"nft",
	"platform",
	"battlepass",
	"notice",
	"communication",
	"reports",
	"controlGame",
	"roles",
	"sports",
	"shop",
];

/**
 * Permission Model
 *
 * Sistemdeki tüm izinleri tanımlar.
 * Her permission bir resource (kaynak) ve action (aksiyon) kombinasyonudur.
 *
 * Örnek: { resource: "users", action: "read" } -> Kullanıcıları görüntüleme izni
 */
const permissionSchema = new mongoose.Schema(
	{
		// Permission kodu (benzersiz tanımlayıcı)
		code: {
			type: String,
			required: true,
			trim: true,
		},

		// Permission adı (görüntüleme için)
		name: {
			type: String,
			required: true,
			trim: true,
		},

		// Açıklama
		description: {
			type: String,
			trim: true,
		},

		// Kaynak (resource) - hangi modül/bölüm
		resource: {
			type: String,
			required: true,
			validate: {
				validator: (value) => {
					const [topLevelResource] = String(value || "").split(".");
					return ALLOWED_TOP_LEVEL_RESOURCES.includes(topLevelResource);
				},
				message: (props) =>
					`Geçersiz permission resource: ${props.value}`,
			},
		},

		// Aksiyon (action) - ne yapılabilir
		action: {
			type: String,
			required: true,
			enum: ["read", "create", "update", "delete", "manage"],
		},

		// Grup (kategorize etmek için)
		group: {
			type: String,
			default: "general",
		},

		// Aktif mi?
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

// Compound index for resource + action
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

permissionSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
