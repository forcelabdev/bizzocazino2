const mongoose = require("mongoose");

const User = require("../database/models/User");
const AdminManualAdjustment = require("../database/models/AdminManualAdjustment");
const CampaignTransaction = require("../database/models/CampaignTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");
const BalanceAnalysisSetting = require("../database/models/BalanceAnalysisSetting");
const { TRIAL_BONUS_CATEGORY } = require("./trialBonusService");

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * req.query'den gelen startDate/endDate (ISO string ya da epoch ms) değerlerini
 * Mongo $match için kullanılabilir bir tarih aralığı objesine çevirir.
 */
const buildDateRange = (startDate, endDate) => {
	const range = {};
	if (startDate) {
		const d = new Date(Number.isNaN(Number(startDate)) ? startDate : Number(startDate));
		if (!Number.isNaN(d.getTime())) range.$gte = d;
	}
	if (endDate) {
		const d = new Date(Number.isNaN(Number(endDate)) ? endDate : Number(endDate));
		if (!Number.isNaN(d.getTime())) range.$lte = d;
	}
	return Object.keys(range).length ? range : null;
};

// ── Ayarlar (Kalan Agent / Bonus Bakiyesi için başlangıç tarih & tutar) ────

const getSettings = async () => {
	let settings = await BalanceAnalysisSetting.findOne();
	if (!settings) {
		settings = await BalanceAnalysisSetting.create({});
	}
	return settings;
};

const updateSettings = async (patch = {}, actorUser = null) => {
	const settings = await getSettings();
	const allowedFields = [
		"agentBalanceOriginAt",
		"agentBalanceInitial",
		"bonusBalanceOriginAt",
		"bonusBalanceInitial",
		"trialBonusBalanceOriginAt",
		"trialBonusBalanceInitial",
	];

	for (const field of allowedFields) {
		if (patch[field] !== undefined) {
			if (field.endsWith("OriginAt")) {
				settings[field] = patch[field] ? new Date(patch[field]) : null;
			} else {
				settings[field] = Math.max(0, Number(patch[field]) || 0);
			}
		}
	}

	settings.updatedBy = actorUser?._id || null;
	await settings.save();
	return settings;
};

/**
 * Kalan Agent Bakiyesi: başlangıç tutarından, başlangıç tarihinden sonraki
 * onaylı Filux + xPayment deposit toplamı düşülerek hesaplanır.
 */
const getRemainingAgentBalance = async (settings) => {
	if (!settings.agentBalanceOriginAt) {
		return { depositSum: 0, remaining: settings.agentBalanceInitial };
	}

	const depositQuery = {
		type: "deposit",
		status: "approved",
		createdAt: { $gt: settings.agentBalanceOriginAt },
	};

	const [fluxTotal, xpayTotal] = await Promise.all([
		FluxKriptoTransaction.aggregate([
			{ $match: depositQuery },
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]),
		XPaymentTransaction.aggregate([
			{ $match: depositQuery },
			{ $group: { _id: null, total: { $sum: "$amount" } } },
		]),
	]);

	const depositSum = round2(
		Number(fluxTotal[0]?.total || 0) + Number(xpayTotal[0]?.total || 0),
	);

	return {
		depositSum,
		remaining: round2(settings.agentBalanceInitial - depositSum),
	};
};

/**
 * Kalan Bonus Bakiyesi: başlangıç tutarından, başlangıç tarihinden sonraki
 * manuel eklenen (kind=bonus, direction=credit) toplam düşülerek hesaplanır.
 * Deneme bonusu (trial bonus) kategorisindeki kayıtlar HARİÇ tutulur —
 * onlar artık ayrı "Kalan Deneme Bonus Bakiyesi" havuzundan düşülür
 * (bkz. getRemainingTrialBonusBalance).
 */
const getRemainingBonusBalance = async (settings) => {
	if (!settings.bonusBalanceOriginAt) {
		return { bonusSum: 0, remaining: settings.bonusBalanceInitial };
	}

	const bonusResult = await AdminManualAdjustment.aggregate([
		{
			$match: {
				direction: "credit",
				kind: "bonus",
				category: { $ne: TRIAL_BONUS_CATEGORY },
				createdAt: { $gt: settings.bonusBalanceOriginAt },
			},
		},
		{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
	]);

	const bonusSum = round2(Number(bonusResult[0]?.total || 0));

	return {
		bonusSum,
		remaining: round2(settings.bonusBalanceInitial - bonusSum),
	};
};

/**
 * Kalan Deneme Bonus Bakiyesi: başlangıç tutarından (varsayılan 1.000.000 TL),
 * sistemden verilen deneme bonusu (kind=bonus, direction=credit,
 * category="DENEME BONUSU") toplamı düşülerek hesaplanır. originAt boşsa
 * (varsayılan) tüm zamanların toplamı düşülür.
 */
const getRemainingTrialBonusBalance = async (settings) => {
	const match = {
		direction: "credit",
		kind: "bonus",
		category: TRIAL_BONUS_CATEGORY,
	};
	if (settings.trialBonusBalanceOriginAt) {
		match.createdAt = { $gt: settings.trialBonusBalanceOriginAt };
	}

	const trialBonusResult = await AdminManualAdjustment.aggregate([
		{ $match: match },
		{ $group: { _id: null, total: { $sum: "$appliedAmount" } } },
	]);

	const trialBonusSum = round2(Number(trialBonusResult[0]?.total || 0));
	// Şema alanı henüz eski bir dokümana yazılmamışsa (migration edilmemiş
	// kayıt) undefined/NaN'a düşmeyip varsayılan 1.000.000 TL'ye geri dönülür.
	const trialBonusInitial = Number.isFinite(Number(settings.trialBonusBalanceInitial))
		? Number(settings.trialBonusBalanceInitial)
		: 1000000;

	return {
		trialBonusSum,
		remaining: round2(trialBonusInitial - trialBonusSum),
	};
};

// Admin/personel hesapları (rank="admin" veya bir adminRole atanmış
// olanlar) bakiye analizi toplamlarına dahil edilmez.
const getAdminUserIds = async () => {
	const admins = await User.find({
		$or: [{ rank: "admin" }, { adminRole: { $exists: true } }],
	})
		.select("_id")
		.lean();
	return admins.map((a) => a._id);
};

/**
 * Üst kısımdaki özet kutucuklarının (kartların) tamamını hesaplar.
 */
const getSummary = async ({ startDate, endDate } = {}) => {
	const dateRange = buildDateRange(startDate, endDate);
	const adminIds = await getAdminUserIds();

	const adjMatch = { direction: "credit", targetUser: { $nin: adminIds } };
	if (dateRange) adjMatch.createdAt = dateRange;

	const depositMatch = {
		type: "deposit",
		status: "approved",
		user: { $nin: adminIds },
	};
	if (dateRange) depositMatch.createdAt = dateRange;

	const campaignMatch = { status: "completed", user: { $nin: adminIds } };
	if (dateRange) campaignMatch.createdAt = dateRange;

	const [
		adjByKind,
		fluxAgg,
		xpayAgg,
		campaignAgg,
		settings,
	] = await Promise.all([
		AdminManualAdjustment.aggregate([
			{ $match: adjMatch },
			{
				$group: {
					_id: "$kind",
					total: { $sum: "$appliedAmount" },
					count: { $sum: 1 },
				},
			},
		]),
		FluxKriptoTransaction.aggregate([
			{ $match: depositMatch },
			{
				$group: {
					_id: null,
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
		]),
		XPaymentTransaction.aggregate([
			{ $match: depositMatch },
			{
				$group: {
					_id: null,
					total: { $sum: "$amount" },
					count: { $sum: 1 },
				},
			},
		]),
		CampaignTransaction.aggregate([
			{ $match: campaignMatch },
			{
				$group: {
					_id: null,
					total: { $sum: "$rewardAmount" },
					count: { $sum: 1 },
				},
			},
		]),
		getSettings(),
	]);

	const bonusKind = adjByKind.find((a) => a._id === "bonus") || {
		total: 0,
		count: 0,
	};
	const balanceKind = adjByKind.find((a) => a._id === "balance") || {
		total: 0,
		count: 0,
	};

	const manualBonusAmount = round2(bonusKind.total);
	const manualBonusCount = bonusKind.count || 0;
	const manualBalanceAmount = round2(balanceKind.total);
	const manualBalanceCount = balanceKind.count || 0;

	const filuxAmount = round2(fluxAgg[0]?.total || 0);
	const filuxCount = fluxAgg[0]?.count || 0;
	const xpayAmount = round2(xpayAgg[0]?.total || 0);
	const xpayCount = xpayAgg[0]?.count || 0;

	const campaignAmount = round2(campaignAgg[0]?.total || 0);
	const campaignCount = campaignAgg[0]?.count || 0;

	const totalDepositAmount = round2(filuxAmount + xpayAmount);
	const totalDepositCount = filuxCount + xpayCount;

	const totalLoadedAmount = round2(
		manualBonusAmount + manualBalanceAmount + campaignAmount,
	);
	const totalManualCount = manualBonusCount + manualBalanceCount;

	const [agentBalance, bonusBalance, trialBonusBalance] = await Promise.all([
		getRemainingAgentBalance(settings),
		getRemainingBonusBalance(settings),
		getRemainingTrialBonusBalance(settings),
	]);

	return {
		totalLoadedAmount,
		totalDepositAmount,
		totalDepositCount,
		manualBonusAmount,
		manualBonusCount,
		manualBalanceAmount,
		manualBalanceCount,
		filuxAmount,
		filuxCount,
		xpayAmount,
		xpayCount,
		campaignAmount,
		campaignCount,
		totalManualCount,
		remainingAgentBalance: agentBalance.remaining,
		remainingBonusBalance: bonusBalance.remaining,
		remainingTrialBonusBalance: trialBonusBalance.remaining,
		settings: {
			agentBalanceOriginAt: settings.agentBalanceOriginAt,
			agentBalanceInitial: settings.agentBalanceInitial,
			bonusBalanceOriginAt: settings.bonusBalanceOriginAt,
			bonusBalanceInitial: settings.bonusBalanceInitial,
			trialBonusBalanceOriginAt: settings.trialBonusBalanceOriginAt,
			trialBonusBalanceInitial: settings.trialBonusBalanceInitial,
		},
	};
};

/**
 * Üye bazlı özet + arama + sayfalama listesi.
 * Sadece "credit" yönlü manuel işlemler ve tamamlanmış kampanya bonusları
 * kullanıcı toplamına dahil edilir (borç/iptal işlemleri hariçtir).
 */
const getMembers = async ({
	search = "",
	page = 1,
	limit = 20,
	startDate,
	endDate,
} = {}) => {
	const dateRange = buildDateRange(startDate, endDate);

	const adjMatch = { direction: "credit" };
	if (dateRange) adjMatch.createdAt = dateRange;

	const campaignMatch = { status: "completed" };
	if (dateRange) campaignMatch.createdAt = dateRange;

	const [adjustments, campaigns] = await Promise.all([
		AdminManualAdjustment.find(adjMatch)
			.select(
				"targetUser targetSnapshot kind appliedAmount requestedAmount createdAt",
			)
			.sort({ createdAt: -1 })
			.lean(),
		CampaignTransaction.find(campaignMatch)
			.select("user rewardAmount createdAt")
			.sort({ createdAt: -1 })
			.lean(),
	]);

	const allUserIds = new Set();
	adjustments.forEach((a) => allUserIds.add(String(a.targetUser)));
	campaigns.forEach((c) => allUserIds.add(String(c.user)));

	const objectIds = [...allUserIds].flatMap((id) => {
		try {
			return [new mongoose.Types.ObjectId(id)];
		} catch {
			return [];
		}
	});

	const userDocs = await User.find({
		_id: { $in: objectIds },
		rank: { $ne: "admin" },
		adminRole: { $exists: false },
	})
		.select("_id username name affiliates.code affiliates.redeemedCode")
		.lean();

	const userMap = {};
	userDocs.forEach((u) => {
		userMap[String(u._id)] = u;
	});

	// referans kodu -> partner kullanıcı adı haritası
	const codeToPartner = {};
	userDocs.forEach((u) => {
		if (u.affiliates?.code) codeToPartner[u.affiliates.code] = u.username;
	});

	const userBalMap = {};
	const ensureUser = (uid) => {
		if (!userBalMap[uid]) {
			const u = userMap[uid];
			if (!u) return null;
			const redeemedCode = u.affiliates?.redeemedCode || null;
			userBalMap[uid] = {
				userId: uid,
				username: u.username || null,
				name: u.name || null,
				redeemedCode,
				partnerName: redeemedCode
					? codeToPartner[redeemedCode] || redeemedCode
					: null,
				totalBonus: 0,
				totalBalance: 0,
				totalCampaign: 0,
				bonusCount: 0,
				campaignCount: 0,
			};
		}
		return userBalMap[uid];
	};

	for (const a of adjustments) {
		const uid = String(a.targetUser);
		const u = ensureUser(uid);
		if (!u) continue;
		const amt = round2(a.appliedAmount ?? a.requestedAmount ?? 0);
		if (a.kind === "bonus") {
			u.totalBonus += amt;
		} else if (a.kind === "balance") {
			u.totalBalance += amt;
		}
		u.bonusCount += 1;
	}

	for (const c of campaigns) {
		const uid = String(c.user);
		const u = ensureUser(uid);
		if (!u) continue;
		u.totalCampaign += round2(c.rewardAmount || 0);
		u.campaignCount += 1;
	}

	let allUsers = Object.values(userBalMap).filter(
		(u) => u.username != null && u.username !== "",
	);

	allUsers.forEach((u) => {
		u.totalBonus = round2(u.totalBonus);
		u.totalBalance = round2(u.totalBalance);
		u.totalCampaign = round2(u.totalCampaign);
		u.totalLoaded = round2(u.totalBonus + u.totalBalance + u.totalCampaign);
	});

	const trimmedSearch = String(search || "").trim().toLowerCase();
	if (trimmedSearch) {
		allUsers = allUsers.filter(
			(u) =>
				u.username?.toLowerCase().includes(trimmedSearch) ||
				(u.name || "").toLowerCase().includes(trimmedSearch) ||
				(u.partnerName || "").toLowerCase().includes(trimmedSearch) ||
				(u.redeemedCode || "").toLowerCase().includes(trimmedSearch),
		);
	}

	allUsers.sort((a, b) => b.totalLoaded - a.totalLoaded);

	const total = allUsers.length;
	const safePage = Math.max(1, page);
	const safeLimit = Math.max(1, limit);
	const skip = (safePage - 1) * safeLimit;
	const data = allUsers.slice(skip, skip + safeLimit);

	return {
		data,
		total,
		page: safePage,
		totalPages: Math.max(1, Math.ceil(total / safeLimit)),
	};
};

/**
 * Belirli bir üyenin tüm bakiye hareketleri (manuel bonus, manuel bakiye,
 * kampanya, Filux, xPayment) kategori bazında gruplanmış olarak döner.
 */
const getMemberDetail = async (userId, { startDate, endDate } = {}) => {
	if (!mongoose.Types.ObjectId.isValid(userId)) {
		throw new Error("INVALID_USER_ID");
	}

	const dateRange = buildDateRange(startDate, endDate);

	const adjMatch = { targetUser: userId, direction: "credit" };
	if (dateRange) adjMatch.createdAt = dateRange;

	const campaignMatch = { user: userId, status: "completed" };
	if (dateRange) campaignMatch.createdAt = dateRange;

	const depositMatch = { user: userId, type: "deposit", status: "approved" };
	if (dateRange) depositMatch.createdAt = dateRange;

	const [user, adjustments, campaigns, fluxDocs, xpayDocs] = await Promise.all([
		User.findById(userId).select("_id username name affiliates").lean(),
		AdminManualAdjustment.find(adjMatch).sort({ createdAt: -1 }).lean(),
		CampaignTransaction.find(campaignMatch).sort({ createdAt: -1 }).lean(),
		FluxKriptoTransaction.find(depositMatch).sort({ createdAt: -1 }).lean(),
		XPaymentTransaction.find(depositMatch).sort({ createdAt: -1 }).lean(),
	]);

	if (!user) {
		throw new Error("USER_NOT_FOUND");
	}

	const manualBonus = adjustments.filter((a) => a.kind === "bonus");
	const manualBalance = adjustments.filter((a) => a.kind === "balance");

	const mapAdjustment = (a) => ({
		id: String(a._id),
		category: a.category,
		note: a.note || "",
		actorUsername: a.actorSnapshot?.username || a.actorSnapshot?.name || null,
		requestedAmount: round2(a.requestedAmount),
		appliedAmount: round2(a.appliedAmount),
		balanceBefore: round2(a.balanceBefore),
		balanceAfter: round2(a.balanceAfter),
		createdAt: a.createdAt,
	});

	const mapCampaign = (c) => ({
		id: String(c._id),
		title: c.campaignTitle,
		amount: round2(c.rewardAmount),
		mode: c.mode,
		createdAt: c.createdAt,
	});

	const mapDeposit = (d) => ({
		id: String(d._id),
		amount: round2(d.amount),
		status: d.status,
		currency: d.currency || "TRY",
		createdAt: d.createdAt,
	});

	const sum = (items, key) => round2(items.reduce((s, i) => s + Number(i[key] || 0), 0));

	return {
		user: {
			id: String(user._id),
			username: user.username,
			name: user.name,
			redeemedCode: user.affiliates?.redeemedCode || null,
		},
		groups: {
			manualBonus: {
				items: manualBonus.map(mapAdjustment),
				total: sum(manualBonus, "appliedAmount"),
			},
			manualBalance: {
				items: manualBalance.map(mapAdjustment),
				total: sum(manualBalance, "appliedAmount"),
			},
			campaign: {
				items: campaigns.map(mapCampaign),
				total: sum(campaigns, "rewardAmount"),
			},
			flux: {
				items: fluxDocs.map(mapDeposit),
				total: sum(fluxDocs, "amount"),
			},
			xpayment: {
				items: xpayDocs.map(mapDeposit),
				total: sum(xpayDocs, "amount"),
			},
		},
	};
};

module.exports = {
	getSettings,
	updateSettings,
	getSummary,
	getMembers,
	getMemberDetail,
};
