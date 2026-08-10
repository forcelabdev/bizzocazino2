const mongoose = require("mongoose");

/**
 * ApiProvider - Ana API sağlayıcı modeli
 * Drakon, Nexus gibi oyun API'lerini temsil eder
 * Her ApiProvider'ın kendine özgü auth yöntemi ve endpoint'leri vardır
 */
const ApiProviderSchema = new mongoose.Schema(
	{
		// Benzersiz tanımlayıcı (drakon, nexus, vb.)
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

		// Provider tipi (aggregator, direct, vb.)
		type: {
			type: String,
			enum: ["aggregator", "direct", "white_label"],
			default: "aggregator",
		},

		// API Base URL
		apiBaseUrl: {
			type: String,
			required: true,
		},

		// API Credentials (şifrelenmiş saklanmalı production'da)
		credentials: {
			agentCode: {type: String, default: null},
			agentToken: {type: String, default: null},
			agentSecret: {type: String, default: null},
			apiKey: {type: String, default: null},
			// Ekstra credentials için
			extra: {type: mongoose.Schema.Types.Mixed, default: {}},
		},

		// Auth tipi
		authType: {
			type: String,
			enum: ["bearer", "basic", "api_key", "hmac", "oauth2", "none"],
			default: "bearer",
		},

		// Callback URL (provider geri dönüş için)
		callbackUrl: {
			type: String,
			default: null,
		},

		// API Endpoints konfigürasyonu
		endpoints: {
			auth: {type: String, default: "/auth/authentication"},
			providers: {type: String, default: "/providers"},
			games: {type: String, default: "/games"},
			gameLaunch: {type: String, default: "/games/game_launch"},
			balance: {type: String, default: "/balance"},
			transaction: {type: String, default: "/transaction"},
		},

		// Request format (json, form-data, vb.)
		requestFormat: {
			type: String,
			enum: ["json", "form-data", "xml"],
			default: "json",
		},

		// Aktif access token (runtime cache)
		accessToken: {
			type: String,
			default: null,
		},

		// Token son geçerlilik zamanı
		tokenExpiresAt: {
			type: Date,
			default: null,
		},

		// Durum
		status: {
			type: Number,
			enum: [0, 1], // 0: inactive, 1: active
			default: 1,
		},

		// Son senkronizasyon zamanı
		lastSyncAt: {
			type: Date,
			default: null,
		},

		// Senkronizasyon durumu
		syncStatus: {
			type: String,
			enum: ["idle", "syncing", "success", "failed"],
			default: "idle",
		},

		// Son hata mesajı
		lastError: {
			type: String,
			default: null,
		},

		// Ek ayarlar
		settings: {
			defaultCurrency: {type: String, default: "TRY"},
			defaultLanguage: {type: String, default: "tr"},
			rateLimit: {type: Number, default: 1000}, // ms between requests
			timeout: {type: Number, default: 30000}, // request timeout ms
			retryAttempts: {type: Number, default: 3},
		},

		// Meta bilgiler
		meta: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
	}
);

// Indexes
ApiProviderSchema.index({code: 1}, {unique: true});
ApiProviderSchema.index({status: 1});
ApiProviderSchema.index({syncStatus: 1, updatedAt: -1});
ApiProviderSchema.index({tokenExpiresAt: 1});

// Virtual: GameProvider sayısı
ApiProviderSchema.virtual("gameProviderCount", {
	ref: "GameProvider",
	localField: "_id",
	foreignField: "apiProvider",
	count: true,
});

// Methods
ApiProviderSchema.methods.isTokenValid = function () {
	if (!this.accessToken || !this.tokenExpiresAt) return false;
	return new Date() < this.tokenExpiresAt;
};

ApiProviderSchema.methods.getFullEndpoint = function (endpointKey) {
	const endpoint = this.endpoints[endpointKey];
	if (!endpoint) return null;
	return `${this.apiBaseUrl}${endpoint}`;
};

// Statics
ApiProviderSchema.statics.findActive = function () {
	return this.find({status: 1});
};

ApiProviderSchema.statics.findByCode = function (code) {
	return this.findOne({code: code.toLowerCase()});
};

module.exports = mongoose.model("ApiProvider", ApiProviderSchema);
