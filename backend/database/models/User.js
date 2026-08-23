const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const {
	RIVO_WALLET,
	createRivoWallet,
	normalizeWalletState,
} = require("../../utils/rivoWallet");

// Avatar validation helper (inline to avoid circular dependencies)
const isAvatarValid = (avatarPath) => {
	if (!avatarPath) return false;
	if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
		return true;
	}
	try {
		const relativePath = avatarPath.replace(/^\//, "");
		const fullPath = path.join(__dirname, "..", "..", relativePath);
		return fs.existsSync(fullPath);
	} catch {
		return false;
	}
};

// Default fallback avatar
const DEFAULT_FALLBACK_AVATAR = "/uploads/avatars/default.png";

// Cache for fallback avatar from SiteSettings
let cachedFallbackAvatar = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

// Function to get fallback avatar (will be populated after DB init)
const getFallbackAvatarSync = () => {
	return cachedFallbackAvatar || DEFAULT_FALLBACK_AVATAR;
};

// Function to update fallback cache (called by avatar helper)
const updateFallbackCache = (fallback) => {
	cachedFallbackAvatar = fallback;
	cacheTime = Date.now();
};

const walletSchema = new mongoose.Schema(
	{
		coinType: { type: String, required: true },
		balance: { type: Number, default: 0 },
		chain: { type: String, required: true },
		type: { type: String, required: true },
	},
	{ _id: false }
);

const mfaMethodSchema = new mongoose.Schema(
	{
		id: { type: String, required: true },
		type: {
			type: String,
			enum: ["sms", "email"],
			default: "sms",
		},
		phone: { type: String },
		phoneMasked: { type: String },
		email: { type: String },
		emailMasked: { type: String },
		label: { type: String },
		verifiedAt: { type: Date },
		enabledAt: { type: Date },
		disabledAt: { type: Date },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const userSchema = new mongoose.Schema(
	{
		numericId: { type: Number },

		local: {
			email: { type: String, required: true },
			emailVerified: { type: Boolean, default: false },
			password: { type: String },
		},

		phone: { type: String, required: false },
		name: { type: String, required: false },
		username: { type: String, required: false },

		identity: {
			idNumber: { type: String }, // CPF (Pix için zorunlu)
			verified: { type: Boolean, default: false },
			documentType: {
				type: String,
				enum: ["CPF", "CNPJ"],
				default: "CPF",
			}, // ✅ Yeni alan
		},

		address: {
			cep: { type: String },
			estado: { type: String },
			cidade: { type: String },
			bairro: { type: String },
			rua: { type: String },
			numeroEnd: { type: String },
			complemento: { type: String },
		},

		birthday: { type: Date },

		// 🔹 OAuth / Sosyal giriş alanları
		google: { id: String, email: String },
		yandex: { id: String, email: String },
		telegram: { id: String, username: String },
		facebook: { id: String, email: String },
		discord: { id: String },

		// 🔹 Web3 login alanı
		web3: [
			{
				address: { type: String },
				provider: { type: String },
				chain: { type: String },
				connectedAt: { type: Date, default: Date.now },
			},
		],

		avatar: { type: String },
		rank: { type: String, default: "user" },

		// Admin role reference (for admin panel access control)
		adminRole: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "AdminRole",
		},

		wallets: {
			type: [walletSchema],
			default: () => [
				createRivoWallet(),
				// { coinType: "USDT", balance: 0, chain: "TRON", type: "trc-20" },
				// { coinType: "BTC", balance: 0, chain: "BTC", type: "native" },
				// { coinType: "ETH", balance: 0, chain: "ETH", type: "native" },
				// { coinType: "BNB", balance: 0, chain: "BNB", type: "native" },
				// { coinType: "TRX", balance: 0, chain: "TRON", type: "native" },
				// { coinType: "USDT", balance: 0, chain: "ETH", type: "erc-20" },
				// { coinType: "USDT", balance: 0, chain: "BNB", type: "bep-20" },
				// { coinType: "Rivo", balance: 0, chain: "TRON", type: "trc-20" },
			],
		},

		currency: {
			fiatCurrency: { type: String, default: "USD" },
			coinType: { type: String, default: RIVO_WALLET.coinType },
			type: { type: String, default: RIVO_WALLET.type },
			chain: { type: String, default: RIVO_WALLET.chain },
			coins: { type: Number, default: 0 },
		},

		xp: { type: Number, default: 0 },

		vault: {
			balances: {
				type: [
					{
						coinType: { type: String },
						chain: { type: String },
						type: { type: String },
						amount: { type: Number, default: 0 },
						expireAt: { type: Date },
					},
				],
				default: [],
			},
			expireAt: { type: Date },
		},

		stats: {
			bet: { type: Number, default: 0 },
			won: { type: Number, default: 0 },
			deposit: { type: Number, default: 0 },
			withdraw: { type: Number, default: 0 },
		},

		leaderboard: {
			points: { type: Number, default: 0 },
		},

			limits: {
				betToWithdraw: { type: Number, default: 0 },
				minWithdraw: { type: Number, default: 0 },
				betToRain: { type: Number, default: 0 },
			blockAffiliate: { type: Boolean, default: false },
			blockRain: { type: Boolean, default: false },
			blockTip: { type: Boolean, default: false },
			limitTip: { type: Number, default: 0 },
			blockSponsor: { type: Boolean, default: false },
			blockLeaderboard: { type: Boolean, default: false },
		},

		betAccess: {
			blocked: { type: Boolean, default: false },
			reason: { type: String, default: "" },
			updatedAt: { type: Date },
		},

		// Admin panelindeki "Kontroller" sekmesi tarafından yönetilen
		// hesap kısıtlamaları ve platform erişim izinleri.
		controls: {
			withdrawalBlocked: { type: Boolean, default: false },
			depositBlocked: { type: Boolean, default: false },
			gameBlocked: { type: Boolean, default: false },
			tipBlocked: { type: Boolean, default: false },
			categoryRestrictions: {
				slots: { type: Boolean, default: false },
				liveCasino: { type: Boolean, default: false },
				sportsBook: { type: Boolean, default: false },
				originals: { type: Boolean, default: false },
			},
			// Bet Limitleme: kategori bazlı maksimum bahis tutarı. 0 = limitsiz.
			// "casino" hem slot hem originals bahislerini kapsayan ortak limittir.
			categoryBetLimits: {
				liveCasino: { type: Number, default: 0 },
				casino: { type: Number, default: 0 },
				sportsBook: { type: Number, default: 0 },
			},
			platformAccess: {
				affiliatePanel: { type: Boolean, default: false },
				partnerAccess: { type: Boolean, default: false },
				contentEditor: { type: Boolean, default: false },
				chatModerator: { type: Boolean, default: false },
				streamer: { type: Boolean, default: false },
			},
			updatedAt: { type: Date },
		},

		// CRM: Tag Manager üzerinden atanan etiketler
		tags: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
			default: [],
		},

		// Kayıp Bonusu: son talep edilen dönemin bitiş tarihi.
		// Bir sonraki dönem bu tarihten (yoksa createdAt'ten) başlar.
		lossBonus: {
			lastClaimAt: { type: Date },
		},

		// Yatırım Bonusu: son talep edilen dönemin bitiş tarihi.
		depositBonus: {
			lastClaimAt: { type: Date },
		},

		// Paylaşımlı bonus kilidi: bir bonus alındığında (örn. Yatırım Bonusu)
		// diğer bonusların talep edilmesini VE gerçek para çekimini engeller.
		// Herhangi bir bonus servisi bu alanı okuyup/yazabilir.
		// - wageringRequired > 0 ise kilit, çevrim tamamlanana kadar aktif kalır
		//   (blockedUntil'e bakılmaz).
		// - wageringRequired === 0 ise eski davranış geçerlidir: kilit sadece
		//   blockedUntil saatine kadar aktiftir (sadece diğer bonusları engeller,
		//   çekimi engellemez).
		bonusLock: {
			source: { type: String, default: "" }, // "deposit_bonus" | "loss_bonus"
			claimId: { type: mongoose.Schema.Types.ObjectId, default: null },
			claimModel: { type: String, default: "" }, // "DepositBonusClaim" | "LossBonusClaim"
			bonusAmount: { type: Number, default: 0 },
			wageringMultiplier: { type: Number, default: 0 },
			wageringRequired: { type: Number, default: 0 },
			wageringSince: { type: Date, default: null },
			blockedUntil: { type: Date },
			completedAt: { type: Date, default: null },
		},

		// Reload Bonusu kilidi: bonusLock'tan tamamen bağımsızdır (Reload,
		// Yatırım/Kayıp Bonusu'nu bloklamaz ve onlardan bloklanmaz). Aktif bir
		// Reload ataması varken kullanıcı çekim yapamaz; çevrim tamamlanan
		// veya süresi biten Reload'lar bu kilidi otomatik serbest bırakır.
		reloadLock: {
			assignmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
			totalAmount: { type: Number, default: 0 },
			wageringMultiplier: { type: Number, default: 0 },
			wageringRequired: { type: Number, default: 0 },
			wageringSince: { type: Date, default: null },
			completedAt: { type: Date, default: null },
		},

		rakeback: {
			earned: { type: Number, default: 0 },
			available: { type: Number, default: 0 },
		},

		affiliates: {
			code: { type: String },
			referred: { type: Number, default: 0 },
			referredLevel2: { type: Number, default: 0 },
			referredLevel3: { type: Number, default: 0 },
			bet: { type: Number, default: 0 },
			deposit: { type: Number, default: 0 },
			earned: { type: Number, default: 0 },
			available: { type: Number, default: 0 },
			generated: { type: Number, default: 0 },
			referrer: { type: mongoose.Schema.ObjectId, ref: "User" },
			referrerLevel2: { type: mongoose.Schema.ObjectId, ref: "User" },
			referrerLevel3: { type: mongoose.Schema.ObjectId, ref: "User" },
			referredAddress: { type: String },
			referredAt: { type: Date },
			redeemedCode: { type: String },
			pid: { type: String },
		},

		claimedCampaigns: { type: [String], default: [] },

		fair: {
			clientSeed: { type: String },
		},

		anonymous: { type: Boolean, default: false },
		proxy: { type: String },

		country: {
			code: { type: String },
			name: { type: String },
		},

		ips: [
			{
				address: { type: String },
				createdAt: { type: Date, default: Date.now },
			},
		],

		mute: {
			expire: { type: Date },
			reason: { type: String },
		},

		ban: {
			expire: { type: Date },
			reason: { type: String },
		},

		verifiedAt: { type: Date },

		mfa: {
			enabled: { type: Boolean, default: false },
			preferredMethodId: { type: String },
			methods: { type: [mfaMethodSchema], default: [] },
			lastVerifiedAt: { type: Date },
			disabledAt: { type: Date },
			updatedAt: { type: Date },
		},

		updatedAt: { type: Date, default: Date.now },
		createdAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

userSchema.pre("validate", function (next) {
	const normalizedState = normalizeWalletState(this);
	this.wallets = normalizedState.wallets;
	this.currency = normalizedState.currency;
	next();
});

userSchema.pre("save", async function (next) {
	if (this.isNew && !this.numericId) {
		try {
			const lastUser = await mongoose
				.model("User")
				.findOne({}, { numericId: 1 })
				.sort({ numericId: -1 })
				.limit(1);
			this.numericId =
				lastUser && lastUser.numericId
					? lastUser.numericId + 1
					: 1000000;
		} catch (error) {
			return next(error);
		}
	}
	next();
});

// Avatar transform - ensures valid avatar on every user data return
const avatarTransform = (doc, ret) => {
	if (ret && ret.avatar !== undefined) {
		if (!isAvatarValid(ret.avatar)) {
			ret.avatar = getFallbackAvatarSync();
		}
	}
	return ret;
};

// Apply transform to toJSON and toObject
userSchema.set("toJSON", {
	transform: avatarTransform,
});

userSchema.set("toObject", {
	transform: avatarTransform,
});

userSchema.index({ createdAt: -1 });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ numericId: 1 }, { unique: true, sparse: true });
userSchema.index({ "local.email": 1 }, { unique: true });
userSchema.index({ "affiliates.code": 1 });
userSchema.index({ "web3.address": 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ "mfa.enabled": 1 });
userSchema.index({ tags: 1 });

const User = mongoose.model("User", userSchema);

// Export model and helper functions
module.exports = User;
module.exports.updateFallbackCache = updateFallbackCache;
module.exports.getFallbackAvatarSync = getFallbackAvatarSync;
module.exports.isAvatarValid = isAvatarValid;
