const express = require("express");
const router = express.Router();
const { authorizeUser } = require("../middleware/auth");
const mongoose = require("mongoose");

const Game = require("../database/models/Game");
const CryptoTransaction = require("../database/models/CryptoTransaction");
const BalanceTransaction = require("../database/models/BalanceTransaction");
const BonusHistory = require("../database/models/BonusHistory");
const Transaction = require("../database/models/Transaction");
const Setting = require("../database/models/Setting");
const SiteSettings = require("../database/models/SiteSettings");
const User = require("../database/models/User");
const BankTransfer = require("../database/models/BankTransfer");
const CampaignTransaction = require("../database/models/CampaignTransaction");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const GalaxyPayTransaction = require("../database/models/GalaxyPayTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");
const goldApiRoute = require("./goldApi");
const drakonApiRoute = require("./drakonApi");
const betinoviApiRoute = require("./betinoviApi");
const betcolabsApiRoute = require("./betcolabsApi");
const pokerApiRoute = require("./pokerApi");
const odemeRoutes = require("./odeme");
const cekimRoutes = require("./cekim");
const maxicallbackRoutes = require("./maxicallback");
const affiliateRoutes = require("./affiliate");
const apiRoutes = require("./apiRoutes"); // EN ÜSTE ekle
const shopRoutes = require("./shopRoutes");
const vipRoutes = require("./vipRoutes");
const battlepassRoutes = require("./battlepassRoutes");
const Wallet = require("./wallet");
const bannerRoutes = require("./banner");
const exchangeRates = require("./exchangeRates");
const wingoRoutes = require("./wingoRoutes");
const binance = require("./binance");
const gamehistory = require("./gamehistory/recent");
const bonusSettingRoutes = require("./bonusSetting");
const pixRoutes = require("./payment/pix");
const forcelabFinanceRoutes = require("./payment/forcelabFinance");
const meelDevRoutes = require("./payment/meelDev");
const galaxyPayRoutes = require("./payment/galaxyPay");
const fluxKriptoRoutes = require("./payment/fluxKripto");
const xPaymentsRoutes = require("./payment/xPayments");
const {
	DEFAULT_METHOD_FLAGS: GALAXY_PAY_DEFAULT_METHOD_FLAGS,
} = require("../utils/galaxyPay");
const pockersGamesRoute = require("./pokerApi");
const raceApiRoute = require("./raceApi");
const noticeApiRoute = require("./noticeApi");
const sportsTournamentApiRoute = require("./sportsTournamentApi");
const sportsTournamentUserApiRoute = require("./sportsTournamentUserApi");
const promoCodesRoutes = require("./promoCodes");
router.use("/poker_api", pockersGamesRoute);
router.use("/promo-codes", promoCodesRoutes);
router.use("/api/race", raceApiRoute);
router.use("/api/notices", noticeApiRoute);
router.use("/api/sports-tournaments", sportsTournamentApiRoute);
router.use("/api/user/sports-tournaments", sportsTournamentUserApiRoute);
	router.use("/bonus-settings", bonusSettingRoutes);
	router.use("/payment/pix", pixRoutes);
router.use("/payment/forcelab-finance", forcelabFinanceRoutes);
router.use("/payment/meeldev", meelDevRoutes);
router.use("/payment/galaxypay", galaxyPayRoutes);
router.use("/payment/fluxkripto", fluxKriptoRoutes);
router.use("/payment/xpayments", xPaymentsRoutes);
router.use("/exchange", exchangeRates);
router.use("/affiliate", affiliateRoutes);
router.use("/banner", bannerRoutes);
router.use("/maxicallback", maxicallbackRoutes);
router.use("/withdrawal", cekimRoutes);
router.use("/deposit", odemeRoutes);
router.use("/gold_api", goldApiRoute);
router.use("/drakon_api", drakonApiRoute);
router.use("/betinovi_api", betinoviApiRoute);
router.use("/betcolabs_api", betcolabsApiRoute);
router.use("/poker_api", pokerApiRoute);
router.use("/public", apiRoutes);
router.use("/shop", shopRoutes);
router.use("/vip", vipRoutes);
router.use("/gamehistory", gamehistory);
router.use("/battlepass", battlepassRoutes);
router.use("/wallet", Wallet);
router.use("/wingo", wingoRoutes);

router.use("/settings", require("./settings"));
router.use("/avatar", require("./avatar"));

// Public site settings endpoint (no auth required)
router.get("/site-settings", async (req, res) => {
	try {
		// Return a sanitized, public-only version of site settings.
		// Do NOT expose provider secrets (apiKey, apiSecret, etc.).
		let settings = await SiteSettings.findOne().lean();
		if (!settings) {
			// create defaults but don't expose secrets
			settings = new SiteSettings();
			await settings.save();
			settings = await SiteSettings.findOne().lean();
		}

		const publicSettings = {
			logo: settings.logo,
			logoMini: settings.logoMini,
			favicon: settings.favicon,

			footerText: settings.footerText,
			footerDescription: settings.footerDescription,

			socialLinks: settings.socialLinks || {},
			licenses: settings.licenses || [],
			partners: settings.partners || [],

			seo: settings.seo || {},

			maintenanceMode: settings.maintenanceMode || false,
			maintenanceMessage: settings.maintenanceMessage || "",

			originalGames: settings.originalGames || {},

			customCSS: settings.customCSS || "",
			customJS: settings.customJS || "",
			customHTML: settings.customHTML || "",

			forcelabFinance: {
				isActive: settings.forcelabFinance?.isActive || false,
				name: settings.forcelabFinance?.name || "Forcelab Finance",
				logo:
					settings.forcelabFinance?.logo ||
					"https://financeforcalabs.com/favicon.ico",
				minAmount: settings.forcelabFinance?.minAmount || 0,
				maxAmount: settings.forcelabFinance?.maxAmount || 0,
				currency: settings.forcelabFinance?.currency || "TRY",
			},

			meelDev: {
				isActive: settings.meelDev?.isActive || false,
				name: settings.meelDev?.name || "MeelDev",
				logo: settings.meelDev?.logo || "",
				minAmount: settings.meelDev?.minAmount || 0,
				maxAmount: settings.meelDev?.maxAmount || 0,
				currency: settings.meelDev?.currency || "TRY",
			},

			galaxyPay: {
				isActive: settings.galaxyPay?.isActive || false,
				name: settings.galaxyPay?.name || "GalaxyPay",
				logo: settings.galaxyPay?.logo || "",
				minAmount: settings.galaxyPay?.minAmount || 0,
				maxAmount: settings.galaxyPay?.maxAmount || 0,
				currency: settings.galaxyPay?.currency || "TRY",
				lang: settings.galaxyPay?.lang || "tr",
				methods: {
					...GALAXY_PAY_DEFAULT_METHOD_FLAGS,
					...(settings.galaxyPay?.methods || {}),
				},
			},

			fluxKripto: {
				isActive: settings.fluxKripto?.isActive || false,
				name: settings.fluxKripto?.name || "FluxKripto",
				logo: settings.fluxKripto?.logo || "",
				minAmount: settings.fluxKripto?.minAmount ?? 100,
				maxAmount: settings.fluxKripto?.maxAmount ?? 100000,
				currency: settings.fluxKripto?.currency || "TRY",
				methods: {
					deposit: settings.fluxKripto?.methods?.deposit !== false,
					withdraw: settings.fluxKripto?.methods?.withdraw !== false,
				},
				currencies: {
					trx: settings.fluxKripto?.currencies?.trx !== false,
					usdt: settings.fluxKripto?.currencies?.usdt !== false,
				},
			},

			xPayments: {
				isActive: settings.xPayments?.isActive || false,
				name: settings.xPayments?.name || "XPayment",
				logo: settings.xPayments?.logo || "",
				minAmount: settings.xPayments?.minAmount ?? 100,
				maxAmount: settings.xPayments?.maxAmount ?? 100000,
				currency: settings.xPayments?.currency || "TRY",
				methods: {
					deposit: settings.xPayments?.methods?.deposit !== false,
					withdraw: settings.xPayments?.methods?.withdraw !== false,
				},
			},

			// Sportsbook provider (betcolabs or nexusggr)
			sportsbookProvider: settings.providerSettings?.sportsbookProvider || "betcolabs",
		};

		// Keep response backward-compatible: return settings object directly
		res.status(200).json(publicSettings);
	} catch (error) {
		console.error("Site ayarları getirilirken hata:", error);
		res.status(500).json({
			success: false,
			error: "Site ayarları getirilirken bir hata oluştu.",
		});
	}
});

// Custom CSS endpoint - no cache headers
router.get("/custom.css", async (req, res) => {
	try {
		// No-cache headers for Cloudflare and browsers
		res.set({
			"Content-Type": "text/css; charset=utf-8",
			"Cache-Control":
				"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
			Pragma: "no-cache",
			Expires: "0",
			"Surrogate-Control": "no-store",
			"CDN-Cache-Control": "no-store",
			"Cloudflare-CDN-Cache-Control": "no-store",
		});

		let settings = await SiteSettings.findOne();
		const css = settings?.customCSS || "";
		res.send(css);
	} catch (error) {
		console.error("Custom CSS getirilirken hata:", error);
		res.set("Content-Type", "text/css");
		res.send("/* Error loading custom CSS */");
	}
});

// Custom JS endpoint - no cache headers
router.get("/custom.js", async (req, res) => {
	try {
		// No-cache headers for Cloudflare and browsers
		res.set({
			"Content-Type": "application/javascript; charset=utf-8",
			"Cache-Control":
				"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
			Pragma: "no-cache",
			Expires: "0",
			"Surrogate-Control": "no-store",
			"CDN-Cache-Control": "no-store",
			"Cloudflare-CDN-Cache-Control": "no-store",
		});

		let settings = await SiteSettings.findOne();
		const js = settings?.customJS || "";
		res.send(js);
	} catch (error) {
		console.error("Custom JS getirilirken hata:", error);
		res.set("Content-Type", "application/javascript");
		res.send("/* Error loading custom JS */");
	}
});

// Custom HTML endpoint - no cache headers
router.get("/custom.html", async (req, res) => {
	try {
		// No-cache headers for Cloudflare and browsers
		res.set({
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control":
				"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
			Pragma: "no-cache",
			Expires: "0",
			"Surrogate-Control": "no-store",
			"CDN-Cache-Control": "no-store",
			"Cloudflare-CDN-Cache-Control": "no-store",
		});

		let settings = await SiteSettings.findOne();
		const html = settings?.customHTML || "";
		res.send(html);
	} catch (error) {
		console.error("Custom HTML getirilirken hata:", error);
		res.set("Content-Type", "text/html");
		res.send("<!-- Error loading custom HTML -->");
	}
});

router.get("/settings/social", async (req, res) => {
	try {
		// Tekil ayar kaydı varsayımıyla (ilk kaydı alıyoruz)
		const settings = await Setting.findOne({}, { social: 1, _id: 0 });

		if (!settings) {
			return res.status(404).json({ message: "Settings not found" });
		}

		res.json({
			success: true,
			social: settings.social,
		});
	} catch (error) {
		console.error("Error fetching social settings:", error);
		res.status(500).json({ success: false, message: "Server error" });
	}
});

router.get("/games/:game_code", async (req, res) => {
	try {
		const { game_code } = req.params; // game_code parametresini al

		// Veritabanında game_code ile eşleşen bir oyun bul
		const game = await Game.findOne({ game_code });
		if (!game) {
			return res.status(404).json({
				success: false,
				message: "Game not found",
			});
		}

		// Oyun detaylarını döndür
		res.status(200).json({
			success: true,
			data: game,
		});
	} catch (error) {
		console.error("Error fetching game details:", error.message);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
});

router.get(
	"/transaction-history/:userId",
	authorizeUser(true),
	async (req, res) => {
	try {
		const { userId } = req.params;
		if (String(req.user?._id || "") !== String(userId)) {
			return res.status(403).json({
				success: false,
				error: "Yalnızca kendi işlem geçmişinizi görüntüleyebilirsiniz.",
			});
		}

		const cryptoTransactions = await CryptoTransaction.find({
			user: userId,
		})
			.sort({ createdAt: -1 })
			.lean();

		const normalizedCrypto = cryptoTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			title: "Kripto Para Transferi",
			type: tx.type, // deposit | withdraw
			status: tx.state, // pending | completed | rejected
			method: "crypto",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			currency: tx.data?.currency,
			cryptoAmount: tx.data?.cryptoAmount,
			bonusAmount: tx.data?.bonusAmount,
			bonusType: tx.data?.bonusType,
			providerId: tx.data?.providerId,
			transaction: tx.data?.transaction,
		}));

		const bankTransfers = await BankTransfer.find({ user: userId })
			.sort({ createdAt: -1 })
			.lean();

		const normalizedBank = bankTransfers.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			title: "Banka Para Transferi",
			type: tx.type || "deposit", // BankTransfer genelde çekim için
			status: tx.status, // pending | approved | rejected
			method: "bank",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			bankName: tx.bankName,
			accountName: tx.accountName,
			accountNumber: tx.accountNumber,
			iban: tx.iban,
			note: tx.note,
		}));

		const siteSettings = await SiteSettings.findOne().lean();

		// Kampanya işlemleri
		const campaignTransactions = await CampaignTransaction.find({
			user: userId,
		})
			.sort({ claimedAt: -1 })
			.lean();

		const normalizedCampaign = campaignTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.rewardAmount,
			title: "Bonus/Kampanya",
			type: "deposit",
			status: tx.status, // completed | cancelled
			method: "bonus",
			createdAt: tx.claimedAt,
			updatedAt: tx.claimedAt,
			campaignTitle: tx.campaignTitle,
			campaignId: tx.campaign,
			mode: tx.mode,
			requirements: tx.requirements,
			terms: tx.terms,
			assignedByAdmin: tx.assignedByAdmin,
		}));

		// Forcelab Finance işlemleri
		const forcelabTransactions = await ForcelabFinanceTransaction.find({
			user: userId,
		})
			.sort({ createdAt: -1 })
			.lean();

		const normalizedForcelab = forcelabTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			title: tx.providerName || "Forcelab Finance",
			type: tx.providerType || "deposit",
			status: tx.status,
			method: "forcelab",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			uuid:
				tx.providerType === "withdraw" && tx.status === "pending"
					? null
					: tx.uuid || null,
			externalTransactionId: tx.externalTransactionId,
			providerSlug: tx.providerSlug,
			currency: tx.currency,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		}));

		const galaxyPayMethodName =
			siteSettings?.galaxyPay?.name || "GalaxyPay";
		const fluxKriptoMethodName =
			siteSettings?.fluxKripto?.name || "FluxKripto";
		const xPaymentsMethodName =
			siteSettings?.xPayments?.name || "XPayment";

		const galaxyPayTransactions = await GalaxyPayTransaction.find({
			user: userId,
		})
			.sort({ createdAt: -1 })
			.lean();

		const normalizedGalaxyPay = galaxyPayTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			title: galaxyPayMethodName,
			type: tx.type,
			status: tx.status,
			method: "galaxypay",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			externalTransactionId: tx.externalTransactionId,
			paymentId: tx.paymentId || null,
			providerMethod: tx.method,
			currency: tx.currency,
			paymentUrl: tx.paymentUrl,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		}));

		const fluxKriptoTransactions = await FluxKriptoTransaction.find({
			user: userId,
		})
			.sort({ createdAt: -1 })
			.lean();

		const normalizedFluxKripto = fluxKriptoTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			requestedAmount: tx.requestedAmount ?? tx.amount,
			providerAmount: tx.providerAmount ?? null,
			title: fluxKriptoMethodName,
			type: tx.type,
			status: tx.status,
			method: "fluxkripto",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			externalTransactionId: tx.externalTransactionId,
			financeId: tx.financeId || null,
			orderId: tx.orderId || null,
			currency: tx.currency,
			cryptoAmount: tx.cryptoAmount ?? null,
			rate: tx.rate ?? null,
			expiresAt: tx.expiresAt || null,
		}));

		const xPaymentTransactions = await XPaymentTransaction.find({
			user: userId,
		})
			.sort({ createdAt: -1 })
			.lean();

		const normalizedXPayments = xPaymentTransactions.map((tx) => ({
			_id: tx._id,
			amount: tx.amount,
			requestedAmount: tx.requestedAmount ?? tx.amount,
			providerAmount: tx.providerAmount ?? null,
			title: xPaymentsMethodName,
			type: tx.type,
			status: tx.status,
			method: "xpayments",
			createdAt: tx.createdAt,
			updatedAt: tx.updatedAt,
			externalTransactionId: tx.externalTransactionId,
			financeId: tx.financeId || null,
			providerStatus: tx.providerStatus || null,
			isProcessing: tx.isProcessing === true,
			currency: tx.currency || "TRY",
		}));

		const allTransactions = [
			...normalizedCrypto,
			...normalizedBank,
			...normalizedCampaign,
			...normalizedForcelab,
			...normalizedGalaxyPay,
			...normalizedFluxKripto,
			...normalizedXPayments,
		].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		res.json({ transactions: allTransactions });
	} catch (error) {
		console.error("Transaction history error:", error);
		res.status(500).json({ error: "Server error" });
	}
	},
);

router.get("/bonus-history/:userId", async (req, res) => {
	try {
		const { userId } = req.params;

		// 1. CryptoTransactions -> deposit bonusları
		const cryptoBonuses = await CryptoTransaction.find({
			user: userId,
			type: "deposit",
			"data.bonusAmount": { $gt: 0 },
		}).lean();

		const mappedCrypto = cryptoBonuses.map((tx) => ({
			source: "crypto",
			bonusType: tx.data?.bonusType,
			bonusAmount: tx.data?.bonusAmount,
			currency: tx.data?.currency,
			createdAt: tx.createdAt,
		}));

		// 2. BalanceTransactions -> bonus işlemleri
		const bonusTypes = [
			"affiliateCommission",
			"affiliateEarningClaim",
			"rakebackClaim",
			"rainTip",
			"adminAdjust",
		];

		const balanceBonuses = await BalanceTransaction.find({
			user: userId,
			type: { $in: bonusTypes },
		}).lean();

		const mappedBalance = balanceBonuses.map((tx) => ({
			source: "balance",
			bonusType: tx.type,
			bonusAmount: tx.amount,
			currency: null,
			createdAt: tx.createdAt,
		}));

		const bonusHistories = await BonusHistory.find({
			userId: userId,
		}).lean();

		const mappedHistories = bonusHistories.map((tx) => ({
			source: "history",
			bonusType: tx.type,
			bonusAmount: tx.amount,
			level: tx.level,
			currency: null,
			createdAt: tx.claimedAt,
		}));

		const allBonuses = [
			...mappedCrypto,
			...mappedBalance,
			...mappedHistories,
		].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		res.json({ bonuses: allBonuses });
	} catch (error) {
		console.error("Bonus history error:", error);
		res.status(500).json({ error: "Server error" });
	}
});

router.get("/game-history/:identifier", async (req, res) => {
	try {
		const { identifier } = req.params;
		let { page = 1, limit = 20 } = req.query;

		page = parseInt(page) || 1;
		limit = parseInt(limit) || 20;

		let userId = null;

		// 1) Identifier kontrol — önce phone olarak dene, bulamazsa ObjectId olarak kullan
		const user = await User.findOne({ phone: identifier }).lean();
		if (user) {
			userId = user._id.toString();
		} else if (mongoose.Types.ObjectId.isValid(identifier)) {
			userId = identifier;
		} else {
			return res
				.status(404)
				.json({ error: "User not found" });
		}

		// 2) Toplam kayıt sayısı
		const totalRecords = await Transaction.countDocuments({
			user_code: userId,
		});

		// 3) Transactionları getir (pagination ile)
		const transactions = await Transaction.find({ user_code: userId })
			.sort({ created_at: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean();

		// 4) Game bilgilerini çek
		const gameCodes = [...new Set(transactions.map((tx) => tx.game_code))];
		const games = await Game.find({ game_code: { $in: gameCodes } }).lean();

		const gameMap = {};
		games.forEach((g) => {
			gameMap[g.game_code] = g;
		});

		// 5) Transaction + Game bilgilerini birleştir
		const history = transactions.map((tx) => {
			const game = gameMap[tx.game_code] || {};
			return {
				txn_id: tx.txn_id,
				round_id: tx.round_id,
				bet_money: tx.bet_money,
				win_money: tx.win_money,
				balance_before: tx.balance_before,
				balance_after: tx.balance_after,
				created_at: tx.created_at,
				txn_type: tx.txn_type,
				game_code: tx.game_code,

				// Game’den gelen alanlar
				game_name: game.game_name || "Unknown",
				game_type: game.game_type || "other",
				banner: game.banner || null,
				provider: game.provider || null,
			};
		});

		res.json({
			history,
			pagination: {
				totalRecords,
				totalPages: Math.ceil(totalRecords / limit),
				currentPage: page,
				pageSize: limit,
			},
		});
	} catch (error) {
		console.error("Game history error:", error);
		res.status(500).json({ error: "Server error" });
	}
});

module.exports = (io) => {
	router.get("/", (req, res) => {
		res.status(200).json({ success: true });
	});

	router.use("/captcha", require("./captcha")());
	router.use("/auth", require("./auth")());
	router.use("/callback", require("./callback")(io));
	router.use("/admin", require("./admin/index"));
	router.use("/notices", require("./notice/index"));
	router.use("/users", require("./user/index"));
	router.use("/news", require("./news/index"));
	router.use("/bonus", require("./bonus/index"));
	router.use("/games", require("./games/index"));
	router.use("/binance", require("./binance"));

	router.use("/customerservices", require("./customerservices/index"));

	router.use("/telegram-settings", require("./telegramSettings"));

	router.use("/telegram", require("./telegram"));

	// TEŞHİS: Gerçek IP zincirini görmek için geçici endpoint. Sorun çözülünce kaldırılacak.
	router.get("/debug-ip", (req, res) => {
		const { getClientIp } = require("../utils/ip");
		res.status(200).json({
			resolvedIp: getClientIp(req),
			headers: {
				"cf-connecting-ip": req.headers["cf-connecting-ip"] || null,
				"true-client-ip": req.headers["true-client-ip"] || null,
				"x-forwarded-for": req.headers["x-forwarded-for"] || null,
				"x-real-ip": req.headers["x-real-ip"] || null,
			},
			expressIp: req.ip,
			expressIps: req.ips,
			remoteAddress: req.socket?.remoteAddress || null,
		});
	});

	// ⚠️ GÜVENLİK: 404 Handler
	router.use((req, res, next) => {
		res.status(404).json({ success: false, message: "Endpoint not found" });
	});

	// ⚠️ GÜVENLİK: Global Error Handler - Stack trace'i production'da gizle
	router.use((err, req, res, next) => {
		console.error("Server Error:", err.message);
		
		// Production'da stack trace gizle
		const isProduction = process.env.NODE_ENV === "production";
		
		res.status(err.status || 500).json({
			success: false,
			message: isProduction ? "Sunucu hatası oluştu" : err.message,
			// Sadece development'ta stack trace göster
			...(isProduction ? {} : { stack: err.stack })
		});
	});

	return router;
};
