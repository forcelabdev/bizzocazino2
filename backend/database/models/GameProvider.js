const mongoose = require("mongoose");

/**
 * GameProvider - Oyun sağlayıcı modeli
 * Pragmatic Play, Evolution, NetEnt gibi oyun üreticilerini temsil eder
 * Her GameProvider bir ApiProvider'a bağlıdır
 */
const GameProviderSchema = new mongoose.Schema(
	{
		// Bağlı olduğu API Provider
		apiProvider: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "ApiProvider",
			required: false,
			default: null,
		},

		// API'den gelen orijinal ID
		externalId: {
			type: Number,
			default: null,
		},

		// Benzersiz kod (pragmatic, evolution, vb.)
		code: {
			type: String,
			required: true,
			lowercase: true,
			trim: true,
		},

		// Görünen isim
		name: {
			type: String,
			required: true,
			trim: true,
		},

		// Slug (URL-friendly)
		slug: {
			type: String,
			lowercase: true,
			trim: true,
		},

		// Logo URL
		logo: {
			type: String,
			default: null,
		},

		// Oyun tipleri (slots, live, table, vb.)
		gameTypes: [
			{
				type: String,
				enum: ["slots", "live", "table", "crash", "instant", "lottery", "virtual", "other"],
			},
		],

		// RTP (Return to Player)
		rtp: {
			type: Number,
			default: 96,
			min: 0,
			max: 100,
		},

		// Durum
		status: {
			type: Number,
			enum: [0, 1], // 0: inactive, 1: active
			default: 1,
		},

		// Öne çıkan
		featured: {
			type: Boolean,
			default: false,
		},

		// Sıralama
		order: {
			type: Number,
			default: 0,
		},

		// Oyun sayısı (cache)
		gameCount: {
			type: Number,
			default: 0,
		},

		// Son senkronizasyon
		lastSyncAt: {
			type: Date,
			default: null,
		},

		// Meta bilgiler (API'den gelen ekstra veriler)
		meta: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
	}
);

// Compound unique index (aynı apiProvider altında aynı code olamaz)
// sparse: true ile null apiProvider'lar için index oluşturmaz
GameProviderSchema.index({apiProvider: 1, code: 1}, {unique: true, sparse: true});
// code tek başına da unique olmalı
GameProviderSchema.index({code: 1}, {unique: true});
GameProviderSchema.index({status: 1});
GameProviderSchema.index({featured: 1, order: 1});

// Pre-save: slug oluştur
GameProviderSchema.pre("save", function (next) {
	if (!this.slug) {
		this.slug = this.code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	}
	next();
});

// Virtual: Games
GameProviderSchema.virtual("games", {
	ref: "Game",
	localField: "_id",
	foreignField: "gameProvider",
});

// Methods
GameProviderSchema.methods.updateGameCount = async function () {
	const Game = mongoose.model("Game");
	this.gameCount = await Game.countDocuments({gameProvider: this._id});
	return this.save();
};

// Statics
GameProviderSchema.statics.findActive = function () {
	return this.find({status: 1}).populate("apiProvider", "code name");
};

GameProviderSchema.statics.findByCode = function (code, apiProviderId = null) {
	const query = {code: code.toLowerCase()};
	if (apiProviderId) query.apiProvider = apiProviderId;
	return this.findOne(query);
};

GameProviderSchema.statics.findByApiProvider = function (apiProviderId) {
	return this.find({apiProvider: apiProviderId}).sort({order: 1, name: 1});
};

module.exports = mongoose.model("GameProvider", GameProviderSchema);
