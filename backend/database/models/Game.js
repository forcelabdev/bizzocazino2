const mongoose = require("mongoose");

// Oyun şeması
const GameSchema = mongoose.Schema({
	// Yeni: GameProvider referansı (opsiyonel, migration için)
	provider: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "GameProvider",
		default: null,
	},

	game_id: { type: String, required: true }, // unique: true KALDIR!

	provider_id: { type: Number, required: true },
	game_server_url: { type: String, default: null },
	game_name: { type: String, required: true },
	game_code: { type: String, required: true },
	game_type: { type: String, required: true },
	description: { type: String, default: null },
	cover: { type: String, required: true },
	technology: { type: String, required: true },
	has_lobby: { type: Number, default: 0 },
	is_mobile: { type: Number, default: 0 },
	has_freespins: { type: Number, default: 0 },
	has_tables: { type: Number, default: 0 },
	only_demo: { type: Number, default: 0 },
	distribution: { type: String, required: true },
	status: { type: Number, default: 1 },
	created_at: { type: Date, default: Date.now },
	updated_at: { type: Date, default: Date.now },
	lobby_id: { type: Number, default: null },
	rtp: { type: Number, default: 0 },
	provider_code: { type: String, default: null },
	banner: { type: String, default: null },
	background: { type: String, default: null },

	// Yeni eklenen alanlar
	featured: { type: Number, default: 0 }, // Varsayılan olarak 0
	views: { type: Number, default: 0 }, // Varsayılan olarak 0

	// Birden fazla kategori desteği (array)
	categories: [{ type: String }],
	// @deprecated
	category: { type: String, default: null },
});

GameSchema.index({ game_id: 1 });
GameSchema.index({ game_code: 1 });
GameSchema.index({ provider: 1 });
GameSchema.index({ provider_id: 1, status: 1 });
GameSchema.index({ game_type: 1, status: 1 });
GameSchema.index({ created_at: -1 });

// Performance Advisor önerileri (2026-02-20)
GameSchema.index({ categories: 1, featured: -1, views: -1 });
GameSchema.index({ category: 1, featured: -1, views: -1 });
GameSchema.index({ featured: 1, views: -1 });
GameSchema.index({ categories: 1, provider_code: 1, featured: -1, views: -1 });
GameSchema.index({ category: 1, provider_code: 1, featured: -1, views: -1 });
GameSchema.index({ game_name: 1, featured: -1, views: -1 });
GameSchema.index({ provider_code: 1, created_at: -1 });
GameSchema.index({ game_name: 1, created_at: -1 });
GameSchema.index({ provider_code: 1, _id: 1 });
GameSchema.index({ game_name: 1, provider_code: 1, created_at: -1 });
GameSchema.index({ banner: 1 });

module.exports = mongoose.model("Games", GameSchema);
