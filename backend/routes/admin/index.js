const express = require("express");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // JWT kütüphanesi
const User = require("../../database/models/User"); // Kullanıcı modelini import edin
const mongoose = require("mongoose");
const upload = require("../../middleware/upload");
const adminWingoController = require("../../controllers/adminWingoController");
const manualBonusCategoryController = require("../../controllers/admin/manualBonusCategoryController");
const lossBonusController = require("../../controllers/admin/lossBonusController");
const depositBonusController = require("../../controllers/admin/depositBonusController");
const trialBonusController = require("../../controllers/admin/trialBonusController");
const balanceAnalysisController = require("../../controllers/admin/balanceAnalysisController");
const crmReportController = require("../../controllers/admin/crmReportController");
const reloadBonusController = require("../../controllers/admin/reloadBonusController");
const callScenarioController = require("../../controllers/admin/callScenarioController");
const playerSegmentsController = require("../../controllers/admin/playerSegments");
const tagsController = require("../../controllers/admin/tags");
const { generalGetChatOnlineCount } = require("../../utils/general/chat");

// Tabloları import edin
const Transactions = require("../../database/models/Transaction");
const Battlesbet = require("../../database/models/BattlesBet");
const Blackjackbet = require("../../database/models/BlackjackBet");
const Crashbet = require("../../database/models/CrashBet");
const Duelsbet = require("../../database/models/DuelsBet");
const MinesGame = require("../../database/models/MinesGame");
const Rollbet = require("../../database/models/RollBet");
const TowersGame = require("../../database/models/TowersGame");
const UpgraderGame = require("../../database/models/UpgraderGame");
const UnboxGame = require("../../database/models/UnboxGame");
const Deposit = require("../../database/models/Deposit");
const Withdrawal = require("../../database/models/Withdrawal");
const CryptoTransaction = require("../../database/models/CryptoTransaction");
const Notice = require("../../database/models/Notice"); // Notice modelini import edin
const { resolveNoticeAudience } = require("../../utils/noticeAudienceResolver");
const Provider = require("../../database/models/Providers"); // Provider modelini import edin
const DrakonProvider = require("../../database/models/drakonProvider"); // Provider modelini import edin
const Game = require("../../database/models/Game"); // Game modelini import edin
const PromoCode = require("../../database/models/PromoCode"); // Promocode modelini import edin
const TicketEvent = require("../../database/models/TicketEvent");
const Ticket = require("../../database/models/Ticket");
const ticketService = require("../../services/ticketService");
const RaceTournament = require("../../database/models/RaceTournament");
const RaceEntry = require("../../database/models/RaceEntry");
const raceService = require("../../services/raceService");
const SportsTournament = require("../../database/models/SportsTournament");
const sportsTournamentService = require("../../services/sportsTournamentService");
const Leaderboard = require("../../database/models/Leaderboard"); // Leaderboard modelini import edin
const News = require("../../database/models/News"); // News modelini import edin
const CustomerService = require("../../database/models/CustomerService"); // CustomerService modelini import edin
const BalanceTransaction = require("../../database/models/BalanceTransaction"); // BalanceTransaction modelini buraya ekleyin
const Bonus = require("../../database/models/Bonus"); // Bonus modeli
const Rain = require("../../database/models/Rain"); // Rain modelini buraya bağlayın
const Box = require("../../database/models/Box");
const FilterPhrase = require("../../database/models/FilterPhrase");
const Setting = require("../../database/models/Setting");
const LimitedItem = require("../../database/models/LimitedItem");
const ShopItem = require("../../database/models/ShopItem");
const ShopPurchase = require("../../database/models/ShopPurchase");
const Banner = require("../../database/models/Banner");
const { normalizeBannerType, serializeBanner } = require("../../utils/banner");
const {
	buildAdminUserSearch,
	isTrueQueryValue,
	resolveAdminUserSearch,
} = require("../../utils/adminUserSearch");
const Category = require("../../database/models/Category");
const VIPConfig = require("../../database/models/Vip");
const BankTransfer = require("../../database/models/BankTransfer");
const SiteSettings = require("../../database/models/SiteSettings");
const GameProvider = require("../../database/models/GameProvider");
const { getStoredSmsOtpConfig } = require("../../services/smsOtpConfigService");
const {
	buildHistoryResultMatch,
	matchesHistoryResult,
	normalizeHistoryResultFilter,
	parseHistoryDate,
	summarizeHistory,
} = require("../../services/gameHistoryService");

// Eski kayıtlarda Game.provider bazen ObjectId yerine "Pragmatic Play" gibi
// string tutuyor. Mongoose populate bu durumda CastError fırlattığı için
// güvenli bir manuel lookup uyguluyoruz.
const attachGameProviders = async (games) => {
	if (!Array.isArray(games) || games.length === 0) return;
	const validIds = [];
	for (const g of games) {
		const p = g?.provider;
		if (p && typeof p !== "object" && mongoose.Types.ObjectId.isValid(p)) {
			validIds.push(String(p));
		}
	}
	const providerMap = new Map();
	if (validIds.length) {
		const providerDocs = await GameProvider.find({
			_id: { $in: [...new Set(validIds)] },
		})
			.select("name code")
			.lean();
		providerDocs.forEach((p) => providerMap.set(String(p._id), p));
	}
	games.forEach((g) => {
		const p = g?.provider;
		if (!p) {
			g.provider = null;
			return;
		}
		if (typeof p === "object") return; // already populated
		if (mongoose.Types.ObjectId.isValid(p) && providerMap.has(String(p))) {
			g.provider = providerMap.get(String(p));
		} else if (typeof p === "string") {
			g.provider = { name: p };
		} else {
			g.provider = null;
		}
	});
};
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Multer configuration for site settings uploads
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

const siteSettingsStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueName + path.extname(file.originalname));
	},
});

const siteSettingsUpload = multer({
	storage: siteSettingsStorage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Multer configuration for category icons (fixed filenames)
const categoryUploadDir = path.join(
	__dirname,
	"..",
	"..",
	"uploads",
	"category",
);
if (!fs.existsSync(categoryUploadDir)) {
	fs.mkdirSync(categoryUploadDir, { recursive: true });
}

const categoryIconStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, categoryUploadDir);
	},
	filename: (req, file, cb) => {
		// Geçici dosya adı - sonra rename edilecek
		const tempName = "temp_" + Date.now() + ".png";
		cb(null, tempName);
	},
});

const categoryIconUpload = multer({
	storage: categoryIconStorage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (req, file, cb) => {
		if (file.mimetype === "image/png") {
			cb(null, true);
		} else {
			cb(new Error("Sadece PNG dosyaları yüklenebilir!"), false);
		}
	},
});

const Season = require("../../database/models/Season");
const Reward = require("../../database/models/Reward");
const Mission = require("../../database/models/Mission");
const BonusSetting = require("../../database/models/BonusSetting");
const AdminManualAdjustment = require("../../database/models/AdminManualAdjustment");
const FreeSpinGrant = require("../../database/models/FreeSpinGrant");
const UserNote = require("../../database/models/UserNote");
const AdminUserAuditLog = require("../../database/models/AdminUserAuditLog");

const FuturesBet = require("../../database/models/FuturesBet");
const TurboTrade = require("../../database/models/TurboTrade");
const WingoBet = require("../../database/models/WingoBet");
const WingoGame = require("../../database/models/WingoGame");
const WingoConfig = require("../../database/models/WingoConfig");
const SportsBet = require("../../database/models/SportsBet");
const SportsBetEvent = require("../../database/models/SportsBetEvent");
const CampaignTransaction = require("../../database/models/CampaignTransaction");
const BonusHistory = require("../../database/models/BonusHistory");
const GalaxyPayTransaction = require("../../database/models/GalaxyPayTransaction");
const FluxKriptoTransaction = require("../../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../../database/models/XPaymentTransaction");

// Permission ve Role modelleri (auto-populate için önce yüklenmeli)
const Permission = require("../../database/models/Permission");
const AdminRole = require("../../database/models/AdminRole");

const io = require("socket.io"); // Socket.io kullanılacak
const router = express.Router();
const { getIO } = require("../../utils/io");
const {
	notifyAndDisconnectSuspendedUser,
} = require("../../utils/userSuspension");
const { createAdminNotification } = require("../../utils/adminNotification");
const AdminNotification = require("../../database/models/AdminNotification");
const {
	authenticateAdmin,
	checkPermission,
	hasPermission,
} = require("../../middleware/permission");

// 🔐 All admin endpoints require an admin JWT
router.use(authenticateAdmin);
const {
	getActiveWallet,
	updateUserBalance,
	getWallet,
} = require("../../utils/wallet");
	const {
		createAdminManualAdjustment,
	} = require("../../services/adminManualAdjustmentService");
		const {
			createBulkManualBonus,
			listAffiliateCodes,
			listLastBonusCategories,
		} = require("../../services/bulkBonusService");
const {
	buildUserUpdateChanges,
	createAdminUserAuditLog,
} = require("../../services/adminUserAuditLogService");
const {
	disableMfaForUser,
	getMfaCodesForUser,
	getUserMfaSummary,
} = require("../../services/mfaService");
const {
	APPROVED_PAYMENT_STATUS,
	APPROVED_CRYPTO_STATES,
	getUserApprovedFinanceTotals,
} = require("../../utils/userFinanceTotals");

const USER_LIST_SORT_FIELDS = {
	user: "username",
	username: "username",
	rank: "rank",
	status: "ban.expire",
	createdAt: "createdAt",
};

const ACTIVE_BALANCE_SORT_KEYS = new Set([
	"balance",
	"activeWallet.balance",
	"activeBalance",
]);

const buildActiveWalletAggregationFields = () => ({
	activeWallet: {
		$let: {
			vars: {
				matchingWallet: {
					$first: {
						$filter: {
							input: { $ifNull: ["$wallets", []] },
							as: "wallet",
							cond: {
								$and: [
									{ $eq: ["$$wallet.coinType", "$currency.coinType"] },
									{ $eq: ["$$wallet.chain", "$currency.chain"] },
									{ $eq: ["$$wallet.type", "$currency.type"] },
								],
							},
						},
					},
				},
				fallbackWallet: {
					$arrayElemAt: [{ $ifNull: ["$wallets", []] }, 0],
				},
			},
			in: { $ifNull: ["$$matchingWallet", "$$fallbackWallet"] },
		},
	},
});

const parseUserListSort = (sort) => {
	if (!sort) return { key: "createdAt", order: -1, field: "createdAt" };

	try {
		const parsedSort = JSON.parse(sort);
		const key = String(parsedSort.key || "");
		const order = Number(parsedSort.order) === 1 ? 1 : -1;

		if (ACTIVE_BALANCE_SORT_KEYS.has(key)) {
			return { key: "activeBalance", order, field: "activeBalance" };
		}

		return {
			key,
			order,
			field: USER_LIST_SORT_FIELDS[key] || "createdAt",
		};
	} catch (e) {
		console.warn("Geçersiz sort JSON:", sort);
		return { key: "createdAt", order: -1, field: "createdAt" };
	}
};

const formatAdminUserListItem = (user, { includeListDetails = false } = {}) => {
	const activeWallet =
		user.activeWallet ||
		user.wallets?.find(
			(w) =>
				w.coinType === user.currency?.coinType &&
				w.chain === user.currency?.chain &&
				w.type === user.currency?.type,
		) ||
		user.wallets?.[0];

	const item = {
		_id: user._id,
		numericId: user.numericId,
		username: user.username,
		rank: user.rank,
		avatar: user.avatar,
		isExactMatch: Boolean(user.isExactMatch),
		ban: user.ban?.expire && user.ban.expire > new Date(),
		activeWallet: {
			coinType: activeWallet?.coinType,
			balance: activeWallet?.balance ?? 0,
			chain: activeWallet?.chain,
			type: activeWallet?.type,
		},
		fiatCurrency: user.currency?.fiatCurrency ?? "USD",
		wallets: user.wallets || [],
	};

	if (includeListDetails) {
		item.phone = user.phone;
		item.local = user.local;
	}

	return item;
};

const getDefaultSuspensionExpiry = () => {
	const expiry = new Date();
	expiry.setFullYear(expiry.getFullYear() + 100);
	return expiry;
};

const buildAdminUserResponseData = (user) => {
	const plainUser = typeof user.toObject === "function" ? user.toObject() : user;
	const activeWallet =
		plainUser.wallets?.find(
			(w) =>
				w.coinType === plainUser.currency?.coinType &&
				w.chain === plainUser.currency?.chain &&
				w.type === plainUser.currency?.type,
		) || plainUser.wallets?.[0];

	return {
		...plainUser,
		activeWallet: {
			coinType: activeWallet?.coinType,
			balance: activeWallet?.balance ?? 0,
			chain: activeWallet?.chain,
			type: activeWallet?.type,
		},
		fiatCurrency: plainUser.currency?.fiatCurrency ?? "USD",
	};
};

// 🔹 Kullanıcı listesi
router.get("/users", checkPermission("users.read"), async (req, res) => {
	try {
		const canViewListDetails = hasPermission(req, "users.listDetails.read");
		const {
			page = 1,
			limit = 20,
			search = "",
			rank,
			status,
			sort,
			searchMode,
			includeSimilar,
		} = req.query;

		const baseQuery = {};
		const searchConfig = buildAdminUserSearch(search);
		const { trimmedSearch } = searchConfig;
		const pageNumber = Math.max(1, Number(page) || 1);
		const limitNumber = Number(limit) || 20;
		const shouldPaginate = limitNumber > 0;

		// Rol filtreleme
		if (rank) baseQuery.rank = rank;

		// Status filtreleme
		if (status === "banned") {
			baseQuery["ban.expire"] = { $gt: new Date() };
		} else if (status === "active") {
			baseQuery.$or = [
				{ "ban.expire": { $exists: false } },
				{ "ban.expire": { $lte: new Date() } },
			];
		}

		const withSearchQuery = (searchQuery) => searchQuery
			? { $and: [baseQuery, searchQuery] }
			: baseQuery;
		const partialQuery = withSearchQuery(searchConfig.partialQuery);
		const exactQuery = withSearchQuery(searchConfig.exactQuery);
		const smartSearchEnabled = searchMode === "smart" && Boolean(trimmedSearch);
		let query = partialQuery;
		let total;
		let searchMeta = null;

		if (smartSearchEnabled) {
			const [exactCount, partialCount] = await Promise.all([
				User.countDocuments(exactQuery),
				User.countDocuments(partialQuery),
			]);
			const searchResolution = resolveAdminUserSearch({
				searchMode,
				hasSearch: true,
				includeSimilar: isTrueQueryValue(includeSimilar),
				exactCount,
				partialCount,
			});

			query = searchResolution.useExactQuery ? exactQuery : partialQuery;
			searchMeta = searchResolution.searchMeta;
			total = searchResolution.useExactQuery ? exactCount : partialCount;
		} else {
			total = await User.countDocuments(query);
		}

		// Sıralama
		const parsedSort = parseUserListSort(sort);
		const sortQuery = { [parsedSort.field]: parsedSort.order };
		if (parsedSort.field !== "createdAt") sortQuery.createdAt = -1;

		// Kullanıcıları çek
		const projection = {
			numericId: 1,
			username: 1,
			...(canViewListDetails
				? { "local.email": 1, phone: 1 }
				: {}),
			rank: 1,
			wallets: 1,
			currency: 1,
			avatar: 1,
			ban: 1,
			activeWallet: 1,
			isExactMatch: 1,
		};
		const pipeline = [
			{ $match: query },
			...(smartSearchEnabled
				? [{ $addFields: { isExactMatch: searchConfig.exactMatchExpression } }]
				: []),
			{ $addFields: buildActiveWalletAggregationFields() },
			{
				$addFields: {
					activeBalance: { $ifNull: ["$activeWallet.balance", 0] },
				},
			},
			{
				$sort: searchMeta?.resolvedMode === "all"
					? { isExactMatch: -1, ...sortQuery }
					: sortQuery,
			},
			{ $project: projection },
		];

		if (shouldPaginate) {
			pipeline.push(
				{ $skip: (pageNumber - 1) * limitNumber },
				{ $limit: limitNumber },
			);
		}

		const usersRaw = await User.aggregate(pipeline);

		const financeTotals = canViewListDetails
			? await getUserApprovedFinanceTotals(usersRaw.map((user) => user._id))
			: null;

		// UI formatına uygun dönüştür
		const users = usersRaw.map((user) => {
			const item = formatAdminUserListItem(user, {
				includeListDetails: canViewListDetails,
			});

			if (!canViewListDetails) return item;

			return {
				...item,
				...(financeTotals.get(user._id.toString()) || {
					totalDeposit: 0,
					totalWithdrawal: 0,
				}),
			};
		});

		res.json({
			success: true,
			data: users,
			totalUsers: total,
			totalPage: shouldPaginate ? Math.ceil(total / limitNumber) : 1,
			page: pageNumber,
			searchMeta,
		});
	} catch (err) {
		console.error("User list error:", err);
		res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
});

router.post("/users", checkPermission("users.create"), async (req, res) => {
	try {
		const {
			email,
			phone,
			name,
			username,
			password,
			birthday,
			rank = "user",
		} = req.body;

		if (rank === "admin" && !req.isSuperAdmin) {
			return res.status(403).json({
				success: false,
				message: "Sadece süper admin, admin kullanıcı oluşturabilir.",
			});
		}

		// Zorunlu alanlar kontrolü
		if (!email || !phone || !name || !username || !password) {
			return res
				.status(400)
				.json({ success: false, message: "Missing required fields." });
		}

		// Var mı kontrolü
		const existingUser = await User.findOne({
			$or: [{ "local.email": email }, { phone }, { username }],
		})
			.select("_id")
			.lean();

		if (existingUser) {
			return res
				.status(409)
				.json({ success: false, message: "User already exists." });
		}

		// Şifreyi hashle
		const hashedPassword = await bcrypt.hash(password, 10);

		// Yeni kullanıcı oluştur
		const newUser = new User({
			local: {
				email,
				password: hashedPassword,
			},
			phone,
			name,
			username,
			birthday: birthday ? new Date(birthday) : undefined,
			rank,
		});

		await newUser.save();

		res.status(201).json({
			success: true,
			message: "User created successfully.",
			data: {
				id: newUser._id,
				username: newUser.username,
				email: newUser.local.email,
				phone: newUser.phone,
			},
		});
	} catch (err) {
		console.error("Create user error:", err);
		res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
});

// 🔹 Tek kullanıcı
router.get("/users/:id", checkPermission("users.read"), async (req, res) => {
	try {
		const user = await User.findById(req.params.id)
			.select("-local.password")
			.populate("adminRole")
			.populate("tags");
		if (!user)
			return res
				.status(404)
				.json({ success: false, message: "Kullanıcı bulunamadı" });

		const activeWallet =
			user.wallets.find(
				(w) =>
					w.coinType === user.currency.coinType &&
					w.chain === user.currency.chain &&
					w.type === user.currency.type,
			) || user.wallets[0];

		res.status(200).json({
			success: true,
			data: {
				...user.toObject(),
				activeWallet: {
					coinType: activeWallet?.coinType,
					balance: activeWallet?.balance ?? 0,
					chain: activeWallet?.chain,
					type: activeWallet?.type,
				},
				fiatCurrency: user.currency?.fiatCurrency ?? "USD",
			},
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.get(
	"/users/:id/mfa-codes",
	checkPermission("users.mfa.read"),
	async (req, res) => {
		try {
			const userExists = await User.exists({ _id: req.params.id });
			if (!userExists) {
				return res.status(404).json({
					success: false,
					message: "Kullanıcı bulunamadı",
				});
			}

			const { page = 1, limit = 20 } = req.query;
			const result = await getMfaCodesForUser({
				userId: req.params.id,
				page,
				limit,
			});

			return res.status(200).json({
				success: true,
				data: result.items,
				total: result.total,
				page: result.page,
				limit: result.limit,
			});
		} catch (error) {
			console.error(error);
			return res.status(error.status || 500).json({
				success: false,
				message: error.message || "Sunucu hatası",
				code: error.code,
				...(error.metadata ? { metadata: error.metadata } : {}),
			});
		}
	}
);

router.post(
	"/users/:id/mfa/disable",
	checkPermission("users.mfa.manage"),
	async (req, res) => {
		try {
			const targetUser = await User.findById(req.params.id);
			if (!targetUser) {
				return res.status(404).json({
					success: false,
					message: "Kullanıcı bulunamadı",
				});
			}

			if (!targetUser?.mfa?.enabled) {
				return res.status(400).json({
					success: false,
					message: "MFA zaten kapalı",
					code: "MFA_NOT_ENABLED",
				});
			}

			const updatedUser = await disableMfaForUser({ userId: targetUser._id });

			await createAdminUserAuditLog({
				targetUser,
				actorUser: req.adminUser,
				action: "mfa_disable",
				summary: "Admin disabled MFA for user",
				changes: [
					{
						field: "mfa.enabled",
						from: true,
						to: false,
					},
				],
				source: "admin-user-mfa",
				metadata: {
					reason: req.body?.reason || "",
				},
			});

			return res.status(200).json({
				success: true,
				mfa: getUserMfaSummary(updatedUser),
			});
		} catch (error) {
			console.error(error);
			return res.status(error.status || 500).json({
				success: false,
				message: error.message || "Sunucu hatası",
				code: error.code,
				...(error.metadata ? { metadata: error.metadata } : {}),
			});
		}
	}
);

// 🔹 Kullanıcı güncelleme (balance / fiat currency dahil)

router.put("/users/:id", checkPermission("users.update"), async (req, res) => {
	const updates = req.body;

	try {
		const user = await User.findById(req.params.id);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "Kullanıcı bulunamadı" });
		}

		const originalUserSnapshot = user.toObject({ depopulate: true });

		// 🔐 Prevent privilege escalation via generic user update
		// Only superadmins can change admin-only identity/role fields.
		if (!req.isSuperAdmin) {
			const normalizeProtectedFieldValue = (key, value) => {
				if (value === undefined) return undefined;
				if (value === null) return null;

				if (["_id", "adminRole"].includes(key)) {
					if (typeof value === "object" && value._id) {
						return String(value._id);
					}

					return String(value);
				}

				return value;
			};

			const forbiddenTopLevelKeys = [
				"rank",
				"adminRole",
				"numericId",
				"betAccess",
				"_id",
			];
			const attemptedForbidden = forbiddenTopLevelKeys.filter(
				(key) => {
					if (!(key in (updates || {}))) return false;

					return (
						normalizeProtectedFieldValue(key, updates[key]) !==
						normalizeProtectedFieldValue(key, user[key])
					);
				},
			);
			if (attemptedForbidden.length) {
				return res.status(403).json({
					success: false,
					message:
						"Bu alanları güncellemek için süper admin yetkisi gerekir.",
					fields: attemptedForbidden,
				});
			}

			if (
				updates?.local &&
				Object.prototype.hasOwnProperty.call(
					updates.local,
					"emailVerified",
				)
			) {
				const requestedEmailVerified = Boolean(updates.local.emailVerified);
				const currentEmailVerified = Boolean(user.local?.emailVerified);

				if (requestedEmailVerified === currentEmailVerified) {
					delete updates.local.emailVerified;
				} else {
				return res.status(403).json({
					success: false,
					message: "emailVerified alanı güncellenemez.",
				});
				}
			}
		}

		// Local alan kontrolü
		if (updates.local) {
			user.local.email = updates.local.email || user.local.email;
			if (updates.local.password) {
				const hashedPassword = await bcrypt.hash(
					updates.local.password,
					10,
				);
				user.local.password = hashedPassword;
			}

			if (
				req.isSuperAdmin &&
				Object.prototype.hasOwnProperty.call(
					updates.local,
					"emailVerified",
				)
			) {
				user.local.emailVerified = Boolean(updates.local.emailVerified);
			}
		}

		// Fiat currency update
		if (updates.currency?.fiatCurrency) {
			user.currency.fiatCurrency = updates.currency.fiatCurrency;
		}

		// Wallet balance update
		if (updates.walletUpdate) {
			const { coinType, chain, type, amount } = updates.walletUpdate;
			const wallet = user.wallets.find(
				(w) =>
					w.coinType === coinType &&
					w.chain === chain &&
					w.type === type,
			);
			if (wallet) {
				wallet.balance = Math.max(0, wallet.balance + amount);
				user.markModified("wallets");
			}
		}

		if (Array.isArray(updates.walletUpdates)) {
			updates.walletUpdates.forEach((walletUpdate) => {
				const { coinType, chain, type, amount } = walletUpdate || {};
				if (!coinType || !chain || !type || !Number.isFinite(Number(amount))) {
					return;
				}

				const wallet = user.wallets.find(
					(w) =>
						w.coinType === coinType &&
						w.chain === chain &&
						w.type === type,
				);

				if (!wallet) return;

				wallet.balance = Math.max(0, Number(wallet.balance || 0) + Number(amount));
			});

			user.markModified("wallets");
		}

		// Diğer alanlar
		const wasAdmin = user.rank === "admin";
		Object.keys(updates).forEach((key) => {
			if (
				[
					"local",
					"currency",
					"walletUpdate",
					"walletUpdates",
					"wallets",
					"activeWallet",
					"fiatCurrency",
					"createdAt",
					"updatedAt",
					"betAccess",
					"__v",
				].includes(key)
			)
				return;
			if (
				!req.isSuperAdmin &&
				["rank", "adminRole", "numericId", "_id"].includes(key)
			)
				return;
			user[key] = updates[key];
		});

		if (!wasAdmin && user.rank === "admin") {
			user.ips = [];
			user.markModified("ips");
		}

		user.updatedAt = Date.now();
		user.markModified("local");
		const updatedUser = await user.save();
		const userUpdateChanges = buildUserUpdateChanges(
			originalUserSnapshot,
			updatedUser.toObject({ depopulate: true }),
			updates,
		);

		await createAdminUserAuditLog({
			targetUser: updatedUser,
			actorUser: req.adminUser || null,
			action: "profile_update",
			summary: "Kullanıcı profili güncellendi",
			changes: userUpdateChanges,
			source: "admin-user-profile",
			metadata: {
				initiatedFrom: "admin-user-profile",
				changedFields: userUpdateChanges.map((change) => change.field),
			},
		});
		const activeWallet =
			updatedUser.wallets.find(
				(w) =>
					w.coinType === updatedUser.currency.coinType &&
					w.chain === updatedUser.currency.chain &&
					w.type === updatedUser.currency.type,
			) || updatedUser.wallets[0];

		const io = getIO();
		io.of("/general")
			.to(updatedUser._id.toString())
			.emit("user", { user: updatedUser });

		res.status(200).json({
			success: true,
			message: "Kullanıcı başarıyla güncellendi",
			data: {
				...updatedUser.toObject(),
				activeWallet: {
					coinType: activeWallet?.coinType,
					balance: activeWallet?.balance ?? 0,
					chain: activeWallet?.chain,
					type: activeWallet?.type,
				},
				fiatCurrency: updatedUser.currency?.fiatCurrency ?? "USD",
			},
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.patch(
	"/users/:id/suspension",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const originalBan = user.ban ? user.ban.toObject?.() || user.ban : null;
			const requestedExpire = req.body?.expiresAt
				? new Date(req.body.expiresAt)
				: getDefaultSuspensionExpiry();

			if (!Number.isFinite(requestedExpire.getTime())) {
				return res.status(400).json({
					success: false,
					message: "Geçerli bir askı bitiş tarihi giriniz.",
				});
			}

			if (requestedExpire <= new Date()) {
				return res.status(400).json({
					success: false,
					message: "Askı bitiş tarihi ileri bir tarih olmalıdır.",
				});
			}

			const reason =
				String(req.body?.reason || "").trim() || "Admin tarafından askıya alındı.";
			user.ban = {
				expire: requestedExpire,
				reason,
			};
			user.updatedAt = Date.now();
			user.markModified("ban");

			const updatedUser = await user.save();
			await createAdminUserAuditLog({
				targetUser: updatedUser,
				actorUser: req.adminUser || null,
				action: "suspension_update",
				summary: "Kullanıcı askıya alınd��",
				changes: [
					{
						field: "ban.expire",
						from: originalBan?.expire || null,
						to: updatedUser.ban?.expire || null,
					},
					{
						field: "ban.reason",
						from: originalBan?.reason || "",
						to: updatedUser.ban?.reason || "",
					},
				],
				source: "admin-user-suspension",
				metadata: {
					initiatedFrom: "admin-user-profile",
				},
			});
			await notifyAndDisconnectSuspendedUser(getIO(), updatedUser._id);

			createAdminNotification(
				"sanction",
				"Kullanıcı Askıya Alındı",
				`${updatedUser.username} kullanıcısı askıya alındı.`,
				`/apps/user/view/${updatedUser._id}`,
				{ username: updatedUser.username, userId: updatedUser._id, reason },
			);

			res.status(200).json({
				success: true,
				message: "Kullanıcı ask����ya alındı.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Kullanıcı askıya alma hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.delete(
	"/users/:id/suspension",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const originalBan = user.ban ? user.ban.toObject?.() || user.ban : null;
			user.ban = undefined;
			user.updatedAt = Date.now();
			user.markModified("ban");

			const updatedUser = await user.save();
			await createAdminUserAuditLog({
				targetUser: updatedUser,
				actorUser: req.adminUser || null,
				action: "suspension_clear",
				summary: "Kullanıcı askısı kaldırıldı",
				changes: [
					{
						field: "ban",
						from: originalBan,
						to: null,
					},
				],
				source: "admin-user-suspension",
				metadata: {
					initiatedFrom: "admin-user-profile",
				},
			});

			res.status(200).json({
				success: true,
				message: "Kullanıcı askısı kaldırıldı.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Kullanıcı askısı kaldırma hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.patch(
	"/users/:id/bet-access",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			if (typeof req.body?.blocked !== "boolean") {
				return res.status(400).json({
					success: false,
					message: "Bet erişim durumu boolean olmalıdır.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const originalBetAccess = user.betAccess?.toObject?.() || {
				blocked: Boolean(user.betAccess?.blocked),
				reason: user.betAccess?.reason || "",
				updatedAt: user.betAccess?.updatedAt || null,
			};
			const blocked = req.body.blocked;
			const reason = blocked
				? String(req.body?.reason || "").trim() ||
					"Admin tarafından bet erişimi kapatıldı."
				: "";

			user.betAccess = {
				blocked,
				reason,
				updatedAt: new Date(),
			};
			user.markModified("betAccess");

			const updatedUser = await user.save();
			await createAdminUserAuditLog({
				targetUser: updatedUser,
				actorUser: req.adminUser || null,
				action: blocked ? "bet_access_block" : "bet_access_restore",
				summary: blocked
					? "Kullanıcının bet erişimi kapatıldı"
					: "Kullanıcının bet erişimi açıldı",
				changes: [
					{
						field: "betAccess.blocked",
						from: Boolean(originalBetAccess.blocked),
						to: blocked,
					},
					{
						field: "betAccess.reason",
						from: originalBetAccess.reason || "",
						to: reason,
					},
				],
				source: "admin-user-bet-access",
				metadata: {
					initiatedFrom: "admin-user-profile",
				},
			});

			res.status(200).json({
				success: true,
				message: blocked
					? "Kullanıcının bet erişimi kapatıldı."
					: "Kullanıcının bet erişimi açıldı.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Bet erişimi güncelleme hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// 🔹 Kontroller sekmesi: hesap kısıtlamaları, kategori engelleri ve platform erişimi
router.patch(
	"/users/:id/controls",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const originalControls = user.controls
				? user.controls.toObject?.() || user.controls
				: {};

			const boolFields = [
				"withdrawalBlocked",
				"depositBlocked",
				"gameBlocked",
				"tipBlocked",
			];
			const categoryFields = [
				"slots",
				"liveCasino",
				"sportsBook",
				"originals",
			];
			// Bet Limitleme: "casino" = slots + originals ortak limiti.
			const betLimitFields = ["liveCasino", "casino", "sportsBook"];
			const platformFields = [
				"affiliatePanel",
				"partnerAccess",
				"contentEditor",
				"chatModerator",
				"streamer",
			];

			const nextControls = {
				withdrawalBlocked: Boolean(
					originalControls.withdrawalBlocked,
				),
				depositBlocked: Boolean(originalControls.depositBlocked),
				gameBlocked: Boolean(originalControls.gameBlocked),
				tipBlocked: Boolean(originalControls.tipBlocked),
				categoryRestrictions: {
					slots: Boolean(
						originalControls.categoryRestrictions?.slots,
					),
					liveCasino: Boolean(
						originalControls.categoryRestrictions?.liveCasino,
					),
					sportsBook: Boolean(
						originalControls.categoryRestrictions?.sportsBook,
					),
					originals: Boolean(
						originalControls.categoryRestrictions?.originals,
					),
				},
				categoryBetLimits: {
					liveCasino: Number(
						originalControls.categoryBetLimits?.liveCasino || 0,
					),
					casino: Number(
						originalControls.categoryBetLimits?.casino || 0,
					),
					sportsBook: Number(
						originalControls.categoryBetLimits?.sportsBook || 0,
					),
				},
				platformAccess: {
					affiliatePanel: Boolean(
						originalControls.platformAccess?.affiliatePanel,
					),
					partnerAccess: Boolean(
						originalControls.platformAccess?.partnerAccess,
					),
					contentEditor: Boolean(
						originalControls.platformAccess?.contentEditor,
					),
					chatModerator: Boolean(
						originalControls.platformAccess?.chatModerator,
					),
					streamer: Boolean(
						originalControls.platformAccess?.streamer,
					),
				},
			};

			const changes = [];

			boolFields.forEach((field) => {
				if (typeof req.body?.[field] === "boolean") {
					const from = nextControls[field];
					const to = req.body[field];
					if (from !== to) {
						changes.push({ field: `controls.${field}`, from, to });
					}
					nextControls[field] = to;
				}
			});

			if (req.body?.categoryRestrictions) {
				categoryFields.forEach((field) => {
					if (
						typeof req.body.categoryRestrictions[field] ===
						"boolean"
					) {
						const from = nextControls.categoryRestrictions[field];
						const to = req.body.categoryRestrictions[field];
						if (from !== to) {
							changes.push({
								field: `controls.categoryRestrictions.${field}`,
								from,
								to,
							});
						}
						nextControls.categoryRestrictions[field] = to;
					}
				});
			}

			// 🎯 Bet Limitleme: kategori bazlı maksimum bahis tutarı (0 = limitsiz).
			if (req.body?.categoryBetLimits) {
				betLimitFields.forEach((field) => {
					const rawValue = req.body.categoryBetLimits[field];
					if (rawValue === undefined) return;
					const to = Math.max(0, Number(rawValue) || 0);
					const from = nextControls.categoryBetLimits[field];
					if (from !== to) {
						changes.push({
							field: `controls.categoryBetLimits.${field}`,
							from,
							to,
						});
					}
					nextControls.categoryBetLimits[field] = to;
				});
			}

			if (req.body?.platformAccess) {
				platformFields.forEach((field) => {
					if (typeof req.body.platformAccess[field] === "boolean") {
						const from = nextControls.platformAccess[field];
						const to = req.body.platformAccess[field];
						if (from !== to) {
							changes.push({
								field: `controls.platformAccess.${field}`,
								from,
								to,
							});
						}
						nextControls.platformAccess[field] = to;
					}
				});
			}

			nextControls.updatedAt = new Date();
			user.controls = nextControls;
			user.markModified("controls");

			const updatedUser = await user.save();

			if (changes.length) {
				await createAdminUserAuditLog({
					targetUser: updatedUser,
					actorUser: req.adminUser || null,
					action: "controls_update",
					summary: "Kullanıcı kontrolleri güncellendi",
					changes,
					source: "admin-user-controls",
					metadata: {
						initiatedFrom: "admin-user-profile",
					},
				});
			}

			res.status(200).json({
				success: true,
				message: "Kullanıcı kontrolleri güncellendi.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Kullanıcı kontrolleri güncelleme hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// 🔹 Kontroller sekmesi: kullanıcıyı bir partnerin/affiliate'in altına ata
router.patch(
	"/users/:id/partner",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const identifier = String(req.body?.identifier || "").trim();
			if (!identifier) {
				return res.status(400).json({
					success: false,
					message: "Referans kodu veya kullanıcı ID'si giriniz.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const partnerQuery = mongoose.Types.ObjectId.isValid(identifier)
				? { $or: [{ _id: identifier }, { "affiliates.code": identifier }] }
				: { "affiliates.code": identifier };

			const partner = await User.findOne(partnerQuery).select(
				"_id username name affiliates.code",
			);

			if (!partner) {
				return res.status(404).json({
					success: false,
					message: "Belirtilen partner bulunamadı.",
				});
			}

			if (partner._id.toString() === user._id.toString()) {
				return res.status(400).json({
					success: false,
					message: "Kullanıcı kendisine partner olarak atanamaz.",
				});
			}

			const previousReferrer = user.affiliates?.referrer || null;
			user.affiliates = user.affiliates || {};
			user.affiliates.referrer = partner._id;
			user.markModified("affiliates");

			const updatedUser = await user.save();
			await createAdminUserAuditLog({
				targetUser: updatedUser,
				actorUser: req.adminUser || null,
				action: "partner_assign",
				summary: "Kullanıcı bir partnere atandı",
				changes: [
					{
						field: "affiliates.referrer",
						from: previousReferrer,
						to: partner._id,
					},
				],
				source: "admin-user-controls",
				metadata: {
					initiatedFrom: "admin-user-profile",
					partnerUsername: partner.username || partner.name || "",
				},
			});

			res.status(200).json({
				success: true,
				message: "Kullanıcı partnere atandı.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Partner atama hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.delete(
	"/users/:id/partner",
	checkPermission("users.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı." });
			}

			const previousReferrer = user.affiliates?.referrer || null;
			if (user.affiliates) {
				user.affiliates.referrer = null;
				user.markModified("affiliates");
			}

			const updatedUser = await user.save();
			await createAdminUserAuditLog({
				targetUser: updatedUser,
				actorUser: req.adminUser || null,
				action: "partner_unassign",
				summary: "Kullanıcının partner bağlantısı kaldırıldı",
				changes: [
					{
						field: "affiliates.referrer",
						from: previousReferrer,
						to: null,
					},
				],
				source: "admin-user-controls",
				metadata: {
					initiatedFrom: "admin-user-profile",
				},
			});

			res.status(200).json({
				success: true,
				message: "Partner bağlantıs�� kaldırıldı.",
				data: buildAdminUserResponseData(updatedUser),
			});
		} catch (error) {
			console.error("Partner bağlantısı kaldırma hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// 📝 Üye Profili — Notlar (bkz. UserRiskNotesCard.vue)
	router.get(
		"/users/:id/notes",
		checkPermission("users.read"),
		async (req, res) => {
			try {
				const { id } = req.params;
				if (!mongoose.Types.ObjectId.isValid(id)) {
					return res
						.status(400)
						.json({ success: false, message: "INVALID_USER_ID" });
				}

				const notes = await UserNote.find({ targetUser: id })
					.sort({ createdAt: -1 })
					.lean();

				res.status(200).json({ success: true, data: notes });
			} catch (error) {
				console.error("Kullanıcı notları alınırken hata:", error);
				res.status(500).json({ success: false, message: "Sunucu hatası" });
			}
		},
	);

	router.post(
		"/users/:id/notes",
		checkPermission("users.manage"),
		async (req, res) => {
			try {
				const { id } = req.params;
				const { text } = req.body || {};
				const trimmedText = String(text || "").trim();

				if (!mongoose.Types.ObjectId.isValid(id)) {
					return res
						.status(400)
						.json({ success: false, message: "INVALID_USER_ID" });
				}
				if (!trimmedText) {
					return res
						.status(400)
						.json({ success: false, message: "MISSING_REQUIRED_FIELDS" });
				}

				const targetExists = await User.exists({ _id: id });
				if (!targetExists) {
					return res
						.status(404)
						.json({ success: false, message: "Kullanıcı bulunamadı" });
				}

				const note = await UserNote.create({
					targetUser: id,
					author: req.adminUser?._id || null,
					authorSnapshot: {
						username: req.adminUser?.username || "",
					},
					text: trimmedText,
				});

				res.status(201).json({ success: true, data: note });
			} catch (error) {
				console.error("Kullanıcı notu eklenirken hata:", error);
				res.status(500).json({ success: false, message: "Sunucu hatası" });
			}
		},
	);

	router.delete(
		"/users/:id/notes/:noteId",
		checkPermission("users.manage"),
		async (req, res) => {
			try {
				const { id, noteId } = req.params;
				if (
					!mongoose.Types.ObjectId.isValid(id) ||
					!mongoose.Types.ObjectId.isValid(noteId)
				) {
					return res
						.status(400)
						.json({ success: false, message: "INVALID_ID" });
				}

				const note = await UserNote.findOneAndDelete({
					_id: noteId,
					targetUser: id,
				});
				if (!note) {
					return res
						.status(404)
						.json({ success: false, message: "NOTE_NOT_FOUND" });
				}

				res.status(200).json({ success: true, message: "NOTE_DELETED" });
			} catch (error) {
				console.error("Kullanıcı notu silinirken hata:", error);
				res.status(500).json({ success: false, message: "Sunucu hatası" });
			}
		},
	);

	// Kullanıcının tüm oyun geçmişini döndürme
	router.get("/users/:id/history", checkPermission("users.read"), async (req, res) => {
	try {
		const { id } = req.params;

		// 📦 Pagination & filtreler
		// Dışa aktarım modunda (export=true) sayfalama üst sınırı kaldırılır ve
		// güvenli bir tavana (20.000 kayıt) kadar tüm eşleşen kayıtlar döndürülür.
		const isExport = String(req.query.export) === "true";
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const itemsPerPage = isExport
			? 20000
			: Math.min(500, Math.max(1, parseInt(req.query.itemsPerPage) || 10));
		const source = (req.query.source || "provider").toLowerCase(); // provider | internal | all
		const providerFilter = (req.query.provider || "").trim(); // provider _id veya code
		const gameCodeFilter = (req.query.gameCode || "").trim();
		const search = (req.query.search || "").trim();
		const dateFrom = parseHistoryDate(req.query.dateFrom);
		const dateTo = parseHistoryDate(req.query.dateTo, { endOfSecond: true });
		const resultFilter = normalizeHistoryResultFilter(req.query.result);

		if ((req.query.dateFrom && !dateFrom) || (req.query.dateTo && !dateTo)) {
			return res.status(400).json({
				success: false,
				message: "Geçersiz tarih formatı",
			});
		}
		if (!resultFilter) {
			return res.status(400).json({
				success: false,
				message: "Geçersiz sonuç filtresi",
			});
		}
		if (dateFrom && dateTo && dateFrom > dateTo) {
			return res.status(400).json({
				success: false,
				message: "Başlangıç tarihi bitiş tarihinden sonra olamaz",
			});
		}

		const summaryGroup = {
			$group: {
				_id: null,
				totalRecords: { $sum: 1 },
				totalBet: { $sum: { $ifNull: ["$bet_money", 0] } },
				totalWin: { $sum: { $ifNull: ["$win_money", 0] } },
				netProfit: {
					$sum: {
						$subtract: [
							{ $ifNull: ["$win_money", 0] },
							{ $ifNull: ["$bet_money", 0] },
						],
					},
				},
			},
		};
		const emptySummary = {
			totalRecords: 0,
			totalBet: 0,
			totalWin: 0,
			netProfit: 0,
		};
		const normalizeMongoSummary = (value) => ({
			totalRecords: Number(value?.totalRecords || 0),
			totalBet: Number(value?.totalBet || 0),
			totalWin: Number(value?.totalWin || 0),
			netProfit: Number(value?.netProfit || 0),
		});

		// Kullanıcı kontrolü
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID" });
		}

		const user = await User.findById(id).select("_id currency").lean();
		if (!user)
			return res
				.status(404)
				.json({ success: false, message: "Kullanıcı bulunamadı" });

		const userCurrency = user.currency?.fiatCurrency || "TRY";
		let resolvedProviderCode = providerFilter
			? providerFilter.toLowerCase()
			: null;
		if (providerFilter && mongoose.Types.ObjectId.isValid(providerFilter)) {
			const provider = await GameProvider.findById(providerFilter)
				.select("code")
				.lean();
			resolvedProviderCode = provider?.code || null;
		}

		// ➜ Sadece provider geçmişi: DB seviyesinde filtre + pagination (performant yol)
		if (source === "provider") {
			const txQuery = { user_code: id };

			if (dateFrom || dateTo) {
				txQuery.created_at = {};
				if (dateFrom) txQuery.created_at.$gte = dateFrom;
				if (dateTo) txQuery.created_at.$lte = dateTo;
			}

			if (gameCodeFilter) txQuery.game_code = gameCodeFilter;

			// Provider filtre — Drakon işlemleri her zaman Transaction.provider_code = "drakon"
			// olarak yazılıyor; ancak gerçek oyun stüdyosu (Pragmatic, NetEnt vb.) Game.provider_code
			// alanında. Bu yüzden filtre her iki kaynaktan da bakar.
			if (providerFilter) {
				if (!resolvedProviderCode) {
					txQuery.provider_code = "__none__";
				} else {
					// Aynı koda sahip Game.provider_code'lu oyun kodlarını da dahil et
					const matchingByGame = await Game.find({
						provider_code: resolvedProviderCode,
					})
						.select("game_code")
						.limit(5000)
						.lean();
					const gameCodesByProvider = matchingByGame
						.map((g) => g.game_code)
						.filter(Boolean);

					const providerOr = [{ provider_code: resolvedProviderCode }];
					if (gameCodesByProvider.length) {
						providerOr.push({
							game_code: { $in: gameCodesByProvider },
						});
					}
					txQuery.$and = (txQuery.$and || []).concat([
						{ $or: providerOr },
					]);
				}
			}

			if (search) {
				const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const searchRegex = new RegExp(safe, "i");
				const matchingGames = await Game.find({
					game_name: searchRegex,
				})
					.select("game_code")
					.limit(500)
					.lean();
				const codes = matchingGames.map((g) => g.game_code);
				txQuery.$and = (txQuery.$and || []).concat([
					{
						$or: [
							{ round_id: searchRegex },
							{ txn_id: searchRegex },
							{
								game_code: {
									$in: codes.length ? codes : ["__none__"],
								},
							},
						],
					},
				]);
			}

			// Sonuç sınıflandırması round toplamına göre yapılır; ham işlem görünümü
			// yalnızca sonuç filtresi "all" iken kullanılabilir.
			const merge = req.query.merge !== "false" || resultFilter !== "all";
			const resultMatch = buildHistoryResultMatch(resultFilter);

			if (!merge) {
				const [facet = {}] = await Transactions.aggregate([
					{ $match: txQuery },
					...(resultMatch ? [resultMatch] : []),
					{ $sort: { created_at: -1 } },
					{
						$facet: {
							data: [
								{ $skip: (page - 1) * itemsPerPage },
								{ $limit: itemsPerPage },
							],
							summary: [summaryGroup],
						},
					},
				]);
				const txList = facet.data || [];
				const summary = facet.summary?.[0]
					? normalizeMongoSummary(facet.summary[0])
					: emptySummary;
				const total = summary.totalRecords;

				const gameCodes = [
					...new Set(txList.map((tx) => tx.game_code).filter(Boolean)),
				];
				const games = await Game.find({ game_code: { $in: gameCodes } }).lean();
				await attachGameProviders(games);
				const gameMap = {};
				games.forEach((g) => {
					gameMap[g.game_code] = g;
				});

				const capitalize = (s) =>
					typeof s === "string" && s.length
						? s.charAt(0).toUpperCase() + s.slice(1)
						: null;

				const data = txList.map((tx) => {
					const game = gameMap[tx.game_code] || {};
					const bet = Number(tx.bet_money || 0);
					const win = Number(tx.win_money || 0);
					const providerName =
						game.provider?.name ||
						capitalize(game.provider_code) ||
						capitalize(tx.provider_code);
					return {
						user_code: tx.user_code,
						txn_id: tx.txn_id,
						round_id: tx.round_id,
						bet_money: bet,
						win_money: win,
						profit: win - bet,
						balance_before: tx.balance_before,
						balance_after: tx.balance_after,
						created_at: tx.created_at,
						createdAt: tx.created_at,
						txn_type: tx.txn_type,
						game_code: tx.game_code,
						game_name: game.game_name || tx.game_code || "Unknown",
						game_type: game.game_type || "other",
						banner: game.banner || null,
						provider: providerName,
						provider_code: game.provider_code || tx.provider_code || null,
						channel: tx.provider_code || null,
						currency: userCurrency,
						real: true,
						completed: true,
						txn_count: 1,
						source: "provider",
					};
				});

				return res.status(200).json({
					success: true,
					data,
					total,
					page,
					itemsPerPage,
					currency: userCurrency,
					source,
					result: resultFilter,
					summary,
					merged: false,
				});
			}

			// 🔀 round_id bazında merge: aynı round için debit + credit (veya çoklu kısmi
			// işlemler) tek satırda toplan��r. round_id boş ise işlem kendi başına grup olur.
			const groupKey = {
				$cond: [
					{
						$or: [
							{ $eq: ["$round_id", null] },
							{ $eq: ["$round_id", ""] },
						],
					},
					{ $toString: "$_id" },
					{ $toString: "$round_id" },
				],
			};

			const facet = await Transactions.aggregate([
				{ $match: txQuery },
				{ $sort: { created_at: 1 } },
				{
					$group: {
						_id: { rid: groupKey, gc: "$game_code" },
						round_id: { $first: "$round_id" },
						game_code: { $first: "$game_code" },
						provider_code: { $first: "$provider_code" },
						user_code: { $first: "$user_code" },
						txn_id_first: { $first: "$txn_id" },
						bet_money: { $sum: { $ifNull: ["$bet_money", 0] } },
						win_money: { $sum: { $ifNull: ["$win_money", 0] } },
						balance_before: { $first: "$balance_before" },
						balance_after: { $last: "$balance_after" },
						first_created: { $first: "$created_at" },
						last_created: { $last: "$created_at" },
						txn_types: { $addToSet: "$txn_type" },
						txn_count: { $sum: 1 },
					},
				},
				...(resultMatch ? [resultMatch] : []),
				{ $sort: { last_created: -1 } },
				{
					$facet: {
						data: [
							{ $skip: (page - 1) * itemsPerPage },
							{ $limit: itemsPerPage },
						],
						summary: [summaryGroup],
					},
				},
			]);

			const grouped = facet[0]?.data || [];
			const summary = facet[0]?.summary?.[0]
				? normalizeMongoSummary(facet[0].summary[0])
				: emptySummary;
			const total = summary.totalRecords;

			// İlgili oyunları batch olarak getir
			const gameCodes = [
				...new Set(grouped.map((g) => g.game_code).filter(Boolean)),
			];
			const games = await Game.find({ game_code: { $in: gameCodes } }).lean();
			await attachGameProviders(games);
			const gameMap = {};
			games.forEach((g) => {
				gameMap[g.game_code] = g;
			});

			const capitalize = (s) =>
				typeof s === "string" && s.length
					? s.charAt(0).toUpperCase() + s.slice(1)
					: null;

			const data = grouped.map((g) => {
				const game = gameMap[g.game_code] || {};
				const bet = Number(g.bet_money || 0);
				const win = Number(g.win_money || 0);
				const providerName =
					game.provider?.name ||
					capitalize(game.provider_code) ||
					capitalize(g.provider_code);

				// Tamamlandı: çoğu sağlayıcı tek satırlık (ör. anlık spin) bir bet+win
				// gönderir. Eğer sadece debit varsa ve win 0 ise bahis tamamlanmamış
				// (asılı kalmış / pending) sayılır.
				const types = g.txn_types || [];
				const hasCredit =
					types.includes("credit") || types.includes("debit_credit");
				const hasDebit =
					types.includes("debit") || types.includes("debit_credit");
				const completed = hasDebit ? hasCredit || win > 0 : true;

				return {
					user_code: g.user_code,
					txn_id: g.txn_id_first,
					round_id: g.round_id,
					bet_money: bet,
					win_money: win,
					profit: win - bet,
					balance_before: g.balance_before,
					balance_after: g.balance_after,
					created_at: g.last_created,
					createdAt: g.last_created,
					first_created: g.first_created,
					txn_type: types.join("+") || "bet",
					game_code: g.game_code,
					game_name: game.game_name || g.game_code || "Unknown",
					game_type: game.game_type || "other",
					banner: game.banner || null,
					provider: providerName,
					provider_code: game.provider_code || g.provider_code || null,
					channel: g.provider_code || null,
					currency: userCurrency,
					real: true,
					completed,
					txn_count: g.txn_count,
					source: "provider",
				};
			});

			return res.status(200).json({
				success: true,
				data,
				total,
				page,
				itemsPerPage,
				currency: userCurrency,
				source,
				result: resultFilter,
				summary,
				merged: true,
			});
		}

		// ➜ Internal veya all: eski davranış (in-memory aggregation)
		const allGames = [];

		// Internal oyun formatı
		const formatInternalGame = (entry, type, gameIdField = "game") => {
			const bet = Number(entry.amount?.main ?? entry.amount ?? 0) || 0;
			const win = Number(entry.payout ?? 0) || 0;

			return {
				user_code: id,
				type,
				game_name: type,
				bet_money: bet,
				win_money: win,
				profit: win - bet,
				amount: bet,
				payout: win,
				multiplier: entry.multiplier ?? 0,
				created_at: entry.createdAt,
				createdAt: entry.createdAt,
				gameId: entry[gameIdField] ?? null,
				currency: entry.fiatCurrency || userCurrency,
				real: true,
				completed: entry.state !== "pending",
				source: "internal",
			};
		};

		// 1) Tüm internal oyunları ve (gerekirse) provider transactionlarını paralel çek
		const internalQueries = [
			Battlesbet.find({ user: id }).lean(),
			Blackjackbet.find({ user: id }).lean(),
			Crashbet.find({ user: id }).lean(),
			Duelsbet.find({ user: id }).lean(),
			MinesGame.find({ user: id }).lean(),
			Rollbet.find({ user: id }).lean(),
			TowersGame.find({ user: id }).lean(),
			UnboxGame.find({ user: id }).lean(),
		];
		const includeProvider = source === "all";
		const results = await Promise.all([
			...internalQueries,
			includeProvider
				? Transactions.find({ user_code: id }).lean()
				: Promise.resolve([]),
		]);
		const [
			battles,
			blackjack,
			crash,
			duel,
			mines,
			roll,
			tower,
			unbox,
			txCasino,
		] = results;

		// Internal oyunları ekle
		battles.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Battles")),
		);
		blackjack.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Blackjack")),
		);
		crash.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Crash")),
		);
		duel.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Duels")),
		);
		mines.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Mines")),
		);
		roll.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Roll")),
		);
		tower.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Towers")),
		);
		unbox.forEach((entry) =>
			allGames.push(formatInternalGame(entry, "Unbox", "box")),
		);

		// 2) "Tümü" kaynağındaki provider hareketlerini de round bazında normalize et
		const groupedCasinoMap = new Map();
		for (const tx of [...txCasino].sort(
			(a, b) => new Date(a.created_at) - new Date(b.created_at),
		)) {
			const roundKey = tx.round_id == null || tx.round_id === ""
				? tx.txn_id || String(tx._id)
				: String(tx.round_id);
			const key = `${roundKey}:${tx.game_code || ""}`;
			const current = groupedCasinoMap.get(key);
			if (!current) {
				groupedCasinoMap.set(key, {
					...tx,
					bet_money: Number(tx.bet_money || 0),
					win_money: Number(tx.win_money || 0),
					txn_types: [tx.txn_type].filter(Boolean),
					txn_count: 1,
				});
				continue;
			}

			current.bet_money += Number(tx.bet_money || 0);
			current.win_money += Number(tx.win_money || 0);
			current.balance_after = tx.balance_after;
			current.created_at = tx.created_at;
			current.txn_count += 1;
			if (tx.txn_type && !current.txn_types.includes(tx.txn_type)) {
				current.txn_types.push(tx.txn_type);
			}
		}
		const normalizedCasino = [...groupedCasinoMap.values()];

		// Provider transactionları için game bilgilerini çek
		const gameCodes = [
			...new Set(normalizedCasino.map((tx) => tx.game_code).filter(Boolean)),
		];
		const games = await Game.find({ game_code: { $in: gameCodes } }).lean();

		const gameMap = {};
		games.forEach((g) => {
			gameMap[g.game_code] = g;
		});

		// Provider transactionlarını ekle
		normalizedCasino.forEach((tx) => {
			const game = gameMap[tx.game_code] || {};
			allGames.push({
				user_code: id,
				txn_id: tx.txn_id,
				round_id: tx.round_id,
				bet_money: tx.bet_money,
				win_money: tx.win_money,
				profit: Number(tx.win_money || 0) - Number(tx.bet_money || 0),
				balance_before: tx.balance_before,
				balance_after: tx.balance_after,
				created_at: tx.created_at,
				createdAt: tx.created_at,
				txn_type: tx.txn_types?.join("+") || tx.txn_type,
				txn_count: tx.txn_count,
				game_code: tx.game_code,
				game_name: game.game_name || "Unknown",
				game_type: game.game_type || "other",
				banner: game.banner || null,
				provider: game.provider || null,
				provider_code: game.provider_code || null,
				amount: tx.bet_money ?? 0,
				payout: tx.win_money ?? 0,
				multiplier:
					tx.win_money && tx.bet_money
						? parseFloat((tx.win_money / tx.bet_money).toFixed(2))
						: 0,
				type: game.game_name || tx.game_code || "Casino",
				currency: userCurrency,
				real: true,
				completed: true,
				source: "provider",
			});
		});

		// 3) Ortak filtreleri normalize edilmiş kayıtların tamamına uygula
		const safeSearch = search.toLocaleLowerCase("tr-TR");
		const filteredGames = allGames.filter((entry) => {
			const createdAt = new Date(entry.createdAt || entry.created_at);
			if (dateFrom && createdAt < dateFrom) return false;
			if (dateTo && createdAt > dateTo) return false;
			if (gameCodeFilter && entry.game_code !== gameCodeFilter) return false;
			if (providerFilter) {
				const providerValues = [entry.provider_code, entry.provider]
					.filter(Boolean)
					.map((value) => String(value).toLowerCase());
				if (
					!resolvedProviderCode ||
					!providerValues.includes(resolvedProviderCode.toLowerCase())
				) return false;
			}
			if (safeSearch) {
				const searchable = [
					entry.round_id,
					entry.txn_id,
					entry.game_code,
					entry.game_name,
					entry.type,
				]
					.filter(Boolean)
					.join(" ")
					.toLocaleLowerCase("tr-TR");
				if (!searchable.includes(safeSearch)) return false;
			}

			return matchesHistoryResult(entry, resultFilter);
		});

		filteredGames.sort(
			(a, b) => new Date(b.createdAt) - new Date(a.createdAt),
		);

		// 4) Sayfalama uygula
		const summary = summarizeHistory(filteredGames);
		const total = summary.totalRecords;
		const paginatedGames = filteredGames.slice(
			(page - 1) * itemsPerPage,
			page * itemsPerPage,
		);

		res.status(200).json({
			success: true,
			data: paginatedGames,
			total,
			page,
			itemsPerPage,
			currency: userCurrency,
			source,
			result: resultFilter,
			summary,
		});
	} catch (err) {
		console.error("Oyun geçmişi hatası:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 🎯 Game history filter listesi (provider + game seçenekleri)
router.get(
	"/users/:id/history/filters",
	checkPermission("users.read"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz kullanıcı ID" });
			}

			// Kullanıcının kullandığı game_code & provider_code seti
			const [gameCodes, providerCodes] = await Promise.all([
				Transactions.distinct("game_code", { user_code: id }),
				Transactions.distinct("provider_code", { user_code: id }),
			]);

			const cleanGameCodes = gameCodes.filter(Boolean);
			const cleanProviderCodes = providerCodes.filter(Boolean);

			const games = await Game.find({ game_code: { $in: cleanGameCodes } })
				.select("game_code game_name provider_code")
				.lean();

			// Drakon/Nexus gibi kanalların altında kalan gerçek stüdyo (Pragmatic, NetEnt vb.)
			// kodlarını da dropdown'a dahil et.
			const studioCodesFromGames = [
				...new Set(games.map((g) => g.provider_code).filter(Boolean)),
			];
			const allProviderCodes = [
				...new Set([...cleanProviderCodes, ...studioCodesFromGames]),
			];

			const providers = await GameProvider.find({
				code: { $in: allProviderCodes },
			})
				.select("_id code name")
				.lean();

			// Provider listesi: GameProvider'da eşleşmeyenler için fallback üret
			const providerMap = new Map(providers.map((p) => [p.code, p]));
			const providerList = allProviderCodes.map((code) => {
				const p = providerMap.get(code);
				return p
					? { id: p._id, code: p.code, name: p.name }
					: {
							id: code,
							code,
							name: code.charAt(0).toUpperCase() + code.slice(1),
					  };
			});

			providerList.sort((a, b) => a.name.localeCompare(b.name));

			const gameList = games
				.map((g) => ({
					code: g.game_code,
					name: g.game_name,
					provider_code: g.provider_code || null,
				}))
				.sort((a, b) => a.name.localeCompare(b.name));

			res.status(200).json({
				success: true,
				providers: providerList,
				games: gameList,
			});
		} catch (err) {
			console.error("History filters hatası:", err);
			res
				.status(500)
				.json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// ═══════════════════════════════════════════════════════════════════════════
// CRM: Oyuncu Segmentleri
// ══════════════════��════════════════════════════════════════════════════════
router.get(
	"/player-segments/summary",
	checkPermission("users.read"),
	playerSegmentsController.getSummary,
);

router.get(
	"/player-segments/:key/users",
	checkPermission("users.read"),
	playerSegmentsController.getUsers,
);

// ══════════════════════════════════════════════════════════���════════════════
// CRM: Tag Manager
// ═══════════════════════════════════════════════════════════════════════════
router.get("/tags", checkPermission("users.read"), tagsController.listTags);
router.post("/tags", checkPermission("users.manage"), tagsController.createTag);
router.put("/tags/:id", checkPermission("users.manage"), tagsController.updateTag);
router.delete("/tags/:id", checkPermission("users.manage"), tagsController.deleteTag);
router.get(
	"/tags/:id/users",
	checkPermission("users.read"),
	tagsController.getTagUsers,
);
router.post(
	"/tags/:id/assign",
	checkPermission("users.manage"),
	tagsController.assignUsers,
);
router.post(
	"/tags/:id/unassign",
	checkPermission("users.manage"),
	tagsController.unassignUsers,
);

router.get(
	"/manual-bonus-categories",
	checkPermission(["finance.manualAdjustments.manage", "users.update"]),
	manualBonusCategoryController.getActiveCategoryNames,
);

router.get(
	"/manual-bonus-categories/manage",
	checkPermission(["finance.manualAdjustments.manage", "finance.promo.manage"]),
	manualBonusCategoryController.getAllCategories,
);

router.post(
	"/manual-bonus-categories",
	checkPermission(["finance.manualAdjustments.manage", "finance.promo.manage"]),
	manualBonusCategoryController.createCategory,
);

router.put(
	"/manual-bonus-categories/:id",
	checkPermission(["finance.manualAdjustments.manage", "finance.promo.manage"]),
	manualBonusCategoryController.updateCategory,
);

router.delete(
	"/manual-bonus-categories/:id",
	checkPermission(["finance.manualAdjustments.manage", "finance.promo.manage"]),
	manualBonusCategoryController.deleteCategory,
);

// 🎯 Toplu Bonus Raporu: bir bonus adına (kategoriye) ait tüm eklemeleri listeler.
router.get(
	"/manual-bonus-categories/:name/report",
	checkPermission(["finance.manualAdjustments.manage", "finance.promo.manage"]),
	manualBonusCategoryController.getCategoryReport,
);

// Kayıp Bonusu (Loss Bonus)
router.get(
	"/loss-bonus/settings",
	checkPermission(["finance.lossBonus.read", "finance.lossBonus.manage"]),
	lossBonusController.getSettings,
);

router.put(
	"/loss-bonus/settings",
	checkPermission("finance.lossBonus.manage"),
	lossBonusController.updateSettings,
);

router.get(
	"/loss-bonus/claims",
	checkPermission(["finance.lossBonus.read", "finance.lossBonus.manage"]),
	lossBonusController.listClaims,
);

router.post(
	"/loss-bonus/claims/:id/approve",
	checkPermission("finance.lossBonus.manage"),
	lossBonusController.approveClaim,
);

router.post(
	"/loss-bonus/claims/:id/reject",
	checkPermission("finance.lossBonus.manage"),
	lossBonusController.rejectClaim,
);

router.get(
	"/users/:id/loss-bonus",
	checkPermission(["finance.lossBonus.read", "finance.lossBonus.manage", "users.read"]),
	lossBonusController.getUserSummary,
);

// Reload Bonusu (Reload Bonus)
router.get(
	"/reload-bonus/settings",
	checkPermission(["finance.reloadBonus.read", "finance.reloadBonus.manage"]),
	reloadBonusController.getSettings,
);

router.put(
	"/reload-bonus/settings",
	checkPermission("finance.reloadBonus.manage"),
	reloadBonusController.updateSettings,
);

router.post(
	"/reload-bonus/preview",
	checkPermission(["finance.reloadBonus.read", "finance.reloadBonus.manage"]),
	reloadBonusController.preview,
);

router.get(
	"/reload-bonus/assignments",
	checkPermission(["finance.reloadBonus.read", "finance.reloadBonus.manage"]),
	reloadBonusController.listAssignments,
);

router.post(
	"/reload-bonus/assignments/:id/cancel",
	checkPermission("finance.reloadBonus.manage"),
	reloadBonusController.cancelAssignment,
);

router.get(
	"/users/:id/reload-bonus",
	checkPermission(["finance.reloadBonus.read", "finance.reloadBonus.manage", "users.read"]),
	reloadBonusController.getUserSummary,
);

router.post(
	"/users/:id/reload-bonus",
	checkPermission("finance.reloadBonus.manage"),
	reloadBonusController.createAssignment,
);

// Çağrı Senaryoları (Call Scenarios)
router.get(
	"/call-scenarios/templates",
	checkPermission(["callScenarios.read", "callScenarios.manage"]),
	callScenarioController.listTemplates,
);

router.post(
	"/call-scenarios/templates",
	checkPermission("callScenarios.manage"),
	callScenarioController.createTemplate,
);

router.put(
	"/call-scenarios/templates/:id",
	checkPermission("callScenarios.manage"),
	callScenarioController.updateTemplate,
);

router.get(
	"/call-scenarios/check-duplicate",
	checkPermission(["callScenarios.read", "callScenarios.manage"]),
	callScenarioController.checkDuplicate,
);

router.get(
	"/call-scenarios/assignments",
	checkPermission(["callScenarios.read", "callScenarios.manage"]),
	callScenarioController.listAssignments,
);

router.post(
	"/call-scenarios/assignments/:id/cancel",
	checkPermission("callScenarios.manage"),
	callScenarioController.cancelAssignment,
);

router.post(
	"/call-scenarios/assignments/:id/violate",
	checkPermission("callScenarios.manage"),
	callScenarioController.markViolated,
);

router.post(
	"/call-scenarios/assignments/:id/complete",
	checkPermission("callScenarios.manage"),
	callScenarioController.completeAssignment,
);

router.get(
	"/users/:id/call-scenarios",
	checkPermission(["callScenarios.read", "callScenarios.manage", "users.read"]),
	callScenarioController.getUserSummary,
);

router.post(
	"/users/:id/call-scenarios",
	checkPermission("callScenarios.manage"),
	callScenarioController.createAssignment,
);

// Yatırım Bonusu (Deposit Bonus)
router.get(
	"/deposit-bonus/settings",
	checkPermission(["finance.depositBonus.read", "finance.depositBonus.manage"]),
	depositBonusController.getSettings,
);

router.put(
	"/deposit-bonus/settings",
	checkPermission("finance.depositBonus.manage"),
	depositBonusController.updateSettings,
);

router.get(
	"/deposit-bonus/claims",
	checkPermission(["finance.depositBonus.read", "finance.depositBonus.manage"]),
	depositBonusController.listClaims,
);

router.post(
	"/deposit-bonus/claims/:id/approve",
	checkPermission("finance.depositBonus.manage"),
	depositBonusController.approveClaim,
);

router.post(
	"/deposit-bonus/claims/:id/reject",
	checkPermission("finance.depositBonus.manage"),
	depositBonusController.rejectClaim,
);

router.get(
	"/users/:id/deposit-bonus",
	checkPermission([
		"finance.depositBonus.read",
		"finance.depositBonus.manage",
		"users.read",
	]),
	depositBonusController.getUserSummary,
);

// Deneme Bonusu (Trial Bonus)
router.get(
	"/trial-bonus/settings",
	checkPermission(["finance.trialBonus.read", "finance.trialBonus.manage"]),
	trialBonusController.getSettings,
);

router.put(
	"/trial-bonus/settings",
	checkPermission("finance.trialBonus.manage"),
	trialBonusController.updateSettings,
);

router.get(
	"/trial-bonus/claims",
	checkPermission(["finance.trialBonus.read", "finance.trialBonus.manage"]),
	trialBonusController.listClaims,
);

router.post(
	"/trial-bonus/claims/:id/approve",
	checkPermission("finance.trialBonus.manage"),
	trialBonusController.approveClaim,
);

router.post(
	"/trial-bonus/claims/:id/reject",
	checkPermission("finance.trialBonus.manage"),
	trialBonusController.rejectClaim,
);

// Call Management (control-game) ekranında "Deneme Bonusu" rozeti/filtresi
// için toplu bakış — RTP/oyun sonucu hesaplaması yapmaz, sadece hangi
// kullanıcıların onaylı deneme bonusu olduğunu ve tutarını döner.
router.post(
	"/trial-bonus/lookup",
	checkPermission([
		"finance.trialBonus.read",
		"finance.trialBonus.manage",
		"controlGame.read",
	]),
	trialBonusController.lookup,
);

router.get(
	"/users/:id/trial-bonus",
	checkPermission([
		"finance.trialBonus.read",
		"finance.trialBonus.manage",
		"users.read",
	]),
	trialBonusController.getUserSummary,
);

// Deneme Bonusu — İnceleme Kilidi: çevrim/hedef bakiye tamamlandığında
// otomatik tetiklenir, SADECE bu endpoint ile (admin onayı) kapatılabilir.
router.post(
	"/users/:id/trial-bonus/resolve-review",
	checkPermission("finance.trialBonus.manage"),
	trialBonusController.resolveReview,
);

// Deneme Bonusu — Manuel İptal: admin, bonus çevrim/hedef bakiye aşamasında
// olsun veya inceleme kilidinde olsun, HER an bu endpoint ile deneme
// bonusunu "İptal Edildi" olarak sonlandırabilir (otomatik onay beklemez).
router.post(
	"/users/:id/trial-bonus/cancel",
	checkPermission("finance.trialBonus.manage"),
	trialBonusController.cancelTrialBonus,
);

// CRM Raporu (yatırım aralığı, alınan/eklenen bonus, bakiye kırılımı)
router.get(
	"/crm-report/summary",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getSummary,
);

router.get(
	"/crm-report/buckets",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getBuckets,
);

router.get(
	"/crm-report/game-buckets",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getGameTypeBuckets,
);

router.get(
	"/crm-report/filter-options",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getFilterOptions,
);

router.get(
	"/crm-report/game-options",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getGameOptions,
);

router.get(
	"/crm-report/members",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
		"reports.read",
	]),
	crmReportController.getMembers,
);

// Bakiye Analizi (manuel bonus/bakiye + kampanya + Filux + xPayment)
router.get(
	"/balance-analysis/summary",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
	]),
	balanceAnalysisController.getSummary,
);

router.get(
	"/balance-analysis/members",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
	]),
	balanceAnalysisController.getMembers,
);

router.get(
	"/balance-analysis/members/:id",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
	]),
	balanceAnalysisController.getMemberDetail,
);

router.get(
	"/balance-analysis/settings",
	checkPermission([
		"finance.balanceAnalysis.read",
		"finance.balanceAnalysis.manage",
	]),
	balanceAnalysisController.getSettings,
);

router.put(
	"/balance-analysis/settings",
	checkPermission("finance.balanceAnalysis.manage"),
	balanceAnalysisController.updateSettings,
);

router.get(
	"/manual-adjustments",
	checkPermission(["finance.manualAdjustments.read", "users.read"]),
	async (req, res) => {
		try {
			const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
			const limit = Math.min(
				Math.max(
					parseInt(req.query.itemsPerPage || req.query.limit, 10) ||
						20,
					1,
				),
				5000,
			);
			const { q = "", kind, direction, actorId, userId } = req.query;

			const query = {};
			if (["balance", "bonus"].includes(kind)) query.kind = kind;
			if (["credit", "debit"].includes(direction)) {
				query.direction = direction;
			}
			if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
				query.actorUser = actorId;
			}
			if (userId && mongoose.Types.ObjectId.isValid(userId)) {
				query.targetUser = userId;
			}

			const trimmedSearch = String(q || "").trim();
			if (trimmedSearch) {
				const regex = new RegExp(trimmedSearch, "i");
				query.$or = [
					{ "actorSnapshot.username": regex },
					{ "actorSnapshot.name": regex },
					{ "targetSnapshot.username": regex },
					{ "targetSnapshot.name": regex },
					{ "targetSnapshot.email": regex },
					{ category: regex },
					{ note: regex },
					{ source: regex },
				];
			}

			const [data, total] = await Promise.all([
				AdminManualAdjustment.find(query)
					.sort({ createdAt: -1 })
					.skip((page - 1) * limit)
					.limit(limit)
					.lean(),
				AdminManualAdjustment.countDocuments(query),
			]);

			res.status(200).json({
				success: true,
				data,
				total,
				page,
				totalPages: Math.ceil(total / limit),
			});
		} catch (error) {
			console.error("Manual adjustment list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

router.get(
	"/users/:id/manual-bonus-history",
	checkPermission(["finance.manualAdjustments.read", "users.read"]),
	async (req, res) => {
		try {
			const { id } = req.params;

			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz kullanıcı ID." });
			}

			const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
			const limit = Math.max(
				parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
				1,
			);

			const query = {
				targetUser: id,
				kind: "bonus",
				source: "manual",
			};

			const [data, total] = await Promise.all([
				AdminManualAdjustment.find(query)
					.sort({ createdAt: -1 })
					.skip((page - 1) * limit)
					.limit(limit)
					.lean(),
				AdminManualAdjustment.countDocuments(query),
			]);

			const mappedData = data.map((tx) => ({
				_id: tx._id,
				bonusName: tx.category,
				category: tx.category,
				note: tx.note,
				actor: tx.actorSnapshot,
				wallet: tx.wallet,
				direction: tx.direction,
				requestedAmount: Number(tx.requestedAmount || 0),
				appliedAmount: Number(tx.appliedAmount || 0),
				amount:
					tx.direction === "debit"
						? -Number(tx.appliedAmount || 0)
						: Number(tx.appliedAmount || 0),
				balanceBefore: Number(tx.balanceBefore || 0),
				balanceAfter: Number(tx.balanceAfter || 0),
				createdAt: tx.createdAt,
			}));

			const totalBonusAmount = mappedData.reduce(
				(sum, tx) => sum + Number(tx.amount || 0),
				0,
			);

			res.status(200).json({
				success: true,
				data: mappedData,
				total,
				totalBonusAmount,
				page,
				totalPages: Math.ceil(total / limit),
			});
		} catch (error) {
			console.error("User manual bonus history error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

router.get(
	"/users/:id/manual-adjustments",
	checkPermission(["finance.manualAdjustments.read", "users.read"]),
	async (req, res) => {
		try {
			const { id } = req.params;

			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz kullanıcı ID." });
			}

			const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
			const limit = Math.max(
				parseInt(req.query.itemsPerPage || req.query.limit, 10) || 20,
				1,
			);
			const adjustmentQuery = { targetUser: id };

			if (["balance", "bonus"].includes(req.query.kind)) {
				adjustmentQuery.kind = req.query.kind;
			}
			if (["credit", "debit"].includes(req.query.direction)) {
				adjustmentQuery.direction = req.query.direction;
			}

			const [adjustments, auditLogs] = await Promise.all([
				AdminManualAdjustment.find(adjustmentQuery)
					.sort({ createdAt: -1 })
					.lean(),
				AdminUserAuditLog.find({ targetUser: id })
					.sort({ createdAt: -1 })
					.lean(),
			]);

			const mergedData = [
				...adjustments.map((item) => ({
					...item,
					entryType: "manualAdjustment",
				})),
				...auditLogs.map((item) => ({
					...item,
					entryType: "userAudit",
				})),
			].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

			const total = mergedData.length;
			const data = mergedData.slice((page - 1) * limit, page * limit);

			res.status(200).json({
				success: true,
				data,
				total,
				page,
				totalPages: Math.ceil(total / limit),
			});
		} catch (error) {
			console.error("User manual adjustment list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

router.post(
	"/users/:id/manual-adjustments",
	checkPermission(["finance.manualAdjustments.manage", "users.update"]),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz kullanıcı ID." });
			}

			const user = await User.findById(id);
			if (!user) {
				return res
					.status(404)
					.json({ success: false, message: "Kullanıcı bulunamadı" });
			}

			const wallet = req.body.wallet || {
				coinType: req.body.coinType,
				chain: req.body.chain,
				type: req.body.type,
			};
			const kind = String(req.body.kind || "").trim();
			const category = String(req.body.category || "").trim();

			if (
				kind === "bonus" &&
				!(await manualBonusCategoryController.isValidCategoryName(category))
			) {
				return res.status(400).json({
					success: false,
					message: "INVALID_MANUAL_BONUS_CATEGORY",
					data: await manualBonusCategoryController.getActiveCategoryNamesRaw(),
				});
			}

			const result = await createAdminManualAdjustment({
				targetUser: user,
				actorUser: req.adminUser || null,
				wallet,
				kind,
				direction: req.body.direction,
				category,
				note: req.body.note,
				amount: req.body.amount,
				source: "manual",
				metadata: {
					initiatedFrom: "admin-user-profile",
				},
			});

			res.status(201).json({
				success: true,
				message: "Manual adjustment created",
				data: result.adjustment,
				appliedAmount: result.appliedAmount,
				balanceAfter: result.balanceAfter,
			});
		} catch (error) {
			console.error("Manual adjustment create error:", error);

			if (
				[
					"INVALID_MANUAL_BONUS_CATEGORY",
					"INVALID_ADJUSTMENT_KIND",
					"INVALID_ADJUSTMENT_DIRECTION",
					"INVALID_ADJUSTMENT_AMOUNT",
					"INVALID_ADJUSTMENT_CATEGORY",
					"INVALID_ADJUSTMENT_WALLET",
					"USER_WALLET_NOT_FOUND",
					"INSUFFICIENT_BALANCE",
				].includes(error.message)
			) {
				return res.status(400).json({
					success: false,
					message: error.message,
				});
			}

			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

// 🔹 Toplu Bonus Yükle: affiliate kodu filtresi için seçim listesi
router.get(
	"/bulk-bonus/affiliate-codes",
	checkPermission(["finance.manualAdjustments.manage", "users.update"]),
	async (req, res) => {
		try {
			const data = await listAffiliateCodes();
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error("Affiliate code list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

// Toplu Bonus: son işlem sayılabilecek bonus türleri
router.get(
	"/bulk-bonus/bonus-categories",
	checkPermission(["finance.manualAdjustments.manage", "users.update"]),
	async (req, res) => {
		try {
			const data = await listLastBonusCategories();
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error("Bulk bonus category list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

// 🔹 Toplu Bonus Yükle: birden fazla kullanıcıya aynı bonusu tek seferde ekler
router.post(
	"/bulk-bonus",
	checkPermission(["finance.manualAdjustments.manage", "users.update"]),
	async (req, res) => {
		try {
			const category = String(req.body.category || "").trim();

			if (!(await manualBonusCategoryController.isValidCategoryName(category))) {
				return res.status(400).json({
					success: false,
					message: "INVALID_MANUAL_BONUS_CATEGORY",
					data: await manualBonusCategoryController.getActiveCategoryNamesRaw(),
				});
			}

			const result = await createBulkManualBonus({
				usernames: req.body.usernames,
				amount: req.body.amount,
				category,
				note: req.body.note,
				wageringMultiplier: req.body.wageringMultiplier,
				applyWithdrawalLock: req.body.applyWithdrawalLock,
				minDeposit: req.body.minDeposit,
				minWithdraw: req.body.minWithdraw,
				affiliateCode: req.body.affiliateCode,
				enforceLastBonusRule: req.body.enforceLastBonusRule,
				lastBonusCategories: req.body.lastBonusCategories,
				actorUser: req.adminUser || null,
			});

			res.status(201).json({
				success: true,
				message: "Toplu bonus işlemi tamamlandı",
				data: result,
			});
		} catch (error) {
			console.error("Bulk bonus create error:", error);

			if (
				[
					"NO_USERNAMES_PROVIDED",
					"TOO_MANY_USERNAMES",
					"INVALID_ADJUSTMENT_AMOUNT",
					"INVALID_ADJUSTMENT_CATEGORY",
				].includes(error.message)
			) {
				return res.status(400).json({ success: false, message: error.message });
			}

			res.status(500).json({ success: false, message: "Sunucu hatası." });
		}
	},
);

router.get("/users/:id/transactions", checkPermission("users.read"), async (req, res) => {
	try {
		const { id } = req.params;

		// Geçerli ObjectId değilse hata dön
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID." });
		}

		// Opsiyonel pagination
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;

		const transactions = await BalanceTransaction.find({ user: id })
			.sort({ createdAt: -1 }) // en yeni ilk
			.skip((page - 1) * limit)
			.limit(limit);

		const total = await BalanceTransaction.countDocuments({ user: id });

		res.status(200).json({
			success: true,
			data: transactions,
			total,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error("BalanceTransaction list error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası." });
	}
});

// 🔹 Kontroller sekmesi: dönemsel finansal rapor (yatırım/çekim/net kâr/bonus/çevrim/GGR)
router.get(
	"/users/:id/financial-report",
	checkPermission("users.read"),
	async (req, res) => {
		try {
			const { id } = req.params;
			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz kullanıcı ID.",
				});
			}

			const period = String(req.query.period || "monthly").toLowerCase();
			const now = new Date();
			let dateFrom = null;
			let dateTo = null;

			if (period === "daily") {
				dateFrom = new Date(now);
				dateFrom.setHours(0, 0, 0, 0);
			} else if (period === "weekly") {
				dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			} else if (period === "monthly") {
				dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			} else if (period === "custom") {
				dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
				dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
				if (dateFrom && Number.isNaN(dateFrom.getTime())) dateFrom = null;
				if (dateTo && Number.isNaN(dateTo.getTime())) dateTo = null;
			}
			// period === 'all' -> aralık yok

			const userObjectId = new mongoose.Types.ObjectId(id);
			const dateMatch = {};
			if (dateFrom) dateMatch.$gte = dateFrom;
			if (dateTo) dateMatch.$lte = dateTo;
			const withDateRange = (base) =>
				Object.keys(dateMatch).length
					? { ...base, createdAt: dateMatch }
					: base;

			const sumAmount = (rows) =>
				rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
			const countRows = (rows) =>
				rows.reduce((sum, row) => sum + Number(row.count || 0), 0);

			const [
				depositAgg,
				withdrawalAgg,
				cryptoAgg,
				bankAgg,
				forcelabAgg,
				meelDevAgg,
				galaxyPayAgg,
				fluxKriptoAgg,
				xPaymentsAgg,
				manualCreditAgg,
				manualDebitAgg,
				manualBonusAgg,
				bonusHistoryAgg,
				transactionAgg,
			] = await Promise.all([
				Deposit.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				Withdrawal.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				CryptoTransaction.aggregate([
					{
						$match: withDateRange({
							user: userObjectId,
							state: { $in: ["completed", "success"] },
						}),
					},
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				BankTransfer.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				ForcelabFinanceTransaction.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{
						$group: {
							_id: { $ifNull: ["$providerType", "deposit"] },
							total: { $sum: "$amount" },
							count: { $sum: 1 },
						},
					},
				]),
				MeelDevTransaction.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				GalaxyPayTransaction.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				FluxKriptoTransaction.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				XPaymentTransaction.aggregate([
					{ $match: withDateRange({ user: userObjectId, status: "approved" }) },
					{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
				]),
				AdminManualAdjustment.aggregate([
					{
						$match: withDateRange({
							targetUser: userObjectId,
							kind: "balance",
							direction: "credit",
						}),
					},
					{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
				]),
				AdminManualAdjustment.aggregate([
					{
						$match: withDateRange({
							targetUser: userObjectId,
							kind: "balance",
							direction: "debit",
						}),
					},
					{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
				]),
				AdminManualAdjustment.aggregate([
					{
						$match: withDateRange({
							targetUser: userObjectId,
							kind: "bonus",
							direction: "credit",
						}),
					},
					{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
				]),
				BonusHistory.aggregate([
					{
						$match: Object.keys(dateMatch).length
							? { userId: userObjectId, claimedAt: dateMatch }
							: { userId: userObjectId },
					},
					{ $group: { _id: null, total: { $sum: "$amount" } } },
				]),
				Transactions.aggregate([
					{
						$match: Object.keys(dateMatch).length
							? { user_code: id, created_at: dateMatch }
							: { user_code: id },
					},
					{
						$group: {
							_id: null,
							totalBet: { $sum: { $ifNull: ["$bet_money", 0] } },
							totalWin: { $sum: { $ifNull: ["$win_money", 0] } },
						},
					},
				]),
			]);

			const splitByType = (rows, type) =>
				rows.filter((row) => row._id === type);

			const totalDeposit =
				Number(depositAgg[0]?.total || 0) +
				sumAmount(splitByType(cryptoAgg, "deposit")) +
				sumAmount(splitByType(bankAgg, "deposit")) +
				sumAmount(splitByType(forcelabAgg, "deposit")) +
				sumAmount(splitByType(meelDevAgg, "deposit")) +
				sumAmount(splitByType(galaxyPayAgg, "deposit")) +
				sumAmount(splitByType(fluxKriptoAgg, "deposit")) +
				sumAmount(splitByType(xPaymentsAgg, "deposit"));

			const depositCount =
				Number(depositAgg[0]?.count || 0) +
				countRows(splitByType(cryptoAgg, "deposit")) +
				countRows(splitByType(bankAgg, "deposit")) +
				countRows(splitByType(forcelabAgg, "deposit")) +
				countRows(splitByType(meelDevAgg, "deposit")) +
				countRows(splitByType(galaxyPayAgg, "deposit")) +
				countRows(splitByType(fluxKriptoAgg, "deposit")) +
				countRows(splitByType(xPaymentsAgg, "deposit"));

			const totalWithdrawal =
				Number(withdrawalAgg[0]?.total || 0) +
				sumAmount(splitByType(cryptoAgg, "withdraw")) +
				sumAmount(splitByType(bankAgg, "withdraw")) +
				sumAmount(splitByType(forcelabAgg, "withdraw")) +
				sumAmount(splitByType(meelDevAgg, "withdraw")) +
				sumAmount(splitByType(galaxyPayAgg, "withdraw")) +
				sumAmount(splitByType(fluxKriptoAgg, "withdraw")) +
				sumAmount(splitByType(xPaymentsAgg, "withdraw"));

			const withdrawalCount =
				Number(withdrawalAgg[0]?.count || 0) +
				countRows(splitByType(cryptoAgg, "withdraw")) +
				countRows(splitByType(bankAgg, "withdraw")) +
				countRows(splitByType(forcelabAgg, "withdraw")) +
				countRows(splitByType(meelDevAgg, "withdraw")) +
				countRows(splitByType(galaxyPayAgg, "withdraw")) +
				countRows(splitByType(fluxKriptoAgg, "withdraw")) +
				countRows(splitByType(xPaymentsAgg, "withdraw"));

			const manualReceivable = Number(manualCreditAgg[0]?.total || 0);
			const manualDebt = Number(manualDebitAgg[0]?.total || 0);
			const bonusTotal =
				Number(manualBonusAgg[0]?.total || 0) +
				Number(bonusHistoryAgg[0]?.total || 0);
			const turnover = Number(transactionAgg[0]?.totalBet || 0);
			const ggr =
				Number(transactionAgg[0]?.totalBet || 0) -
				Number(transactionAgg[0]?.totalWin || 0);
			const netProfit = totalDeposit - totalWithdrawal;

			res.status(200).json({
				success: true,
				data: {
					period,
					dateFrom,
					dateTo,
					totalDeposit,
					depositCount,
					totalWithdrawal,
					withdrawalCount,
					netProfit,
					manualReceivable,
					manualDebt,
					bonusTotal,
					turnover,
					ggr,
				},
			});
		} catch (error) {
			console.error("Finansal rapor hatası:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Kullanıcının bonus geçmişini döndürme
router.get("/users/:id/bonus-history", checkPermission("users.read"), async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz kullanıcı ID" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;

		// 1. BonusHistory (VIP, daily rewards vs.)
		const bonusHistories = await BonusHistory.find({ userId: id })
			.sort({ claimedAt: -1 })
			.lean();

		const mappedBonusHistory = bonusHistories.map((tx) => ({
			_id: tx._id,
			source: "vip",
			type: tx.type,
			amount: tx.amount,
			level: tx.level,
			details: tx.details,
			createdAt: tx.claimedAt,
		}));

		// 2. CampaignTransaction (Kampanya bonusları)
		const campaignTx = await CampaignTransaction.find({ user: id })
			.sort({ claimedAt: -1 })
			.lean();

		const mappedCampaign = campaignTx.map((tx) => ({
			_id: tx._id,
			source: "campaign",
			type: "campaign",
			amount: tx.rewardAmount,
			direction: "credit",
			campaignTitle: tx.campaignTitle,
			campaignId: tx.campaign,
			mode: tx.mode,
			status: tx.status,
			assignedByAdmin: tx.assignedByAdmin,
			createdAt: tx.claimedAt,
		}));

		// 3. CryptoTransaction (Deposit bonusları)
		const cryptoBonuses = await CryptoTransaction.find({
			user: id,
			type: "deposit",
			"data.bonusAmount": { $gt: 0 },
		}).lean();

		const mappedCrypto = cryptoBonuses.map((tx) => {
			const bonusAmount = Number(tx.data?.bonusAmount || 0);
			const totalAmount = Number(tx.amount || 0);

			return {
				_id: tx._id,
				source: "deposit",
				type: tx.data?.bonusType || "depositBonus",
				amount: bonusAmount,
				direction: "credit",
				depositAmount: Math.max(totalAmount - bonusAmount, 0),
				currency: tx.data?.userFiat || tx.data?.currency || null,
				createdAt: tx.createdAt,
			};
		});

		// 4. BalanceTransaction (Affiliate, rakeback vs.)
		const bonusTypes = [
			"affiliateCommission",
			"affiliateCodeClaim",
			"affiliateEarningClaim",
			"promoCodeClaim",
			"rakebackClaim",
			"rainTip",
			"adminAdjust",
		];

		const balanceBonuses = await BalanceTransaction.find({
			user: id,
			type: { $in: bonusTypes },
		}).lean();

		const mappedBalance = balanceBonuses.map((tx) => ({
			_id: tx._id,
			source: "balance",
			type: tx.type,
			amount: tx.amount,
			direction: "credit",
			createdAt: tx.createdAt,
		}));

		// 5. AdminManualAdjustment (manuel bonuslar)
		const manualBonusAdjustments = await AdminManualAdjustment.find({
			targetUser: id,
			kind: "bonus",
			source: "manual",
		}).lean();

		const mappedManualAdjustments = manualBonusAdjustments.map((tx) => ({
			_id: tx._id,
			source: "manual",
			type: "manualBonus",
			amount:
				tx.direction === "debit"
					? -Number(tx.appliedAmount || 0)
					: Number(tx.appliedAmount || 0),
			direction: tx.direction,
			category: tx.category,
			note: tx.note,
			actor: tx.actorSnapshot,
			wallet: tx.wallet,
			createdAt: tx.createdAt,
		}));

		// Hepsini birleştir ve tarihe göre sırala
		const allBonuses = [
			...mappedBonusHistory,
			...mappedCampaign,
			...mappedCrypto,
			...mappedBalance,
			...mappedManualAdjustments,
		].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		// Pagination
		const total = allBonuses.length;
		const paginatedBonuses = allBonuses.slice(
			(page - 1) * limit,
			page * limit,
		);

		// Toplam bonus miktarı
		const totalBonusAmount = allBonuses.reduce(
			(sum, b) => sum + (b.amount || 0),
			0,
		);

		res.status(200).json({
			success: true,
			data: paginatedBonuses,
			total,
			totalBonusAmount,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error("Bonus history error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.get("/users/:id/transactions/fiat-crypto", checkPermission("users.read"), async (req, res) => {
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id))
		return res
			.status(400)
			.json({ success: false, message: "Geçersiz kullanıcı ID" });

	try {
		const siteSettings = await SiteSettings.findOne().lean();
		const meelDevMethodName = siteSettings?.meelDev?.name || "MeelDev";
		const galaxyPayMethodName = siteSettings?.galaxyPay?.name || "GalaxyPay";
		const fluxKriptoMethodName =
			siteSettings?.fluxKripto?.name || "FluxKripto";
		const xPaymentsMethodName =
			siteSettings?.xPayments?.name || "XPayment";

		// ✅ Crypto işlemlerini çek
		const cryptoTx = await CryptoTransaction.find({ user: id }).lean();

		const cryptoDeposits = cryptoTx
			.filter((tx) => tx.type === "deposit")
			.map((tx) => ({
				amount: tx.amount,
				type: "crypto",
				transaction: tx.data?.transaction,
				currency: tx.data?.currency,
				cryptoAmount: tx.data?.cryptoAmount,
				state: tx.state,
				method: tx.data?.providerId ?? null,
				createdAt: tx.createdAt,
			}));

		const cryptoWithdrawals = cryptoTx
			.filter((tx) => tx.type === "withdraw")
			.map((tx) => ({
				amount: tx.amount,
				type: "crypto",
				transaction: tx.data?.transaction,
				currency: tx.data?.currency,
				cryptoAmount: tx.data?.cryptoAmount,
				state: tx.state,
				method: tx.data?.receiver ?? null,
				createdAt: tx.createdAt,
			}));

		// ✅ Fiat deposit işlemleri
		const fiatDepositsRaw = await Deposit.find({ user: id }).lean();
		const fiatDeposits = fiatDepositsRaw.map((tx) => ({
			amount: tx.amount,
			type: "fiat",
			transaction: tx.transactionId ?? null,
			method: tx.method,
			status: tx.status,
			createdAt: tx.createdAt,
		}));

		// ✅ Fiat withdrawal işlemleri
		const fiatWithdrawalsRaw = await Withdrawal.find({ user: id }).lean();
		const fiatWithdrawals = fiatWithdrawalsRaw.map((tx) => ({
			amount: tx.amount,
			type: "fiat",
			transaction: tx.trx ?? null,
			method: tx.method,
			status: tx.status ?? null,
			createdAt: tx.createdAt,
		}));

		// ✅ Banka transferi işlemleri
		const bankTransferRaw = await BankTransfer.find({ user: id }).lean();
		const bankDeposits = bankTransferRaw
			.filter((tx) => tx.type === "deposit")
			.map((tx) => ({
				amount: tx.amount,
				type: "bank",
				transaction: tx._id.toString(),
				method: tx.bankName || "Banka Transferi",
				status: tx.status,
				createdAt: tx.createdAt,
				iban: tx.iban,
				accountName: tx.accountName,
			}));
		const bankWithdrawals = bankTransferRaw
			.filter((tx) => tx.type === "withdraw" || !tx.type)
			.map((tx) => ({
				amount: tx.amount,
				type: "bank",
				transaction: tx._id.toString(),
				method: tx.bankName || "Banka Transferi",
				status: tx.status,
				createdAt: tx.createdAt,
				iban: tx.iban,
				accountName: tx.accountName,
			}));

		// ✅ Forcelab Finance işlemleri
		const forcelabRaw = await ForcelabFinanceTransaction.find({
			user: id,
		}).lean();

		const normalizeForcelabTransaction = (tx) => ({
			amount: tx.amount,
			type: "forcelab",
			transaction: tx.externalTransactionId || null,
			method:
				tx.providerName || tx.providerSlug || "Forcelab Finance",
			status: tx.status,
			currency: tx.currency,
			createdAt: tx.createdAt,
			providerSlug: tx.providerSlug,
			providerType: tx.providerType,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		});

		const forcelabDeposits = forcelabRaw
			.filter((tx) => (tx.providerType || "deposit") === "deposit")
			.map(normalizeForcelabTransaction);

		const forcelabWithdrawals = forcelabRaw
			.filter((tx) => tx.providerType === "withdraw")
			.map(normalizeForcelabTransaction);

		// ✅ MeelDev işlemleri
		const meelDevRaw = await MeelDevTransaction.find({ user: id }).lean();

		const normalizeMeelDevTransaction = (tx) => ({
			amount: tx.amount,
			type: "meeldev",
			transaction: tx.transactionId || tx._id.toString(),
			method:
				tx.bankInfo?.bankName || tx.paymentType || meelDevMethodName,
			status: tx.status,
			currency: tx.currency,
			createdAt: tx.createdAt,
			processNo: tx.processNo,
			paymentType: tx.paymentType,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		});

		const meelDevDeposits = meelDevRaw
			.filter((tx) => tx.type === "deposit")
			.map(normalizeMeelDevTransaction);

		const meelDevWithdrawals = meelDevRaw
			.filter((tx) => tx.type === "withdraw")
			.map(normalizeMeelDevTransaction);

		// ✅ GalaxyPay işlemleri
		const galaxyPayRaw = await GalaxyPayTransaction.find({ user: id }).lean();

		const normalizeGalaxyPayTransaction = (tx) => ({
			amount: tx.amount,
			type: "galaxypay",
			transaction: tx.externalTransactionId || tx._id.toString(),
			method:
				tx.method === "bank-transfer"
					? tx.bankInfo?.bankName || "Banka Transferi"
					: tx.method === "papara"
						? "Papara"
						: galaxyPayMethodName,
			status: tx.status,
			currency: tx.currency,
			createdAt: tx.createdAt,
			paymentId: tx.paymentId,
			providerMethod: tx.method,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		});

		const galaxyPayDeposits = galaxyPayRaw
			.filter((tx) => tx.type === "deposit")
			.map(normalizeGalaxyPayTransaction);

		const galaxyPayWithdrawals = galaxyPayRaw
			.filter((tx) => tx.type === "withdraw")
			.map(normalizeGalaxyPayTransaction);

		const fluxKriptoRaw = await FluxKriptoTransaction.find({ user: id }).lean();
		const normalizeFluxKriptoTransaction = (tx) => ({
			amount: tx.amount,
			requestedAmount: tx.requestedAmount ?? tx.amount,
			providerAmount: tx.providerAmount ?? null,
			type: "fluxkripto",
			transaction: tx.externalTransactionId || tx._id.toString(),
			method: "fluxkripto",
			methodName: fluxKriptoMethodName,
			status: tx.status,
			currency: tx.currency,
			cryptoAmount: tx.cryptoAmount ?? null,
			createdAt: tx.createdAt,
			financeId: tx.financeId || null,
			orderId: tx.orderId || null,
			walletAddress: tx.walletAddress || null,
			receiverWallet: tx.receiverWallet || null,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		});
		const fluxKriptoDeposits = fluxKriptoRaw
			.filter((tx) => tx.type === "deposit")
			.map(normalizeFluxKriptoTransaction);
		const fluxKriptoWithdrawals = fluxKriptoRaw
			.filter((tx) => tx.type === "withdraw")
			.map(normalizeFluxKriptoTransaction);

		const xPaymentsRaw = await XPaymentTransaction.find({ user: id }).lean();
		const normalizeXPaymentTransaction = (tx) => ({
			amount: tx.amount,
			requestedAmount: tx.requestedAmount ?? tx.amount,
			providerAmount: tx.providerAmount ?? null,
			type: "xpayments",
			transaction: tx.externalTransactionId || tx._id.toString(),
			method: "xpayments",
			methodName: xPaymentsMethodName,
			status: tx.status,
			providerStatus: tx.providerStatus || null,
			isProcessing: tx.isProcessing === true,
			currency: tx.currency || "TRY",
			createdAt: tx.createdAt,
			financeId: tx.financeId || null,
			account: tx.account || null,
			withdrawal: tx.withdrawal || null,
			oldBalance: tx.oldBalance,
			newBalance: tx.newBalance,
		});
		const xPaymentDeposits = xPaymentsRaw
			.filter((tx) => tx.type === "deposit")
			.map(normalizeXPaymentTransaction);
		const xPaymentWithdrawals = xPaymentsRaw
			.filter((tx) => tx.type === "withdraw")
			.map(normalizeXPaymentTransaction);

		const deposits = [
			...cryptoDeposits,
			...fiatDeposits,
			...bankDeposits,
			...forcelabDeposits,
			...meelDevDeposits,
			...galaxyPayDeposits,
			...fluxKriptoDeposits,
			...xPaymentDeposits,
		].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		const withdrawals = [
			...cryptoWithdrawals,
			...fiatWithdrawals,
			...bankWithdrawals,
			...forcelabWithdrawals,
			...meelDevWithdrawals,
			...galaxyPayWithdrawals,
			...fluxKriptoWithdrawals,
			...xPaymentWithdrawals,
		].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		res.status(200).json({
			success: true,
			deposits,
			withdrawals,
		});
	} catch (err) {
		console.error("Fiat & crypto tx error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.get("/users/:id/shop-purchases", checkPermission("users.read"), async (req, res) => {
	const { id } = req.params;

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res
			.status(400)
			.json({ success: false, message: "Geçersiz kullanıcı ID" });
	}

	try {
		const purchases = await ShopPurchase.find({ user: id })
			.sort({ createdAt: -1 })
			.lean();

		return res.status(200).json({
			success: true,
			data: purchases,
			total: purchases.length,
		});
	} catch (error) {
		console.error("Shop purchase history error:", error);
		return res.status(500).json({
			success: false,
			message: "Mağaza geçmişi alınamadı",
		});
	}
});

router.get("/games", checkPermission("games.read"), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			search = "",
			provider,
			category,
			game_type,
			distribution,
			sort_by = "created_at",
			order = "desc",
		} = req.query;

		const filter = {};

		if (search) filter.game_name = { $regex: search, $options: "i" };
		if (provider) filter.provider_code = provider;
		if (category) filter.category = category;
		if (game_type) filter.game_type = game_type;
		if (distribution) filter.distribution = distribution;

		const sortOrder = order === "asc" ? 1 : -1;

		const games = await Game.find(filter)
			.sort({ [sort_by]: sortOrder })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Game.countDocuments(filter);

		res.status(200).json({
			success: true,
			data: games,
			total,
			totalPages: Math.ceil(total / limit),
			page: Number(page),
		});
	} catch (error) {
		console.error("Games list error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

const GAME_UPLOAD_DIR = path.join(__dirname, "../../uploads/games");
const GAME_IMAGE_EXTENSION_BY_MIME = {
	"image/avif": ".avif",
	"image/gif": ".gif",
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/svg+xml": ".svg",
	"image/webp": ".webp",
};
const GAME_ALLOWED_IMAGE_EXTENSIONS = new Set(
	Object.values(GAME_IMAGE_EXTENSION_BY_MIME)
);
const GAME_IMAGE_MAX_SIZE = 50 * 1024 * 1024;

const ensureDirectoryExists = (dirPath) => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
};

const createGameImageFilename = (extension = ".jpg") =>
	`${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

const resolveGameImageExtension = (contentType, pathname = "") => {
	const normalizedContentType = String(contentType || "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	const mimeExtension = GAME_IMAGE_EXTENSION_BY_MIME[normalizedContentType];

	if (mimeExtension) {
		return mimeExtension;
	}

	const pathnameExtension = path.extname(pathname).toLowerCase();
	if (GAME_ALLOWED_IMAGE_EXTENSIONS.has(pathnameExtension)) {
		return pathnameExtension;
	}

	return ".jpg";
};

const saveRemoteGameImage = async (imageUrl) => {
	let parsedUrl;

	try {
		parsedUrl = new URL(imageUrl);
	} catch {
		throw new Error("Geçerli bir görsel URL'si girilmelidir.");
	}

	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		throw new Error("Sadece http/https görsel URL'leri kabul edilir.");
	}

	const response = await axios.get(parsedUrl.toString(), {
		responseType: "arraybuffer",
		timeout: 30000,
		maxRedirects: 5,
		maxContentLength: GAME_IMAGE_MAX_SIZE,
		validateStatus: (status) => status >= 200 && status < 400,
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.9",
		},
	});

	const contentType = String(response.headers["content-type"] || "")
		.split(";")[0]
		.trim()
		.toLowerCase();

	if (!contentType.startsWith("image/")) {
		throw new Error("Verilen URL bir görsel dosyası döndürmüyor.");
	}

	ensureDirectoryExists(GAME_UPLOAD_DIR);

	const extension = resolveGameImageExtension(
		contentType,
		parsedUrl.pathname
	);
	const filename = createGameImageFilename(extension);
	const filePath = path.join(GAME_UPLOAD_DIR, filename);

	await fs.promises.writeFile(filePath, Buffer.from(response.data));

	return `/uploads/games/${filename}`;
};

const gameImageUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			ensureDirectoryExists(GAME_UPLOAD_DIR);
			cb(null, GAME_UPLOAD_DIR);
		},
		filename: (req, file, cb) => {
			const ext = path.extname(file.originalname) || ".jpg";
			const uniqueName = createGameImageFilename(ext);
			cb(null, uniqueName);
		},
	}),
	limits: { fileSize: GAME_IMAGE_MAX_SIZE },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Sadece resim dosyaları kabul edilmektedir."), false);
		}
	},
});


router.put(
	"/games/:id",
	checkPermission("games.update"),
	gameImageUpload.fields([
		{ name: "bannerFile", maxCount: 1 },
		{ name: "backgroundFile", maxCount: 1 },
	]),
	async (req, res) => {
	try {
		const bannerFile = req.files?.bannerFile?.[0];
		const backgroundFile = req.files?.backgroundFile?.[0];
		const backgroundImageUrl =
			typeof req.body.backgroundImageUrl === "string"
				? req.body.backgroundImageUrl.trim()
				: "";
		const updateData = { ...req.body, updated_at: new Date() };
		delete updateData.backgroundImageUrl;

		// FormData her şeyi string yapar — "null", "undefined", "" değerlerini temizle
		for (const key of Object.keys(updateData)) {
			if (updateData[key] === "null" || updateData[key] === "undefined") {
				delete updateData[key];
			}
		}

		// FormData ile gönderilen array alanları JSON string olarak gelir, parse et
		if (typeof updateData.categories === "string") {
			try {
				updateData.categories = JSON.parse(updateData.categories);
			} catch {
				updateData.categories = [updateData.categories];
			}
		}

		// Number alanlarını string'den Number'a ��evir
		const numberFields = [
			"provider_id", "has_lobby", "is_mobile", "has_freespins",
			"has_tables", "only_demo", "status", "lobby_id", "rtp",
			"featured", "views",
		];
		for (const field of numberFields) {
			if (updateData[field] === "") {
				delete updateData[field];
			} else if (updateData[field] !== undefined) {
				const num = Number(updateData[field]);
				if (!isNaN(num)) {
					updateData[field] = num;
				} else {
					delete updateData[field];
				}
			}
		}

		if (bannerFile) {
			updateData.banner = `/uploads/games/${bannerFile.filename}`;
		}

		if (backgroundFile) {
			updateData.background = `/uploads/games/${backgroundFile.filename}`;
		} else if (backgroundImageUrl) {
			try {
				updateData.background = await saveRemoteGameImage(
					backgroundImageUrl
				);
			} catch (downloadError) {
				console.error(
					"Game background download error:",
					downloadError.message
				);
				return res.status(400).json({
					success: false,
					message: downloadError.message,
				});
			}
		}

		const updatedGame = await Game.findByIdAndUpdate(
			req.params.id,
			updateData,
			{ new: true },
		);

		if (!updatedGame) {
			return res
				.status(404)
				.json({ success: false, message: "Oyun bulunamadı" });
		}

		res.status(200).json({ success: true, data: updatedGame });
	} catch (error) {
		console.error("Game update error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
	}
);

router.delete("/games/:id", checkPermission("games.delete"), async (req, res) => {
	try {
		const deletedGame = await Game.findByIdAndDelete(req.params.id);

		if (!deletedGame) {
			return res
				.status(404)
				.json({ success: false, message: "Oyun bulunamadı" });
		}

		res.status(200).json({
			success: true,
			message: "Oyun başarıyla silindi.",
			data: { id: deletedGame._id, game_name: deletedGame.game_name },
		});
	} catch (error) {
		console.error("Game delete error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.get("/games/meta", checkPermission("games.read"), async (req, res) => {
	try {
		const categories = await Game.distinct("category");
		const providerCodes = await Game.distinct("provider_code");

		res.status(200).json({
			success: true,
			categories: categories.filter(Boolean),
			providerCodes: providerCodes.filter(Boolean),
		});
	} catch (error) {
		console.error("Games meta error:", error);
		res.status(500).json({
			success: false,
			message: "Meta veriler alınamadı",
		});
	}
});

router.get("/providers", checkPermission("providers.read"), async (req, res) => {
	try {
		const { page = 1, limit = 20, search = "", type = "" } = req.query;
		const skip = (Number(page) - 1) * Number(limit);

		let drakonQuery = {};
		if (search) {
			drakonQuery.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ code: { $regex: search, $options: "i" } },
			];
		}
		const drakonProviders = await DrakonProvider.find(drakonQuery).lean();
		const drakonMapped = drakonProviders.map((p) => ({
			_id: p._id,
			name: p.name,
			code: p.code,
			rtp: p.rtp || 0,
			status: p.status,
			type: "drakon",
			createdAt: p.createdAt,
		}));

		const nexusGames = await Game.find({ distribution: "nexus" }).lean();
		const nexusProviderMap = new Map();
		nexusGames.forEach((game) => {
			const key = game.provider_code || game.provider?.code;
			if (key && !nexusProviderMap.has(key)) {
				nexusProviderMap.set(key, {
					_id: `nexus_${key}`,
					name: game.provider?.name || key,
					code: key,
					rtp: game.provider?.rtp || game.rtp || 0,
					status: game.status ?? 1,
					type: "nexus",
					createdAt: game.createdAt,
				});
			}
		});
		let nexusMapped = Array.from(nexusProviderMap.values());

		if (search) {
			const searchLower = search.toLowerCase();
			nexusMapped = nexusMapped.filter(
				(p) =>
					p.name.toLowerCase().includes(searchLower) ||
					p.code.toLowerCase().includes(searchLower),
			);
		}

		let allProviders = [...drakonMapped, ...nexusMapped];
		if (type === "drakon") {
			allProviders = drakonMapped;
		} else if (type === "nexus") {
			allProviders = nexusMapped;
		}

		allProviders.sort((a, b) => a.name.localeCompare(b.name));

		const total = allProviders.length;
		const paginatedProviders = allProviders.slice(
			skip,
			skip + Number(limit),
		);

		res.status(200).json({
			success: true,
			data: paginatedProviders,
			total,
			totalPages: Math.ceil(total / Number(limit)),
			page: Number(page),
		});
	} catch (err) {
		console.error("Unified provider list error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.put("/providers/:id/status", checkPermission("providers.update"), async (req, res) => {
	try {
		const { id } = req.params;
		const { status, type } = req.body;

		if (![0, 1].includes(status)) {
			return res
				.status(400)
				.json({ success: false, message: "Geçersiz status değeri." });
		}

		if (type === "drakon") {
			const provider = await DrakonProvider.findByIdAndUpdate(
				id,
				{ status },
				{ new: true },
			);
			if (!provider) {
				return res
					.status(404)
					.json({ success: false, message: "Provider bulunamadı." });
			}
			const result = await Game.updateMany(
				{ provider_code: provider.code, distribution: "drakon" },
				{ $set: { status } },
			);
			return res.status(200).json({
				success: true,
				message: `Drakon provider ve ${result.modifiedCount} oyun güncellendi.`,
				provider,
			});
		} else if (type === "nexus") {
			const providerCode = id.replace("nexus_", "");
			const result = await Game.updateMany(
				{ provider_code: providerCode, distribution: "nexus" },
				{ $set: { status } },
			);
			return res.status(200).json({
				success: true,
				message: `Nexus provider ve ${result.modifiedCount} oyun güncellendi.`,
				provider: { code: providerCode, status, type: "nexus" },
			});
		}

		return res
			.status(400)
			.json({ success: false, message: "Geçersiz provider tipi." });
	} catch (error) {
		console.error("Provider status güncelleme hatası:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası." });
	}
});

router.post("/banners", checkPermission("platform.create"), upload.single("image"), async (req, res) => {
	try {
		const { link, position, title, subtitle } = req.body;
		const type = normalizeBannerType(req.body.type);
		if (!type) {
			return res.status(400).json({
				success: false,
				message: "Banner tipi both, mobile veya desktop olmalıdır.",
			});
		}
		const imageUrl = `/uploads/${req.file.filename}`;
		const banner = new Banner({
			imageUrl,
			link,
			position,
			type,
			title,
			subtitle,
		});
		await banner.save();
		res.status(201).json({ success: true, data: banner });
	} catch (err) {
		res.status(500).json({ success: false, message: "Banner eklenemedi" });
	}
});

router.get("/banners", checkPermission("platform.read"), async (req, res) => {
	const banners = await Banner.find().sort({ createdAt: -1 }).lean();
	res.json({ success: true, data: banners.map(serializeBanner) });
});

router.put("/banners/:id", checkPermission("platform.update"), upload.single("image"), async (req, res) => {
	try {
		const updates = {};
		for (const field of ["link", "position", "title", "subtitle"]) {
			if (req.body[field] !== undefined) updates[field] = req.body[field];
		}
		if (req.body.type !== undefined) {
			const type = normalizeBannerType(req.body.type);
			if (!type) {
				return res.status(400).json({
					success: false,
					message: "Banner tipi both, mobile veya desktop olmalıdır.",
				});
			}
			updates.type = type;
		}
		if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
		const banner = await Banner.findByIdAndUpdate(req.params.id, updates, {
			new: true,
			runValidators: true,
		});
		if (!banner) {
			return res.status(404).json({ success: false, message: "Banner bulunamadı" });
		}
		res.json({ success: true, data: serializeBanner(banner) });
	} catch (err) {
		res.status(500).json({ success: false, message: "Güncelleme hatası" });
	}
});

router.delete("/banners/:id", checkPermission("platform.delete"), async (req, res) => {
	try {
		await Banner.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Banner silindi" });
	} catch (err) {
		res.status(500).json({ success: false, message: "Silme hatası" });
	}
});

router.post(
	"/shop-items",
	checkPermission("shop.manage"),
	upload.single("banner"),
	async (req, res) => {
		try {
			const { title, description, coinCost, rewardAmount } = req.body;
			const parsedCoinCost = Number(coinCost);
			const parsedRewardAmount = Number(rewardAmount);
			const isActive = req.body.isActive !== "false";

			if (!title?.trim()) {
				return res.status(400).json({
					success: false,
					message: "Başlık zorunludur.",
				});
			}

			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: "Banner zorunludur.",
				});
			}

			if (
				!Number.isFinite(parsedCoinCost) ||
				!Number.isFinite(parsedRewardAmount)
			) {
				return res.status(400).json({
					success: false,
					message: "Coin ve ödül bakiyesi geçerli sayı olmalıdır.",
				});
			}

			const item = await ShopItem.create({
				title: title.trim(),
				description: description || "",
				banner: `/uploads/${req.file.filename}`,
				coinCost: parsedCoinCost,
				rewardAmount: parsedRewardAmount,
				isActive,
			});

			res.status(201).json({ success: true, data: item });
		} catch (err) {
			console.error("Shop item create error:", err);
			res.status(500).json({
				success: false,
				message: "Mağaza ürünü eklenemedi",
			});
		}
	}
);

router.get("/shop-items", checkPermission("shop.read"), async (req, res) => {
	try {
		const items = await ShopItem.find().sort({ createdAt: -1 });
		res.json({ success: true, data: items });
	} catch (err) {
		console.error("Shop items fetch error:", err);
		res.status(500).json({
			success: false,
			message: "Mağaza ürünleri alınamadı",
		});
	}
});

router.get(
	"/shop-items/:id",
	checkPermission("shop.read"),
	async (req, res) => {
		try {
			const item = await ShopItem.findById(req.params.id);
			if (!item) {
				return res.status(404).json({
					success: false,
					message: "Mağaza ürünü bulunamadı",
				});
			}

			res.json({ success: true, data: item });
		} catch (err) {
			console.error("Shop item fetch error:", err);
			res.status(500).json({
				success: false,
				message: "Mağaza ürünü alınamadı",
			});
		}
	}
);

router.put(
	"/shop-items/:id",
	checkPermission("shop.manage"),
	upload.single("banner"),
	async (req, res) => {
		try {
			const { title, description, coinCost, rewardAmount } = req.body;
			const updates = {
				description: description || "",
				isActive: req.body.isActive !== "false",
			};

			if (title !== undefined) {
				if (!title.trim()) {
					return res.status(400).json({
						success: false,
						message: "Başlık zorunludur.",
					});
				}
				updates.title = title.trim();
			}

			if (coinCost !== undefined) {
				const parsedCoinCost = Number(coinCost);
				if (!Number.isFinite(parsedCoinCost)) {
					return res.status(400).json({
						success: false,
						message: "Coin değeri geçerli sayı olmalıdır.",
					});
				}
				updates.coinCost = parsedCoinCost;
			}

			if (rewardAmount !== undefined) {
				const parsedRewardAmount = Number(rewardAmount);
				if (!Number.isFinite(parsedRewardAmount)) {
					return res.status(400).json({
						success: false,
						message: "Ödül bakiyesi ge��erli sayı olmalıdır.",
					});
				}
				updates.rewardAmount = parsedRewardAmount;
			}

			if (req.file) {
				updates.banner = `/uploads/${req.file.filename}`;
			}

			const item = await ShopItem.findByIdAndUpdate(req.params.id, updates, {
				new: true,
			});

			if (!item) {
				return res.status(404).json({
					success: false,
					message: "Mağaza ürünü bulunamadı",
				});
			}

			res.json({ success: true, data: item });
		} catch (err) {
			console.error("Shop item update error:", err);
			res.status(500).json({
				success: false,
				message: "Mağaza ürünü güncellenemedi",
			});
		}
	}
);

router.delete(
	"/shop-items/:id",
	checkPermission("shop.manage"),
	async (req, res) => {
		try {
			const item = await ShopItem.findByIdAndDelete(req.params.id);
			if (!item) {
				return res.status(404).json({
					success: false,
					message: "Mağaza ürünü bulunamadı",
				});
			}

			res.json({ success: true, message: "Mağaza ürünü silindi" });
		} catch (err) {
			console.error("Shop item delete error:", err);
			res.status(500).json({
				success: false,
				message: "Mağaza ürünü silinemedi",
			});
		}
	}
);

// 2. CATEGORY
router.post("/categories", checkPermission("platform.create"), upload.single("img"), async (req, res) => {
	try {
		const { name, slug } = req.body;
		const img = `/uploads/${req.file.filename}`;
		const category = new Category({ name, slug, img });
		await category.save();
		res.status(201).json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Kategori eklenemedi",
		});
	}
});

router.get("/categories", checkPermission("platform.read"), async (req, res) => {
	const categories = await Category.find().sort({ created_at: -1 });
	res.json({ success: true, data: categories });
});

router.put("/categories/:id", checkPermission("platform.update"), upload.single("img"), async (req, res) => {
	try {
		const updates = { ...req.body };
		if (req.file) updates.img = `/uploads/${req.file.filename}`;
		const category = await Category.findByIdAndUpdate(
			req.params.id,
			updates,
			{ new: true },
		);
		res.json({ success: true, data: category });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Kategori güncellenemedi",
		});
	}
});

router.delete("/categories/:id", checkPermission("platform.delete"), async (req, res) => {
	try {
		await Category.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Kategori silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Kategori silinemedi",
		});
	}
});

// 3. VIP
router.post(
	"/vip",
	checkPermission("users.manage"),
	upload.fields([{ name: "vipBadgeImage" }, { name: "vipHeaderImage" }]),
	async (req, res) => {
		try {
			const vipData = req.body;
			if (req.files.vipBadgeImage)
				vipData.vipBadgeImage = `/uploads/${req.files.vipBadgeImage[0].filename}`;
			if (req.files.vipHeaderImage)
				vipData.vipHeaderImage = `/uploads/${req.files.vipHeaderImage[0].filename}`;
			const vip = new VIPConfig(vipData);
			await vip.save();
			res.status(201).json({ success: true, data: vip });
		} catch (err) {
			res.status(500).json({ success: false, message: "VIP eklenemedi" });
		}
	},
);

router.get("/vip", checkPermission("users.read"), async (req, res) => {
	const vips = await VIPConfig.find().sort({ level: 1 });
	res.json({ success: true, data: vips });
});

router.put(
	"/vip/:id",
	checkPermission("users.manage"),
	upload.fields([{ name: "vipBadgeImage" }, { name: "vipHeaderImage" }]),
	async (req, res) => {
		try {
			const updates = { ...req.body };
			if (req.files.vipBadgeImage)
				updates.vipBadgeImage = `/uploads/${req.files.vipBadgeImage[0].filename}`;
			if (req.files.vipHeaderImage)
				updates.vipHeaderImage = `/uploads/${req.files.vipHeaderImage[0].filename}`;
			const vip = await VIPConfig.findByIdAndUpdate(
				req.params.id,
				updates,
				{ new: true },
			);
			res.json({ success: true, data: vip });
		} catch (err) {
			res.status(500).json({
				success: false,
				message: "VIP güncellenemedi",
			});
		}
	},
);

router.delete("/vip/:id", checkPermission("users.manage"), async (req, res) => {
	try {
		await VIPConfig.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "VIP silindi" });
	} catch (err) {
		res.status(500).json({ success: false, message: "VIP silinemedi" });
	}
});

// 4. BOX
router.post("/boxes", checkPermission("nft.create"), upload.single("image"), async (req, res) => {
	try {
		const boxData = {
			...req.body,
			items: req.body.items ? JSON.parse(req.body.items) : [],
		};

		if (req.file) {
			boxData.image = `/uploads/${req.file.filename}`;
		}

		const box = new Box(boxData);
		await box.save();

		res.status(201).json({ success: true, data: box });
	} catch (err) {
		console.error(err); // Bu satırı hata takibi için ekleyebilirsin
		res.status(500).json({ success: false, message: "Kutu eklenemedi" });
	}
});

router.get("/boxes", checkPermission("nft.read"), async (req, res) => {
	const boxes = await Box.find().sort({ createdAt: -1 });
	res.json({ success: true, data: boxes });
});

router.put("/boxes/:id", checkPermission("nft.update"), async (req, res) => {
	try {
		const box = await Box.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
		});
		res.json({ success: true, data: box });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Kutu güncellenemedi",
		});
	}
});

router.delete("/boxes/:id", checkPermission("nft.delete"), async (req, res) => {
	try {
		await Box.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Kutu silindi" });
	} catch (err) {
		res.status(500).json({ success: false, message: "Kutu silinemedi" });
	}
});

// 5. ITEM
router.post("/items", checkPermission("nft.create"), upload.single("image"), async (req, res) => {
	try {
		const itemData = {
			...req.body,
			image: `/uploads/${req.file.filename}`,
		};
		const item = new LimitedItem(itemData);
		await item.save();
		res.status(201).json({ success: true, data: item });
	} catch (err) {
		res.status(500).json({ success: false, message: "Item eklenemedi" });
	}
});

router.get("/items", checkPermission("nft.read"), async (req, res) => {
	const items = await LimitedItem.find().sort({ createdAt: -1 });
	res.json({ success: true, data: items });
});

router.put("/items/:id", checkPermission("nft.update"), upload.single("image"), async (req, res) => {
	try {
		const updates = { ...req.body };
		if (req.file) updates.image = `/uploads/${req.file.filename}`;
		const item = await LimitedItem.findByIdAndUpdate(
			req.params.id,
			updates,
			{ new: true },
		);
		res.json({ success: true, data: item });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Item güncellenemedi",
		});
	}
});

router.delete("/items/:id", checkPermission("nft.delete"), async (req, res) => {
	try {
		await LimitedItem.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Item silindi" });
	} catch (err) {
		res.status(500).json({ success: false, message: "Item silinemedi" });
	}
});

// 6. LEADERBOARD
router.post("/leaderboards", checkPermission("users.manage"), async (req, res) => {
	try {
		const leaderboard = new Leaderboard(req.body);
		await leaderboard.save();
		res.status(201).json({ success: true, data: leaderboard });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Leaderboard eklenemedi",
		});
	}
});

router.get("/leaderboards", checkPermission("users.read"), async (req, res) => {
	const boards = await Leaderboard.find().sort({ createdAt: -1 });
	res.json({ success: true, data: boards });
});

router.put("/leaderboards/:id", checkPermission("users.manage"), async (req, res) => {
	try {
		const leaderboard = await Leaderboard.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true },
		);
		res.json({ success: true, data: leaderboard });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Leaderboard güncellenemedi",
		});
	}
});

router.delete("/leaderboards/:id", checkPermission("users.manage"), async (req, res) => {
	try {
		await Leaderboard.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Leaderboard silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Leaderboard silinemedi",
		});
	}
});

// 7. PROMOCODE
const PROMO_CONDITION_METRICS = ["deposit", "withdraw", "membershipAgeDays", "depositSinceDate"];
const PROMO_CONDITION_OPERATORS = ["gte", "lte", "eq", "gt", "lt"];

// 🎯 Segment/koşul motoru: gönderilen koşul satırlarını doğrular ve normalize eder.
const normalizePromoConditions = (rawConditions) => {
	if (!Array.isArray(rawConditions)) return [];

	return rawConditions
		.filter((condition) => condition && condition.metric)
		.map((condition) => {
			const metric = String(condition.metric);
			const operator = String(condition.operator || "gte");
			const value = Number(condition.value);

			if (!PROMO_CONDITION_METRICS.includes(metric)) throw new Error("INVALID_CONDITION_METRIC");
			if (!PROMO_CONDITION_OPERATORS.includes(operator)) throw new Error("INVALID_CONDITION_OPERATOR");
			if (!Number.isFinite(value)) throw new Error("INVALID_CONDITION_VALUE");

			return {
				metric,
				operator,
				value,
				dateFrom: condition.dateFrom ? new Date(condition.dateFrom) : null,
				dateTo: condition.dateTo ? new Date(condition.dateTo) : null,
			};
		});
};

const normalizePromoPayload = (body = {}) => {
	const startsAt = body.startsAt ? new Date(body.startsAt) : null;
	const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
	const reward = Number(body.reward);
	if (!String(body.code || "").trim() || !Number.isFinite(reward) || reward <= 0) throw new Error("INVALID_PROMO");
	if (startsAt && expiresAt && startsAt >= expiresAt) throw new Error("INVALID_DATE_RANGE");
	const redeemptionsMax = Math.max(0, Number(body.redeemptionsMax) || 0);
	const perUserLimit = Math.max(1, Number(body.perUserLimit) || 1);
	if (redeemptionsMax > 0 && perUserLimit > redeemptionsMax) throw new Error("INVALID_USER_LIMIT");
	const applyWageringLock = Boolean(body.applyWageringLock);
	const wageringMultiplier = Math.max(0, Number(body.wageringMultiplier) || 0);
	if (applyWageringLock && wageringMultiplier <= 0) throw new Error("INVALID_WAGERING_MULTIPLIER");
	const minLastDeposit = Math.max(0, Number(body.minLastDeposit) || 0);
	const minWithdraw = Math.max(0, Number(body.minWithdraw) || 0);
	if (minLastDeposit < 0 || minWithdraw < 0 || reward < 0) throw new Error("INVALID_PROMO");
	const conditions = normalizePromoConditions(body.conditions);
	return {
		code: String(body.code).trim().toUpperCase(), reward,
		levelMin: Math.max(0, Number(body.levelMin) || 0), isActive: body.isActive !== false,
		startsAt, expiresAt,
		affiliateCodes: [...new Set((Array.isArray(body.affiliateCodes) ? body.affiliateCodes : []).map(code => String(code).trim()).filter(Boolean))],
		redeemptionsMax,
		perUserLimit,
		minLastDeposit,
		applyWageringLock,
		wageringMultiplier,
		minWithdraw,
		conditions,
		updatedAt: new Date(),
	};
};

router.get("/promocodes/affiliate-options", checkPermission("finance.promo.read"), async (req, res) => {
	const users = await User.find({ "affiliates.code": { $exists: true, $nin: [null, ""] } }).select("username affiliates.code").sort({ username: 1 }).lean();
	res.json({ success: true, data: users.map(user => ({ code: user.affiliates.code, title: `${user.username} (${user.affiliates.code})` })) });
});

const PROMO_VALIDATION_MESSAGES = {
	INVALID_PROMO: "Kod ve ödül tutarı zorunludur; ödül tutarı sıfırdan büyük olmalıdır.",
	INVALID_DATE_RANGE: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
	INVALID_USER_LIMIT: "Kullanıcı başı limit, toplam kullanım limitinden büyük olamaz.",
	INVALID_WAGERING_MULTIPLIER: "Çevrim şartı açıkken çevrim katı sıfırdan büyük olmalıdır.",
	INVALID_CONDITION_METRIC: "Geçersiz koşul metriği seçildi.",
	INVALID_CONDITION_OPERATOR: "Geçersiz koşul operatörü seçildi.",
	INVALID_CONDITION_VALUE: "Koşul değeri sayısal ve geçerli olmalıdır.",
};

const resolvePromoErrorMessage = (err, fallback) => PROMO_VALIDATION_MESSAGES[err?.message] || fallback;

router.post("/promocodes", checkPermission("finance.promo.manage"), async (req, res) => {
	try { res.status(201).json({ success: true, data: await PromoCode.create(normalizePromoPayload(req.body)) }); }
	catch (err) {
		const message = err?.code === 11000 ? "Bu kod zaten mevcut." : resolvePromoErrorMessage(err, "Promosyon kodu eklenemedi.");
		res.status(err?.code === 11000 ? 409 : 400).json({ success: false, message });
	}
});

router.get("/promocodes", checkPermission("finance.promo.read"), async (req, res) => {
	res.json({ success: true, data: await PromoCode.find().sort({ createdAt: -1 }).lean() });
});

router.put("/promocodes/:id", checkPermission("finance.promo.manage"), async (req, res) => {
	try {
		const promo = await PromoCode.findByIdAndUpdate(req.params.id, { $set: normalizePromoPayload(req.body) }, { new: true, runValidators: true });
		if (!promo) return res.status(404).json({ success: false, message: "Promosyon kodu bulunamadı." });
		res.json({ success: true, data: promo });
	} catch (err) {
		const message = err?.code === 11000 ? "Bu kod zaten mevcut." : resolvePromoErrorMessage(err, "Promosyon kodu güncellenemedi.");
		res.status(err?.code === 11000 ? 409 : 400).json({ success: false, message });
	}
});

router.delete("/promocodes/:id", checkPermission("finance.promo.manage"), async (req, res) => {
	try {
		await PromoCode.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Promocode silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Promocode silinemedi",
		});
	}
});

// 7.1 BİLET ETKİNLİĞİ (Ticket Events)
const normalizeTicketEventPayload = (body = {}) => {
	const startsAt = body.startsAt ? new Date(body.startsAt) : null;
	const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
	const amountPerTicket = Number(body.amountPerTicket);
	if (!String(body.name || "").trim() || !Number.isFinite(amountPerTicket) || amountPerTicket <= 0) {
		throw new Error("INVALID_TICKET_EVENT");
	}
	if (startsAt && expiresAt && startsAt >= expiresAt) throw new Error("INVALID_DATE_RANGE");
	const wageringRequirement = Math.max(0, Number(body.wageringRequirement) || 0);
	const maxTicketsPerUser = Math.max(0, Number(body.maxTicketsPerUser) || 0);
	return {
		name: String(body.name).trim(),
		isActive: body.isActive !== false,
		startsAt,
		expiresAt,
		amountPerTicket,
		wageringRequirement,
		maxTicketsPerUser,
		eligibleAffiliateCodes: [...new Set((Array.isArray(body.eligibleAffiliateCodes) ? body.eligibleAffiliateCodes : []).map((c) => String(c).trim()).filter(Boolean))],
		note: String(body.note || "").trim(),
		updatedAt: new Date(),
	};
};

const TICKET_EVENT_VALIDATION_MESSAGES = {
	INVALID_TICKET_EVENT: "Etkinlik adı ve bilet başına gereken tutar zorunludur; tutar sıfırdan büyük olmalıdır.",
	INVALID_DATE_RANGE: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
};

router.get("/ticket-events", checkPermission("finance.tickets.read"), async (req, res) => {
	const events = await TicketEvent.find().sort({ createdAt: -1 }).lean();
	const stats = await Promise.all(events.map((event) => ticketService.getEventTicketStats(event._id)));
	res.json({ success: true, data: events.map((event, i) => ({ ...event, stats: stats[i] })) });
});

router.post("/ticket-events", checkPermission("finance.tickets.manage"), async (req, res) => {
	try {
		const event = await TicketEvent.create(normalizeTicketEventPayload(req.body));
		res.status(201).json({ success: true, data: event });
	} catch (err) {
		res.status(400).json({ success: false, message: TICKET_EVENT_VALIDATION_MESSAGES[err?.message] || "Bilet etkinliği eklenemedi." });
	}
});

router.put("/ticket-events/:id", checkPermission("finance.tickets.manage"), async (req, res) => {
	try {
		const event = await TicketEvent.findByIdAndUpdate(req.params.id, { $set: normalizeTicketEventPayload(req.body) }, { new: true, runValidators: true });
		if (!event) return res.status(404).json({ success: false, message: "Bilet etkinliği bulunamadı." });
		res.json({ success: true, data: event });
	} catch (err) {
		res.status(400).json({ success: false, message: TICKET_EVENT_VALIDATION_MESSAGES[err?.message] || "Bilet etkinliği güncellenemedi." });
	}
});

router.delete("/ticket-events/:id", checkPermission("finance.tickets.manage"), async (req, res) => {
	try {
		await TicketEvent.findByIdAndDelete(req.params.id);
		await Ticket.deleteMany({ event: req.params.id });
		res.json({ success: true, message: "Bilet etkinliği silindi." });
	} catch (err) {
		res.status(500).json({ success: false, message: "Bilet etkinliği silinemedi." });
	}
});

router.get("/ticket-events/:id/tickets", checkPermission("finance.tickets.read"), async (req, res) => {
	const { status } = req.query;
	const filter = { event: req.params.id };
	if (status && ["pending", "approved", "cancelled"].includes(status)) filter.status = status;
	const tickets = await Ticket.find(filter)
		.populate("user", "username name email")
		.sort({ createdAt: -1 })
		.limit(500)
		.lean();
	res.json({ success: true, data: tickets });
});

router.get("/ticket-events/user-search", checkPermission("finance.tickets.manage"), async (req, res) => {
	const q = String(req.query.q || "").trim();
	if (q.length < 2) return res.json({ success: true, data: [] });
	const users = await User.find({
		$or: [
			{ username: { $regex: q, $options: "i" } },
			{ email: { $regex: q, $options: "i" } },
		],
	}).select("username email name").limit(15).lean();
	res.json({ success: true, data: users });
});

router.post("/ticket-events/:id/manual-ticket", checkPermission("finance.tickets.manage"), async (req, res) => {
	try {
		const { userId, quantity } = req.body;
		if (!userId) return res.status(400).json({ success: false, message: "Kullanıcı seçimi zorunludur." });
		const tickets = await ticketService.addManualTicket({
			adminId: req.adminUser?._id || null,
			userId,
			eventId: req.params.id,
			quantity,
		});
		res.status(201).json({ success: true, data: tickets });
	} catch (err) {
		res.status(err?.status || 400).json({ success: false, message: err?.message || "Manuel bilet eklenemedi.", code: err?.code });
	}
});

// 7.2 ÇEVRİM TURNUVASI (Race Tournaments)
const RACE_GAME_CATEGORIES = ["all", "slots", "liveCasino", "sportsBook", "originals"];

const normalizeRaceTournamentPayload = (body = {}) => {
	const startsAt = body.startsAt ? new Date(body.startsAt) : null;
	const endsAt = body.endsAt ? new Date(body.endsAt) : null;
	const pointsPerWager = Number(body.pointsPerWager);

	if (!String(body.name || "").trim() || !Number.isFinite(pointsPerWager) || pointsPerWager <= 0) {
		throw new Error("INVALID_RACE_TOURNAMENT");
	}
	if (startsAt && endsAt && startsAt >= endsAt) throw new Error("INVALID_DATE_RANGE");

	const gameCategory = RACE_GAME_CATEGORIES.includes(body.gameCategory) ? body.gameCategory : "all";
	const providers = [...new Set((Array.isArray(body.providers) ? body.providers : ["all"]).map((p) => String(p).trim()).filter(Boolean))];
	const prizes = (Array.isArray(body.prizes) ? body.prizes : [])
		.map((p) => ({ rank: Math.max(1, Math.floor(Number(p.rank) || 0)), amount: Math.max(0, Number(p.amount) || 0) }))
		.filter((p) => p.rank > 0);

	return {
		name: String(body.name).trim(),
		isActive: body.isActive !== false,
		startsAt,
		endsAt,
		providers: providers.length ? providers : ["all"],
		gameCategory,
		pointsPerWager,
		prizes,
		autoDistribute: body.autoDistribute !== false,
		note: String(body.note || "").trim(),
		updatedAt: new Date(),
	};
};

const RACE_VALIDATION_MESSAGES = {
	INVALID_RACE_TOURNAMENT: "Turnuva adı ve 1 TL çevrime karşılık gelen puan zorunludur; puan sıfırdan büyük olmalıdır.",
	INVALID_DATE_RANGE: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
};

router.get("/race-tournaments", checkPermission("finance.race.read"), async (req, res) => {
	const tournaments = await RaceTournament.find().sort({ createdAt: -1 }).lean();
	const counts = await Promise.all(tournaments.map((t) => RaceEntry.countDocuments({ tournament: t._id })));
	res.json({ success: true, data: tournaments.map((t, i) => ({ ...t, entryCount: counts[i] })) });
});

router.post("/race-tournaments", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		const tournament = await RaceTournament.create(normalizeRaceTournamentPayload(req.body));
		res.status(201).json({ success: true, data: tournament });
	} catch (err) {
		res.status(400).json({ success: false, message: RACE_VALIDATION_MESSAGES[err?.message] || "Turnuva eklenemedi." });
	}
});

router.put("/race-tournaments/:id", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		const tournament = await RaceTournament.findByIdAndUpdate(req.params.id, { $set: normalizeRaceTournamentPayload(req.body) }, { new: true, runValidators: true });
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });
		res.json({ success: true, data: tournament });
	} catch (err) {
		res.status(400).json({ success: false, message: RACE_VALIDATION_MESSAGES[err?.message] || "Turnuva güncellenemedi." });
	}
});

router.delete("/race-tournaments/:id", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		await RaceTournament.findByIdAndDelete(req.params.id);
		await RaceEntry.deleteMany({ tournament: req.params.id });
		res.json({ success: true, message: "Turnuva silindi." });
	} catch (err) {
		res.status(500).json({ success: false, message: "Turnuva silinemedi." });
	}
});

router.get("/race-tournaments/:id/leaderboard", checkPermission("finance.race.read"), async (req, res) => {
	try {
		const leaderboard = await raceService.getLeaderboard(req.params.id, Number(req.query.limit) || 100);
		res.json({ success: true, data: leaderboard });
	} catch (err) {
		res.status(500).json({ success: false, message: "Sıralama alınamadı." });
	}
});

router.get("/race-tournaments/user-search", checkPermission("finance.race.manage"), async (req, res) => {
	const q = String(req.query.q || "").trim();
	if (q.length < 2) return res.json({ success: true, data: [] });
	const users = await User.find({
		$or: [
			{ username: { $regex: q, $options: "i" } },
			{ email: { $regex: q, $options: "i" } },
		],
	}).select("username email name").limit(15).lean();
	res.json({ success: true, data: users });
});

router.post("/race-tournaments/:id/manual-entry", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		const { userId, displayName, startingPoints, manualGrowthRate } = req.body;
		const entry = await raceService.upsertManualEntry({
			tournamentId: req.params.id,
			userId: userId || null,
			displayName,
			startingPoints,
			manualGrowthRate,
		});
		res.status(201).json({ success: true, data: entry });
	} catch (err) {
		res.status(err?.status || 400).json({ success: false, message: err?.message || "Katılımcı eklenemedi.", code: err?.code });
	}
});

router.delete("/race-tournaments/:id/entries/:entryId", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		await RaceEntry.findOneAndDelete({ _id: req.params.entryId, tournament: req.params.id });
		res.json({ success: true, message: "Katılımcı silindi." });
	} catch (err) {
		res.status(500).json({ success: false, message: "Katılımcı silinemedi." });
	}
});

router.post("/race-tournaments/:id/settle", checkPermission("finance.race.manage"), async (req, res) => {
	try {
		const result = await raceService.settleTournament(req.params.id);
		res.json({ success: true, data: result });
	} catch (err) {
		res.status(err?.status || 400).json({ success: false, message: err?.message || "Turnuva sonuçlandırılamadı.", code: err?.code });
	}
});

// 7.3 SPOR TURNUVASI (Manuel — min oran + min bet tutarı şartlı)
const normalizeSportsTournamentPayload = (body = {}) => {
	const startsAt = body.startsAt ? new Date(body.startsAt) : null;
	const endsAt = body.endsAt ? new Date(body.endsAt) : null;
	const minOdds = Number(body.minOdds);
	const minBetAmount = Number(body.minBetAmount);

	if (!String(body.name || "").trim() || !Number.isFinite(minOdds) || minOdds < 1) {
		throw new Error("INVALID_SPORTS_TOURNAMENT");
	}
	if (!Number.isFinite(minBetAmount) || minBetAmount < 0) throw new Error("INVALID_SPORTS_TOURNAMENT");
	if (startsAt && endsAt && startsAt >= endsAt) throw new Error("INVALID_DATE_RANGE");

	const prizes = (Array.isArray(body.prizes) ? body.prizes : [])
		.map((p) => ({ rank: Math.max(1, Math.floor(Number(p.rank) || 0)), amount: Math.max(0, Number(p.amount) || 0) }))
		.filter((p) => p.rank > 0);

	return {
		name: String(body.name).trim(),
		description: String(body.description || "").trim(),
		isActive: body.isActive !== false,
		startsAt,
		endsAt,
		minOdds,
		minBetAmount,
		prizes,
		prizePoolDescription: String(body.prizePoolDescription || "").trim(),
		autoDistribute: body.autoDistribute !== false,
		note: String(body.note || "").trim(),
		updatedAt: new Date(),
	};
};

const SPORTS_TOURNAMENT_VALIDATION_MESSAGES = {
	INVALID_SPORTS_TOURNAMENT: "Turnuva adı zorunludur; minimum oran 1'den büyük/eşit, minimum bet tutarı sıfırdan büyük/eşit olmalıdır.",
	INVALID_DATE_RANGE: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
};

router.get("/sports-tournaments", checkPermission("sports.tournament.read"), async (req, res) => {
	const tournaments = await SportsTournament.find().sort({ createdAt: -1 }).lean();
	res.json({ success: true, data: tournaments });
});

router.post("/sports-tournaments", checkPermission("sports.tournament.manage"), async (req, res) => {
	try {
		const tournament = await SportsTournament.create(normalizeSportsTournamentPayload(req.body));
		res.status(201).json({ success: true, data: tournament });
	} catch (err) {
		res.status(400).json({ success: false, message: SPORTS_TOURNAMENT_VALIDATION_MESSAGES[err?.message] || "Turnuva eklenemedi." });
	}
});

router.put("/sports-tournaments/:id", checkPermission("sports.tournament.manage"), async (req, res) => {
	try {
		const tournament = await SportsTournament.findByIdAndUpdate(req.params.id, { $set: normalizeSportsTournamentPayload(req.body) }, { new: true, runValidators: true });
		if (!tournament) return res.status(404).json({ success: false, message: "Turnuva bulunamadı." });
		res.json({ success: true, data: tournament });
	} catch (err) {
		res.status(400).json({ success: false, message: SPORTS_TOURNAMENT_VALIDATION_MESSAGES[err?.message] || "Turnuva güncellenemedi." });
	}
});

router.delete("/sports-tournaments/:id", checkPermission("sports.tournament.manage"), async (req, res) => {
	try {
		await SportsTournament.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Turnuva silindi." });
	} catch (err) {
		res.status(500).json({ success: false, message: "Turnuva silinemedi." });
	}
});

router.get("/sports-tournaments/:id/leaderboard", checkPermission("sports.tournament.read"), async (req, res) => {
	try {
		const leaderboard = await sportsTournamentService.getLeaderboard(req.params.id, Number(req.query.limit) || 100);
		res.json({ success: true, data: leaderboard });
	} catch (err) {
		res.status(err?.status || 500).json({ success: false, message: err?.message || "Sıralama alınamadı." });
	}
});

router.post("/sports-tournaments/:id/settle", checkPermission("sports.tournament.manage"), async (req, res) => {
	try {
		const result = await sportsTournamentService.settleTournament(req.params.id);
		res.json({ success: true, data: result });
	} catch (err) {
		res.status(err?.status || 400).json({ success: false, message: err?.message || "Turnuva sonuçlandırılamadı.", code: err?.code });
	}
});

// 8. NOTICE
router.post("/notices", checkPermission("notice.create"), upload.single("image"), async (req, res) => {
	try {
		const noticeData = { ...req.body };
		if (req.file) noticeData.image = `/uploads/${req.file.filename}`;

		// 🎯 multipart/form-data ile geldiği için audience JSON string olabilir.
		let audience = { type: "all", conditions: [] };
		if (noticeData.audience) {
			try {
				audience = typeof noticeData.audience === "string" ? JSON.parse(noticeData.audience) : noticeData.audience;
			} catch {
				audience = { type: "all", conditions: [] };
			}
		}
		delete noticeData.audience;

		let recipients = null;
		if (!noticeData.recipientId && audience.type !== "all") {
			const resolved = await resolveNoticeAudience(audience);
			recipients = resolved.recipients;
		}

		const notice = new Notice({
			...noticeData,
			audience: noticeData.recipientId ? undefined : audience,
			recipients: recipients || undefined,
		});
		await notice.save();
		res.status(201).json({ success: true, data: notice, matchedCount: recipients ? recipients.length : null });
	} catch (err) {
		console.error("Bildirim oluşturma hatası:", err);
		res.status(500).json({
			success: false,
			message: "Bildirim eklenemedi",
		});
	}
});

router.get("/notices", checkPermission("notice.read"), async (req, res) => {
	const notices = await Notice.find().sort({ createdAt: -1 }).lean();
	const data = notices.map((notice) => ({
		...notice,
		recipientsCount: Array.isArray(notice.recipients) ? notice.recipients.length : null,
		readCount: Array.isArray(notice.readBy) ? notice.readBy.length : 0,
	}));
	res.json({ success: true, data });
});

router.get("/notices/user/:userId", checkPermission("notice.read"), async (req, res) => {
	try {
		const { userId } = req.params;
		const userNotices = await Notice.find({ recipientId: userId }).sort({
			createdAt: -1,
		});
		res.json({ success: true, data: userNotices });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Kullanıcı bildirimleri alınamadı",
		});
	}
});

router.delete("/notices/:id", checkPermission("notice.delete"), async (req, res) => {
	try {
		await Notice.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Bildirim silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Bildirim silinemedi",
		});
	}
});

// GET /admin/settings
router.get("/settings", checkPermission("platform.read"), async (req, res) => {
	try {
		const setting = await Setting.findOne();
		res.json({ success: true, data: setting });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Ayarlar getirilemedi",
			error: err.message,
		});
	}
});

// ��� GET /admin/settings  → mevcut ayarları getir
router.get("/settings", checkPermission("platform.read"), async (req, res) => {
	try {
		const settings = await Setting.findOne({});
		res.json({ success: true, data: settings });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Ayarlar alınamadı",
			error: err.message,
		});
	}
});

// ✅ PUT /admin/settings → mevcut ayarları güncelle (dosya + json)
router.put(
	"/settings",
	checkPermission("platform.update"),
	upload.fields([{ name: "logo" }, { name: "favicon" }]),
	async (req, res) => {
		try {
			const updates = JSON.parse(req.body.data || "{}");

			// Dosya upload kontrolü
			if (req.files.logo) {
				updates.general = {
					...updates.general,
					logo: `/uploads/${req.files.logo[0].filename}`,
				};
			}
			if (req.files.favicon) {
				updates.general = {
					...updates.general,
					favicon: `/uploads/${req.files.favicon[0].filename}`,
				};
			}

			// Güncelle veya yoksa oluştur
			const updated = await Setting.findOneAndUpdate(
				{},
				{ ...updates, updatedAt: new Date() },
				{ new: true, upsert: true },
			);

			res.json({ success: true, data: updated });
		} catch (err) {
			res.status(500).json({
				success: false,
				message: "Ayar güncellenemedi",
				error: err.message,
			});
		}
	},
);

// ✅ DELETE /admin/settings/:id → admin panelden manuel silme için
router.delete("/settings/:id", checkPermission("platform.delete"), async (req, res) => {
	try {
		await Setting.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Ayar silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Ayar silinemedi",
			error: err.message,
		});
	}
});

router.post("/season", checkPermission("battlepass.create"), async (req, res) => {
	try {
		let {
			name,
			startDate,
			endDate,
			isActive,
			premiumPrice,
			premiumBenefits,
			totalLevels,
			xpPerLevel,
		} = req.body;

		// XP değerleri dizi değilse JSON.parse etmeyi dene
		if (typeof xpPerLevel === "string") {
			try {
				xpPerLevel = JSON.parse(xpPerLevel);
			} catch (e) {
				return res.status(400).json({
					success: false,
					message: "Invalid xpPerLevel format",
				});
			}
		}

		// XP array'ini güvenli bir şekilde sayılara çevir
		xpPerLevel = xpPerLevel.map((xp) => Number(xp));

		const season = await Season.create({
			name,
			startDate,
			endDate,
			isActive,
			premiumPrice: Number(premiumPrice),
			premiumBenefits: Array.isArray(premiumBenefits)
				? premiumBenefits
				: String(premiumBenefits)
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean),
			totalLevels: Number(totalLevels),
			xpPerLevel,
		});

		res.status(201).json({ success: true, season });
	} catch (err) {
		console.warn("Season create error:", err);
		res.status(500).json({ success: false, message: err.message });
	}
});

router.post("/reward", checkPermission("battlepass.create"), upload.single("image"), async (req, res) => {
	try {
		const {
			seasonId,
			level,
			isPremium,
			rewardType,
			amount,
			description,
			assetId,
		} = req.body;

		const img = req.file ? `/uploads/${req.file.filename}` : "";

		// reward objesini oluştur
		const rewardData = {
			seasonId,
			level,
			isPremium,
			rewardType,
			amount,
			description,
			img,
		};

		// Sadece bazı rewardType'lar için assetId ekle
		if (["NFT", "VIP_TICKET"].includes(rewardType) && assetId) {
			rewardData.assetId = assetId;
		}

		const reward = await Reward.create(rewardData);

		res.status(201).json({ success: true, reward });
	} catch (err) {
		console.error("REWARD CREATE ERROR:", err);
		res.status(500).json({ success: false, message: err.message });
	}
});

router.post("/mission", checkPermission("battlepass.create"), upload.single("image"), async (req, res) => {
	try {
		const {
			seasonId,
			name,
			description,
			missionType,
			targetValue,
			xpReward,
			tokenReward,
			resetInterval,
			isRepeatable,
			gameSpecific,
			startDate,
			endDate,
		} = req.body;

		const img = req.file ? `/uploads/${req.file.filename}` : "";

		const mission = await Mission.create({
			seasonId,
			name,
			description,
			missionType,
			targetValue,
			xpReward,
			tokenReward,
			resetInterval,
			isRepeatable,
			gameSpecific,
			startDate,
			endDate,
			img,
		});

		res.status(201).json({ success: true, mission });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

router.put("/reward/:id", checkPermission("battlepass.update"), upload.single("img"), async (req, res) => {
	try {
		const updates = { ...req.body };

		if (req.file) {
			updates.img = `/uploads/${req.file.filename}`;
		}

		const reward = await Reward.findByIdAndUpdate(req.params.id, updates, {
			new: true,
		});

		if (!reward) {
			return res
				.status(404)
				.json({ success: false, message: "Ödül bulunamadı" });
		}

		res.status(200).json({ success: true, data: reward });
	} catch (err) {
		console.error("Reward güncelleme hatası:", err);
		res.status(500).json({
			success: false,
			message: "Ödül güncellenemedi",
		});
	}
});

router.put("/mission/:id", checkPermission("battlepass.update"), upload.single("img"), async (req, res) => {
	try {
		const updates = { ...req.body };

		if (req.file) {
			updates.img = `/uploads/${req.file.filename}`;
		}

		const mission = await Mission.findByIdAndUpdate(
			req.params.id,
			updates,
			{ new: true },
		);

		if (!mission) {
			return res
				.status(404)
				.json({ success: false, message: "Görev bulunamadı" });
		}

		res.status(200).json({ success: true, data: mission });
	} catch (err) {
		console.error("Mission güncelleme hatası:", err);
		res.status(500).json({
			success: false,
			message: "Görev güncellenemedi",
		});
	}
});

router.get("/reward", checkPermission("battlepass.read"), async (req, res) => {
	try {
		const { seasonId } = req.query;

		const query = {};
		if (seasonId) query.seasonId = seasonId;

		const rewards = await Reward.find(query).sort({ level: 1 });

		res.status(200).json({ success: true, data: rewards });
	} catch (err) {
		console.error("Reward list error:", err);
		res.status(500).json({
			success: false,
			message: "Ödüller getirilemedi",
		});
	}
});

router.get("/reward/:id", checkPermission("battlepass.read"), async (req, res) => {
	try {
		const reward = await Reward.findById(req.params.id);

		if (!reward) {
			return res
				.status(404)
				.json({ success: false, message: "Ödül bulunamadı" });
		}

		res.status(200).json({ success: true, data: reward });
	} catch (err) {
		console.error("Reward detail error:", err);
		res.status(500).json({ success: false, message: "Ödül getirilemedi" });
	}
});

router.get("/mission", checkPermission("battlepass.read"), async (req, res) => {
	try {
		const { seasonId } = req.query;

		const query = {};
		if (seasonId) query.seasonId = seasonId;

		const missions = await Mission.find(query).sort({ createdAt: -1 });

		res.status(200).json({ success: true, data: missions });
	} catch (err) {
		console.error("Mission list error:", err);
		res.status(500).json({
			success: false,
			message: "Görevler getirilemedi",
		});
	}
});

router.get("/mission/:id", checkPermission("battlepass.read"), async (req, res) => {
	try {
		const mission = await Mission.findById(req.params.id);

		if (!mission) {
			return res
				.status(404)
				.json({ success: false, message: "Görev bulunamadı" });
		}

		res.status(200).json({ success: true, data: mission });
	} catch (err) {
		console.error("Mission detail error:", err);
		res.status(500).json({ success: false, message: "Görev getirilemedi" });
	}
});

router.get("/season", checkPermission("battlepass.read"), async (req, res) => {
	try {
		const active = await Season.findOne({ isActive: true });
		if (!active) {
			return res.status(404).json({ message: "No active season found" });
		}
		res.json({ season: active });
	} catch (err) {
		res.status(500).json({ message: "Server error" });
	}
});

router.get("/bonus-settings", checkPermission("platform.read"), async (req, res) => {
	try {
		const settings = await BonusSetting.find().sort({ createdAt: -1 });
		res.status(200).json({ success: true, data: settings });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Bonus ayarları getirilemedi",
			error: err.message,
		});
	}
});

// POST: Yeni bonus ayarı oluştur
router.post("/bonus-settings", checkPermission("platform.create"), async (req, res) => {
	try {
		const setting = await BonusSetting.create(req.body);
		res.status(201).json({ success: true, data: setting });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Bonus ayarı oluşturulamadı",
			error: err.message,
		});
	}
});

// PUT: Bonus ayarını güncelle
router.put("/bonus-settings/:id", checkPermission("platform.update"), async (req, res) => {
	try {
		const updated = await BonusSetting.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true },
		);
		if (!updated) {
			return res
				.status(404)
				.json({ success: false, message: "Bonus ayarı bulunamadı" });
		}
		res.json({ success: true, data: updated });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Bonus ayarı güncellenemedi",
			error: err.message,
		});
	}
});

// DELETE: Bonus ayarını sil
router.delete("/bonus-settings/:id", checkPermission("platform.delete"), async (req, res) => {
	try {
		await BonusSetting.findByIdAndDelete(req.params.id);
		res.json({ success: true, message: "Bonus ayarı silindi" });
	} catch (err) {
		res.status(500).json({
			success: false,
			message: "Bonus ayarı silinemedi",
			error: err.message,
		});
	}
});

router.get(
	"/analytics",
	checkPermission("dashboard.read"),
	async (req, res) => {
		try {
			const now = Date.now();
			const yesterday = new Date(now - 24 * 60 * 60 * 1000);

			// 🔹 TR (Europe/Istanbul, UTC+3, DST yok) gününün 00:00'ı.
			// Sunucu saat dilimi ne olursa olsun UTC üzerinden hesaplanır.
			const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
			const nowTr = new Date(now + TR_OFFSET_MS);
			const todayStartTR = new Date(
				Date.UTC(nowTr.getUTCFullYear(), nowTr.getUTCMonth(), nowTr.getUTCDate()) - TR_OFFSET_MS,
			);

			// 🔹 Temel (kritik) query'leri paralel çalıştır (Promise.all ile).
			// 🎯 "Bugünkü Özet" widget'ının bazen tamamen 0 görünmesinin nedeni:
			// bonus/freespin sorguları (özellikle FreeSpinGrant -> transactions
			// $lookup'ı) ağır/kırılgan olduğundan tek bir hata/timeout TÜM
			// Promise.all'u reddediyor ve endpoint 500 dönüyordu; bu da
			// depositsTodayTry/withdrawalsTodayTry gibi aslında sorunsuz
			// hesaplanabilecek alanları da frontend'de "|| 0" varsayılanına
			// düşürüyordu. Bu yüzden kritik olmayan iki sorgu artık ayrı ve
			// kendi try/catch'i ile izole çalışıyor (bkz. aşağısı).
			const [
				setting,
				totalUsers,
				newUsers24h,
				userBetsAgg,
				cryptoAggAll,
				bankAggAll,
				galaxyPayAggAll,
				fluxKriptoAggAll,
				xPaymentsAggAll,
			] = await Promise.all([
				// Ayarlar
				Setting.findOne().select("exchangeRates").lean(),

				// Kullanıcı sayıları - estimatedDocumentCount daha hızlı
				User.estimatedDocumentCount(),
				User.countDocuments({ createdAt: { $gte: yesterday } }),

				// Kullanıcı bahis/kazanç toplamları (aggregation ile)
				User.aggregate([
					{
						$group: {
							_id: null,
							totalBet: { $sum: "$stats.bet" },
							totalWon: { $sum: "$stats.won" },
						},
					},
				]),

				// CryptoTransaction toplamları (tümü + 24h tek sorguda)
				CryptoTransaction.aggregate([
					{ $match: { state: { $in: ["completed", "success"] } } },
					{
						$facet: {
							all: [
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							last24h: [
								{ $match: { createdAt: { $gte: yesterday } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							today: [
								{ $match: { createdAt: { $gte: todayStartTR } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
						},
					},
				]),

				// BankTransfer toplamları (tümü + 24h tek sorguda)
				BankTransfer.aggregate([
					{ $match: { status: "approved" } },
					{
						$facet: {
							all: [
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							last24h: [
								{ $match: { createdAt: { $gte: yesterday } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							today: [
								{ $match: { createdAt: { $gte: todayStartTR } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
						},
					},
				]),

				GalaxyPayTransaction.aggregate([
					{ $match: { status: "approved" } },
					{
						$facet: {
							all: [
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							last24h: [
								{ $match: { createdAt: { $gte: yesterday } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
							today: [
								{ $match: { createdAt: { $gte: todayStartTR } } },
								{
									$group: {
										_id: "$type",
										total: { $sum: "$amount" },
									},
								},
							],
						},
					},
				]),
				FluxKriptoTransaction.aggregate([
					{ $match: { status: "approved" } },
					{
						$facet: {
							all: [
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
							last24h: [
								{ $match: { createdAt: { $gte: yesterday } } },
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
							today: [
								{ $match: { createdAt: { $gte: todayStartTR } } },
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
						},
					},
				]),
				XPaymentTransaction.aggregate([
					{ $match: { status: "approved" } },
					{
						$facet: {
							all: [
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
							last24h: [
								{ $match: { createdAt: { $gte: yesterday } } },
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
							today: [
								{ $match: { createdAt: { $gte: todayStartTR } } },
								{ $group: { _id: "$type", total: { $sum: "$amount" } } },
							],
						},
					},
				]),
				]);

			// 🎁 Bugün (TR günü) verilen bonus toplamı (AdminManualAdjustment)
			// 🎰 Bugün verilen freespin adedi + yaklaşık kazanç
			// (bkz. "Kapsam Dışı / Varsayımlar": provider'dan freespin bayrağı
			// gelmediği için grant süresi + oyun eşleşmesiyle yaklaşık hesaplanır)
			//
			// 🎯 Bu iki sorgu Promise.all dışında ve kendi try/catch'i ile
			// çalışır: freespin sorgusu FreeSpinGrant -> transactions arasında
			// $expr tabanlı bir $lookup içerir (indekslenmiş bir eşitlik değil),
			// bu da veri arttıkça yavaşlayıp zaman zaman timeout ile
			// başarısız olabilir. Eskiden bu hata Promise.all'u tamamen
			// reddedip /admin/analytics'i 500 döndürüyor, bu da depositsToday/
			// withdrawalsToday gibi aslında sağlıklı hesaplanan alanları da
			// frontend'de "|| 0" varsayılanına düşürüyordu. Artık bir hata
			// olursa sadece bonus/freespin kısmı 0 olarak döner, diğer tüm
			// "Bugünkü Özet" alanları normal şekilde gelir.
			const [bonusTodayAgg, freeSpinsTodayAgg] = await Promise.all([
				AdminManualAdjustment.aggregate([
					{
						$match: {
							kind: "bonus",
							direction: "credit",
							createdAt: { $gte: todayStartTR },
						},
					},
					{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
				]).catch(err => {
					console.error("Bugünkü bonus toplamı alınamadı:", err.message);
					return [];
				}),

				FreeSpinGrant.aggregate([
					{ $match: { createdAt: { $gte: todayStartTR } } },
					{
						$lookup: {
							from: "transactions",
							let: {
								uid: { $toString: "$targetUser" },
								gcode: "$gameCode",
								gfrom: "$createdAt",
								gto: "$expiresAt",
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$user_code", "$$uid"] },
												{ $eq: ["$game_code", "$$gcode"] },
												{ $gte: ["$created_at", "$$gfrom"] },
												{ $lte: ["$created_at", "$$gto"] },
											],
										},
									},
								},
								{
									$group: {
										_id: null,
										winSum: { $sum: { $ifNull: ["$win_money", 0] } },
									},
								},
							],
							as: "playedWin",
						},
					},
					{
						$group: {
							_id: null,
							totalGrants: { $sum: 1 },
							totalSpinCount: { $sum: { $ifNull: ["$spinCount", 0] } },
							totalWinEstimate: {
								$sum: {
									$ifNull: [{ $arrayElemAt: ["$playedWin.winSum", 0] }, 0],
								},
							},
						},
					},
					])
						.option({ maxTimeMS: 8000 })
						.catch(err => {
							console.error("Bugünkü freespin özeti alınamadı:", err.message);
						return [];
					}),
			]);

				// Aggregation sonuçlarını parse et
			const rates = setting?.exchangeRates || {};

			// Kullanıcı bahis/kazanç
			const betsAllTry = userBetsAgg[0]?.totalBet || 0;
			const totalWonTry = userBetsAgg[0]?.totalWon || 0;
			const bets24hTry = 0; // Hesaplanamıyor

			// Crypto/Bank toplamları parse et (facet sonucu)
			const parseAggResult = (agg) => {
				let deposits = 0,
					withdrawals = 0;
				agg.forEach((item) => {
					if (item._id === "deposit") deposits = item.total || 0;
					if (item._id === "withdraw") withdrawals = item.total || 0;
				});
				return { deposits, withdrawals };
			};

			// Facet sonuçlarını parse et
			const cryptoFacet = cryptoAggAll[0] || { all: [], last24h: [], today: [] };
			const bankFacet = bankAggAll[0] || { all: [], last24h: [], today: [] };
			const galaxyPayFacet = galaxyPayAggAll[0] || { all: [], last24h: [], today: [] };
			const fluxKriptoFacet = fluxKriptoAggAll[0] || { all: [], last24h: [], today: [] };
			const xPaymentsFacet = xPaymentsAggAll[0] || { all: [], last24h: [], today: [] };

			const cryptoAllTotals = parseAggResult(cryptoFacet.all);
			const cryptoLast24hTotals = parseAggResult(cryptoFacet.last24h);
			const cryptoTodayTotals = parseAggResult(cryptoFacet.today);
			const bankAllTotals = parseAggResult(bankFacet.all);
			const bankLast24hTotals = parseAggResult(bankFacet.last24h);
			const bankTodayTotals = parseAggResult(bankFacet.today);
			const galaxyPayAllTotals = parseAggResult(galaxyPayFacet.all);
			const galaxyPayLast24hTotals = parseAggResult(galaxyPayFacet.last24h);
			const galaxyPayTodayTotals = parseAggResult(galaxyPayFacet.today);
			const fluxKriptoAllTotals = parseAggResult(fluxKriptoFacet.all);
			const fluxKriptoLast24hTotals = parseAggResult(fluxKriptoFacet.last24h);
			const fluxKriptoTodayTotals = parseAggResult(fluxKriptoFacet.today);
			const xPaymentsAllTotals = parseAggResult(xPaymentsFacet.all);
			const xPaymentsLast24hTotals = parseAggResult(xPaymentsFacet.last24h);
			const xPaymentsTodayTotals = parseAggResult(xPaymentsFacet.today);

			// Toplam hesaplama (Crypto + Bank + diğer sağlayıcılar)
			const allTotals = {
				deposits:
					cryptoAllTotals.deposits +
					bankAllTotals.deposits +
					galaxyPayAllTotals.deposits +
					fluxKriptoAllTotals.deposits +
					xPaymentsAllTotals.deposits,
				withdrawals:
					cryptoAllTotals.withdrawals +
					bankAllTotals.withdrawals +
					galaxyPayAllTotals.withdrawals +
					fluxKriptoAllTotals.withdrawals +
					xPaymentsAllTotals.withdrawals,
			};
			const last24hTotals = {
				deposits:
					cryptoLast24hTotals.deposits +
					bankLast24hTotals.deposits +
					galaxyPayLast24hTotals.deposits +
					fluxKriptoLast24hTotals.deposits +
					xPaymentsLast24hTotals.deposits,
				withdrawals:
					cryptoLast24hTotals.withdrawals +
					bankLast24hTotals.withdrawals +
					galaxyPayLast24hTotals.withdrawals +
					fluxKriptoLast24hTotals.withdrawals +
					xPaymentsLast24hTotals.withdrawals,
			};
			// 🔹 Bugün (TR günü, 00:00'dan şimdiye) toplamları
			const todayTotals = {
				deposits:
					cryptoTodayTotals.deposits +
					bankTodayTotals.deposits +
					galaxyPayTodayTotals.deposits +
					fluxKriptoTodayTotals.deposits +
					xPaymentsTodayTotals.deposits,
				withdrawals:
					cryptoTodayTotals.withdrawals +
					bankTodayTotals.withdrawals +
					galaxyPayTodayTotals.withdrawals +
					fluxKriptoTodayTotals.withdrawals +
					xPaymentsTodayTotals.withdrawals,
			};

			const bonusTodayTry = bonusTodayAgg?.[0]?.total || 0;
			const freeSpinsTodaySummary = freeSpinsTodayAgg?.[0] || {
				totalGrants: 0,
				totalSpinCount: 0,
				totalWinEstimate: 0,
			};

			// Response data
			const responseData = {
				// Kullanıcılar
				totalUsers,
				newUsers24h,

				// Finans (TRY bazlı - toplam)
				totalDepositsTry: allTotals.deposits,
				totalWithdrawalsTry: allTotals.withdrawals,
				deposits24hTry: last24hTotals.deposits,
				withdrawals24hTry: last24hTotals.withdrawals,

				// Bugün (TR günü, 00:00'dan itibaren)
				depositsTodayTry: todayTotals.deposits,
				withdrawalsTodayTry: todayTotals.withdrawals,
				bonusTodayTry,
				freeSpinsTodayCount: freeSpinsTodaySummary.totalSpinCount,
				freeSpinsTodayGrantsCount: freeSpinsTodaySummary.totalGrants,
				// Yaklaşık değer: provider'dan freespin bayrağı gelmediği için
				// grant süresi + oyun eşleşmesiyle hesaplanır, kesin değildir.
				freeSpinsTodayWinTry: freeSpinsTodaySummary.totalWinEstimate,

				// Finans detay - Crypto
				cryptoDepositsTry: cryptoAllTotals.deposits,
				cryptoWithdrawalsTry: cryptoAllTotals.withdrawals,
				cryptoDeposits24hTry: cryptoLast24hTotals.deposits,
				cryptoWithdrawals24hTry: cryptoLast24hTotals.withdrawals,

				// Finans detay - Bank
				bankDepositsTry: bankAllTotals.deposits,
				bankWithdrawalsTry: bankAllTotals.withdrawals,
				bankDeposits24hTry: bankLast24hTotals.deposits,
				bankWithdrawals24hTry: bankLast24hTotals.withdrawals,

				// Finans detay - GalaxyPay
				galaxyPayDepositsTry: galaxyPayAllTotals.deposits,
				galaxyPayWithdrawalsTry: galaxyPayAllTotals.withdrawals,
				galaxyPayDeposits24hTry: galaxyPayLast24hTotals.deposits,
				galaxyPayWithdrawals24hTry: galaxyPayLast24hTotals.withdrawals,

				fluxKriptoDepositsTry: fluxKriptoAllTotals.deposits,
				fluxKriptoWithdrawalsTry: fluxKriptoAllTotals.withdrawals,
				fluxKriptoDeposits24hTry: fluxKriptoLast24hTotals.deposits,
				fluxKriptoWithdrawals24hTry: fluxKriptoLast24hTotals.withdrawals,

				xPaymentsDepositsTry: xPaymentsAllTotals.deposits,
				xPaymentsWithdrawalsTry: xPaymentsAllTotals.withdrawals,
				xPaymentsDeposits24hTry: xPaymentsLast24hTotals.deposits,
				xPaymentsWithdrawals24hTry: xPaymentsLast24hTotals.withdrawals,

				// Bahisler (TRY bazlı)
				betsAllTry,
				bets24hTry: 0,
				totalWonTry,

				// Kurlar
				exchangeRates: rates,

				// Online kullanıcı (socket ile güncellenecek)
				activeUsers: 0,
			};

			// 🔹 Response
			res.json({
				success: true,
				data: responseData,
			});
		} catch (err) {
			console.error("Analytics error:", err);
			res.status(500).json({
				success: false,
				message: "Analytics fetch error",
			});
		}
	},
);

// Son 5 transaction endpointi (Crypto + Bank + diğer sağlayıcılar birleşik)
router.get(
	"/analytics/last-transactions",
	checkPermission("dashboard.read"),
	async (req, res) => {
		try {
			// Her koleksiyondan paralel olarak sadece 5'er tane çek
			const [
				cryptoTxs,
				bankTxs,
				galaxyPayTxs,
				fluxKriptoTxs,
				xPaymentTxs,
			] = await Promise.all([
				CryptoTransaction.find()
					.select("type amount state createdAt user")
					.populate("user", "username")
					.sort({ createdAt: -1 })
					.limit(5)
					.lean(),
				BankTransfer.find()
					.select("type amount status createdAt user bankName")
					.populate("user", "username")
					.sort({ createdAt: -1 })
					.limit(5)
					.lean(),
				GalaxyPayTransaction.find()
					.select("type method amount status createdAt user externalTransactionId")
					.populate("user", "username")
					.sort({ createdAt: -1 })
					.limit(5)
					.lean(),
				FluxKriptoTransaction.find()
					.select("type currency amount status createdAt user externalTransactionId")
					.populate("user", "username")
					.sort({ createdAt: -1 })
					.limit(5)
					.lean(),
				XPaymentTransaction.find()
					.select("type amount status createdAt user externalTransactionId")
					.populate("user", "username")
					.sort({ createdAt: -1 })
					.limit(5)
					.lean(),
			]);

			// Formatla ve birleştir
			const formattedCrypto = cryptoTxs.map((tx) => ({
				_id: tx._id,
				type: tx.type,
				amount: tx.amount,
				status: tx.state,
				createdAt: tx.createdAt,
				user: tx.user,
				source: "crypto",
				currency: "TRY",
			}));

			const formattedBank = bankTxs.map((tx) => ({
				_id: tx._id,
				type: tx.type,
				amount: tx.amount,
				status: tx.status,
				createdAt: tx.createdAt,
				user: tx.user,
				source: "bank",
				bankName: tx.bankName,
				currency: "TRY",
			}));

			const formattedGalaxyPay = galaxyPayTxs.map((tx) => ({
				_id: tx._id,
				type: tx.type,
				amount: tx.amount,
				status: tx.status,
				createdAt: tx.createdAt,
				user: tx.user,
				source: "galaxypay",
				bankName:
					tx.method === "bank-transfer"
						? "GalaxyPay Banka Transferi"
						: tx.method === "papara"
							? "GalaxyPay Papara"
							: "GalaxyPay",
				currency: "TRY",
			}));

			const formattedFluxKripto = fluxKriptoTxs.map((tx) => ({
				_id: tx._id,
				type: tx.type,
				amount: tx.amount,
				status: tx.status,
				createdAt: tx.createdAt,
				user: tx.user,
				source: "fluxkripto",
				bankName: `FluxKripto ${tx.currency || ""}`.trim(),
				currency: "TRY",
			}));

			const formattedXPayments = xPaymentTxs.map((tx) => ({
				_id: tx._id,
				type: tx.type,
				amount: tx.amount,
				status: tx.status,
				createdAt: tx.createdAt,
				user: tx.user,
				source: "xpayments",
				bankName: "XPayment H2H",
				currency: "TRY",
			}));

			// Birleştir ve tarihe göre sırala
			const allTxs = [
				...formattedCrypto,
				...formattedBank,
				...formattedGalaxyPay,
				...formattedFluxKripto,
				...formattedXPayments,
			]
				.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
				.slice(0, 5);

			res.json({ success: true, data: allTxs });
		} catch (err) {
			console.error("Last transactions error:", err);
			res.status(500).json({
				success: false,
				message: "Fetch last transactions error",
			});
		}
	},
);

const buildUnifiedPaymentPipeline = (type) => {
	const defaultTransactionId = { $toString: "$_id" };
	const commonFields = {
		_id: 1,
		user: 1,
		amount: 1,
		createdAt: 1,
		updatedAt: 1,
	};
	const sourcePipeline = (match, projection) => [
		{ $match: match },
		{ $project: { ...commonFields, ...projection } },
	];
	const pipeline = sourcePipeline(
		{ type },
		{
			source: { $literal: "crypto" },
			provider: { $literal: "Kripto" },
			transactionId: {
				$ifNull: ["$data.transaction", defaultTransactionId],
			},
			currency: {
				$ifNull: [
					"$data.fiatcurrency",
					{ $ifNull: ["$data.currency", "TRY"] },
				],
			},
			status: "$state",
			details: {
				providerId: "$data.providerId",
				sender: "$data.sender",
				receiver: "$data.receiver",
				cryptoCurrency: "$data.currency",
				fiatCurrency: "$data.fiatcurrency",
				cryptoAmount: "$data.cryptoAmount",
				bonusAmount: "$data.bonusAmount",
				bonusType: "$data.bonusType",
			},
		},
	);

	pipeline.push(
		{
			$unionWith: {
				coll: ForcelabFinanceTransaction.collection.name,
				pipeline: sourcePipeline(
					{
						$expr: {
							$eq: [{ $ifNull: ["$providerType", "deposit"] }, type],
						},
					},
					{
						source: { $literal: "forcelab" },
						provider: {
							$cond: [
								{
									$gt: [
										{ $strLenCP: { $ifNull: ["$providerName", ""] } },
										0,
									],
								},
								"$providerName",
								{ $ifNull: ["$providerSlug", "Forcelab Finance"] },
							],
						},
						transactionId: {
							$ifNull: ["$externalTransactionId", defaultTransactionId],
						},
						currency: { $ifNull: ["$currency", "TRY"] },
						status: "$status",
						details: {
							uuid: "$uuid",
							providerSlug: "$providerSlug",
							providerName: "$providerName",
							providerAmount: "$providerAmount",
							oldBalance: "$oldBalance",
							newBalance: "$newBalance",
							rejectionReason: "$rejectionReason",
							approvedAt: "$approvedAt",
							rejectedAt: "$rejectedAt",
							processedAt: "$processedAt",
						},
					},
				),
			},
		},
		{
			$unionWith: {
				coll: MeelDevTransaction.collection.name,
				pipeline: sourcePipeline(
					{ type },
					{
						source: { $literal: "meeldev" },
						provider: { $literal: "MeelDev" },
						transactionId: {
							$ifNull: [
								"$transactionId",
								{ $ifNull: ["$processNo", defaultTransactionId] },
							],
						},
						currency: { $ifNull: ["$currency", "TRY"] },
						status: "$status",
						details: {
							processNo: "$processNo",
							paymentType: "$paymentType",
							paymentUrl: "$paymentUrl",
							accountInfo: {
								accountHolder: "$accountInfo.account_holder_name",
								iban: "$accountInfo.account_no",
								bankName: "$accountInfo.platform_option.name",
								minAmount: "$accountInfo.min_amount",
								maxAmount: "$accountInfo.max_amount",
							},
							bankInfo: {
								iban: "$bankInfo.iban",
								accountHolder: "$bankInfo.accountHolder",
								bankName: "$bankInfo.bankName",
							},
							oldBalance: "$oldBalance",
							newBalance: "$newBalance",
							rejectionReason: "$rejectionReason",
							approvedAt: "$approvedAt",
							rejectedAt: "$rejectedAt",
						},
					},
				),
			},
		},
		{
			$unionWith: {
				coll: GalaxyPayTransaction.collection.name,
				pipeline: sourcePipeline(
					{ type },
					{
						source: { $literal: "galaxypay" },
						provider: {
							$concat: [
								"GalaxyPay",
								{
									$cond: [
										{ $gt: [{ $strLenCP: { $ifNull: ["$method", ""] } }, 0] },
										{ $concat: [" - ", "$method"] },
										"",
									],
								},
							],
						},
						transactionId: {
							$ifNull: [
								"$externalTransactionId",
								{ $ifNull: ["$paymentId", defaultTransactionId] },
							],
						},
						currency: { $ifNull: ["$currency", "TRY"] },
						status: "$status",
						details: {
							method: "$method",
							paymentId: "$paymentId",
							bankInfo: {
								iban: "$bankInfo.iban",
								accountNumber: "$bankInfo.accountNumber",
								accountHolder: "$bankInfo.accountHolder",
								bankName: "$bankInfo.bankName",
							},
							paparaInfo: {
								accountNumber: "$paparaInfo.accountNumber",
								accountHolder: "$paparaInfo.accountHolder",
							},
							oldBalance: "$oldBalance",
							newBalance: "$newBalance",
							rejectionReason: "$rejectionReason",
							approvedAt: "$approvedAt",
							rejectedAt: "$rejectedAt",
						},
					},
				),
			},
		},
		{
			$unionWith: {
				coll: FluxKriptoTransaction.collection.name,
				pipeline: sourcePipeline(
					{ type },
					{
						source: { $literal: "fluxkripto" },
						provider: { $literal: "FluxKripto" },
						transactionId: {
							$ifNull: [
								"$externalTransactionId",
								{ $ifNull: ["$financeId", defaultTransactionId] },
							],
						},
						currency: { $ifNull: ["$currency", "TRY"] },
						status: "$status",
						details: {
							orderId: "$orderId",
							financeId: "$financeId",
							requestedAmount: "$requestedAmount",
							providerAmount: "$providerAmount",
							cryptoAmount: "$cryptoAmount",
							rate: "$rate",
							walletAddress: "$walletAddress",
							receiverWallet: "$receiverWallet",
							providerStatus: "$providerStatus",
							rejectionReason: "$rejectionReason",
							approvedAt: "$approvedAt",
							rejectedAt: "$rejectedAt",
							processedAt: "$processedAt",
						},
					},
				),
			},
		},
		{
			$unionWith: {
				coll: XPaymentTransaction.collection.name,
				pipeline: sourcePipeline(
					{ type },
					{
						source: { $literal: "xpayments" },
						provider: { $literal: "XPayment H2H" },
						transactionId: {
							$ifNull: [
								"$externalTransactionId",
								{ $ifNull: ["$financeId", defaultTransactionId] },
							],
						},
						currency: { $ifNull: ["$currency", "TRY"] },
						status: "$status",
						details: {
							financeId: "$financeId",
							requestedAmount: "$requestedAmount",
							providerAmount: "$providerAmount",
							providerStatus: "$providerStatus",
							isProcessing: "$isProcessing",
							submissionState: "$submissionState",
							account: {
								bankName: "$account.bankName",
								accountHolderName: "$account.accountHolderName",
								iban: "$account.iban",
								methodType: "$account.methodType",
							},
							withdrawal: {
								accountHolder: "$withdrawal.accountHolder",
								iban: "$withdrawal.iban",
							},
							rejectionReason: "$rejectionReason",
							approvedAt: "$approvedAt",
							rejectedAt: "$rejectedAt",
							cancelledAt: "$cancelledAt",
							submittedAt: "$submittedAt",
						},
					},
				),
			},
		},
	);

	return pipeline;
};

const createUnifiedPaymentListHandler = (type) => async (req, res) => {
	try {
		const {
			q = "",
			status,
			startDate,
			endDate,
			page = 1,
			itemsPerPage = 10,
			export: exportMode,
		} = req.query;
		// Dışa aktarım modunda sayfalama devre dışı kalır ve güvenli bir üst
		// sınıra (50.000 kayıt) kadar tüm eşleşen işlemler döndürülür.
		const isExport = String(exportMode) === "true" || Number(itemsPerPage) === -1;
		const pageNumber = Math.max(1, Number(page) || 1);
		const limitNumber = isExport
			? 50000
			: Math.min(100, Math.max(1, Number(itemsPerPage) || 10));
		const now = new Date();
		const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		// Onaylı/tamamlanmış kabul edilen statüler. İstatistik kartları
		// (Toplam/24s/Aylık) her zaman bu statülere göre hesaplanır; tablodaki
		// Durum filtresi ise sadece listelenen işlemleri filtreler, istatistik
		// kartlarını etkilemez.
		const approvedStatuses = ["approved", "completed", "success"];
		// `baseFilters`: tablo VE istatistik hesaplamasına uygulanan ortak
		// filtreler (arama, tarih aralığı). Durum filtresi buraya dahil
		// edilmez; sadece tablo (transactions/totalCount) dallarında ayrıca
		// uygulanır — istatistik kartları her zaman onaylı statüye göre
		// hesaplanır.
		const baseFilters = [];

		const createdAt = {};
		if (startDate && !Number.isNaN(new Date(startDate).getTime())) {
			createdAt.$gte = new Date(startDate);
		}
		if (endDate && !Number.isNaN(new Date(endDate).getTime())) {
			const inclusiveEndDate = new Date(endDate);
			inclusiveEndDate.setHours(23, 59, 59, 999);
			createdAt.$lte = inclusiveEndDate;
		}
		if (Object.keys(createdAt).length) {
			baseFilters.push({ createdAt });
		}

		const trimmedSearch = String(q || "").trim();
		const pipeline = buildUnifiedPaymentPipeline(type);
		pipeline.push(
			{
				$lookup: {
					from: User.collection.name,
					localField: "user",
					foreignField: "_id",
					as: "user",
				},
			},
			{ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
		);

		if (trimmedSearch) {
			const searchRegex = new RegExp(escapeRegex(trimmedSearch), "i");

			baseFilters.push({
				$or: [
					{ "user.username": searchRegex },
					{ "user.local.email": searchRegex },
					{ "user.phone": searchRegex },
					{ provider: searchRegex },
					{ transactionId: searchRegex },
				],
			});
		}

		// Sadece ortak filtreler (arama + tarih) burada uygulanır. Durum
		// filtresi facet içinde ayrıca uygulanır, çünkü tablo listesi
		// kullanıcının seçtiği duruma göre filtrelenmeli, ama istatistik
		// kartları her zaman onaylı işlemlere göre hesaplanmalı.
		if (baseFilters.length) pipeline.push({ $match: { $and: baseFilters } });

		const statusMatchStage = status ? [{ $match: { status: String(status) } }] : [];

		pipeline.push(
			{ $sort: { createdAt: -1, _id: -1 } },
			{
				$facet: {
					transactions: [
						...statusMatchStage,
						...(isExport ? [] : [{ $skip: (pageNumber - 1) * limitNumber }]),
						{ $limit: limitNumber },
						{
							$project: {
								_id: 1,
								source: 1,
								provider: 1,
								transactionId: 1,
								currency: 1,
								amount: 1,
								status: 1,
								createdAt: 1,
								updatedAt: 1,
								details: 1,
								"user._id": 1,
								"user.username": 1,
								"user.local.email": 1,
								"user.phone": 1,
							},
						},
					],
					// Tablonun toplam kayıt sayısı (pagination) — kullanıcının
					// seçtiği durum filtresine göre değişir.
					totalCount: [...statusMatchStage, { $count: "count" }],
					// İstatistik kartları — durum filtresinden bağımsız olarak
					// her zaman sadece onaylı/tamamlanmış işlemlere göre hesaplanır.
					summary: [
						{ $match: { status: { $in: approvedStatuses } } },
						{
							$group: {
								_id: null,
								totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
								last24hAmount: {
									$sum: {
										$cond: [
											{ $gte: ["$createdAt", last24h] },
											{ $ifNull: ["$amount", 0] },
											0,
										],
									},
								},
								monthlyAmount: {
									$sum: {
										$cond: [
											{ $gte: ["$createdAt", monthStart] },
											{ $ifNull: ["$amount", 0] },
											0,
										],
									},
								},
							},
						},
					],
				},
			},
		);

		const [result = {}] = await CryptoTransaction.aggregate(pipeline);
		const summary = result.summary?.[0] || {};
		const total = result.totalCount?.[0]?.count || 0;

		res.json({
			success: true,
			data: {
				transactions: result.transactions || [],
				total,
				page: pageNumber,
				stats: {
					totalAmount: summary.totalAmount || 0,
					last24hAmount: summary.last24hAmount || 0,
					monthlyAmount: summary.monthlyAmount || 0,
				},
			},
		});
	} catch (err) {
		console.error(`Unified ${type} transactions error:`, err);
		res.status(500).json({
			success: false,
			message: "Birleşik ödeme işlemleri alınamadı.",
		});
	}
};

router.get(
	"/payment-transactions/deposit",
	checkPermission("finance.deposits.read"),
	createUnifiedPaymentListHandler("deposit"),
);

router.get(
	"/payment-transactions/withdraw",
	checkPermission("finance.withdraws.read"),
	createUnifiedPaymentListHandler("withdraw"),
);

// routes/admin.js
router.get("/transactions-deposit", checkPermission("finance.deposits.read"), async (req, res) => {
	try {
		const {
			q,
			startDate,
			endDate,
			page = 1,
			itemsPerPage = 10,
		} = req.query;

		const query = { type: "deposit" };

		// Kullanıcı araması
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ email: { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		// Tarih aralığı
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		const skip = (page - 1) * itemsPerPage;
		const total = await CryptoTransaction.countDocuments(query);

		const txs = await CryptoTransaction.find(query)
			.populate("user", "username email phone avatar")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(itemsPerPage));

		// 📊 Ek istatistikler
		const now = new Date();
		const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [totalAmount, last24hAmount, monthlyAmount] = await Promise.all([
			CryptoTransaction.aggregate([
				{ $match: { type: "deposit" } },
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
			CryptoTransaction.aggregate([
				{ $match: { type: "deposit", createdAt: { $gte: last24h } } },
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
			CryptoTransaction.aggregate([
				{ $match: { type: "deposit", createdAt: { $gte: lastMonth } } },
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
		]);

		res.json({
			success: true,
			data: {
				transactions: txs,
				total,
				page: Number(page),

				// Yeni alanlar:
				stats: {
					totalAmount: totalAmount[0]?.sum || 0,
					last24hAmount: last24hAmount[0]?.sum || 0,
					monthlyAmount: monthlyAmount[0]?.sum || 0,
				},
			},
		});
	} catch (err) {
		console.error("Transactions fetch error:", err);
		res.status(500).json({
			success: false,
			message: "Transactions fetch error",
		});
	}
});

// routes/admin.js
router.get("/transactions-withdraw", checkPermission("finance.withdraws.read"), async (req, res) => {
	try {
		const {
			q,
			startDate,
			endDate,
			page = 1,
			itemsPerPage = 10,
		} = req.query;

		const query = { type: "withdraw" };

		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ email: { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		const skip = (page - 1) * itemsPerPage;
		const total = await CryptoTransaction.countDocuments(query);

		const txs = await CryptoTransaction.find(query)
			.populate("user", "username email phone avatar")
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(itemsPerPage));

		// 📊 Ek istatistikler
		const now = new Date();
		const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [totalAmount, last24hAmount, monthlyAmount] = await Promise.all([
			CryptoTransaction.aggregate([
				{ $match: { type: "withdraw" } },
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
			CryptoTransaction.aggregate([
				{ $match: { type: "withdraw", createdAt: { $gte: last24h } } },
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
			CryptoTransaction.aggregate([
				{
					$match: {
						type: "withdraw",
						createdAt: { $gte: lastMonth },
					},
				},
				{ $group: { _id: null, sum: { $sum: "$amount" } } },
			]),
		]);

		res.json({
			success: true,
			data: {
				transactions: txs,
				total,
				page: Number(page),

				stats: {
					totalAmount: totalAmount[0]?.sum || 0,
					last24hAmount: last24hAmount[0]?.sum || 0,
					monthlyAmount: monthlyAmount[0]?.sum || 0,
				},
			},
		});
	} catch (err) {
		console.error("Withdraw transactions fetch error:", err);
		res.status(500).json({
			success: false,
			message: "Withdraw transactions fetch error",
		});
	}
});

// 📌 Wingo Config getir
router.get("/wingo/config", checkPermission("games.read"), async (req, res) => {
	try {
		const config = await WingoConfig.findOne().sort({ createdAt: -1 });
		res.json({ success: true, data: config });
	} catch (err) {
		console.error("Wingo config error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Bir sonraki roundu zorla (force)
router.post("/wingo/force", checkPermission("games.manage"), async (req, res) => {
	try {
		const { forcedColor, forcedNumber } = req.body;

		const config = await WingoConfig.findOneAndUpdate(
			{},
			{
				"forceNext.enabled": true,
				"forceNext.forcedColor": forcedColor || null,
				"forceNext.forcedNumber": forcedNumber || null,
			},
			{ new: true, upsert: true },
		);

		res.json({
			success: true,
			data: config,
			message: "Sonraki round zorlandı",
		});
	} catch (err) {
		console.error("Wingo force error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Wingo Config güncelle
router.post("/wingo/config", checkPermission("games.update"), async (req, res) => {
	try {
		const updates = req.body;
		const config = await WingoConfig.findOneAndUpdate({}, updates, {
			new: true,
			upsert: true,
		});
		res.json({ success: true, data: config });
	} catch (err) {
		console.error("Wingo config update error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Tüm Futures geçmişleri (admin)
router.get("/futures/history", checkPermission("games.read"), async (req, res) => {
	try {
		const {
			q,
			startDate,
			endDate,
			status,
			direction,
			symbol,
			fiatCurrency,
			page = 1,
			limit = 20,
		} = req.query;

		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📊 Detaylı filtreler
		if (status) query.status = status;
		if (direction) query.direction = direction;
		if (symbol) query.symbol = symbol;
		if (fiatCurrency) query.fiatCurrency = fiatCurrency;

		// 📦 Futures kayıtlarını getir
		const bets = await FuturesBet.find(query)
			.populate(
				"user",
				"username local.email phone rank wallets currency",
			)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await FuturesBet.countDocuments(query);

		res.json({
			success: true,
			data: bets,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Futures history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Tüm Turbo ge��mişleri (admin)
router.get("/turbo/history", checkPermission("games.read"), async (req, res) => {
	try {
		const {
			q,
			startDate,
			endDate,
			status,
			direction,
			symbol,
			fiatCurrency,
			page = 1,
			limit = 20,
		} = req.query;

		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📊 Detaylı filtreler
		if (status) query.result = status; // turbo'da "win/lose/pending"
		if (direction) query.direction = direction;
		if (symbol) query.symbol = symbol;
		if (fiatCurrency) query.fiatCurrency = fiatCurrency;

		// 📦 Kayıtları getir
		const trades = await TurboTrade.find(query)
			.populate(
				"user",
				"username local.email phone rank wallets currency",
			)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await TurboTrade.countDocuments(query);

		res.json({
			success: true,
			data: trades,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Turbo history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Tüm Wingo geçmişleri (admin)
router.get("/wingo/history", checkPermission("games.read"), async (req, res) => {
	try {
		const {
			q,
			startDate,
			endDate,
			betType,
			choice,
			isWin,
			page = 1,
			limit = 20,
		} = req.query;

		const match = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}

			match.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			match.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 🎲 Özel filtreler
		if (betType) match.betType = betType;
		if (choice) match.choice = choice;
		if (isWin !== undefined) match.isWin = isWin === "true";

		const skip = (page - 1) * limit;

		const results = await WingoBet.aggregate([
			{ $match: match },
			{ $sort: { createdAt: -1 } },
			{ $skip: skip },
			{ $limit: Number(limit) },

			// 🔗 User ekle
			{
				$lookup: {
					from: "users",
					localField: "user",
					foreignField: "_id",
					as: "user",
				},
			},
			{ $unwind: "$user" },

			// 🔗 Game ekle
			{
				$lookup: {
					from: "wingogames",
					localField: "roundId",
					foreignField: "roundId",
					as: "round",
				},
			},
			{ $unwind: { path: "$round", preserveNullAndEmptyArrays: true } },

			{
				$project: {
					_id: 1,
					roundId: 1,
					user: {
						_id: "$user._id",
						username: "$user.username",
						email: "$user.local.email",
					},
					betType: 1,
					choice: 1,
					amount: 1,
					payout: 1,
					isWin: 1,
					createdAt: 1,
					colorResult: "$round.colorResult",
					numberResult: "$round.numberResult",
				},
			},
		]);

		const total = await WingoBet.countDocuments(match);

		res.json({
			success: true,
			data: results,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Wingo history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

router.get("/battle/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;

		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (users.length) {
				query.user = { $in: users.map((u) => u._id) };
			} else {
				query.user = null;
			}
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📥 Veriler
		const battles = await Battlesbet.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Battlesbet.countDocuments(query);

		// 🔑 Normalize response (tüm alanlarla)
		const formatted = battles.map((battle) => ({
			_id: battle._id,
			user: {
				_id: battle.user?._id,
				username: battle.user?.username || "Unknown",
				email: battle.user?.local?.email || "—",
			},
			amount: battle.amount,
			fiatCurrency: battle.fiatCurrency || null,
			payout: battle.payout || null,
			multiplier: battle.multiplier || null,
			playerCount: battle.playerCount,
			mode: battle.mode,
			state: battle.state,
			boxes: battle.boxes || [],
			createdAt: battle.createdAt,
			updatedAt: battle.updatedAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Battle history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📌 Tüm Blackjack geçmişleri (admin)
router.get("/blackjack/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📦 Blackjack kayıtlar��nı getir
		const bets = await Blackjackbet.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Blackjackbet.countDocuments(query);

		// 🔑 Normalize edilmiş format
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount || {}, // main / sideLeft / sideRight
			payout: bet.payout || 0,
			multiplier: bet.multiplier || 0,
			seat: bet.seat,
			actions: bet.actions || [],
			cards: bet.cards || [],
			cardsLeft: bet.cardsLeft || [],
			cardsRight: bet.cardsRight || [],
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Blackjack history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= CRASH =================
router.get("/crash/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			query.user = users.length ? { $in: users.map((u) => u._id) } : null;
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📥 Verileri çek
		const bets = await Crashbet.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Crashbet.countDocuments(query);

		// 📑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			fiatCurrency: bet.fiatCurrency,
			coinType: bet.coinType,
			chain: bet.chain,
			walletType: bet.walletType,
			payout: bet.payout,
			multiplier: bet.multiplier,
			autoCashout: bet.autoCashout,
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Crash history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= DUELS =================
router.get("/duels/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}
			query.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📦 Verileri çek
		const bets = await Duelsbet.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Duelsbet.countDocuments(query);

		// 🔑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			payout: bet.payout,
			multiplier: bet.multiplier,
			roll: bet.roll,
			fiatCurrency: bet.fiatCurrency,
			fiatRate: bet.fiatRate,
			bot: bet.bot,
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Duels history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= MINES =================
router.get("/mines/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}
			query.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📦 Veriler
		const bets = await MinesGame.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await MinesGame.countDocuments(query);

		// 🔑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			payout: bet.payout,
			multiplier: bet.multiplier,
			minesCount: bet.minesCount,
			fiatCurrency: bet.fiatCurrency,
			coinType: bet.coinType,
			chain: bet.chain,
			walletType: bet.walletType,
			state: bet.state,
			revealed: bet.revealed || [],
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Mines history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= ROLL =================
router.get("/roll/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}
			query.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📦 Veriler
		const bets = await Rollbet.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await Rollbet.countDocuments(query);

		// 🔑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			payout: bet.payout,
			multiplier: bet.multiplier,
			fiatCurrency: bet.fiatCurrency,
			coinType: bet.coinType,
			chain: bet.chain,
			walletType: bet.walletType,
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Roll history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= TOWERS =================
router.get("/towers/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}
			query.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		// 📦 Veriler
		const bets = await TowersGame.find(query)
			.populate("user", "username local.email")
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await TowersGame.countDocuments(query);

		// 🔑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			payout: bet.payout,
			multiplier: bet.multiplier,
			risk: bet.risk,
			fiatCurrency: bet.fiatCurrency,
			coinType: bet.coinType,
			chain: bet.chain,
			walletType: bet.walletType,
			state: bet.state,
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Towers history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ================= UNBOX =================
router.get("/unbox/history", checkPermission("games.read"), async (req, res) => {
	try {
		const { q, startDate, endDate, page = 1, limit = 20 } = req.query;
		const query = {};

		// 🔍 Kullanıcı arama
		if (q) {
			const users = await User.find({
				$or: [
					{ username: { $regex: q, $options: "i" } },
					{ "local.email": { $regex: q, $options: "i" } },
					{ phone: { $regex: q, $options: "i" } },
					{ _id: mongoose.Types.ObjectId.isValid(q) ? q : null },
				].filter(Boolean),
			}).select("_id");

			if (!users.length) {
				return res.json({
					success: true,
					data: [],
					total: 0,
					page: 1,
					totalPages: 0,
				});
			}

			query.user = { $in: users.map((u) => u._id) };
		}

		// 📅 Tarih filtresi
		if (startDate && endDate) {
			query.createdAt = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			};
		}

		const bets = await UnboxGame.find(query)
			.populate("user", "username local.email")
			.populate("box", "name price") // kutu bilgisi de gelsin
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await UnboxGame.countDocuments(query);

		// 🔑 Normalize response
		const formatted = bets.map((bet) => ({
			_id: bet._id,
			user: {
				_id: bet.user?._id,
				username: bet.user?.username || "Unknown",
				email: bet.user?.local?.email || "—",
			},
			amount: bet.amount,
			payout: bet.payout,
			multiplier: bet.multiplier,
			outcome: bet.outcome,
			box: bet.box ? { name: bet.box.name, price: bet.box.price } : null,
			fiatCurrency: bet.fiatCurrency,
			coinType: bet.coinType,
			chain: bet.chain,
			walletType: bet.walletType,
			state: bet.state,
			createdAt: bet.createdAt,
		}));

		res.json({
			success: true,
			data: formatted,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (err) {
		console.error("Unbox history error:", err);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

const serializeBankTransfer = (transfer) => {
	if (!transfer) return null;

	const plain = transfer.toObject ? transfer.toObject() : transfer;

	return {
		_id: plain._id,
		user: plain.user
			? {
					_id: plain.user._id,
					username: plain.user.username,
					name: plain.user.name,
					email: plain.user.local?.email,
					phone: plain.user.phone,
				}
			: null,
		amount: plain.amount,
		bankId: plain.bankId,
		bankName: plain.bankName,
		accountName: plain.accountName,
		accountNumber: plain.accountNumber,
		iban: plain.iban,
		note: plain.note,
		status: plain.status,
		type: plain.type,
		metadata: plain.metadata || {},
		createdAt: plain.createdAt,
		updatedAt: plain.updatedAt,
	};
};

router.all(
	[
		"/bank-transfers",
		"/bank-transfers/:id/status",
		"/bank-transfers-withdraw",
		"/bank-transfers-withdraw/:id/status",
	],
	(req, res) => {
		return res.status(410).json({
			success: false,
			message: "Legacy bank transfer admin endpoints are disabled. Use Forcelab Finance.",
		});
	},
);

router.get(
	"/bank-transfers",
	checkPermission("finance.bankTransfers.read"),
	async (req, res) => {
		try {
			const { page = 1, limit = 20, status, search, userId } = req.query;

			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.min(
				Math.max(parseInt(limit, 10) || 20, 1),
				5000,
			);

			const query = { type: "deposit" };
			if (status) query.status = status;
			if (userId && mongoose.Types.ObjectId.isValid(userId))
				query.user = userId;

			if (search) {
				const regex = new RegExp(search, "i");
				query.$or = [
					{ bankName: regex },
					{ accountName: regex },
					{ accountNumber: regex },
					{ iban: regex },
				];
			}

			const [total, transfers] = await Promise.all([
				BankTransfer.countDocuments(query),
				BankTransfer.find(query)
					.populate("user", "name username phone local.email")
					.sort({ createdAt: -1 })
					.skip((pageNum - 1) * limitNum)
					.limit(limitNum),
			]);

			res.json({
				success: true,
				data: transfers.map(serializeBankTransfer),
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
			});
		} catch (error) {
			console.error("Bank transfer list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.patch(
	"/bank-transfers/:id/status",
	checkPermission("finance.bankTransfers.manage"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body || {};

			const allowedStatuses = ["pending", "approved", "rejected"];
			if (!allowedStatuses.includes(status)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz durum" });
			}

			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz transfer ID" });
			}

			const transfer = await BankTransfer.findById(id).populate(
				"user",
				"username phone local.email currency wallets",
			);
			if (!transfer) {
				return res
					.status(404)
					.json({ success: false, message: "Transfer bulunamadı" });
			}

			const previousStatus = transfer.status;
			transfer.status = status;
			await transfer.save();

			if (
				status === "approved" &&
				previousStatus !== "approved" &&
				transfer.user?._id
			) {
				try {
					const user = await User.findById(transfer.user._id).select(
						"currency wallets",
					);
					if (user) {
						await updateUserBalance(
							user,
							Number(transfer.amount || 0),
							{ emitSocket: true },
						);
					}
				} catch (walletError) {
					console.error(
						"Bank transfer wallet update error:",
						walletError,
					);
				}
			}

			res.json({ success: true, data: serializeBankTransfer(transfer) });
		} catch (error) {
			console.error("Bank transfer status update error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// =============================================
// BANK TRANSFERS - WITHDRAW (Para Çekme)
// =============================================

router.get(
	"/bank-transfers-withdraw",
	checkPermission("finance.bankTransfersWithdraw.read"),
	async (req, res) => {
		try {
			const { page = 1, limit = 20, status, search, userId } = req.query;

			const pageNum = Math.max(parseInt(page, 10) || 1, 1);
			const limitNum = Math.min(
				Math.max(parseInt(limit, 10) || 20, 1),
				5000,
			);

			const query = { type: "withdraw" };
			if (status) query.status = status;
			if (userId && mongoose.Types.ObjectId.isValid(userId))
				query.user = userId;

			if (search) {
				const regex = new RegExp(search, "i");
				query.$or = [
					{ bankName: regex },
					{ accountName: regex },
					{ accountNumber: regex },
					{ iban: regex },
				];
			}

			const [total, transfers] = await Promise.all([
				BankTransfer.countDocuments(query),
				BankTransfer.find(query)
					.populate(
						"user",
						"name username phone local.email currency wallets",
					)
					.sort({ createdAt: -1 })
					.skip((pageNum - 1) * limitNum)
					.limit(limitNum),
			]);

			// Add user balance to response
			const transfersWithBalance = transfers.map((t) => {
				const serialized = serializeBankTransfer(t);
				if (t.user) {
					const { coinType, chain, type } = t.user.currency || {};
					const activeWallet =
						t.user.wallets?.find(
							(wallet) =>
								wallet.coinType === coinType &&
								wallet.chain === chain &&
								wallet.type === type,
						) || t.user.wallets?.[0];
					serialized.userBalance = activeWallet?.balance || 0;
				}
				return serialized;
			});

			res.json({
				success: true,
				data: transfersWithBalance,
				total,
				page: pageNum,
				totalPages: Math.ceil(total / limitNum),
			});
		} catch (error) {
			console.error("Bank transfer withdraw list error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.patch(
	"/bank-transfers-withdraw/:id/status",
	checkPermission("finance.bankTransfersWithdraw.manage"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body || {};

			const allowedStatuses = [
				"pending",
				"processing",
				"approved",
				"rejected",
			];
			if (!allowedStatuses.includes(status)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz durum" });
			}

			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz transfer ID" });
			}

			const transfer = await BankTransfer.findById(id).populate(
				"user",
				"username phone local.email currency wallets",
			);
			if (!transfer) {
				return res
					.status(404)
					.json({ success: false, message: "Transfer bulunamadı" });
			}

			if (transfer.type !== "withdraw") {
				return res.status(400).json({
					success: false,
					message: "Bu işlem withdraw değil",
				});
			}

			const previousStatus = transfer.status;

			// Ödeme aşamasına alınacaksa bakiye kontrolü yap ve düş
			if (
				status === "processing" &&
				previousStatus === "pending" &&
				transfer.user?._id
			) {
				const user = await User.findById(transfer.user._id).select(
					"currency wallets",
				);

				if (user) {
					const activeWallet = getActiveWallet(user);
					if (!activeWallet) {
						return res.status(400).json({
							success: false,
							message: "Kullanıcının aktif cüzdanı bulunamadı",
						});
					}

					const currentBalance = Number(activeWallet.balance || 0);
					const withdrawAmount = Number(transfer.amount || 0);

					if (currentBalance < withdrawAmount) {
						return res.status(400).json({
							success: false,
							message: `Yetersiz bakiye. Mevcut: ${currentBalance.toFixed(
								2,
							)}, İstenen: ${withdrawAmount.toFixed(2)}`,
						});
					}

					// Bakiyeyi düş (negatif miktar ile)
					await updateUserBalance(user, -withdrawAmount, {
						emitSocket: true,
					});
				}
			}

			// Processing'den rejected'a geçilirse bakiyeyi geri yükle
			if (
				status === "rejected" &&
				previousStatus === "processing" &&
				transfer.user?._id
			) {
				const user = await User.findById(transfer.user._id).select(
					"currency wallets",
				);
				if (user) {
					const withdrawAmount = Number(transfer.amount || 0);
					await updateUserBalance(user, withdrawAmount, {
						emitSocket: true,
					});
				}
			}

			transfer.status = status;
			await transfer.save();

			res.json({ success: true, data: serializeBankTransfer(transfer) });
		} catch (error) {
			console.error("Bank transfer withdraw status update error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

router.get("/wingo/config", checkPermission("games.read"), adminWingoController.getWingoConfig);
router.post("/wingo/config", checkPermission("games.update"), adminWingoController.updateWingoConfig);
router.post("/wingo/force", checkPermission("games.manage"), adminWingoController.forceNextRound);

// ==================== CAMPAIGN ROUTES ====================
const campaignController = require("../../controllers/admin/campaignController");

router.get("/campaigns", checkPermission("finance.campaigns.read"), campaignController.getAllCampaigns);
router.get("/campaigns/:id", checkPermission("finance.campaigns.read"), campaignController.getCampaignById);
router.post("/campaigns", checkPermission("finance.campaigns.manage"), campaignController.createCampaign);
router.put("/campaigns/:id", checkPermission("finance.campaigns.manage"), campaignController.updateCampaign);
router.delete("/campaigns/:id", checkPermission("finance.campaigns.manage"), campaignController.deleteCampaign);
router.post("/campaigns/:id/assign", checkPermission("finance.campaigns.manage"), campaignController.assignCampaignToUser);
router.post("/campaigns/:id/revoke", checkPermission("finance.campaigns.manage"), campaignController.revokeCampaignFromUser);

// ==================== CAMPAIGN CATEGORY ROUTES ====================
const campaignCategoryController = require("../../controllers/admin/campaignCategoryController");

router.get("/campaign-categories", checkPermission("finance.campaigns.read"), campaignCategoryController.getAllCategories);
router.post("/campaign-categories", checkPermission("finance.campaigns.manage"), campaignCategoryController.createCategory);
router.put("/campaign-categories/:id", checkPermission("finance.campaigns.manage"), campaignCategoryController.updateCategory);
router.delete("/campaign-categories/:id", checkPermission("finance.campaigns.manage"), campaignCategoryController.deleteCategory);

// ==================== PROMOTION ROUTES ====================
const promotionController = require("../../controllers/admin/promotionController");

router.get("/promotions", checkPermission("finance.promo.read"), promotionController.getAllPromotions);
router.get("/promotions/:id", checkPermission("finance.promo.read"), promotionController.getPromotionById);
router.post("/promotions", checkPermission("finance.promo.manage"), promotionController.createPromotion);
router.put("/promotions/:id", checkPermission("finance.promo.manage"), promotionController.updatePromotion);
router.delete("/promotions/:id", checkPermission("finance.promo.manage"), promotionController.deletePromotion);

// ==================== PROMOTION CATEGORY ROUTES ====================
const promotionCategoryController = require("../../controllers/admin/promotionCategoryController");

router.get("/promotion-categories", checkPermission("finance.promo.read"), promotionCategoryController.getAllCategories);
router.post("/promotion-categories", checkPermission("finance.promo.manage"), promotionCategoryController.createCategory);
router.put("/promotion-categories/:id", checkPermission("finance.promo.manage"), promotionCategoryController.updateCategory);
router.delete("/promotion-categories/:id", checkPermission("finance.promo.manage"), promotionCategoryController.deleteCategory);

// ==================== PROVIDER MANAGEMENT ROUTES ====================
const providerRoutes = require("./providerRoutes");
router.use("/providers", providerRoutes);

const fluxKriptoAdminRoutes = require("./fluxKripto");
const xPaymentsAdminRoutes = require("./xPayments");
router.use("/fluxkripto", fluxKriptoAdminRoutes);
router.use("/xpayments", xPaymentsAdminRoutes);

// ==================== BETINOVI ADMIN API ROUTES ====================
const betinoviAdminRoutes = require("./betinoviAdminRoutes");
router.use("/betinovi-admin", betinoviAdminRoutes);

// ==================== BANK ACCOUNT MANAGEMENT ROUTES ====================
const BankAccount = require("../../database/models/BankAccount");

// Get all bank accounts (admin)
router.get(
	"/bank-accounts",
	checkPermission("finance.bankAccounts.read"),
	async (req, res) => {
		try {
			const accounts = await BankAccount.find().sort({
				order: 1,
				createdAt: -1,
			});
			res.json({ success: true, data: accounts });
		} catch (error) {
			console.error("Bank accounts fetch error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Get single bank account
router.get(
	"/bank-accounts/:id",
	checkPermission("finance.bankAccounts.read"),
	async (req, res) => {
		try {
			const account = await BankAccount.findById(req.params.id);
			if (!account) {
				return res
					.status(404)
					.json({ success: false, message: "Hesap bulunamadı" });
			}
			res.json({ success: true, data: account });
		} catch (error) {
			console.error("Bank account fetch error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Create bank account
router.post(
	"/bank-accounts",
	checkPermission("finance.bankAccounts.manage"),
	async (req, res) => {
		try {
			const {
				bankName,
				accountName,
				accountNumber,
				iban,
				note,
				logo,
				minAmount,
				maxAmount,
				active,
				order,
			} = req.body;

			if (!bankName || !accountName || !iban) {
				return res.status(400).json({
					success: false,
					message: "Banka adı, hesap adı ve IBAN zorunludur",
				});
			}

			const account = await BankAccount.create({
				bankName,
				accountName,
				accountNumber: accountNumber || "",
				iban,
				note: note || "",
				logo: logo || null,
				minAmount: minAmount || 0,
				maxAmount: maxAmount || null,
				active: active !== false,
				order: order || 0,
			});

			res.status(201).json({ success: true, data: account });
		} catch (error) {
			console.error("Bank account create error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Update bank account
router.put(
	"/bank-accounts/:id",
	checkPermission("finance.bankAccounts.manage"),
	async (req, res) => {
		try {
			const {
				bankName,
				accountName,
				accountNumber,
				iban,
				note,
				logo,
				minAmount,
				maxAmount,
				active,
				order,
			} = req.body;

			const account = await BankAccount.findByIdAndUpdate(
				req.params.id,
				{
					bankName,
					accountName,
					accountNumber,
					iban,
					note,
					logo,
					minAmount,
					maxAmount,
					active,
					order,
				},
				{ new: true, runValidators: true },
			);

			if (!account) {
				return res
					.status(404)
					.json({ success: false, message: "Hesap bulunamadı" });
			}

			res.json({ success: true, data: account });
		} catch (error) {
			console.error("Bank account update error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Delete bank account
router.delete(
	"/bank-accounts/:id",
	checkPermission("finance.bankAccounts.manage"),
	async (req, res) => {
		try {
			const account = await BankAccount.findByIdAndDelete(req.params.id);
			if (!account) {
				return res
					.status(404)
					.json({ success: false, message: "Hesap bulunamadı" });
			}
			res.json({ success: true, message: "Hesap silindi" });
		} catch (error) {
			console.error("Bank account delete error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// ==================== SPORTS BETS ADMIN ENDPOINTS ====================

// Get all sports bets with pagination and filters
router.get("/sports-bets", checkPermission("sports.read"), async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			status,
			search,
			userId,
			sortBy = "createdAt",
			sortOrder = "desc",
		} = req.query;

		const query = {};

		// Status filter
		if (
			status &&
			["pending", "won", "lost", "cancelled"].includes(status)
		) {
			query.status = status;
		}

		// User filter
		if (userId && mongoose.Types.ObjectId.isValid(userId)) {
			query.user = new mongoose.Types.ObjectId(userId);
		}

		// Search by coupon ID
		if (search) {
			query.$or = [
				{ externalCouponId: { $regex: search, $options: "i" } },
				{ externalBetId: { $regex: search, $options: "i" } },
			];
		}

		const skip = (parseInt(page) - 1) * parseInt(limit);
		const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

		const [bets, total] = await Promise.all([
			SportsBet.find(query)
				.populate("user", "username local.email avatar numericId")
				.sort(sortOptions)
				.skip(skip)
				.limit(parseInt(limit))
				.lean(),
			SportsBet.countDocuments(query),
		]);

		// Get events for each bet
		const betIds = bets.map((b) => b._id);
		const allEvents = await SportsBetEvent.find({ bet: { $in: betIds } })
			.sort({ createdAt: 1 })
			.lean();

		// Group events by bet
		const eventsByBet = {};
		allEvents.forEach((ev) => {
			const betId = ev.bet.toString();
			if (!eventsByBet[betId]) eventsByBet[betId] = [];
			eventsByBet[betId].push(ev);
		});

		// Attach events to bets
		const betsWithEvents = bets.map((bet) => ({
			...bet,
			details: eventsByBet[bet._id.toString()] || [],
		}));

		res.json({
			success: true,
			data: betsWithEvents,
			total,
			page: parseInt(page),
			limit: parseInt(limit),
			totalPages: Math.ceil(total / parseInt(limit)),
		});
	} catch (error) {
		console.error("Sports bets fetch error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// Get single sports bet detail
router.get("/sports-bets/:betId", checkPermission("sports.read"), async (req, res) => {
	try {
		const { betId } = req.params;

		const bet = await SportsBet.findById(betId)
			.populate(
				"user",
				"username local.email avatar numericId wallets currency",
			)
			.lean();

		if (!bet) {
			return res.status(404).json({
				success: false,
				message: "Bahis bulunamadı",
			});
		}

		const events = await SportsBetEvent.find({ bet: bet._id })
			.sort({ createdAt: 1 })
			.lean();

		res.json({
			success: true,
			data: {
				...bet,
				details: events,
			},
		});
	} catch (error) {
		console.error("Sports bet detail error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// Get sports bets for a specific user (used by the user detail "Sports Bet History" tab)
router.get(
	"/users/:id/sports-bets",
	checkPermission(["sports.read", "users.read"]),
	async (req, res) => {
		try {
			const { id } = req.params;

			if (!mongoose.Types.ObjectId.isValid(id)) {
				return res
					.status(400)
					.json({ success: false, message: "Geçersiz kullan��cı ID" });
			}

			const {
				page = 1,
				limit = 20,
				status,
				search,
				sortBy = "createdAt",
				sortOrder = "desc",
			} = req.query;

			const query = { user: new mongoose.Types.ObjectId(id) };

			if (
				status &&
				["pending", "won", "lost", "cancelled", "cashout"].includes(status)
			) {
				query.status = status;
			}

			if (search) {
				query.$or = [
					{ externalCouponId: { $regex: search, $options: "i" } },
					{ externalBetId: { $regex: search, $options: "i" } },
				];
			}

			const pageNum = Math.max(1, parseInt(page) || 1);
			const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
			const skip = (pageNum - 1) * limitNum;
			const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

			const [bets, total, summaryAgg] = await Promise.all([
				SportsBet.find(query)
					.sort(sortOptions)
					.skip(skip)
					.limit(limitNum)
					.lean(),
				SportsBet.countDocuments(query),
				SportsBet.aggregate([
					{ $match: { user: new mongoose.Types.ObjectId(id) } },
					{
						$group: {
							_id: null,
							totalRecords: { $sum: 1 },
							totalStake: { $sum: { $ifNull: ["$amount", 0] } },
							totalWin: { $sum: { $ifNull: ["$actualWin", 0] } },
							totalWon: {
								$sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] },
							},
							totalLost: {
								$sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
							},
							totalPending: {
								$sum: {
									$cond: [{ $eq: ["$status", "pending"] }, 1, 0],
								},
							},
						},
					},
				]),
			]);

			const betIds = bets.map((b) => b._id);
			const allEvents = await SportsBetEvent.find({ bet: { $in: betIds } })
				.sort({ createdAt: 1 })
				.lean();

			const eventsByBet = {};
			allEvents.forEach((ev) => {
				const betId = ev.bet.toString();
				if (!eventsByBet[betId]) eventsByBet[betId] = [];
				eventsByBet[betId].push(ev);
			});

			const betsWithEvents = bets.map((bet) => ({
				...bet,
				details: eventsByBet[bet._id.toString()] || [],
			}));

			const summaryRaw = summaryAgg?.[0] || {};
			const totalStake = Number(summaryRaw.totalStake || 0);
			const totalWin = Number(summaryRaw.totalWin || 0);

			res.json({
				success: true,
				data: betsWithEvents,
				total,
				page: pageNum,
				limit: limitNum,
				totalPages: Math.ceil(total / limitNum),
				summary: {
					totalRecords: Number(summaryRaw.totalRecords || 0),
					totalStake,
					totalWin,
					netProfit: totalWin - totalStake,
					totalWon: Number(summaryRaw.totalWon || 0),
					totalLost: Number(summaryRaw.totalLost || 0),
					totalPending: Number(summaryRaw.totalPending || 0),
				},
			});
		} catch (error) {
			console.error("User sports bets fetch error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// Get sports bets statistics for admin
router.get("/sports-bets-stats", checkPermission("sports.read"), async (req, res) => {
	try {
		const [stats] = await SportsBet.aggregate([
			{
				$group: {
					_id: null,
					totalBets: { $sum: 1 },
					totalAmount: { $sum: "$amount" },
					totalWon: {
						$sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] },
					},
					totalLost: {
						$sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
					},
					totalPending: {
						$sum: {
							$cond: [{ $eq: ["$status", "pending"] }, 1, 0],
						},
					},
					totalWinAmount: { $sum: "$actualWin" },
					totalRakeback: { $sum: "$rakeback" },
					totalAffiliate: { $sum: "$affiliateCommission" },
				},
			},
		]);

		// Get today's stats
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [todayStats] = await SportsBet.aggregate([
			{ $match: { createdAt: { $gte: today } } },
			{
				$group: {
					_id: null,
					todayBets: { $sum: 1 },
					todayAmount: { $sum: "$amount" },
					todayWinAmount: { $sum: "$actualWin" },
				},
			},
		]);

		res.json({
			success: true,
			data: {
				...stats,
				...todayStats,
			},
		});
	} catch (error) {
		console.error("Sports bets stats error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// =====================================================
// 🔐 ROLE & PERMISSION MANAGEMENT
// =====================================================

// Permission middleware is imported at the top of this file.

// 📋 Get all permissions
router.get("/permissions", checkPermission("roles.read"), async (req, res) => {
	try {
		const { resource, group } = req.query;
		const query = { isActive: true };

		if (resource) query.resource = resource;
		if (group) query.group = group;

		const permissions = await Permission.find(query).sort({
			resource: 1,
			action: 1,
		});

		// Group by display group first, then fallback to top-level resource
		const grouped = permissions.reduce((acc, perm) => {
			const key =
				perm.group ||
				(perm.resource ? perm.resource.split(".")[0] : "other");
			if (!acc[key]) acc[key] = [];
			acc[key].push(perm);
			return acc;
		}, {});

		res.json({
			success: true,
			data: permissions,
			grouped,
			total: permissions.length,
		});
	} catch (error) {
		console.error("Get permissions error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📋 Get all roles
router.get("/roles", checkPermission("roles.read"), async (req, res) => {
	try {
		const { includeInactive } = req.query;
		const query = includeInactive ? {} : { isActive: true };

		const roles = await AdminRole.find(query)
			.populate("permissions", "code name resource action")
			.populate("createdBy", "username")
			.sort({ isSuperAdmin: -1, isSystem: -1, name: 1 });

		// Her rol için kullanıcı sayısını hesapla
		const rolesWithCount = await Promise.all(
			roles.map(async (role) => {
				const userCount = await User.countDocuments({
					adminRole: role._id,
				});
				return {
					...role.toObject(),
					userCount,
				};
			}),
		);

		res.json({
			success: true,
			data: rolesWithCount,
			total: roles.length,
		});
	} catch (error) {
		console.error("Get roles error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 📋 Get single role
router.get("/roles/:id", checkPermission("roles.read"), async (req, res) => {
	try {
		const role = await AdminRole.findById(req.params.id)
			.populate("permissions", "code name resource action group")
			.populate("createdBy", "username");

		if (!role) {
			return res.status(404).json({
				success: false,
				message: "Rol bulunamadı",
			});
		}

		const userCount = await User.countDocuments({ adminRole: role._id });

		res.json({
			success: true,
			data: {
				...role.toObject(),
				userCount,
			},
		});
	} catch (error) {
		console.error("Get role error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ➕ Create new role
router.post("/roles", checkPermission("roles.create"), async (req, res) => {
	try {
		const { name, displayName, description, permissions, color, icon } =
			req.body;

		// Validate required fields
		if (!name || !displayName) {
			return res.status(400).json({
				success: false,
				message: "Rol adı ve görüntüleme adı gerekli",
			});
		}

		// Check if role exists
		const existingRole = await AdminRole.findOne({ name });
		if (existingRole) {
			return res.status(400).json({
				success: false,
				message: "Bu isimde bir rol zaten var",
			});
		}

		// Validate permissions
		let permissionIds = [];
		if (permissions && permissions.length > 0) {
			const validPermissions = await Permission.find({
				_id: { $in: permissions },
			});
			permissionIds = validPermissions.map((p) => p._id);
		}

		const role = new AdminRole({
			name: name.toLowerCase().replace(/\s+/g, "_"),
			displayName,
			description,
			permissions: permissionIds,
			color: color || "primary",
			icon: icon || "tabler-user-shield",
			isSuperAdmin: false,
			isSystem: false,
		});

		await role.save();

		// Populate and return
		const savedRole = await AdminRole.findById(role._id).populate(
			"permissions",
			"code name resource action",
		);

		res.status(201).json({
			success: true,
			message: "Rol başarıyla oluşturuldu",
			data: savedRole,
		});
	} catch (error) {
		console.error("Create role error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ✏️ Update role
router.put("/roles/:id", checkPermission("roles.update"), async (req, res) => {
	try {
		const { displayName, description, permissions, color, icon, isActive } =
			req.body;

		const role = await AdminRole.findById(req.params.id);

		if (!role) {
			return res.status(404).json({
				success: false,
				message: "Rol bulunamadı",
			});
		}

		// System role kontrolü
		if (role.isSystem && role.isSuperAdmin) {
			return res.status(403).json({
				success: false,
				message: "Süper admin rolü değiştirilemez",
			});
		}

		// Update fields
		if (displayName) role.displayName = displayName;
		if (description !== undefined) role.description = description;
		if (color) role.color = color;
		if (icon) role.icon = icon;
		if (typeof isActive === "boolean") role.isActive = isActive;

		// Update permissions
		if (permissions !== undefined) {
			const validPermissions = await Permission.find({
				_id: { $in: permissions },
			});
			role.permissions = validPermissions.map((p) => p._id);
		}

		await role.save();

		const updatedRole = await AdminRole.findById(role._id).populate(
			"permissions",
			"code name resource action",
		);

		res.json({
			success: true,
			message: "Rol başarıyla güncellendi",
			data: updatedRole,
		});
	} catch (error) {
		console.error("Update role error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 🗑️ Delete role
router.delete(
	"/roles/:id",
	checkPermission("roles.delete"),
	async (req, res) => {
		try {
			const role = await AdminRole.findById(req.params.id);

			if (!role) {
				return res.status(404).json({
					success: false,
					message: "Rol bulunamadı",
				});
			}

			// System role kontrolü
			if (role.isSystem) {
				return res.status(403).json({
					success: false,
					message: "Sistem rolleri silinemez",
				});
			}

			// Bu role sahip kullanıcı var mı kontrol et
			const usersWithRole = await User.countDocuments({
				adminRole: role._id,
			});
			if (usersWithRole > 0) {
				return res.status(400).json({
					success: false,
					message: `Bu role ${usersWithRole} kullanıcı atanmış. Önce kullanıcıların rollerini değiştirin.`,
				});
			}

			await AdminRole.findByIdAndDelete(req.params.id);

			res.json({
				success: true,
				message: "Rol başarıyla silindi",
			});
		} catch (error) {
			console.error("Delete role error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// 👤 Assign role to user
router.post(
	"/users/:id/assign-role",
	checkPermission("roles.update"),
	async (req, res) => {
		try {
			const { roleId } = req.body;
			const userId = req.params.id;

			const user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "Kullanıcı bulunamadı",
				});
			}

			// Admin değilse reddet
			if (user.rank !== "admin") {
				return res.status(400).json({
					success: false,
					message: "Rol sadece admin kullanıcılara atanabilir",
				});
			}

			const currentRole = user.adminRole
				? await AdminRole.findById(user.adminRole).select("name displayName")
				: null;

			// roleId null ise rolü kaldır
			if (!roleId) {
				user.adminRole = null;
				await user.save();
				await createAdminUserAuditLog({
					targetUser: user,
					actorUser: req.adminUser || null,
					action: "role_update",
					summary: "Admin rolü kaldırıldı",
					changes: [
						{
							field: "adminRole",
							from:
								currentRole?.displayName ||
								currentRole?.name ||
								null,
							to: null,
						},
					],
					source: "admin-user-role",
					metadata: {
						initiatedFrom: "admin-user-role",
					},
				});

				return res.json({
					success: true,
					message: "Kullanıcının rolü kaldırıldı",
					data: user,
				});
			}

			// Role var mı kontrol et
			const role = await AdminRole.findById(roleId);
			if (!role) {
				return res.status(404).json({
					success: false,
					message: "Rol bulunamadı",
				});
			}

			user.adminRole = roleId;
			await user.save();
			await createAdminUserAuditLog({
				targetUser: user,
				actorUser: req.adminUser || null,
				action: "role_update",
				summary: "Admin rolü güncellendi",
				changes: [
					{
						field: "adminRole",
						from:
							currentRole?.displayName ||
							currentRole?.name ||
							null,
						to: role.displayName || role.name,
					},
				],
				source: "admin-user-role",
				metadata: {
					initiatedFrom: "admin-user-role",
					roleId: role._id,
				},
			});

			// Populate ve döndür
			const updatedUser = await User.findById(userId)
				.select("_id username local.email rank adminRole")
				.populate({
					path: "adminRole",
					populate: {
						path: "permissions",
						select: "code name resource action",
					},
				});

			res.json({
				success: true,
				message: "Rol başarıyla atandı",
				data: updatedUser,
			});
		} catch (error) {
			console.error("Assign role error:", error);
			res.status(500).json({ success: false, message: "Sunucu hatası" });
		}
	},
);

// 👥 Get users with roles (admin users)
router.get("/admin-users", checkPermission("roles.read"), async (req, res) => {
	try {
		const { page = 1, limit = 20, search, roleId } = req.query;

		const query = { rank: "admin" };

		if (search) {
			query.$or = [
				{ "local.email": { $regex: search, $options: "i" } },
				{ username: { $regex: search, $options: "i" } },
			];
		}

		if (roleId) {
			query.adminRole = roleId;
		}

		const users = await User.find(query)
			.select("_id username local.email rank adminRole avatar createdAt")
			.populate({
				path: "adminRole",
				select: "name displayName color icon isSuperAdmin",
			})
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(Number(limit));

		const total = await User.countDocuments(query);

		res.json({
			success: true,
			data: users,
			total,
			totalPages: Math.ceil(total / limit),
			page: Number(page),
		});
	} catch (error) {
		console.error("Get admin users error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// 🔐 Get current admin's permissions (for frontend)
router.get("/my-permissions", authenticateAdmin, async (req, res) => {
	try {
		const user = req.adminUser;

		// Süper admin ise tüm permission'ları döndür
		if (req.isSuperAdmin) {
			const allPermissions = await Permission.find({ isActive: true });
			return res.json({
				success: true,
				data: {
					isSuperAdmin: true,
					role: user.adminRole,
					permissions: allPermissions.map((p) => p.code),
					permissionDetails: allPermissions,
				},
			});
		}

		res.json({
			success: true,
			data: {
				isSuperAdmin: false,
				role: user.adminRole,
				permissions: req.userPermissions,
				permissionDetails: user.adminRole?.permissions || [],
			},
		});
	} catch (error) {
		console.error("Get my permissions error:", error);
		res.status(500).json({ success: false, message: "Sunucu hatası" });
	}
});

// ═══��══���══════════════════════════════════���═════════════════════════════════
// 🎨 SITE SETTINGS ENDPOINTS
// ═════════════════════════════════════════════════════════════��═════════════

// Get site settings
const sanitizeAdminSiteSettings = (settings) => {
	const sanitized =
		typeof settings?.toObject === "function"
			? settings.toObject()
			: { ...(settings || {}) };

	for (const providerKey of ["fluxKripto", "xPayments"]) {
		const provider = sanitized[providerKey];
		if (!provider || typeof provider !== "object") continue;

		provider.apiKeyConfigured = Boolean(String(provider.apiKey || "").trim());
		provider.secretKeyConfigured = Boolean(
			String(provider.secretKey || "").trim(),
		);
		delete provider.apiKey;
		delete provider.secretKey;
	}

	return sanitized;
};

router.get(
	"/site-settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let settings = await SiteSettings.findOne();
			if (!settings) {
				settings = new SiteSettings();
				await settings.save();
			}
			res.status(200).json(sanitizeAdminSiteSettings(settings));
		} catch (error) {
			console.error("Site ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Site ayarları getirilirken bir hata oluştu.",
			});
		}
	},
);

// Update site settings
router.put(
	"/site-settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const updates = { ...(req.body || {}) };
			// Provider credentials are managed only by their dedicated, redacted APIs.
			delete updates.fluxKripto;
			delete updates.xPayments;
			let settings = await SiteSettings.findOne();
			if (!settings) {
				settings = new SiteSettings(updates);
			} else {
				Object.assign(settings, updates);
			}
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Site ayarları başarıyla güncellendi.",
				settings: sanitizeAdminSiteSettings(settings),
			});
		} catch (error) {
			console.error("Site ayarları güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Site ayarları güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Upload logo
router.post(
	"/site-settings/logo",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logo"),
	async (req, res) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}
			const logoPath = `/uploads/${req.file.filename}`;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.logo = logoPath;
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Logo başarıyla yüklendi.",
				logo: logoPath,
			});
		} catch (error) {
			console.error("Logo yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Logo yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Upload logo mini
router.post(
	"/site-settings/logo-mini",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logoMini"),
	async (req, res) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}
			const logoMiniPath = `/uploads/${req.file.filename}`;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.logoMini = logoMiniPath;
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Logo Mini başarıyla yüklendi.",
				logoMini: logoMiniPath,
			});
		} catch (error) {
			console.error("Logo Mini yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Logo Mini yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Upload favicon - sabit dosya adı ile kaydeder
const faviconUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			const uploadDir = "uploads";
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => {
			// Sabit dosya adı - favicon.png
			cb(null, "favicon.png");
		},
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
	"/site-settings/favicon",
	checkPermission("platform.update"),
	faviconUpload.single("favicon"),
	async (req, res) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}
			const faviconPath = `/uploads/favicon.png`;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.favicon = faviconPath;
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Favicon başarıyla yüklendi.",
				favicon: faviconPath,
			});
		} catch (error) {
			console.error("Favicon yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Favicon yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Add partner
router.post(
	"/site-settings/partners",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logo"),
	async (req, res) => {
		try {
			const { name, url, order } = req.body;
			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: "Logo dosyası yüklenmedi.",
				});
			}
			const logoPath = `/uploads/${req.file.filename}`;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.partners.push({
				name,
				logo: logoPath,
				url: url || "",
				order: order || settings.partners.length,
			});
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Partner başarıyla eklendi.",
				partners: settings.partners,
			});
		} catch (error) {
			console.error("Partner eklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Partner eklenirken bir hata oluştu.",
			});
		}
	},
);

// Delete partner
router.delete(
	"/site-settings/partners/:id",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });
			settings.partners = settings.partners.filter(
				(partner) => partner._id.toString() !== id,
			);
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Partner başarıyla silindi.",
				partners: settings.partners,
			});
		} catch (error) {
			console.error("Partner silinirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Partner silinirken bir hata oluştu.",
			});
		}
	},
);

// Edit partner
router.put(
	"/site-settings/partners/:id",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logo"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { name, url, order } = req.body;
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });

			const partnerIndex = settings.partners.findIndex(
				(p) => p._id.toString() === id,
			);
			if (partnerIndex === -1)
				return res
					.status(404)
					.json({ success: false, error: "Partner bulunamadı." });

			if (name) settings.partners[partnerIndex].name = name;
			if (url !== undefined) settings.partners[partnerIndex].url = url;
			if (order !== undefined)
				settings.partners[partnerIndex].order = parseInt(order);
			if (req.file) {
				settings.partners[partnerIndex].logo =
					`/uploads/${req.file.filename}`;
			}

			await settings.save();
			res.status(200).json({
				success: true,
				message: "Partner başarıyla güncellendi.",
				partners: settings.partners,
			});
		} catch (error) {
			console.error("Partner güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Partner güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Reorder partners
router.put(
	"/site-settings/partners-reorder",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { partnerId, direction } = req.body; // direction: 'up' or 'down'
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });

			const index = settings.partners.findIndex(
				(p) => p._id.toString() === partnerId,
			);
			if (index === -1)
				return res
					.status(404)
					.json({ success: false, error: "Partner bulunamadı." });

			if (direction === "up" && index > 0) {
				[settings.partners[index], settings.partners[index - 1]] = [
					settings.partners[index - 1],
					settings.partners[index],
				];
			} else if (
				direction === "down" &&
				index < settings.partners.length - 1
			) {
				[settings.partners[index], settings.partners[index + 1]] = [
					settings.partners[index + 1],
					settings.partners[index],
				];
			}

			await settings.save();
			res.status(200).json({
				success: true,
				message: "Partner sırası güncellendi.",
				partners: settings.partners,
			});
		} catch (error) {
			console.error("Partner sırası güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Partner sırası güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Add license
router.post(
	"/site-settings/licenses",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logo"),
	async (req, res) => {
		try {
			const { name, url } = req.body;
			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: "Logo dosyası yüklenmedi.",
				});
			}
			const logoPath = `/uploads/${req.file.filename}`;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.licenses.push({ name, logo: logoPath, url: url || "" });
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Lisans başarıyla eklendi.",
				licenses: settings.licenses,
			});
		} catch (error) {
			console.error("Lisans eklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Lisans eklenirken bir hata oluştu.",
			});
		}
	},
);

// Delete license
router.delete(
	"/site-settings/licenses/:id",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { id } = req.params;
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });
			settings.licenses = settings.licenses.filter(
				(license) => license._id.toString() !== id,
			);
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Lisans başarıyla silindi.",
				licenses: settings.licenses,
			});
		} catch (error) {
			console.error("Lisans silinirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Lisans silinirken bir hata oluştu.",
			});
		}
	},
);

// Edit license
router.put(
	"/site-settings/licenses/:id",
	checkPermission("platform.update"),
	siteSettingsUpload.single("logo"),
	async (req, res) => {
		try {
			const { id } = req.params;
			const { name, url } = req.body;
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });

			const licenseIndex = settings.licenses.findIndex(
				(l) => l._id.toString() === id,
			);
			if (licenseIndex === -1)
				return res
					.status(404)
					.json({ success: false, error: "Lisans bulunamadı." });

			if (name) settings.licenses[licenseIndex].name = name;
			if (url !== undefined) settings.licenses[licenseIndex].url = url;
			if (req.file) {
				settings.licenses[licenseIndex].logo =
					`/uploads/${req.file.filename}`;
			}

			await settings.save();
			res.status(200).json({
				success: true,
				message: "Lisans başarıyla güncellendi.",
				licenses: settings.licenses,
			});
		} catch (error) {
			console.error("Lisans güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Lisans güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Reorder licenses
router.put(
	"/site-settings/licenses-reorder",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { licenseId, direction } = req.body; // direction: 'up' or 'down'
			let settings = await SiteSettings.findOne();
			if (!settings)
				return res
					.status(404)
					.json({ success: false, error: "Ayarlar bulunamadı." });

			const index = settings.licenses.findIndex(
				(l) => l._id.toString() === licenseId,
			);
			if (index === -1)
				return res
					.status(404)
					.json({ success: false, error: "Lisans bulunamadı." });

			if (direction === "up" && index > 0) {
				[settings.licenses[index], settings.licenses[index - 1]] = [
					settings.licenses[index - 1],
					settings.licenses[index],
				];
			} else if (
				direction === "down" &&
				index < settings.licenses.length - 1
			) {
				[settings.licenses[index], settings.licenses[index + 1]] = [
					settings.licenses[index + 1],
					settings.licenses[index],
				];
			}

			await settings.save();
			res.status(200).json({
				success: true,
				message: "Lisans sırası güncellendi.",
				licenses: settings.licenses,
			});
		} catch (error) {
			console.error("Lisans sırası güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Lisans sırası güncellenirken bir hata oluştu.",
			});
		}
	},
);

// ═══════════���═══════════════════════════════════════════════════════════════
// 🖼️ AVATAR MANAGEMENT ENDPOINTS
// ═════════════════════════════���═════════════════════════════════════════��═══

// Avatar upload directory
const avatarUploadDir = path.join(__dirname, "..", "..", "uploads", "avatars");
if (!fs.existsSync(avatarUploadDir)) {
	fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// Multer config for avatar uploads
const avatarStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, avatarUploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueName + path.extname(file.originalname));
	},
});

const avatarUpload = multer({
	storage: avatarStorage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (req, file, cb) => {
		// Check MIME type
		const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Sadece JPEG, PNG ve GIF formatları kabul edilmektedir.",
				),
				false,
			);
		}
	},
});

// Get all avatars
router.get(
	"/site-settings/avatars",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			const files = fs
				.readdirSync(avatarUploadDir)
				.filter((file) => /\.(jpe?g|png|gif)$/i.test(file));

			const avatars = files.map((file) => ({
				filename: file,
				path: `/uploads/avatars/${file}`,
			}));

			const settings = await SiteSettings.findOne().lean();
			const fallbackAvatar =
				settings?.avatars?.fallbackAvatar ||
				"/uploads/avatars/default.png";

			res.status(200).json({
				success: true,
				data: {
					avatars,
					fallbackAvatar,
					total: avatars.length,
				},
			});
		} catch (error) {
			console.error("Avatar listesi alınırken hata:", error);
			res.status(500).json({
				success: false,
				error: "Avatar listesi alınırken bir hata oluştu.",
			});
		}
	},
);

// Upload new avatar(s)
router.post(
	"/site-settings/avatars",
	checkPermission("platform.update"),
	(req, res, next) => {
		console.log("Avatar upload request received");
		console.log("Content-Type:", req.headers["content-type"]);
		avatarUpload.array("avatars", 100)(req, res, (err) => {
			if (err) {
				console.error("Avatar upload error:", err);
				console.error("Error code:", err.code);
				console.error("Error field:", err.field);
				return res.status(400).json({
					success: false,
					error: err.message || "Dosya yüklenirken bir hata oluştu.",
				});
			}
			console.log("Files received:", req.files?.length || 0);
			next();
		});
	},
	async (req, res) => {
		try {
			if (!req.files || req.files.length === 0) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}

			const uploadedAvatars = req.files.map((file) => ({
				filename: file.filename,
				path: `/uploads/avatars/${file.filename}`,
			}));

			// Update SiteSettings avatarList
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();

			if (!settings.avatars) {
				settings.avatars = {
					fallbackAvatar: "/uploads/avatars/default.png",
					avatarList: [],
				};
			}

			uploadedAvatars.forEach((avatar) => {
				settings.avatars.avatarList.push({
					filename: avatar.filename,
					path: avatar.path,
					uploadedAt: new Date(),
				});
			});

			await settings.save();

			res.status(200).json({
				success: true,
				message: `${uploadedAvatars.length} avatar başarıyla yüklendi.`,
				avatars: uploadedAvatars,
			});
		} catch (error) {
			console.error("Avatar yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Avatar yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Delete avatar
router.delete(
	"/site-settings/avatars/:filename",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { filename } = req.params;
			const sanitizedFilename = path.basename(filename);
			const avatarPath = path.join(avatarUploadDir, sanitizedFilename);

			// Check if file exists
			if (!fs.existsSync(avatarPath)) {
				return res
					.status(404)
					.json({ success: false, error: "Avatar bulunamadı." });
			}

			// Delete the file
			fs.unlinkSync(avatarPath);

			// Remove from SiteSettings avatarList
			let settings = await SiteSettings.findOne();
			if (settings && settings.avatars && settings.avatars.avatarList) {
				settings.avatars.avatarList =
					settings.avatars.avatarList.filter(
						(a) => a.filename !== sanitizedFilename,
					);
				await settings.save();
			}

			res.status(200).json({
				success: true,
				message: "Avatar başarıyla silindi.",
			});
		} catch (error) {
			console.error("Avatar silinirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Avatar silinirken bir hata oluştu.",
			});
		}
	},
);

// Set fallback avatar
router.post(
	"/site-settings/avatars/fallback",
	checkPermission("platform.update"),
	(req, res, next) => {
		avatarUpload.single("fallback")(req, res, (err) => {
			if (err) {
				console.error("Fallback avatar upload error:", err);
				return res.status(400).json({
					success: false,
					error: err.message || "Dosya yüklenirken bir hata oluştu.",
				});
			}
			next();
		});
	},
	async (req, res) => {
		try {
			let fallbackPath;

			if (req.file) {
				// Uploaded a new fallback avatar
				fallbackPath = `/uploads/avatars/${req.file.filename}`;
			} else if (req.body.path) {
				// Using an existing avatar as fallback
				fallbackPath = req.body.path;
			} else {
				return res.status(400).json({
					success: false,
					error: "Fallback avatar dosyası veya path gerekli.",
				});
			}

			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();

			if (!settings.avatars) {
				settings.avatars = {
					fallbackAvatar: fallbackPath,
					avatarList: [],
				};
			} else {
				settings.avatars.fallbackAvatar = fallbackPath;
			}

			await settings.save();

			// Clear avatar cache so new fallback is used
			const { clearFallbackAvatarCache } = require("../../utils/avatar");
			clearFallbackAvatarCache();

			res.status(200).json({
				success: true,
				message: "Fallback avatar başarıyla güncellendi.",
				fallbackAvatar: fallbackPath,
			});
		} catch (error) {
			console.error("Fallback avatar güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Fallback avatar güncellenirken bir hata oluştu.",
			});
		}
	},
);

// ════════════════════════════════════���══════════════════════════════════════
// 🎮 ORIGINAL GAMES BANNER ENDPOINTS
// ════════════════════════════════���══════════════════════════════════════════

// Original game banner upload - sabit path'e yükler
const originalGamesUpload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			const uploadDir = "uploads/games";
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => {
			// Oyun adına göre sabit dosya adı
			const gameSlug = req.params.game;
			cb(null, `${gameSlug}.png`);
		},
	}),
	fileFilter: (req, file, cb) => {
		// Sadece PNG kabul et
		if (file.mimetype === "image/png") {
			cb(null, true);
		} else {
			cb(new Error("Sadece PNG formatı kabul edilmektedir."), false);
		}
	},
});

// Upload original game banner
router.post(
	"/site-settings/original-games/:game",
	checkPermission("platform.update"),
	originalGamesUpload.single("banner"),
	async (req, res) => {
		try {
			const { game } = req.params;
			const validGames = [
				"turbo",
				"crash",
				"wingo",
				"unbox",
				"mines",
				"towers",
				"roll",
			];

			if (!validGames.includes(game)) {
				return res
					.status(400)
					.json({ success: false, error: "Geçersiz oyun adı." });
			}

			if (!req.file) {
				return res.status(400).json({
					success: false,
					error: "Banner dosyası yüklenmedi. Sadece PNG formatı kabul edilmektedir.",
				});
			}

			const bannerPath = `/uploads/games/${game}.png`;

			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();

			if (!settings.originalGames) {
				settings.originalGames = {};
			}
			settings.originalGames[game] = bannerPath;
			await settings.save();

			res.status(200).json({
				success: true,
				message: `${game} banner'ı başarıyla yüklendi.`,
				path: bannerPath,
				originalGames: settings.originalGames,
			});
		} catch (error) {
			console.error("Original game banner yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Banner yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Get original games settings
router.get(
	"/site-settings/original-games",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let settings = await SiteSettings.findOne();
			const defaultGames = {
				turbo: "/uploads/games/turbo.png",
				crash: "/uploads/games/crash.png",
				wingo: "/uploads/games/wingo.png",
				unbox: "/uploads/games/unbox.png",
				mines: "/uploads/games/mines.png",
				towers: "/uploads/games/towers.png",
				roll: "/uploads/games/roll.png",
			};

			res.status(200).json({
				success: true,
				originalGames: settings?.originalGames || defaultGames,
			});
		} catch (error) {
			console.error("Original games alınırken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar alınırken bir hata oluştu.",
			});
		}
	},
);

// ═══════════════════════════════════════════════���═══════════════════════════
// 🎨 CUSTOM CSS/JS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Update custom CSS
router.put(
	"/site-settings/custom-css",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { customCSS } = req.body;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.customCSS = customCSS || "";
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Custom CSS başarıyla güncellendi.",
			});
		} catch (error) {
			console.error("Custom CSS güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Custom CSS güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Update custom JS
router.put(
	"/site-settings/custom-js",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { customJS } = req.body;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.customJS = customJS || "";
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Custom JavaScript başarıyla güncellendi.",
			});
		} catch (error) {
			console.error("Custom JS güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Custom JavaScript güncellenirken bir hata oluştu.",
			});
		}
	},
);

// Update custom HTML
router.put(
	"/site-settings/custom-html",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { customHTML } = req.body;
			let settings = await SiteSettings.findOne();
			if (!settings) settings = new SiteSettings();
			settings.customHTML = customHTML || "";
			await settings.save();
			res.status(200).json({
				success: true,
				message: "Custom HTML başarıyla güncellendi.",
			});
		} catch (error) {
			console.error("Custom HTML güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Custom HTML güncellenirken bir hata oluştu.",
			});
		}
	},
);

// ═══════════════════════════════════════════════════════════════════════════
// 📁 FILE MANAGER ENDPOINTS
// ════════════════════════════════════════════════════════════════════��══════

// List all files
router.get("/files", checkPermission("platform.read"), async (req, res) => {
	try {
		const uploadDir = "uploads";
		if (!fs.existsSync(uploadDir)) {
			return res.status(200).json([]);
		}
		const files = fs.readdirSync(uploadDir);
		const backendUrl = process.env.SERVER_BACKEND_URL || "";
		const fileList = files.map((filename) => {
			const filePath = path.join(uploadDir, filename);
			const stats = fs.statSync(filePath);
			return {
				filename,
				url: `${backendUrl}/uploads/${filename}`,
				size: stats.size,
				createdAt: stats.birthtime,
				modifiedAt: stats.mtime,
			};
		});
		fileList.sort((a, b) => b.createdAt - a.createdAt);
		res.status(200).json(fileList);
	} catch (error) {
		console.error("Dosyalar listelenirken hata:", error);
		res.status(500).json({
			success: false,
			error: "Dosyalar listelenirken bir hata oluştu.",
		});
	}
});

// Upload file
router.post(
	"/files/upload",
	checkPermission("platform.update"),
	siteSettingsUpload.single("file"),
	async (req, res) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}
			const backendUrl = process.env.SERVER_BACKEND_URL || "";
			const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;
			res.status(200).json({
				success: true,
				message: "Dosya başarıyla yüklendi.",
				filename: req.file.filename,
				originalName: req.file.originalname,
				url: fileUrl,
				size: req.file.size,
			});
		} catch (error) {
			console.error("Dosya yüklenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Dosya yüklenirken bir hata oluştu.",
			});
		}
	},
);

// Upload file from URL
router.post(
	"/files/upload-url",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { url } = req.body;
			if (!url || typeof url !== "string") {
				return res
					.status(400)
					.json({ success: false, error: "Geçerli bir URL girilmelidir." });
			}

			let parsedUrl;
			try {
				parsedUrl = new URL(url);
			} catch {
				return res
					.status(400)
					.json({ success: false, error: "Geçerli bir URL girilmelidir." });
			}

			if (!["http:", "https:"].includes(parsedUrl.protocol)) {
				return res
					.status(400)
					.json({ success: false, error: "Sadece http/https URL'leri kabul edilir." });
			}

			const response = await axios.get(parsedUrl.toString(), {
				responseType: "arraybuffer",
				timeout: 60000,
				maxRedirects: 5,
				maxContentLength: 50 * 1024 * 1024, // 50MB
				validateStatus: (status) => status >= 200 && status < 400,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
					Accept: "*/*",
					"Accept-Language": "en-US,en;q=0.9",
				},
			});

			// Dosya uzantısını belirle
			const contentType = String(response.headers["content-type"] || "")
				.split(";")[0]
				.trim()
				.toLowerCase();

			const mimeToExt = {
				"image/jpeg": ".jpg",
				"image/png": ".png",
				"image/gif": ".gif",
				"image/webp": ".webp",
				"image/svg+xml": ".svg",
				"image/avif": ".avif",
				"video/mp4": ".mp4",
				"application/pdf": ".pdf",
				"application/zip": ".zip",
			};

			let ext = mimeToExt[contentType] || "";
			if (!ext) {
				// URL path'inden uzantıy�� al
				const urlPath = parsedUrl.pathname;
				const urlExt = path.extname(urlPath).toLowerCase();
				if (urlExt && urlExt.length <= 6) {
					ext = urlExt;
				} else {
					ext = ".bin";
				}
			}

			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			const uniqueName =
				Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
			const filePath = path.join(uploadDir, uniqueName);

			await fs.promises.writeFile(filePath, Buffer.from(response.data));

			const stats = fs.statSync(filePath);
			const backendUrl = process.env.SERVER_BACKEND_URL || "";
			const fileUrl = `${backendUrl}/uploads/${uniqueName}`;

			res.status(200).json({
				success: true,
				message: "Dosya URL'den başarıyla indirildi.",
				filename: uniqueName,
				url: fileUrl,
				size: stats.size,
				createdAt: stats.birthtime,
				modifiedAt: stats.mtime,
			});
		} catch (error) {
			console.error("URL'den dosya indirme hatası:", error.message);
			res.status(400).json({
				success: false,
				error: error.message || "URL'den dosya indirilemedi.",
			});
		}
	},
);

// Delete file
router.delete(
	"/files/:filename",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { filename } = req.params;
			const filePath = path.join("uploads", filename);
			if (!fs.existsSync(filePath)) {
				return res
					.status(404)
					.json({ success: false, error: "Dosya bulunamadı." });
			}
			fs.unlinkSync(filePath);
			res.status(200).json({
				success: true,
				message: "Dosya başarıyla silindi.",
			});
		} catch (error) {
			console.error("Dosya silinirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Dosya silinirken bir hata oluştu.",
			});
		}
	},
);

// ═══���═══════════════════════════════════════════════════════════════════════
// Kategori İkonları Yönetimi
// ══════════════════════════════════════════════════════════════════��════════

const CATEGORY_ICONS = ["lobby", "originals", "favorites", "hot"];

// Kategori ikonların�� listele
router.get(
	"/category-icons",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			const backendUrl = process.env.SERVER_BACKEND_URL || "";
			const icons = CATEGORY_ICONS.map((iconType) => {
				const filePath = path.join(
					categoryUploadDir,
					`${iconType}.png`,
				);
				const exists = fs.existsSync(filePath);
				return {
					type: iconType,
					name: iconType.charAt(0).toUpperCase() + iconType.slice(1),
					url: exists
						? `${backendUrl}/uploads/category/${iconType}.png`
						: null,
					exists: exists,
					path: `/uploads/category/${iconType}.png`,
				};
			});
			res.status(200).json({ success: true, icons });
		} catch (error) {
			console.error("Kategori ikonları listelenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Kategori ikonları listelenirken bir hata oluştu.",
			});
		}
	},
);

// Kategori ikonu yükle
router.post(
	"/category-icons/upload",
	checkPermission("platform.update"),
	(req, res, next) => {
		categoryIconUpload.single("file")(req, res, (err) => {
			if (err) {
				if (err.message === "Sadece PNG dosyaları yüklenebilir!") {
					return res
						.status(400)
						.json({ success: false, error: err.message });
				}
				console.error("Multer hatası:", err);
				return res.status(500).json({
					success: false,
					error: "Dosya yüklenirken bir hata oluştu.",
				});
			}
			next();
		});
	},
	async (req, res) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ success: false, error: "Dosya yüklenmedi." });
			}

			const iconType = req.body.iconType;
			console.log(
				"Kategori ikon yükleme - iconType:",
				iconType,
				"Geçici dosya:",
				req.file.filename,
			);

			if (!CATEGORY_ICONS.includes(iconType)) {
				// Geçici dosyayı sil
				if (fs.existsSync(req.file.path)) {
					fs.unlinkSync(req.file.path);
				}
				return res.status(400).json({
					success: false,
					error: "Geçersiz ikon tipi: " + iconType,
				});
			}

			// Hedef dosya yolu
			const targetPath = path.join(categoryUploadDir, iconType + ".png");

			// Eğer hedef dosya varsa sil
			if (fs.existsSync(targetPath)) {
				fs.unlinkSync(targetPath);
			}

			// Geçici dosyayı hedef dosyaya taşı
			fs.renameSync(req.file.path, targetPath);

			const backendUrl = process.env.SERVER_BACKEND_URL || "";
			const fileUrl = `${backendUrl}/uploads/category/${iconType}.png`;

			console.log("Kategori ikonu başarıyla yüklendi:", targetPath);

			res.status(200).json({
				success: true,
				message: "Kategori ikonu başarıyla yüklendi.",
				type: iconType,
				url: fileUrl,
				path: `/uploads/category/${iconType}.png`,
			});
		} catch (error) {
			console.error("Kategori ikonu yüklenirken hata:", error);
			// Geçici dosyayı temizle
			if (req.file && fs.existsSync(req.file.path)) {
				fs.unlinkSync(req.file.path);
			}
			res.status(500).json({
				success: false,
				error: "Kategori ikonu yüklenirken bir hata oluştu.",
			});
		}
	},
);

// ════��════════════════════════════════════��═════════════════════════════════
// Provider Ayarları (SiteSettings içinde)
// ═════════════════════════════════════════��═════════════════════════════════

const DEFAULT_PROVIDER_DISPLAY_NAMES = {
	drakon: "Drakon",
	nexus: "Nexus",
	nexusggr: "Nexus GGR",
	betinovi: "Betinovi",
	betcolabs: "Betcolabs",
};

const normalizeProviderDisplayNames = (value = {}) => {
	const names = { ...DEFAULT_PROVIDER_DISPLAY_NAMES };

	for (const [rawCode, rawName] of Object.entries(value || {})) {
		const code = String(rawCode || "").trim().toLowerCase();
		const name = String(rawName || "").trim();

		if (code && name) names[code] = name;
	}

	return names;
};

const buildProviderSettingsPayload = (providerSettings = {}) => ({
	drakonBalanceSync:
		providerSettings.drakonBalanceSync !== undefined
			? providerSettings.drakonBalanceSync
			: true,
	drakonEnabled:
		providerSettings.drakonEnabled !== undefined
			? providerSettings.drakonEnabled
			: true,
	drakonDisabledMessage:
		providerSettings.drakonDisabledMessage || "Şu anda bu oyuna erişilemiyor.",
	sportsbookProvider: providerSettings.sportsbookProvider || "betcolabs",
	providerDisplayNames: normalizeProviderDisplayNames(
		providerSettings.providerDisplayNames,
	),
});

router.get("/provider/display-names", async (req, res) => {
	try {
		const siteSettings = await SiteSettings.findOne().lean();

		res.status(200).json({
			success: true,
			data: {
				providerDisplayNames: normalizeProviderDisplayNames(
					siteSettings?.providerSettings?.providerDisplayNames,
				),
			},
		});
	} catch (error) {
		console.error("Provider görünen adları getirilirken hata:", error);
		res.status(500).json({
			success: false,
			error: "Provider görünen adları getirilirken bir hata oluştu.",
		});
	}
});

// Provider ayarlarını getir
router.get(
	"/provider/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let siteSettings = await SiteSettings.findOne().lean();
			if (!siteSettings) {
				siteSettings = await new SiteSettings().save();
				siteSettings = siteSettings.toObject();
			}

			res.status(200).json({
				success: true,
				data: buildProviderSettingsPayload(siteSettings.providerSettings),
			});
		} catch (error) {
			console.error("Provider ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar getirilirken bir hata oluştu.",
			});
		}
	},
);

// Provider ayarlarını güncelle
router.put(
	"/provider/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const {
				drakonBalanceSync,
				drakonEnabled,
				drakonDisabledMessage,
				sportsbookProvider,
				providerDisplayNames,
			} = req.body;

			const updateFields = {};
			if (drakonBalanceSync !== undefined)
				updateFields['providerSettings.drakonBalanceSync'] = drakonBalanceSync;
			if (drakonEnabled !== undefined)
				updateFields['providerSettings.drakonEnabled'] = drakonEnabled;
			if (drakonDisabledMessage !== undefined)
				updateFields['providerSettings.drakonDisabledMessage'] = drakonDisabledMessage;
			if (sportsbookProvider !== undefined)
				updateFields['providerSettings.sportsbookProvider'] = sportsbookProvider;
			if (providerDisplayNames !== undefined)
				updateFields['providerSettings.providerDisplayNames'] =
					normalizeProviderDisplayNames(providerDisplayNames);

			const updated = await SiteSettings.findOneAndUpdate(
				{},
				{ $set: updateFields },
				{ new: true, upsert: true, lean: true }
			);

			// Update sportsbook game records if provider changed
			if (sportsbookProvider !== undefined) {
				const { updateSportsbookProvider } = require("../../services/sportsbookGames");
				await updateSportsbookProvider(sportsbookProvider);
			}

			res.status(200).json({
				success: true,
				message: "Provider ayarları güncellendi.",
				data: buildProviderSettingsPayload(updated.providerSettings),
			});
		} catch (error) {
			console.error("Provider ayarları güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar güncellenirken bir hata oluştu.",
			});
		}
	},
);

// ═════════════��═════════════════════════════════════════════════════════════
// SMS OTP Ayarları (SiteSettings içinde)
// ════════════════════════════════════��═��══════════════════════════════���═════

const normalizePositiveInteger = (value, fallback = 0) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

router.get(
	"/sms-otp/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			const smsOtp = await getStoredSmsOtpConfig();

			res.status(200).json({ success: true, data: smsOtp });
		} catch (error) {
			console.error("SMS OTP ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "SMS OTP ayarları getirilirken bir hata oluştu.",
			});
		}
	}
);

router.put(
	"/sms-otp/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const {
				apiKey,
				userToken,
				baseUrl,
				otpTtlMs,
				resendCooldownMs,
				maxAttempts,
				encryptionKey,
				hashSecret,
			} = req.body;

			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
			}

			if (!siteSettings.smsOtp) {
				siteSettings.smsOtp = {};
			}

			const submittedApiKey = apiKey !== undefined ? apiKey : userToken;
			if (submittedApiKey !== undefined)
				siteSettings.smsOtp.apiKey = String(submittedApiKey || "").trim();
			if (baseUrl !== undefined)
				siteSettings.smsOtp.baseUrl = String(baseUrl || "").trim();
			if (otpTtlMs !== undefined)
				siteSettings.smsOtp.otpTtlMs = normalizePositiveInteger(otpTtlMs);
			if (resendCooldownMs !== undefined) {
				siteSettings.smsOtp.resendCooldownMs = normalizePositiveInteger(
					resendCooldownMs
				);
			}
			if (maxAttempts !== undefined) {
				siteSettings.smsOtp.maxAttempts = normalizePositiveInteger(maxAttempts);
			}
			if (encryptionKey !== undefined) {
				siteSettings.smsOtp.encryptionKey = String(
					encryptionKey || ""
				).trim();
			}
			if (hashSecret !== undefined) {
				siteSettings.smsOtp.hashSecret = String(hashSecret || "").trim();
			}

			await siteSettings.save();
			await SiteSettings.updateOne(
				{ _id: siteSettings._id },
				{
					$unset: {
						"smsOtp.brandName": 1,
						"smsOtp.origin": 1,
						"smsOtp.userToken": 1,
					},
				}
			);
			const smsOtp = await getStoredSmsOtpConfig();

			res.status(200).json({
				success: true,
				message: "SMS OTP ayarları güncellendi.",
				data: smsOtp,
			});
		} catch (error) {
			console.error("SMS OTP ayarları güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "SMS OTP ayarları güncellenirken bir hata oluştu.",
			});
		}
	}
);

// ═══════════════════════════════════════════════════════════════════════════
// E-posta Şablonları (SiteSettings içinde)
// SMTP credential bilgileri backend/.env üzerinden okunur, sadece şablonlar
// ve gönderici görünen ad/adres burada yönetilir.
// ═══════════���═══════════════════════════════════���══════��═���══════��═══════════

const buildEmailTemplatesPayload = (siteSettings) => {
	const tpl = (siteSettings && siteSettings.emailTemplates) || {};
	const defaults = new SiteSettings().emailTemplates || {};
	const fromEnv = {
		hostConfigured: Boolean(
			process.env.EMAIL_SMTP_HOST && process.env.EMAIL_SMTP_PORT
		),
		fromAddressEnv: process.env.EMAIL_FROM || "",
		fromNameEnv: process.env.EMAIL_FROM_NAME || "",
	};

	return {
		fromName: tpl.fromName || "",
		fromAddress: tpl.fromAddress || "",
		tokenExpiresInMinutes:
			Number.isFinite(tpl.tokenExpiresInMinutes) &&
			tpl.tokenExpiresInMinutes > 0
				? tpl.tokenExpiresInMinutes
				: 30,
		verifyEmail: {
			subject:
				(tpl.verifyEmail && tpl.verifyEmail.subject) ||
				(defaults.verifyEmail && defaults.verifyEmail.subject) ||
				"E-posta adresinizi doğrulayın",
			html:
				(tpl.verifyEmail && tpl.verifyEmail.html) ||
				(defaults.verifyEmail && defaults.verifyEmail.html) ||
				"",
		},
		resetPassword: {
			subject:
				(tpl.resetPassword && tpl.resetPassword.subject) ||
				(defaults.resetPassword && defaults.resetPassword.subject) ||
				"Şifre sıfırlama talebi",
			html:
				(tpl.resetPassword && tpl.resetPassword.html) ||
				(defaults.resetPassword && defaults.resetPassword.html) ||
				"",
		},
		changeEmail: {
			subject:
				(tpl.changeEmail && tpl.changeEmail.subject) ||
				(defaults.changeEmail && defaults.changeEmail.subject) ||
				"Yeni e-posta adresinizi doğrulayın",
			html:
				(tpl.changeEmail && tpl.changeEmail.html) ||
				(defaults.changeEmail && defaults.changeEmail.html) ||
				"",
		},
		emailOtp: {
			subject:
				(tpl.emailOtp && tpl.emailOtp.subject) ||
				(defaults.emailOtp && defaults.emailOtp.subject) ||
				"Giriş doğrulama kodunuz",
			html:
				(tpl.emailOtp && tpl.emailOtp.html) ||
				(defaults.emailOtp && defaults.emailOtp.html) ||
				"",
		},
		smtp: fromEnv,
	};
};

router.get(
	"/email-templates",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
				await siteSettings.save();
			}

			res.status(200).json({
				success: true,
				data: buildEmailTemplatesPayload(siteSettings),
			});
		} catch (error) {
			console.error("E-posta şablonları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "E-posta şablonları getirilirken bir hata oluştu.",
			});
		}
	}
);

router.put(
	"/email-templates",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const {
				fromName,
				fromAddress,
				tokenExpiresInMinutes,
				verifyEmail,
				resetPassword,
				changeEmail,
				emailOtp,
			} = req.body || {};

			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
			}

			if (!siteSettings.emailTemplates) {
				siteSettings.emailTemplates = {};
			}

			if (fromName !== undefined) {
				siteSettings.emailTemplates.fromName = String(
					fromName || ""
				).trim();
			}
			if (fromAddress !== undefined) {
				siteSettings.emailTemplates.fromAddress = String(
					fromAddress || ""
				).trim();
			}
			if (tokenExpiresInMinutes !== undefined) {
				const parsed = Number.parseInt(tokenExpiresInMinutes, 10);
				siteSettings.emailTemplates.tokenExpiresInMinutes =
					Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
			}

			const applyTemplate = (key, payload) => {
				if (!payload || typeof payload !== "object") return;
				if (!siteSettings.emailTemplates[key]) {
					siteSettings.emailTemplates[key] = {};
				}
				if (payload.subject !== undefined) {
					siteSettings.emailTemplates[key].subject = String(
						payload.subject || ""
					);
				}
				if (payload.html !== undefined) {
					siteSettings.emailTemplates[key].html = String(
						payload.html || ""
					);
				}
			};

			applyTemplate("verifyEmail", verifyEmail);
			applyTemplate("resetPassword", resetPassword);
			applyTemplate("changeEmail", changeEmail);
			applyTemplate("emailOtp", emailOtp);

			siteSettings.markModified("emailTemplates");
			await siteSettings.save();

			res.status(200).json({
				success: true,
				message: "E-posta şablonları güncellendi.",
				data: buildEmailTemplatesPayload(siteSettings),
			});
		} catch (error) {
			console.error("E-posta şablonları güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "E-posta şablonları güncellenirken bir hata oluştu.",
			});
		}
	}
);

router.post(
	"/email-templates/test",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { to, type } = req.body || {};
			const validTypes = [
				"verifyEmail",
				"resetPassword",
				"changeEmail",
				"emailOtp",
			];

			if (!to || typeof to !== "string") {
				return res.status(400).json({
					success: false,
					error: "Test e-posta adresi belirtmelisiniz.",
				});
			}
			if (!validTypes.includes(type)) {
				return res.status(400).json({
					success: false,
					error: "Geçersiz şablon tipi.",
				});
			}

			const { sendTemplatedEmail } = require("../../utils/email");
			const frontendBase =
				(process.env.SERVER_FRONTEND_URL || "")
					.split(",")[0]
					.trim()
					.replace(/\/+$/, "") || "";
			const dummyToken = "test-token-" + Date.now();
			const dummyUrl = `${frontendBase}/test?token=${dummyToken}`;

			await sendTemplatedEmail({
				to: String(to).trim(),
				type,
				vars: {
					username: "Test Kullanıcı",
					email: String(to).trim(),
					newEmail: String(to).trim(),
					otpCode: "123456",
					token: dummyToken,
					verifyUrl: dummyUrl,
					resetUrl: dummyUrl,
					changeEmailUrl: dummyUrl,
					siteUrl: frontendBase,
				},
			});

			res.status(200).json({ success: true });
		} catch (error) {
			console.error("Test e-posta gönderilirken hata:", error);
			res.status(500).json({
				success: false,
				error:
					error.message || "Test e-posta gönderilirken bir hata oluştu.",
			});
		}
	}
);



// ═══════════════════════════════════════════���═══════════════════════════════
// Forcelab Finance Ayarları (SiteSettings içinde)
// ════���════════════════════════════��═════════════════════════════════════════

router.get(
	"/forcelab-finance/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
				await siteSettings.save();
			}

			const forcelabFinance = {
				isActive: false,
				name: "Forcelab Finance",
				logo: "https://financeforcalabs.com/favicon.ico",
				minAmount: 100,
				maxAmount: 100000,
				currency: "TRY",
				apiKey: "",
				webhookSecret: "",
				apiUrl: "https://financeforcalabs.com/api/v1",
				...siteSettings.forcelabFinance,
			};

			forcelabFinance.callbackUrl = `${process.env.SERVER_BACKEND_URL}/payment/forcelab-finance/callback`;

			res.status(200).json({ success: true, data: forcelabFinance });
		} catch (error) {
			console.error("Forcelab Finance ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar getirilirken bir hata oluştu.",
			});
		}
	},
);

router.put(
	"/forcelab-finance/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const {
				name,
				logo,
				minAmount,
				maxAmount,
				currency,
				apiKey,
				webhookSecret,
				apiUrl,
				isActive,
			} = req.body;

			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
			}

			if (!siteSettings.forcelabFinance) {
				siteSettings.forcelabFinance = {};
			}

			if (name !== undefined) siteSettings.forcelabFinance.name = name;
			if (logo !== undefined) siteSettings.forcelabFinance.logo = logo;
			if (minAmount !== undefined)
				siteSettings.forcelabFinance.minAmount = minAmount;
			if (maxAmount !== undefined)
				siteSettings.forcelabFinance.maxAmount = maxAmount;
			if (currency !== undefined)
				siteSettings.forcelabFinance.currency = String(currency).toUpperCase();
			if (apiKey !== undefined) siteSettings.forcelabFinance.apiKey = apiKey;
			if (webhookSecret !== undefined)
				siteSettings.forcelabFinance.webhookSecret = webhookSecret;
			if (apiUrl !== undefined) siteSettings.forcelabFinance.apiUrl = apiUrl;
			if (isActive !== undefined)
				siteSettings.forcelabFinance.isActive = isActive;

			await siteSettings.save();

			res.status(200).json({
				success: true,
				message: "Forcelab Finance ayarları güncellendi.",
				data: siteSettings.forcelabFinance,
			});
		} catch (error) {
			console.error("Forcelab Finance ayarları güncellenirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar güncellenirken bir hata oluştu.",
			});
		}
	},
);

// ═══════════════════════════════════════════════════════════════════════════
// Forcelab Finance Admin Endpoints
// ═══════════════════════════════════════════════════════════════════════════

const ForcelabFinanceTransaction = require("../../database/models/ForcelabFinanceTransaction");
const {
	createAuthHeaders: createForcelabAuthHeaders,
	toSmallestUnit: forcelabToSmallestUnit,
	mapForcelabStatus,
	normalizeForcelabWithdrawMetadata,
	unwrapForcelabData,
} = require("../../utils/forcelabFinance");
// updateUserBalance and getActiveWallet already imported above

const getForcelabSettings = async () => {
	const siteSettings = await SiteSettings.findOne();
	const settings = siteSettings?.forcelabFinance || {};
	return {
		apiUrl: "https://financeforcalabs.com/api/v1",
		...settings,
	};
};

// Forcelab Finance işlemlerini listele (deposit veya withdraw)
router.get(
	"/forcelab-finance/transactions",
	checkPermission("finance.read"),
	async (req, res) => {
		try {
			const {
				type,
				status,
				q,
				page = 1,
				itemsPerPage = 20,
			} = req.query;

			const query = {};
			if (type) query.providerType = type;
			if (status) query.status = status;

			if (q) {
				const users = await User.find({
					$or: [
						{ username: { $regex: q, $options: "i" } },
						{ email: { $regex: q, $options: "i" } },
						{ phone: { $regex: q, $options: "i" } },
						{ _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : null },
					].filter(Boolean),
				}).select("_id");

				if (users.length) {
					query.user = { $in: users.map((u) => u._id) };
				} else {
					query.user = null;
				}
			}

			const skip = (Number(page) - 1) * Number(itemsPerPage);

			const [transactions, total, statsAgg] = await Promise.all([
				ForcelabFinanceTransaction.find(query)
					.populate("user", "username email phone avatar")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(Number(itemsPerPage))
					.lean(),
				ForcelabFinanceTransaction.countDocuments(query),
				ForcelabFinanceTransaction.aggregate([
					{ $match: query.providerType ? { providerType: query.providerType } : {} },
					{
						$facet: {
							totalAmount: [
								{ $match: { status: "approved" } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							last24hAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							monthlyAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							pendingCount: [
								{ $match: { status: "pending" } },
								{ $count: "count" },
							],
							processingCount: [
								{ $match: { status: "processing" } },
								{ $count: "count" },
							],
						},
					},
				]),
			]);

			const facet = statsAgg[0] || {};
			const normalizedTransactions = transactions.map((transaction) => ({
				...transaction,
				uuid:
					transaction.providerType === "withdraw" && transaction.status === "pending"
						? null
						: transaction.uuid || null,
			}));

			res.json({
				success: true,
				data: {
					transactions: normalizedTransactions,
					total,
					page: Number(page),
					stats: {
						totalAmount: facet.totalAmount?.[0]?.sum || 0,
						last24hAmount: facet.last24hAmount?.[0]?.sum || 0,
						monthlyAmount: facet.monthlyAmount?.[0]?.sum || 0,
						pendingCount: facet.pendingCount?.[0]?.count || 0,
						processingCount: facet.processingCount?.[0]?.count || 0,
					},
				},
			});
		} catch (error) {
			console.error("Forcelab Finance admin list hatası:", error);
			res.status(500).json({
				success: false,
				error: "İşlemler listelenirken hata oluştu.",
			});
		}
	},
);

// Forcelab Finance çekim talebi onayla — Forcelab'e gönder
router.post(
	"/forcelab-finance/withdraw/:id/approve",
		checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		let transaction = null;
		let payload = null;

		try {
			transaction = await ForcelabFinanceTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.providerType !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (transaction.status !== "pending") {
				return res.status(400).json({
					success: false,
					error: `İşlem zaten "${transaction.status}" durumunda.`,
				});
			}

			const settings = await getForcelabSettings();

			if (!settings.isActive || !settings.apiKey) {
				return res.status(400).json({
					success: false,
					error: "Forcelab Finance yapılandırması eksik veya aktif değil.",
				});
			}

			const client = axios.create({
				baseURL: settings.apiUrl,
				headers: createForcelabAuthHeaders(settings.apiKey),
				timeout: 30000,
			});

			// Forcelab API field mapping for metadata
			const txMeta = { ...(transaction.metadata || {}) };

			// Extract customer from stored metadata or build from transaction user
			const customer = txMeta.customer || {};

			payload = {
				provider_slug: transaction.providerSlug,
				amount: transaction.providerAmount,
				currency: transaction.currency,
				external_transaction_id: transaction.externalTransactionId,
				customer: {
					reference: customer.reference || transaction.user?.toString() || "",
					name: customer.name || "",
					username: customer.username || "",
				},
				metadata: normalizeForcelabWithdrawMetadata(txMeta),
			};

			const response = await client.post("/withdraw", payload);
			const rawData = response.data || {};
			const data = unwrapForcelabData(rawData);
			const upstreamUuid = data?.uuid || data?.transaction_uuid;

			if (!upstreamUuid) {
				console.error("Forcelab Finance approve beklenmeyen response:", {
					transactionId: transaction._id?.toString(),
					externalTransactionId: transaction.externalTransactionId,
					request: payload,
					status: response.status,
					statusText: response.statusText,
					rawData,
					normalizedData: data,
				});

				return res.status(400).json({
					success: false,
					error:
						data?.message ||
						data?.error ||
						rawData?.message ||
						rawData?.error ||
						"Forcelab Finance çekim isteği gönderilemedi.",
				});
			}

			transaction.uuid = upstreamUuid;
			transaction.status = "processing";
			transaction.providerResponse = data && typeof data === "object" ? data : rawData;
			transaction.processedAt = data.processed_at || null;

			if (data.external_transaction_id) {
				transaction.externalTransactionId = data.external_transaction_id;
			}

			// Capture returned metadata from Forcelab (bank_account, wallet_address, gateway_message)
			const responseMeta = data.metadata || {};
			if (responseMeta && typeof responseMeta === "object" && Object.keys(responseMeta).length) {
				transaction.metadata = {
					...transaction.metadata,
					...responseMeta,
				};
			}

			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi onaylandı ve Forcelab'e iletildi.",
				data: {
					_id: transaction._id,
					uuid: transaction.uuid,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("Forcelab Finance approve hatası:", {
				transactionId: transaction?._id?.toString?.() || req.params.id,
				externalTransactionId: transaction?.externalTransactionId || null,
				request: payload,
				status: error.response?.status || null,
				statusText: error.response?.statusText || "",
				data: error.response?.data || null,
				message: error.message,
			});
			const upstreamMessage =
				error.response?.data?.message || error.response?.data?.error || error.message;
			res.status(error.response?.status || 500).json({
				success: false,
				error: upstreamMessage || "Çekim onaylanırken hata oluştu.",
			});
		}
	},
);

// Forcelab Finance çekim talebi reddet — bakiye iade et
router.post(
	"/forcelab-finance/withdraw/:id/reject",
		checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		try {
			const transaction = await ForcelabFinanceTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.providerType !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (!["pending", "processing"].includes(transaction.status)) {
				return res.status(400).json({
					success: false,
					error: `İşlem "${transaction.status}" durumunda, reddedilemez.`,
				});
			}

			const { reason } = req.body;

			// Bakiyeyi iade et
			const user = await User.findById(transaction.user);
			if (user) {
				const newBalance = await updateUserBalance(user, transaction.amount, {
					emitSocket: true,
				});
				transaction.newBalance = newBalance || 0;
			}

			transaction.status = "rejected";
			transaction.rejectedAt = new Date();
			transaction.rejectionReason = reason || "Admin tarafından reddedildi.";
			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi reddedildi ve bakiye iade edildi.",
				data: {
					_id: transaction._id,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("Forcelab Finance reject hatası:", error.message);
			res.status(500).json({
				success: false,
				error: "Çekim reddedilirken hata oluştu.",
			});
		}
	},
);

// ═══════════════════════════════════════════════════════════════════════════
// GalaxyPay Admin Endpoints
// ═══════════════════════════════════════════════════════════════════════════

const {
	DEFAULT_METHOD_FLAGS: GALAXY_PAY_DEFAULT_METHOD_FLAGS,
	buildGalaxyPayFormBody: buildGalaxyPayAdminFormBody,
	createGalaxyPayHeaders: createGalaxyPayAdminHeaders,
	getGalaxyPayEndpoint: getGalaxyPayAdminEndpoint,
} = require("../../utils/galaxyPay");

const getGalaxyPaySettings = async () => {
	const siteSettings = await SiteSettings.findOne();
	const settings = siteSettings?.galaxyPay || {};
	return {
		isActive: false,
		name: "GalaxyPay",
		logo: "",
		minAmount: 100,
		maxAmount: 100000,
		currency: "TRY",
		lang: "tr",
		apiId: "",
		apiKey: "",
		apiUrl: "https://galaxypay.dev",
		methods: { ...GALAXY_PAY_DEFAULT_METHOD_FLAGS },
		returnUrlSuccess: "",
		returnUrlFail: "",
		...settings,
		methods: {
			...GALAXY_PAY_DEFAULT_METHOD_FLAGS,
			...(settings.methods || {}),
		},
	};
};

router.get(
	"/galaxypay/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
				await siteSettings.save();
			}

			const galaxyPay = {
				isActive: false,
				name: "GalaxyPay",
				logo: "",
				minAmount: 100,
				maxAmount: 100000,
				currency: "TRY",
				lang: "tr",
				apiId: "",
				apiKey: "",
				apiUrl: "https://galaxypay.dev",
				methods: { ...GALAXY_PAY_DEFAULT_METHOD_FLAGS },
				returnUrlSuccess: "",
				returnUrlFail: "",
				...siteSettings.galaxyPay,
			};

			galaxyPay.methods = {
				...GALAXY_PAY_DEFAULT_METHOD_FLAGS,
				...(galaxyPay.methods || {}),
			};
			galaxyPay.callbackUrl = `${process.env.SERVER_BACKEND_URL}/payment/galaxypay/callback`;

			res.status(200).json({ success: true, data: galaxyPay });
		} catch (error) {
			console.error("GalaxyPay ayarları getirilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar getirilirken bir hata oluştu.",
			});
		}
	},
);

router.put(
	"/galaxypay/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const {
				name,
				logo,
				minAmount,
				maxAmount,
				currency,
				lang,
				apiId,
				apiKey,
				apiUrl,
				methods,
				returnUrlSuccess,
				returnUrlFail,
				isActive,
			} = req.body;

			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
			}

			if (!siteSettings.galaxyPay) {
				siteSettings.galaxyPay = {};
			}

			if (name !== undefined) siteSettings.galaxyPay.name = name;
			if (logo !== undefined) siteSettings.galaxyPay.logo = logo;
			if (minAmount !== undefined) siteSettings.galaxyPay.minAmount = minAmount;
			if (maxAmount !== undefined) siteSettings.galaxyPay.maxAmount = maxAmount;
			if (currency !== undefined) {
				siteSettings.galaxyPay.currency = String(currency).toUpperCase();
			}
			if (lang !== undefined) siteSettings.galaxyPay.lang = String(lang).toLowerCase();
			if (apiId !== undefined) siteSettings.galaxyPay.apiId = String(apiId);
			if (apiKey !== undefined) siteSettings.galaxyPay.apiKey = apiKey;
			if (apiUrl !== undefined) siteSettings.galaxyPay.apiUrl = apiUrl;
			if (returnUrlSuccess !== undefined) {
				siteSettings.galaxyPay.returnUrlSuccess = returnUrlSuccess;
			}
			if (returnUrlFail !== undefined) {
				siteSettings.galaxyPay.returnUrlFail = returnUrlFail;
			}
			if (methods !== undefined) {
				siteSettings.galaxyPay.methods = {
					...GALAXY_PAY_DEFAULT_METHOD_FLAGS,
					...methods,
				};
			}
			if (isActive !== undefined) siteSettings.galaxyPay.isActive = isActive;

			siteSettings.markModified("galaxyPay");
			await siteSettings.save();

			res.status(200).json({
				success: true,
				message: "GalaxyPay ayarları güncellendi.",
				data: siteSettings.galaxyPay,
			});
		} catch (error) {
			console.error("GalaxyPay ayarları kaydedilirken hata:", error);
			res.status(500).json({
				success: false,
				error: "Ayarlar kaydedilirken bir hata oluştu.",
			});
		}
	},
);

router.get(
	"/galaxypay/transactions",
	checkPermission("finance.read"),
	async (req, res) => {
		try {
			const {
				type,
				method,
				status,
				q,
				page = 1,
				itemsPerPage = 20,
			} = req.query;

			const query = {};
			if (type) query.type = type;
			if (method) query.method = method;
			if (status) query.status = status;

			if (q) {
				const users = await User.find({
					$or: [
						{ username: { $regex: q, $options: "i" } },
						{ "local.email": { $regex: q, $options: "i" } },
						{ phone: { $regex: q, $options: "i" } },
						{ _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : null },
					].filter(Boolean),
				}).select("_id");

				if (users.length) {
					query.user = { $in: users.map((u) => u._id) };
				} else {
					query.user = null;
				}
			}

			const skip = (Number(page) - 1) * Number(itemsPerPage);

			const [transactions, total, statsAgg] = await Promise.all([
				GalaxyPayTransaction.find(query)
					.populate("user", "username local.email phone avatar")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(Number(itemsPerPage))
					.lean(),
				GalaxyPayTransaction.countDocuments(query),
				GalaxyPayTransaction.aggregate([
					{ $match: query },
					{
						$facet: {
							totalAmount: [
								{ $match: { status: "approved" } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							last24hAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							monthlyAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							pendingCount: [{ $match: { status: "pending" } }, { $count: "count" }],
							processingCount: [{ $match: { status: "processing" } }, { $count: "count" }],
						},
					},
				]),
			]);

			const facet = statsAgg[0] || {};

			res.json({
				success: true,
				data: {
					transactions,
					total,
					page: Number(page),
					stats: {
						totalAmount: facet.totalAmount?.[0]?.sum || 0,
						last24hAmount: facet.last24hAmount?.[0]?.sum || 0,
						monthlyAmount: facet.monthlyAmount?.[0]?.sum || 0,
						pendingCount: facet.pendingCount?.[0]?.count || 0,
						processingCount: facet.processingCount?.[0]?.count || 0,
					},
				},
			});
		} catch (error) {
			console.error("GalaxyPay admin list hatası:", error);
			res.status(500).json({
				success: false,
				error: "İşlemler listelenirken hata oluştu.",
			});
		}
	},
);

router.post(
	"/galaxypay/withdraw/:id/approve",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		let transaction = null;
		let payload = null;

		try {
			transaction = await GalaxyPayTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.type !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (transaction.status !== "pending") {
				return res.status(400).json({
					success: false,
					error: `İşlem zaten "${transaction.status}" durumunda.`,
				});
			}

			const settings = await getGalaxyPaySettings();
			if (!settings.isActive || !settings.apiId || !settings.apiKey) {
				return res.status(400).json({
					success: false,
					error: "GalaxyPay yapılandırması eksik veya aktif değil.",
				});
			}

			const endpoint = getGalaxyPayAdminEndpoint("withdraw", transaction.method);
			if (!endpoint) {
				return res.status(400).json({ success: false, error: "Geçersiz GalaxyPay yöntemi." });
			}

			const customer = transaction.metadata?.customer || {};
			payload = {
				api_id: settings.apiId,
				api_key: settings.apiKey,
				user_id: customer.userId || transaction.user?.toString() || "",
				username: customer.username || "",
				external_transaction_id: transaction.externalTransactionId,
				first_name: customer.firstName || customer.username || "GalaxyPay",
				last_name: customer.lastName || customer.firstName || customer.username || "User",
				amount: Number(transaction.amount).toFixed(2),
				lang: transaction.lang || settings.lang || "tr",
				currency: transaction.currency || settings.currency || "TRY",
			};

			if (customer.email) payload.email = customer.email;
			if (customer.phoneNumber) payload.phone_number = customer.phoneNumber;

			if (transaction.method === "bank-transfer") {
				payload.account_number = transaction.bankInfo?.accountNumber || "";
				payload.iban = transaction.bankInfo?.iban || "";
				payload.bank_id = transaction.bankInfo?.bankId || "";
				payload.branch_code = transaction.bankInfo?.branchCode || "";
				payload.tcno = transaction.bankInfo?.tcno || "";
			}

			if (transaction.method === "papara") {
				payload.account_number = transaction.paparaInfo?.accountNumber || "";
			}

			const client = axios.create({
				baseURL: settings.apiUrl,
				headers: createGalaxyPayAdminHeaders(),
				timeout: 30000,
			});

			const response = await client.post(endpoint, buildGalaxyPayAdminFormBody(payload));
			const rawData = response.data || {};

			if (Number(rawData.code) !== 200 || rawData.type !== "success") {
				console.error("GalaxyPay approve beklenmeyen response:", {
					transactionId: transaction._id?.toString(),
					request: payload,
					rawData,
				});

				return res.status(400).json({
					success: false,
					error: rawData.message || "GalaxyPay çekim isteği gönderilemedi.",
				});
			}

			transaction.paymentId = rawData.transaction_id
				? String(rawData.transaction_id)
				: transaction.paymentId;
			transaction.methodId = rawData.method_id ? String(rawData.method_id) : transaction.methodId;
			transaction.providerHash = rawData.hash || transaction.providerHash;
			transaction.status = "processing";
			transaction.providerResponse = rawData;

			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi onaylandı ve GalaxyPay'e iletildi.",
				data: {
					_id: transaction._id,
					paymentId: transaction.paymentId,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("GalaxyPay approve hatası:", {
				transactionId: transaction?._id?.toString?.() || req.params.id,
				request: payload,
				status: error.response?.status || null,
				data: error.response?.data || null,
				message: error.message,
			});
			const upstreamMessage = error.response?.data?.message || error.response?.data?.error || error.message;
			res.status(error.response?.status || 500).json({
				success: false,
				error: upstreamMessage || "Çekim onaylanırken hata oluştu.",
			});
		}
	},
);

router.post(
	"/galaxypay/withdraw/:id/reject",
	checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		try {
			const transaction = await GalaxyPayTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.type !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (!["pending", "processing"].includes(transaction.status)) {
				return res.status(400).json({
					success: false,
					error: `İşlem "${transaction.status}" durumunda, reddedilemez.`,
				});
			}

			const { reason } = req.body;
			const user = await User.findById(transaction.user);
			if (user) {
				const newBalance = await updateUserBalance(user, transaction.amount, {
					emitSocket: true,
				});
				transaction.newBalance = newBalance || 0;
			}

			transaction.status = "rejected";
			transaction.rejectedAt = new Date();
			transaction.rejectionReason = reason || "Admin tarafından reddedildi.";
			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi reddedildi ve bakiye iade edildi.",
				data: {
					_id: transaction._id,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("GalaxyPay reject hatası:", error.message);
			res.status(500).json({
				success: false,
				error: "Çekim reddedilirken hata oluştu.",
			});
		}
	},
);

// ═══════════════════════════════════════════════════���═��═════════════════════
// MeelDev Admin Endpoints
// ═══════════════════════════════════════════��═══════════════════════════════

const MeelDevTransaction = require("../../database/models/MeelDevTransaction");
const {
	createMeelDevHeaders: createMeelDevAdminHeaders,
} = require("../../utils/meelDev");

const getMeelDevSettings = async () => {
	const siteSettings = await SiteSettings.findOne();
	const settings = siteSettings?.meelDev || {};
	return {
		apiUrl: "https://gateway.meeldev.com",
		...settings,
	};
};

// MeelDev Ayarları GET
router.get(
	"/meeldev/settings",
	checkPermission("platform.read"),
	async (req, res) => {
		try {
			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
				await siteSettings.save();
			}

			const meelDev = {
				isActive: false,
				name: "MeelDev",
				logo: "",
				minAmount: 100,
				maxAmount: 100000,
				currency: "TRY",
				apiKey: "",
				apiSecret: "",
				cbSecretKey: "",
				apiUrl: "https://gateway.meeldev.com",
				...siteSettings.meelDev,
			};

			meelDev.callbackUrl = `${process.env.SERVER_BACKEND_URL}/payment/meeldev/callback`;

			res.status(200).json({ success: true, data: meelDev });
		} catch (error) {
			console.error("MeelDev ayarları getirilirken hata:", error);
			res.status(500).json({ success: false, error: "Ayarlar getirilirken bir hata oluştu." });
		}
	},
);

// MeelDev Ayarları PUT
router.put(
	"/meeldev/settings",
	checkPermission("platform.update"),
	async (req, res) => {
		try {
			const { name, logo, minAmount, maxAmount, currency, apiKey, apiSecret, cbSecretKey, apiUrl, isActive } = req.body;

			let siteSettings = await SiteSettings.findOne();
			if (!siteSettings) {
				siteSettings = new SiteSettings();
			}

			if (!siteSettings.meelDev) {
				siteSettings.meelDev = {};
			}

			if (name !== undefined) siteSettings.meelDev.name = name;
			if (logo !== undefined) siteSettings.meelDev.logo = logo;
			if (minAmount !== undefined) siteSettings.meelDev.minAmount = minAmount;
			if (maxAmount !== undefined) siteSettings.meelDev.maxAmount = maxAmount;
			if (currency !== undefined) siteSettings.meelDev.currency = String(currency).toUpperCase();
			if (apiKey !== undefined) siteSettings.meelDev.apiKey = apiKey;
			if (apiSecret !== undefined) siteSettings.meelDev.apiSecret = apiSecret;
			if (cbSecretKey !== undefined) siteSettings.meelDev.cbSecretKey = cbSecretKey;
			if (apiUrl !== undefined) siteSettings.meelDev.apiUrl = apiUrl;
			if (isActive !== undefined) siteSettings.meelDev.isActive = isActive;

			siteSettings.markModified("meelDev");
			await siteSettings.save();

			res.status(200).json({ success: true, message: "MeelDev ayarları güncellendi." });
		} catch (error) {
			console.error("MeelDev ayarları kaydedilirken hata:", error);
			res.status(500).json({ success: false, error: "Ayarlar kaydedilirken bir hata olu��tu." });
		}
	},
);

// MeelDev işlemleri listele
router.get(
	"/meeldev/transactions",
	checkPermission("finance.read"),
	async (req, res) => {
		try {
			const { type, status, q, page = 1, itemsPerPage = 20 } = req.query;

			const query = {};
			if (type) query.type = type;
			if (status) query.status = status;

			if (q) {
				const users = await User.find({
					$or: [
						{ username: { $regex: q, $options: "i" } },
						{ "local.email": { $regex: q, $options: "i" } },
						{ phone: { $regex: q, $options: "i" } },
						{ _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : null },
					].filter(Boolean),
				}).select("_id");

				if (users.length) {
					query.user = { $in: users.map((u) => u._id) };
				} else {
					query.user = null;
				}
			}

			const skip = (Number(page) - 1) * Number(itemsPerPage);

			const [transactions, total, statsAgg] = await Promise.all([
				MeelDevTransaction.find(query)
					.populate("user", "username email phone avatar")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(Number(itemsPerPage))
					.lean(),
				MeelDevTransaction.countDocuments(query),
				MeelDevTransaction.aggregate([
					{ $match: query.type ? { type: query.type } : {} },
					{
						$facet: {
							totalAmount: [
								{ $match: { status: "approved" } },
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							last24hAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							monthlyAmount: [
								{
									$match: {
										status: "approved",
										createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
									},
								},
								{ $group: { _id: null, sum: { $sum: "$amount" } } },
							],
							pendingCount: [{ $match: { status: "pending" } }, { $count: "count" }],
							processingCount: [{ $match: { status: "processing" } }, { $count: "count" }],
						},
					},
				]),
			]);

			const facet = statsAgg[0] || {};

			res.json({
				success: true,
				data: {
					transactions,
					total,
					page: Number(page),
					stats: {
						totalAmount: facet.totalAmount?.[0]?.sum || 0,
						last24hAmount: facet.last24hAmount?.[0]?.sum || 0,
						monthlyAmount: facet.monthlyAmount?.[0]?.sum || 0,
						pendingCount: facet.pendingCount?.[0]?.count || 0,
						processingCount: facet.processingCount?.[0]?.count || 0,
					},
				},
			});
		} catch (error) {
			console.error("MeelDev admin list hatası:", error);
			res.status(500).json({ success: false, error: "İşlemler listelenirken hata olu��tu." });
		}
	},
);

// MeelDev çekim talebi onayla — MeelDev'e gönder
router.post(
	"/meeldev/withdraw/:id/approve",
		checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		let transaction = null;

		try {
			transaction = await MeelDevTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.type !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (transaction.status !== "pending") {
				return res.status(400).json({
					success: false,
					error: `İşlem zaten "${transaction.status}" durumunda.`,
				});
			}

			const settings = await getMeelDevSettings();

			if (!settings.isActive || !settings.apiKey || !settings.apiSecret) {
				return res.status(400).json({
					success: false,
					error: "MeelDev yapılandırması eksik veya aktif değil.",
				});
			}

			const client = axios.create({
				baseURL: settings.apiUrl,
				headers: createMeelDevAdminHeaders(settings.apiKey, settings.apiSecret, settings.cbSecretKey),
				timeout: 30000,
			});

			const payload = {
				price: transaction.amount.toFixed(2),
				transaction_id: transaction.transactionId,
				username: transaction.metadata?.username || "",
				user_id: transaction.user?.toString() || "",
				bank_info: {
					iban: transaction.bankInfo?.iban || "",
					sahibi: transaction.bankInfo?.accountHolder || "",
					banka: transaction.bankInfo?.bankName || "",
				},
			};

			const response = await client.post("/api/withdrawAdd.php", payload);
			const rawData = response.data || {};

			if (rawData.status !== "success" || !rawData.data) {
				console.error("MeelDev approve beklenmeyen response:", {
					transactionId: transaction._id?.toString(),
					request: payload,
					rawData,
				});

				return res.status(400).json({
					success: false,
					error: rawData.message || "MeelDev çekim isteği gönderilemedi.",
				});
			}

			const data = rawData.data;
			transaction.processNo = data.process_no || transaction.processNo;
			transaction.status = "processing";
			transaction.providerResponse = data;

			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi onaylandı ve MeelDev'e iletildi.",
				data: {
					_id: transaction._id,
					processNo: transaction.processNo,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("MeelDev approve hatası:", {
				transactionId: transaction?._id?.toString?.() || req.params.id,
				status: error.response?.status || null,
				data: error.response?.data || null,
				message: error.message,
			});
			const upstreamMessage = error.response?.data?.message || error.response?.data?.error || error.message;
			res.status(error.response?.status || 500).json({
				success: false,
				error: upstreamMessage || "Çekim onaylanırken hata oluştu.",
			});
		}
	},
);

// MeelDev çekim talebi reddet — bakiye iade et
router.post(
	"/meeldev/withdraw/:id/reject",
		checkPermission("finance.withdraws.manage"),
	async (req, res) => {
		try {
			const transaction = await MeelDevTransaction.findById(req.params.id);

			if (!transaction) {
				return res.status(404).json({ success: false, error: "İşlem bulunamadı." });
			}

			if (transaction.type !== "withdraw") {
				return res.status(400).json({ success: false, error: "Bu bir çekim işlemi değil." });
			}

			if (!["pending", "processing"].includes(transaction.status)) {
				return res.status(400).json({
					success: false,
					error: `İşlem "${transaction.status}" durumunda, reddedilemez.`,
				});
			}

			const { reason } = req.body;

			// Bakiyeyi iade et
			const user = await User.findById(transaction.user);
			if (user) {
				const newBalance = await updateUserBalance(user, transaction.amount, {
					emitSocket: true,
				});
				transaction.newBalance = newBalance || 0;
			}

			transaction.status = "rejected";
			transaction.rejectedAt = new Date();
			transaction.rejectionReason = reason || "Admin tarafından reddedildi.";
			await transaction.save();

			res.json({
				success: true,
				message: "Çekim talebi reddedildi ve bakiye iade edildi.",
				data: {
					_id: transaction._id,
					status: transaction.status,
				},
			});
		} catch (error) {
			console.error("MeelDev reject hatası:", error.message);
			res.status(500).json({ success: false, error: "Çekim reddedilirken hata oluştu." });
		}
	},
);

// @desc    Admin bildirimlerini listele (son 50 + okunmamış sayısı)
// @route   GET /admin/notifications
// @access  Admin
router.get("/notifications", async (req, res) => {
	try {
		const adminId = req.adminUser._id;

		const notifications = await AdminNotification.find()
			.sort({ createdAt: -1 })
			.limit(50)
			.lean();

		const unreadCount = await AdminNotification.countDocuments({
			readBy: { $ne: adminId },
		});

		res.status(200).json({
			success: true,
			data: notifications,
			unreadCount,
		});
	} catch (error) {
		console.error("Admin notifications list error:", error.message);
		res.status(500).json({ success: false, message: "Bildirimler alınamadı." });
	}
});

// @desc    Bir bildirimi okundu olarak işaretle
// @route   POST /admin/notifications/:id/read
// @access  Admin
router.post("/notifications/:id/read", async (req, res) => {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Geçersiz bildirim ID." });
		}

		const adminId = req.adminUser._id;

		await AdminNotification.updateOne(
			{ _id: id },
			{ $addToSet: { readBy: adminId } },
		);

		res.status(200).json({ success: true });
	} catch (error) {
		console.error("Admin notification read error:", error.message);
		res.status(500).json({ success: false, message: "Bildirim güncellenemedi." });
	}
});

// @desc    Tüm bildirimleri okundu olarak işaretle
// @route   POST /admin/notifications/read-all
// @access  Admin
router.post("/notifications/read-all", async (req, res) => {
	try {
		const adminId = req.adminUser._id;

		await AdminNotification.updateMany(
			{ readBy: { $ne: adminId } },
			{ $addToSet: { readBy: adminId } },
		);

		res.status(200).json({ success: true });
	} catch (error) {
		console.error("Admin notifications read-all error:", error.message);
		res.status(500).json({ success: false, message: "Bildirimler güncellenemedi." });
	}
});

module.exports = router;
