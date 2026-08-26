const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
	general: {
		siteName: { type: String, default: "Casino" },
		logo: { type: String },
		favicon: { type: String },
		supportLink: { type: String },
		termsUrl: { type: String },
		privacyUrl: { type: String },
		allowRegistration: { type: Boolean, default: true },
		maintenance: { enabled: { type: Boolean, default: false } },
		rain: { enabled: { type: Boolean, default: true } },
		leaderboard: { enabled: { type: Boolean, default: true } },
		tip: { enabled: { type: Boolean, default: true } },
		affiliate: {
			enabled: { type: Boolean, default: true },
			gameLevels: {
				level1: { type: Number, default: 7 },
				level2: { type: Number, default: 3 },
				level3: { type: Number, default: 1 },
			},
			depositLevels: {
				level1: { type: Number, default: 5 },
				level2: { type: Number, default: 2 },
				level3: { type: Number, default: 1 },
			},
		},
		reward: {
			multiplier: { type: Number, default: 1 },
			rakeback: { type: Number, default: 5 },
		},
	},

	// 🔹 Yeni bölüm: Auth / Sosyal Login ayarları
	auth: {
		google: {
			enabled: { type: Boolean, default: true },
			clientId: { type: String },
			clientSecret: { type: String },
		},
		telegram: {
			enabled: { type: Boolean, default: true },
			botToken: { type: String }, // Bot token (API için)
			botName: { type: String }, // Widget doğrulama için
		},
		web3: {
			enabled: { type: Boolean, default: true },
			supportedChains: [
				{ type: String, default: ["ETH", "BNB", "POLYGON"] },
			],
			messageTemplate: {
				type: String,
				default: "Login at {timestamp}",
			},
		},
		jwt: {
			secret: { type: String, default: "supersecretkey" },
			expiresIn: { type: String, default: "7d" },
		},
	},

	exchangeRates: {
		USD: { type: Number, default: 1 },
		GBP: { type: Number, default: 1.25 },
		CAD: { type: Number, default: 1.35 },
		AUD: { type: Number, default: 1.45 },
		EUR: { type: Number, default: 0.92 },
		TRY: { type: Number, default: 33 },
		BRL: { type: Number, default: 5.1 },
		MXN: { type: Number, default: 17 },
		INR: { type: Number, default: 83 },
		JPY: { type: Number, default: 155 },
		KRW: { type: Number, default: 1350 },
		PHP: { type: Number, default: 56 },
		ZAR: { type: Number, default: 18 },
		RUB: { type: Number, default: 90 },
		SEK: { type: Number, default: 11 },
		NOK: { type: Number, default: 11.5 },
		DKK: { type: Number, default: 6.8 },
		SGD: { type: Number, default: 1.35 },
		MYR: { type: Number, default: 4.7 },
		THB: { type: Number, default: 35 },
		VND: { type: Number, default: 24000 },
		ARS: { type: Number, default: 900 },
		COP: { type: Number, default: 3800 },
		CLP: { type: Number, default: 900 },
		CNY: { type: Number, default: 1 },
	},

	social: {
		discord: { type: String },
		twitter: { type: String },
		telegram: { type: String },
		instagram: { type: String },
		facebook: { type: String },
		youtube: { type: String },
		tiktok: { type: String },
		reddit: { type: String },
		medium: { type: String },
		github: { type: String },
		linkedin: { type: String },
	},

	chat: {
		mode: { type: String, enum: ["normal", "vipOnly"], default: "normal" },
		enabled: { type: Boolean, default: true },
		rooms: {
			en: { enabled: { type: Boolean, default: true } },
			tr: { enabled: { type: Boolean, default: true } },
			de: { enabled: { type: Boolean, default: false } },
			es: { enabled: { type: Boolean, default: false } },
			beg: { enabled: { type: Boolean, default: true } },
			whale: { enabled: { type: Boolean, default: true } },
		},
	},

	games: {
		crash: { enabled: { type: Boolean, default: true } },
		roll: { enabled: { type: Boolean, default: true } },
		blackjack: { enabled: { type: Boolean, default: true } },
		duels: { enabled: { type: Boolean, default: true } },
		mines: { enabled: { type: Boolean, default: true } },
		towers: { enabled: { type: Boolean, default: true } },
		unbox: { enabled: { type: Boolean, default: true } },
		battles: { enabled: { type: Boolean, default: true } },
		upgrader: { enabled: { type: Boolean, default: true } },
	},

	robux: {
		deposit: { enabled: { type: Boolean, default: true } },
		withdraw: { enabled: { type: Boolean, default: true } },
	},
	limited: {
		deposit: { enabled: { type: Boolean, default: true } },
		withdraw: { enabled: { type: Boolean, default: true } },
	},
	steam: {
		deposit: { enabled: { type: Boolean, default: false } },
		withdraw: { enabled: { type: Boolean, default: false } },
	},
	crypto: {
		deposit: { enabled: { type: Boolean, default: true } },
		withdraw: { enabled: { type: Boolean, default: true } },
		supportedCoins: [{ type: String, default: ["BTC", "ETH", "USDT"] }],
		minDeposit: { type: Number, default: 5 },
		minWithdraw: { type: Number, default: 10 },
		networkFee: { type: Number, default: 1.5 },
	},
	gift: {
		deposit: { enabled: { type: Boolean, default: true } },
		withdraw: { enabled: { type: Boolean, default: true } },
	},
	credit: {
		deposit: { enabled: { type: Boolean, default: true } },
		withdraw: { enabled: { type: Boolean, default: true } },
	},

	security: {
		twoFactorEnabled: { type: Boolean, default: true },
		loginAlerts: { type: Boolean, default: true },
	},

	limits: {
		maxWithdrawPerDay: { type: Number, default: 10000 },
		maxDepositPerDay: { type: Number, default: 50000 },
		maxBetAmount: { type: Number, default: 1000 },
	},

	ui: {
		theme: { type: String, enum: ["dark", "light"], default: "dark" },
		languageDefault: { type: String, default: "en" },
	},

	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

settingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Setting", settingSchema);
