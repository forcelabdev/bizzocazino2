const mongoose = require("mongoose");

const User = require("../database/models/User");
const AdminManualAdjustment = require("../database/models/AdminManualAdjustment");
const CryptoTransaction = require("../database/models/CryptoTransaction");
const Deposit = require("../database/models/Deposit");
const Withdrawal = require("../database/models/Withdrawal");
const BankTransfer = require("../database/models/BankTransfer");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const MeelDevTransaction = require("../database/models/MeelDevTransaction");
const GalaxyPayTransaction = require("../database/models/GalaxyPayTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");
const Transaction = require("../database/models/Transaction");
const Vip = require("../database/models/Vip");
const Tag = require("../database/models/Tag");
const { RIVO_WALLET } = require("../utils/rivoWallet");

const APPROVED_STATUS = "approved";
const APPROVED_CRYPTO_STATES = ["completed", "success"];
const DAY_MS = 24 * 60 * 60 * 1000;

// Otomatik/onaylı bonus sistemlerinin kategori adları ("Alınan Bonus").
// Bu listede olmayan kind=bonus manuel kayıtlar "Eklenen Bonus" sayılır
// (admin tarafından elle, sistem dışı olarak eklenmiştir).
const SYSTEM_BONUS_CATEGORIES = [
	"YATIRIM BONUSU",
	"KAYIP BONUSU",
	"RELOAD BONUSU",
	"DENEME BONUSU",
	"CALL SENARYO BONUSU",
];

// Yatırım (deposit) aralığı segmentleri - "yatırım aralıklarına göre" raporu.
const DEPOSIT_BUCKETS = [
	{ key: "0-500", label: "0 - 500", min: 0, max: 500 },
	{ key: "500-1000", label: "500 - 1.000", min: 500, max: 1000 },
	{ key: "1000-2500", label: "1.000 - 2.500", min: 1000, max: 2500 },
	{ key: "2500-5000", label: "2.500 - 5.000", min: 2500, max: 5000 },
	{ key: "5000-10000", label: "5.000 - 10.000", min: 5000, max: 10000 },
	{ key: "10000-25000", label: "10.000 - 25.000", min: 10000, max: 25000 },
	{ key: "25000+", label: "25.000 ve üzeri", min: 25000, max: Infinity },
];

// Transaction.game_type değerlerinin normalize edildiği oyun kategorileri.
// "SB" = Nexus spor bahis sağlayıcısı. "slot"/"live" doğrudan eşleşir.
// Diğer tüm değerler (örn. drakon sağlayıcısının bet/win kayıtları gibi
// kategorisi netleşmeyen kayıtlar) "other" (Diğer) altında toplanır.
const GAME_CATEGORIES = [
	{ key: "slot", label: "Slot" },
	{ key: "live", label: "Canlı Casino" },
	{ key: "sportsbook", label: "Spor Bahisi" },
	{ key: "other", label: "Diğer" },
];
const GAME_CATEGORY_KEYS = GAME_CATEGORIES.map((c) => c.key);

const ACTIVITY_STATUSES = {
	active: { key: "active", label: "Aktif", maxDays: 14 },
	at_risk: { key: "at_risk", label: "Risk Altında", maxDays: 30 },
	churned: { key: "churned", label: "Kaybedilmiş", maxDays: Infinity },
	never_played: { key: "never_played", label: "Hiç Oynamamış" },
};

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildDateRange = (startDate, endDate) => {
	const range = {};
	if (startDate) {
		const d = new Date(
			Number.isNaN(Number(startDate)) ? startDate : Number(startDate),
		);
		if (!Number.isNaN(d.getTime())) range.$gte = d;
	}
	if (endDate) {
		const d = new Date(
			Number.isNaN(Number(endDate)) ? endDate : Number(endDate),
		);
		if (!Number.isNaN(d.getTime())) range.$lte = d;
	}
	return Object.keys(range).length ? range : null;
};

const getDepositBucketKey = (amount) => {
	const val = Number(amount || 0);
	const bucket = DEPOSIT_BUCKETS.find((b) => val >= b.min && val < b.max);
	return bucket ? bucket.key : DEPOSIT_BUCKETS[DEPOSIT_BUCKETS.length - 1].key;
};

const normalizeGameCategory = (gameType) => {
	const val = String(gameType || "").toLowerCase();
	if (val === "slot") return "slot";
	if (val === "live") return "live";
	if (val === "sb") return "sportsbook";
	return "other";
};

/**
 * Tüm ödeme sağlayıcılarından (kripto, fiat, banka, Forcelab, MeelDev,
 * GalaxyPay, FluxKripto, xPayment), belirtilen tarih aralığındaki onaylı
 * yatırım/çekim toplamlarını kullanıcı bazında hesaplar. userFinanceTotals.js
 * ile aynı veri kaynaklarını, tarih aralığı desteğiyle kullanır.
 */
const aggregateDepositsByUser = async (dateRange) => {
	const dateMatch = dateRange ? { createdAt: dateRange } : {};

	const groupByUserAndType = (typeExpr) => ({
		$group: {
			_id: { user: "$user", type: typeExpr },
			total: { $sum: "$amount" },
			count: { $sum: 1 },
		},
	});

	const [
		cryptoAgg,
		depositAgg,
		withdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxAgg,
		xpayAgg,
	] = await Promise.all([
		CryptoTransaction.aggregate([
			{ $match: { ...dateMatch, state: { $in: APPROVED_CRYPTO_STATES } } },
			groupByUserAndType("$type"),
		]),
		Deposit.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("deposit"),
		]),
		Withdrawal.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("withdraw"),
		]),
		BankTransfer.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("$type"),
		]),
		ForcelabFinanceTransaction.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType({ $ifNull: ["$providerType", "deposit"] }),
		]),
		MeelDevTransaction.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("$type"),
		]),
		GalaxyPayTransaction.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("$type"),
		]),
		FluxKriptoTransaction.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("$type"),
		]),
		XPaymentTransaction.aggregate([
			{ $match: { ...dateMatch, status: APPROVED_STATUS } },
			groupByUserAndType("$type"),
		]),
	]);

	const map = new Map();
	const ensure = (uid) => {
		const key = String(uid);
		if (!map.has(key)) {
			map.set(key, { totalDeposit: 0, totalWithdrawal: 0, depositCount: 0 });
		}
		return map.get(key);
	};

	const addRows = (rows) => {
		for (const row of rows) {
			if (!row?._id?.user) continue;
			const entry = ensure(row._id.user);
			if (row._id.type === "deposit") {
				entry.totalDeposit += Number(row.total || 0);
				entry.depositCount += Number(row.count || 0);
			} else if (row._id.type === "withdraw") {
				entry.totalWithdrawal += Number(row.total || 0);
			}
		}
	};

	[
		cryptoAgg,
		depositAgg,
		withdrawalAgg,
		bankAgg,
		forcelabAgg,
		meelDevAgg,
		galaxyPayAgg,
		fluxAgg,
		xpayAgg,
	].forEach(addRows);

	return map;
};

/**
 * Belirli tarih aralığında kredi yönlü manuel bakiye hareketlerini kullanıcı
 * bazında "alınan bonus" (sistem onaylı), "eklenen bonus" (admin elle
 * ekledi) ve "eklenen bakiye" olarak gruplar.
 */
const aggregateAdjustmentsByUser = async (dateRange) => {
	const match = { direction: "credit" };
	if (dateRange) match.createdAt = dateRange;

	const rows = await AdminManualAdjustment.aggregate([
		{ $match: match },
		{
			$group: {
				_id: { user: "$targetUser", kind: "$kind", category: "$category" },
				total: { $sum: "$appliedAmount" },
				count: { $sum: 1 },
			},
		},
	]);

	const map = new Map();
	const ensure = (uid) => {
		const key = String(uid);
		if (!map.has(key)) {
			map.set(key, {
				claimedBonus: 0,
				manualBonus: 0,
				manualBalance: 0,
				claimedCount: 0,
				manualBonusCount: 0,
				manualBalanceCount: 0,
			});
		}
		return map.get(key);
	};

	for (const row of rows) {
		if (!row?._id?.user) continue;
		const entry = ensure(row._id.user);
		const amount = Number(row.total || 0);
		const count = Number(row.count || 0);
		if (row._id.kind === "bonus") {
			if (SYSTEM_BONUS_CATEGORIES.includes(row._id.category)) {
				entry.claimedBonus += amount;
				entry.claimedCount += count;
			} else {
				entry.manualBonus += amount;
				entry.manualBonusCount += count;
			}
		} else if (row._id.kind === "balance") {
			entry.manualBalance += amount;
			entry.manualBalanceCount += count;
		}
	}

	return map;
};

/**
 * Transaction koleksiyonundan (tüm slot/canlı casino/spor bahis/diğer oyun
 * sağlayıcıları) kullanıcı bazında bahis/kazanç toplamlarını, oyun türüne
 * göre kırılımı ve en son işlem tarihini (son aktivite) hesaplar.
 * user_code alanı User._id'nin string hali olduğu için doğrudan eşleşir.
 */
const aggregateGameStatsByUser = async (dateRange) => {
	const match = {};
	if (dateRange) match.created_at = dateRange;

	const rows = await Transaction.aggregate([
		{ $match: match },
		{
			$addFields: {
				category: {
					$switch: {
						branches: [
							{ case: { $eq: [{ $toLower: "$game_type" }, "slot"] }, then: "slot" },
							{ case: { $eq: [{ $toLower: "$game_type" }, "live"] }, then: "live" },
							{ case: { $eq: [{ $toLower: "$game_type" }, "sb"] }, then: "sportsbook" },
						],
						default: "other",
					},
				},
			},
		},
		{
			$group: {
				_id: { user: "$user_code", category: "$category" },
				betTotal: { $sum: { $ifNull: ["$bet_money", 0] } },
				winTotal: { $sum: { $ifNull: ["$win_money", 0] } },
				count: { $sum: 1 },
				lastActivityAt: { $max: "$created_at" },
			},
		},
	]);

	const map = new Map();
	const ensure = (uid) => {
		const key = String(uid);
		if (!map.has(key)) {
			map.set(key, {
				betTotal: 0,
				winTotal: 0,
				betCount: 0,
				lastActivityAt: null,
				byCategory: GAME_CATEGORY_KEYS.reduce((acc, k) => {
					acc[k] = { bet: 0, win: 0, count: 0 };
					return acc;
				}, {}),
			});
		}
		return map.get(key);
	};

	for (const row of rows) {
		if (!row?._id?.user) continue;
		const entry = ensure(row._id.user);
		const category = row._id.category || "other";
		const betTotal = Number(row.betTotal || 0);
		const winTotal = Number(row.winTotal || 0);
		const count = Number(row.count || 0);

		entry.betTotal += betTotal;
		entry.winTotal += winTotal;
		entry.betCount += count;
		if (entry.byCategory[category]) {
			entry.byCategory[category].bet += betTotal;
			entry.byCategory[category].win += winTotal;
			entry.byCategory[category].count += count;
		}
		if (
			row.lastActivityAt &&
			(!entry.lastActivityAt || row.lastActivityAt > entry.lastActivityAt)
		) {
			entry.lastActivityAt = row.lastActivityAt;
		}
	}

	return map;
};

const getUserWalletBalance = (user) => {
	const wallets = Array.isArray(user?.wallets) ? user.wallets : [];
	const wallet =
		wallets.find(
			(w) =>
				w.coinType === RIVO_WALLET.coinType &&
				w.chain === RIVO_WALLET.chain &&
				w.type === RIVO_WALLET.type,
		) || wallets[0];
	return Number(wallet?.balance || 0);
};

// Kullanıcının XP'sine göre hangi VIP seviyesinde olduğunu çözer.
// sortedVipLevels, level alanına göre artan sırada olmalıdır.
const resolveVipLevel = (xp, sortedVipLevels) => {
	if (!sortedVipLevels.length) return { vipLevel: 0, vipLevelName: null };

	const userXp = Number(xp || 0);
	let currentLevel = sortedVipLevels[0];

	for (const level of sortedVipLevels) {
		if (userXp >= level.requiredXp) {
			currentLevel = level;
		} else {
			break;
		}
	}

	return {
		vipLevel: currentLevel.level,
		vipLevelName: currentLevel.levelName || null,
	};
};

const getActivityStatus = (lastActivityAt, betCount) => {
	if (!betCount || !lastActivityAt) return ACTIVITY_STATUSES.never_played.key;
	const days = (Date.now() - new Date(lastActivityAt).getTime()) / DAY_MS;
	if (days <= ACTIVITY_STATUSES.active.maxDays) return ACTIVITY_STATUSES.active.key;
	if (days <= ACTIVITY_STATUSES.at_risk.maxDays) return ACTIVITY_STATUSES.at_risk.key;
	return ACTIVITY_STATUSES.churned.key;
};

/**
 * Filtrelenmemiş, birleştirilmiş üye kayıtlarını üretir. getSummary /
 * getBuckets / getGameTypeBuckets / getMembers tarafından paylaşılan ortak
 * veri kümesidir.
 */
const buildMemberRecords = async ({ startDate, endDate } = {}) => {
	const dateRange = buildDateRange(startDate, endDate);

	const [depositMap, adjustmentMap, gameStatsMap, vipLevels, tagDocs] =
		await Promise.all([
			aggregateDepositsByUser(dateRange),
			aggregateAdjustmentsByUser(dateRange),
			aggregateGameStatsByUser(dateRange),
			Vip.find({}).sort({ level: 1 }).select("level levelName requiredXp").lean(),
			Tag.find({}).select("name color category").lean(),
		]);

	const tagById = new Map(tagDocs.map((t) => [String(t._id), t]));

	const userIds = new Set([
		...depositMap.keys(),
		...adjustmentMap.keys(),
		...gameStatsMap.keys(),
	]);
	if (!userIds.size) return [];

	const objectIds = [...userIds].flatMap((id) => {
		try {
			return [new mongoose.Types.ObjectId(id)];
		} catch {
			return [];
		}
	});

	// Admin/personel hesapları (rank="admin" veya bir adminRole atanmış
	// olanlar) rapora dahil edilmez - sadece gerçek oyuncular sayılır.
	const userDocs = await User.find({
		_id: { $in: objectIds },
		rank: { $ne: "admin" },
		adminRole: { $exists: false },
	})
		.select(
			"_id username name affiliates wallets createdAt xp country tags",
		)
		.lean();

	const codeToPartner = {};
	userDocs.forEach((u) => {
		if (u.affiliates?.code) codeToPartner[u.affiliates.code] = u.username;
	});

	const records = [];
	for (const u of userDocs) {
		if (!u.username) continue;
		const uid = String(u._id);
		const deposit = depositMap.get(uid) || {
			totalDeposit: 0,
			totalWithdrawal: 0,
			depositCount: 0,
		};
		const adj = adjustmentMap.get(uid) || {
			claimedBonus: 0,
			manualBonus: 0,
			manualBalance: 0,
		};
		const gameStats = gameStatsMap.get(uid) || {
			betTotal: 0,
			winTotal: 0,
			betCount: 0,
			lastActivityAt: null,
			byCategory: GAME_CATEGORY_KEYS.reduce((acc, k) => {
				acc[k] = { bet: 0, win: 0, count: 0 };
				return acc;
			}, {}),
		};
		const redeemedCode = u.affiliates?.redeemedCode || null;
		const { vipLevel, vipLevelName } = resolveVipLevel(u.xp, vipLevels);
		const tags = (u.tags || [])
			.map((tagId) => tagById.get(String(tagId)))
			.filter(Boolean)
			.map((t) => ({ id: String(t._id), name: t.name, color: t.color }));

		records.push({
			userId: uid,
			username: u.username,
			name: u.name || null,
			partnerName: redeemedCode
				? codeToPartner[redeemedCode] || redeemedCode
				: null,
			totalDeposit: round2(deposit.totalDeposit),
			depositCount: deposit.depositCount || 0,
			totalWithdrawal: round2(deposit.totalWithdrawal),
			claimedBonus: round2(adj.claimedBonus),
			manualBonus: round2(adj.manualBonus),
			manualBalance: round2(adj.manualBalance),
			walletBalance: round2(getUserWalletBalance(u)),
			depositBucket: getDepositBucketKey(deposit.totalDeposit),
			registeredAt: u.createdAt,
			country: u.country?.code
				? { code: u.country.code, name: u.country.name || u.country.code }
				: null,
			vipLevel,
			vipLevelName,
			tags,
			betTotal: round2(gameStats.betTotal),
			winTotal: round2(gameStats.winTotal),
			betCount: gameStats.betCount,
			// Oyuncu perspektifinden net sonuç: kazanç - bahis. Pozitif (yeşil)
			// = oyuncu kazançlı, negatif (kırmızı) = oyuncu zararda.
			netResult: round2(gameStats.winTotal - gameStats.betTotal),
			avgBet: gameStats.betCount
				? round2(gameStats.betTotal / gameStats.betCount)
				: 0,
			gameBreakdown: gameStats.byCategory,
			lastActivityAt: gameStats.lastActivityAt,
			activityStatus: getActivityStatus(
				gameStats.lastActivityAt,
				gameStats.betCount,
			),
		});
	}

	return records;
};

const applyFilters = (
	records,
	{
		depositMin,
		depositMax,
		bucket,
		bonusOrigin,
		search,
		gameType,
		vipLevel,
		country,
		activityStatus,
		tag,
		partner,
	} = {},
) => {
	let filtered = records;

	if (bucket) {
		filtered = filtered.filter((r) => r.depositBucket === bucket);
	}
	if (depositMin !== undefined && depositMin !== null && depositMin !== "") {
		const min = Number(depositMin);
		if (!Number.isNaN(min)) filtered = filtered.filter((r) => r.totalDeposit >= min);
	}
	if (depositMax !== undefined && depositMax !== null && depositMax !== "") {
		const max = Number(depositMax);
		if (!Number.isNaN(max)) filtered = filtered.filter((r) => r.totalDeposit <= max);
	}
	if (bonusOrigin === "claimed") {
		filtered = filtered.filter((r) => r.claimedBonus > 0);
	} else if (bonusOrigin === "manual") {
		filtered = filtered.filter((r) => r.manualBonus > 0);
	}
	if (gameType && GAME_CATEGORY_KEYS.includes(gameType)) {
		filtered = filtered.filter((r) => r.gameBreakdown[gameType]?.count > 0);
	}
	if (vipLevel !== undefined && vipLevel !== null && vipLevel !== "") {
		const level = Number(vipLevel);
		if (!Number.isNaN(level)) filtered = filtered.filter((r) => r.vipLevel === level);
	}
	if (country) {
		filtered = filtered.filter((r) => r.country?.code === country);
	}
	if (activityStatus && ACTIVITY_STATUSES[activityStatus]) {
		filtered = filtered.filter((r) => r.activityStatus === activityStatus);
	}
	if (tag) {
		filtered = filtered.filter((r) => r.tags.some((t) => t.id === tag));
	}
	if (partner) {
		filtered = filtered.filter((r) => r.partnerName === partner);
	}

	const trimmedSearch = String(search || "").trim().toLowerCase();
	if (trimmedSearch) {
		filtered = filtered.filter(
			(r) =>
				r.username?.toLowerCase().includes(trimmedSearch) ||
				(r.name || "").toLowerCase().includes(trimmedSearch) ||
				(r.partnerName || "").toLowerCase().includes(trimmedSearch),
		);
	}

	return filtered;
};

/**
 * Üst kısımdaki özet kartlarının verisini hesaplar.
 */
const getSummary = async (query = {}) => {
	const records = applyFilters(await buildMemberRecords(query), query);

	const summary = records.reduce(
		(acc, r) => {
			acc.totalMembers += 1;
			acc.totalDeposit += r.totalDeposit;
			acc.depositCount += r.depositCount;
			acc.totalWithdrawal += r.totalWithdrawal;
			acc.totalClaimedBonus += r.claimedBonus;
			acc.totalManualBonus += r.manualBonus;
			acc.totalManualBalance += r.manualBalance;
			acc.totalWalletBalance += r.walletBalance;
			acc.totalBetAmount += r.betTotal;
			acc.totalWinAmount += r.winTotal;
			if (r.activityStatus === "active") acc.activeCount += 1;
			else if (r.activityStatus === "at_risk") acc.atRiskCount += 1;
			else if (r.activityStatus === "churned") acc.churnedCount += 1;
			else acc.neverPlayedCount += 1;
			return acc;
		},
		{
			totalMembers: 0,
			totalDeposit: 0,
			depositCount: 0,
			totalWithdrawal: 0,
			totalClaimedBonus: 0,
			totalManualBonus: 0,
			totalManualBalance: 0,
			totalWalletBalance: 0,
			totalBetAmount: 0,
			totalWinAmount: 0,
			activeCount: 0,
			atRiskCount: 0,
			churnedCount: 0,
			neverPlayedCount: 0,
		},
	);

	Object.keys(summary).forEach((k) => {
		if (
			k !== "totalMembers" &&
			k !== "depositCount" &&
			k !== "activeCount" &&
			k !== "atRiskCount" &&
			k !== "churnedCount" &&
			k !== "neverPlayedCount"
		) {
			summary[k] = round2(summary[k]);
		}
	});

	summary.avgDeposit = summary.totalMembers
		? round2(summary.totalDeposit / summary.totalMembers)
		: 0;
	summary.totalBonus = round2(summary.totalClaimedBonus + summary.totalManualBonus);
	// Site perspektifinden brüt oyun geliri (GGR): pozitif = site kârda,
	// negatif = site zararda (oyuncular toplamda kazandı).
	summary.netGamingResult = round2(summary.totalBetAmount - summary.totalWinAmount);
	summary.avgBetPerMember = summary.totalMembers
		? round2(summary.totalBetAmount / summary.totalMembers)
		: 0;

	return summary;
};

/**
 * Yatırım aralığı segmentlerine göre üye sayısı / toplam yatırım / bonus
 * kırılımı. "bucket" filtresi burada göz ardı edilir (tüm segmentler
 * gösterilir), diğer filtreler (tarih, bonusOrigin, arama, oyun türü, vb.)
 * uygulanır.
 */
const getBuckets = async (query = {}) => {
	const records = applyFilters(await buildMemberRecords(query), {
		...query,
		bucket: undefined,
	});

	return DEPOSIT_BUCKETS.map((b) => {
		const rows = records.filter((r) => r.depositBucket === b.key);
		const totalDeposit = round2(rows.reduce((s, r) => s + r.totalDeposit, 0));
		const totalClaimedBonus = round2(
			rows.reduce((s, r) => s + r.claimedBonus, 0),
		);
		const totalManualBonus = round2(
			rows.reduce((s, r) => s + r.manualBonus, 0),
		);
		const memberCount = rows.length;
		return {
			key: b.key,
			label: b.label,
			memberCount,
			totalDeposit,
			totalClaimedBonus,
			totalManualBonus,
			avgDeposit: memberCount ? round2(totalDeposit / memberCount) : 0,
		};
	});
};

/**
 * Oyun türüne (Slot / Canlı Casino / Spor Bahisi / Diğer) göre üye sayısı,
 * toplam bahis/kazanç ve site net sonucu kırılımı. "gameType" filtresi
 * burada göz ardı edilir (tüm kategoriler gösterilir), diğer filtreler
 * uygulanır.
 */
const getGameTypeBuckets = async (query = {}) => {
	const records = applyFilters(await buildMemberRecords(query), {
		...query,
		gameType: undefined,
	});

	return GAME_CATEGORIES.map((cat) => {
		const rows = records.filter((r) => r.gameBreakdown[cat.key]?.count > 0);
		const betTotal = round2(
			rows.reduce((s, r) => s + r.gameBreakdown[cat.key].bet, 0),
		);
		const winTotal = round2(
			rows.reduce((s, r) => s + r.gameBreakdown[cat.key].win, 0),
		);
		const betCount = rows.reduce(
			(s, r) => s + r.gameBreakdown[cat.key].count,
			0,
		);
		const memberCount = rows.length;
		return {
			key: cat.key,
			label: cat.label,
			memberCount,
			betTotal,
			winTotal,
			netResult: round2(betTotal - winTotal),
			avgBet: betCount ? round2(betTotal / betCount) : 0,
		};
	});
};

/**
 * Filtre dropdown'larını doldurmak için kullanılan, tarih aralığından
 * bağımsız statik/global seçenek listeleri.
 */
const getFilterOptions = async () => {
	const [countries, vipLevels, tags, partnerDocs] = await Promise.all([
		User.aggregate([
			{ $match: { "country.code": { $exists: true, $ne: null } } },
			{ $group: { _id: "$country.code", name: { $first: "$country.name" } } },
			{ $sort: { _id: 1 } },
		]),
		Vip.find({}).select("level levelName").sort({ level: 1 }).lean(),
		Tag.find({}).select("name color category").sort({ name: 1 }).lean(),
		User.find({ "affiliates.code": { $exists: true, $ne: null } })
			.select("username")
			.lean(),
	]);

	const partners = [...new Set(partnerDocs.map((u) => u.username).filter(Boolean))].sort(
		(a, b) => a.localeCompare(b),
	);

	return {
		countries: countries.map((c) => ({ code: c._id, name: c.name || c._id })),
		vipLevels: vipLevels.map((v) => ({ level: v.level, name: v.levelName })),
		tags: tags.map((t) => ({ id: String(t._id), name: t.name, color: t.color })),
		partners,
		gameTypes: GAME_CATEGORIES,
		activityStatuses: Object.values(ACTIVITY_STATUSES).map((s) => ({
			key: s.key,
			label: s.label,
		})),
	};
};

/**
 * Aranabilir / sayfalanabilir üye listesi. limit=-1 verilirse (Excel export
 * amacıyla) filtrelenmiş tüm kayıtlar tek seferde döner.
 */
const getMembers = async (query = {}) => {
	const { page = 1, limit = 20 } = query;
	const records = applyFilters(await buildMemberRecords(query), query);

	records.sort((a, b) => b.totalDeposit - a.totalDeposit);

	const total = records.length;
	const numericLimit = Number(limit);

	if (numericLimit === -1) {
		return { data: records, total, page: 1, totalPages: 1 };
	}

	const safePage = Math.max(1, Number(page) || 1);
	const perPage = Math.max(1, numericLimit || 20);
	const skip = (safePage - 1) * perPage;

	return {
		data: records.slice(skip, skip + perPage),
		total,
		page: safePage,
		totalPages: Math.max(1, Math.ceil(total / perPage)),
	};
};

module.exports = {
	DEPOSIT_BUCKETS,
	GAME_CATEGORIES,
	SYSTEM_BONUS_CATEGORIES,
	getSummary,
	getBuckets,
	getGameTypeBuckets,
	getFilterOptions,
	getMembers,
};
