const User = require("../database/models/User");
const Vip = require("../database/models/Vip");
const Tag = require("../database/models/Tag");
const { getUserApprovedFinanceTotals } = require("../utils/userFinanceTotals");

const DAY_MS = 24 * 60 * 60 * 1000;

// İş kuralı eşikleri (tamamı TRY, dönüşüm yapılmaz)
const THRESHOLDS = {
	newSignupDays: 7,
	birthdayWindowDays: 7,
	activeWindowDays: 14,
	dormantWindowDays: 30,
	regularDepositCount: 5,
	highRollerBetTotal: 10000,
	whaleDepositTotal: 5000,
	lossStreakNetLoss: 500,
};

const daysAgo = (date, days) => {
	if (!date) return false;
	const diff = Date.now() - new Date(date).getTime();
	return diff >= 0 && diff <= days * DAY_MS;
};

const daysBeforeOrEqual = (date, days) => {
	if (!date) return false;
	const diff = Date.now() - new Date(date).getTime();
	return diff >= days * DAY_MS;
};

// Doğum gününün (ay/gün) bugünden itibaren 7 gün içinde olup olmadığını
// yıl farkını göz ardı ederek kontrol eder.
const isBirthdaySoon = (birthday, windowDays) => {
	if (!birthday) return false;
	const bd = new Date(birthday);
	if (Number.isNaN(bd.getTime())) return false;

	const now = new Date();
	const currentYear = now.getFullYear();

	const candidates = [currentYear, currentYear + 1].map((year) => {
		const next = new Date(year, bd.getMonth(), bd.getDate());
		next.setHours(0, 0, 0, 0);
		return next;
	});

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	return candidates.some((candidate) => {
		const diffDays = Math.round((candidate - today) / DAY_MS);
		return diffDays >= 0 && diffDays <= windowDays;
	});
};

// Segment tanımları. title/description admin panelinde i18n üzerinden
// çözülür (bkz. crm.segments.<key>.title / .description), backend sadece
// key + icon + color + matches predicate döner.
const SEGMENT_DEFINITIONS = [
	{
		key: "noDeposit",
		icon: "tabler-wallet-off",
		color: "secondary",
		matches: (m) => m.totalDeposit <= 0,
	},
	{
		key: "newSignups",
		icon: "tabler-user-plus",
		color: "success",
		matches: (m) => daysAgo(m.createdAt, THRESHOLDS.newSignupDays),
	},
	{
		key: "birthdaySoon",
		icon: "tabler-cake",
		color: "primary",
		matches: (m) => isBirthdaySoon(m.birthday, THRESHOLDS.birthdayWindowDays),
	},
	{
		key: "firstDepositors",
		icon: "tabler-wallet",
		color: "info",
		matches: (m) => m.depositCount === 1,
	},
	{
		key: "vipPlayers",
		icon: "tabler-crown",
		color: "warning",
		matches: (m) => m.isVip,
	},
	{
		key: "activePlayers",
		icon: "tabler-bolt",
		color: "success",
		matches: (m) => daysAgo(m.lastActivity, THRESHOLDS.activeWindowDays),
	},
	{
		key: "regularPlayers",
		icon: "tabler-repeat",
		color: "info",
		matches: (m) => m.depositCount >= THRESHOLDS.regularDepositCount,
	},
	{
		key: "highRollers",
		icon: "tabler-coin",
		color: "warning",
		matches: (m) => m.betTotal >= THRESHOLDS.highRollerBetTotal,
	},
	{
		key: "whales",
		icon: "tabler-diamond",
		color: "primary",
		matches: (m) => m.totalDeposit >= THRESHOLDS.whaleDepositTotal,
	},
	{
		key: "riskyPlayers",
		icon: "tabler-alert-triangle",
		color: "error",
		matches: (m) => m.tagCategories.has("risk"),
	},
	{
		key: "lossStreak",
		icon: "tabler-trending-down",
		color: "error",
		matches: (m) => m.netLoss >= THRESHOLDS.lossStreakNetLoss,
	},
	{
		key: "dormantPlayers",
		icon: "tabler-moon",
		color: "secondary",
		matches: (m) => daysBeforeOrEqual(m.lastActivity, THRESHOLDS.dormantWindowDays),
	},
	{
		key: "bonusAbusers",
		icon: "tabler-gift-off",
		color: "error",
		matches: (m) => m.tagCategories.has("bonus_abuse"),
	},
	{
		key: "churned",
		icon: "tabler-user-off",
		color: "secondary",
		matches: (m) =>
			m.totalDeposit > 0 && daysBeforeOrEqual(m.lastActivity, THRESHOLDS.dormantWindowDays),
	},
];

const SEGMENT_MAP = new Map(SEGMENT_DEFINITIONS.map((s) => [s.key, s]));

// Kullanıcının en düşük (base) seviyenin üzerinde olup olmadığını belirler.
const resolveVipInfo = (user, sortedVipLevels) => {
	if (!sortedVipLevels.length) {
		return { isVip: false, vipLevelName: null };
	}

	const userXp = Number(user?.xp || 0);
	let currentLevel = sortedVipLevels[0];

	for (const level of sortedVipLevels) {
		if (userXp >= level.requiredXp) {
			currentLevel = level;
		} else {
			break;
		}
	}

	return {
		isVip: currentLevel.level > sortedVipLevels[0].level,
		vipLevelName: currentLevel.levelName || null,
	};
};

/**
 * Tüm kullanıcılar için segmentasyon metriklerini hesaplar.
 * Küçük/orta ölçekli kullanıcı tabanları için bellekte hesaplama yeterlidir.
 */
const buildUserMetrics = async () => {
	const [users, vipLevels] = await Promise.all([
		User.find({})
			.select(
				"username name local.email avatar xp birthday createdAt updatedAt stats tags",
			)
			.lean(),
		Vip.find({}).sort({ level: 1 }).lean(),
	]);

	const financeTotals = await getUserApprovedFinanceTotals(
		users.map((u) => u._id),
	);

	const metricsByUserId = new Map();

	for (const user of users) {
		const finance = financeTotals.get(user._id.toString()) || {
			totalDeposit: 0,
			totalWithdrawal: 0,
			depositCount: 0,
		};

		const betTotal = Number(user?.stats?.bet || 0);
		const wonTotal = Number(user?.stats?.won || 0);
		const { isVip, vipLevelName } = resolveVipInfo(user, vipLevels);

		const tagCategories = new Set(
			(user.tags || []).map((t) => t?.category).filter(Boolean),
		);

		metricsByUserId.set(user._id.toString(), {
			user,
			totalDeposit: finance.totalDeposit,
			totalWithdrawal: finance.totalWithdrawal,
			depositCount: finance.depositCount,
			netValue: finance.totalDeposit - finance.totalWithdrawal,
			betTotal,
			wonTotal,
			netLoss: betTotal - wonTotal,
			isVip,
			vipLevelName,
			createdAt: user.createdAt,
			birthday: user.birthday,
			lastActivity: user.updatedAt,
			tagCategories,
		});
	}

	return metricsByUserId;
};

// Tag'lerin kategori bilgisiyle beraber populate edilmesi gerektiği için
// User.find sorgusuna tags populate ekliyoruz (buildUserMetrics içinde
// kullanılan .lean() sorgusuna manuel populate uygulanamaz, bu yüzden
// ayrı bir yardımcı ile tag kategorilerini çözüyoruz).
const attachTagCategories = async (metricsByUserId) => {
	const allTagIds = new Set();
	for (const metrics of metricsByUserId.values()) {
		for (const tagId of metrics.user.tags || []) {
			allTagIds.add(String(tagId));
		}
	}

	if (!allTagIds.size) return metricsByUserId;

	const tags = await Tag.find({ _id: { $in: [...allTagIds] } })
		.select("category")
		.lean();
	const categoryByTagId = new Map(tags.map((t) => [String(t._id), t.category]));

	for (const metrics of metricsByUserId.values()) {
		const categories = new Set();
		for (const tagId of metrics.user.tags || []) {
			const category = categoryByTagId.get(String(tagId));
			if (category) categories.add(category);
		}
		metrics.tagCategories = categories;
	}

	return metricsByUserId;
};

const formatUserListItem = (metrics) => {
	const { user } = metrics;
	return {
		_id: user._id,
		username: user.username || user.name || "—",
		email: user.local?.email || "",
		avatar: user.avatar || null,
		vipLevel: metrics.vipLevelName || "VIP 0",
		totalDeposit: metrics.totalDeposit,
		totalWithdrawal: metrics.totalWithdrawal,
		netValue: metrics.netValue,
	};
};

const getSegmentSummary = async () => {
	const metricsByUserId = await buildUserMetrics();
	await attachTagCategories(metricsByUserId);

	const allMetrics = [...metricsByUserId.values()];
	const totalUsers = allMetrics.length;

	return SEGMENT_DEFINITIONS.map((segment) => {
		const count = allMetrics.filter((m) => segment.matches(m)).length;
		return {
			key: segment.key,
			icon: segment.icon,
			color: segment.color,
			count,
			percent: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
		};
	});
};

const getSegmentUsers = async (key, { search = "", page = 1, limit = 20 } = {}) => {
	const segment = SEGMENT_MAP.get(key);
	if (!segment) {
		const error = new Error("Geçersiz segment anahtarı");
		error.statusCode = 400;
		throw error;
	}

	const metricsByUserId = await buildUserMetrics();
	await attachTagCategories(metricsByUserId);

	let matched = [...metricsByUserId.values()].filter((m) => segment.matches(m));

	const normalizedSearch = String(search || "").trim().toLowerCase();
	if (normalizedSearch) {
		matched = matched.filter((m) => {
			const username = (m.user.username || m.user.name || "").toLowerCase();
			const email = (m.user.local?.email || "").toLowerCase();
			return username.includes(normalizedSearch) || email.includes(normalizedSearch);
		});
	}

	matched.sort((a, b) => (a.user.username || "").localeCompare(b.user.username || ""));

	const total = matched.length;
	const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
	const safePage = Math.max(Number(page) || 1, 1);
	const startIndex = (safePage - 1) * safeLimit;
	const pageItems = matched.slice(startIndex, startIndex + safeLimit);

	return {
		users: pageItems.map(formatUserListItem),
		total,
		page: safePage,
		limit: safeLimit,
		totalPages: Math.max(1, Math.ceil(total / safeLimit)),
	};
};

module.exports = {
	THRESHOLDS,
	SEGMENT_DEFINITIONS,
	getSegmentSummary,
	getSegmentUsers,
};
