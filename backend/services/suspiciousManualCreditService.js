const Deposit = require("../database/models/Deposit");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const GalaxyPayTransaction = require("../database/models/GalaxyPayTransaction");
const MeelDevTransaction = require("../database/models/MeelDevTransaction");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const AdminManualAdjustment = require("../database/models/AdminManualAdjustment");

// Başarısız sayılan durumlar. Deposit modeli sadece "failed" kullanıyor,
// diğer sağlayıcılar "rejected"/"cancelled"/"expired" de kullanabiliyor.
const FAILED_STATUSES = ["rejected", "cancelled", "failed", "expired"];

// Her sağlayıcı koleksiyonunun nasıl sorgulanacağını ve normalize
// edileceğini tanımlayan konfigürasyon listesi.
const PROVIDER_SOURCES = [
	{
		label: "Deposit (Legacy)",
		model: Deposit,
		typeFilter: null, // Deposit modelinde hep deposit
		statuses: ["failed"],
		rejectedAtField: "updatedAt",
	},
	{
		label: "xPayments",
		model: XPaymentTransaction,
		typeFilter: "deposit",
		statuses: FAILED_STATUSES,
		rejectedAtField: "rejectedAt",
	},
	{
		label: "FluxKripto",
		model: FluxKriptoTransaction,
		typeFilter: "deposit",
		statuses: FAILED_STATUSES,
		rejectedAtField: "rejectedAt",
	},
	{
		label: "GalaxyPay",
		model: GalaxyPayTransaction,
		typeFilter: "deposit",
		statuses: FAILED_STATUSES,
		rejectedAtField: "rejectedAt",
	},
	{
		label: "MeelDev",
		model: MeelDevTransaction,
		typeFilter: "deposit",
		statuses: FAILED_STATUSES,
		rejectedAtField: "rejectedAt",
	},
	{
		label: "ForcelabFinance",
		model: ForcelabFinanceTransaction,
		typeFilter: "deposit",
		typeField: "providerType",
		statuses: FAILED_STATUSES,
		rejectedAtField: "rejectedAt",
	},
];

/**
 * Tüm sağlayıcılardan reddedilen/başarısız yatırım denemelerini toplar.
 */
async function collectFailedDeposits(lookbackDate) {
	const results = [];

	for (const source of PROVIDER_SOURCES) {
		const query = {
			status: { $in: source.statuses },
			createdAt: { $gte: lookbackDate },
		};

		if (source.typeFilter) {
			query[source.typeField || "type"] = source.typeFilter;
		}

		const rows = await source.model
			.find(query)
			.select("user amount status createdAt updatedAt rejectedAt")
			.lean();

		for (const row of rows) {
			if (!row.user) continue;
			results.push({
				provider: source.label,
				userId: String(row.user),
				amount: Number(row.amount) || 0,
				status: row.status,
				failedAt: row[source.rejectedAtField] || row.updatedAt || row.createdAt,
				createdAt: row.createdAt,
			});
		}
	}

	return results;
}

/**
 * Reddedilen yatırım denemeleriyle sonrasında gelen manuel kredileri
 * (AdminManualAdjustment, direction: credit) tutar ve zaman penceresi
 * bazında eşleştirir. Bu bir kanıt değil, incelenmesi gereken bir
 * korelasyon sinyalidir.
 */
async function findSuspiciousManualCredits({
	page = 1,
	limit = 20,
	lookbackDays = 30,
	minRejections = 2,
	toleranceRatio = 0.05,
	matchWindowDays = 14,
	userId = null,
} = {}) {
	const pageNumber = Math.max(1, Number(page) || 1);
	const limitNumber = Math.max(1, Number(limit) || 20);
	const lookbackDate = new Date(
		Date.now() - Number(lookbackDays) * 24 * 60 * 60 * 1000
	);

	const failedDeposits = await collectFailedDeposits(lookbackDate);

	// Kullanıcıya göre grupla
	const byUser = new Map();
	for (const item of failedDeposits) {
		if (userId && item.userId !== String(userId)) continue;
		if (!byUser.has(item.userId)) byUser.set(item.userId, []);
		byUser.get(item.userId).push(item);
	}

	// Yeterli sayıda reddi olan kullanıcıları filtrele
	const candidateUserIds = [];
	for (const [uid, deposits] of byUser.entries()) {
		if (deposits.length >= Number(minRejections)) {
			candidateUserIds.push(uid);
		}
	}

	if (candidateUserIds.length === 0) {
		return {
			results: [],
			pagination: { page: pageNumber, limit: limitNumber, total: 0, pages: 0 },
		};
	}

	// Bu kullanıcılar için manuel kredileri (bonus/balance, credit) çek
	const manualCredits = await AdminManualAdjustment.find({
		targetUser: { $in: candidateUserIds },
		direction: "credit",
		createdAt: { $gte: lookbackDate },
	})
		.select(
			"targetUser targetSnapshot actorSnapshot kind category appliedAmount createdAt note"
		)
		.lean();

	const creditsByUser = new Map();
	for (const credit of manualCredits) {
		const uid = String(credit.targetUser);
		if (!creditsByUser.has(uid)) creditsByUser.set(uid, []);
		creditsByUser.get(uid).push(credit);
	}

	// Eşleştirme: her reddedilen yatırım için, tutar toleransı içinde ve
	// reddedilenden SONRA + matchWindowDays içinde bir manuel kredi ara.
	const matchWindowMs = Number(matchWindowDays) * 24 * 60 * 60 * 1000;
	const allResults = [];

	for (const uid of candidateUserIds) {
		const deposits = byUser.get(uid) || [];
		const credits = creditsByUser.get(uid) || [];
		if (credits.length === 0) continue;

		const matches = [];

		for (const deposit of deposits) {
			const failedAtTime = new Date(deposit.failedAt).getTime();
			for (const credit of credits) {
				const creditTime = new Date(credit.createdAt).getTime();
				const deltaMs = creditTime - failedAtTime;

				// Manuel kredi, reddedilen denemeden SONRA ve pencere içinde mi?
				if (deltaMs < 0 || deltaMs > matchWindowMs) continue;

				const amountDiff = Math.abs(credit.appliedAmount - deposit.amount);
				const amountDiffRatio =
					deposit.amount > 0 ? amountDiff / deposit.amount : 1;

				if (amountDiffRatio <= Number(toleranceRatio)) {
					matches.push({
						deposit,
						credit,
						daysDiff: Math.round((deltaMs / (24 * 60 * 60 * 1000)) * 10) / 10,
						amountDiffRatio: Math.round(amountDiffRatio * 1000) / 1000,
					});
				}
			}
		}

		if (matches.length === 0) continue;

		allResults.push({
			userId: uid,
			targetSnapshot: matches[0].credit.targetSnapshot,
			rejectedDeposits: deposits.map((d) => ({
				provider: d.provider,
				amount: d.amount,
				status: d.status,
				failedAt: d.failedAt,
			})),
			matches: matches.map((m) => ({
				depositProvider: m.deposit.provider,
				depositAmount: m.deposit.amount,
				depositFailedAt: m.deposit.failedAt,
				creditAmount: m.credit.appliedAmount,
				creditKind: m.credit.kind,
				creditCategory: m.credit.category,
				creditNote: m.credit.note,
				creditCreatedAt: m.credit.createdAt,
				actorSnapshot: m.credit.actorSnapshot,
				daysDiff: m.daysDiff,
				amountDiffRatio: m.amountDiffRatio,
			})),
		});
	}

	// En kritik (tutar farkı en düşük) eşleşmeler öne gelsin
	allResults.sort((a, b) => {
		const bestA = Math.min(...a.matches.map((m) => m.amountDiffRatio));
		const bestB = Math.min(...b.matches.map((m) => m.amountDiffRatio));
		return bestA - bestB;
	});

	const total = allResults.length;
	const start = (pageNumber - 1) * limitNumber;
	const paged = allResults.slice(start, start + limitNumber);

	return {
		results: paged,
		pagination: {
			page: pageNumber,
			limit: limitNumber,
			total,
			pages: Math.ceil(total / limitNumber) || 0,
		},
	};
}

module.exports = { findSuspiciousManualCredits };
