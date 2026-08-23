const mongoose = require("mongoose");
const User = require("../database/models/User");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const AdminManualAdjustment = require("../database/models/AdminManualAdjustment");
const ManualBonusCategory = require("../database/models/ManualBonusCategory");
const { createAdminManualAdjustment } = require("./adminManualAdjustmentService");
const { applyWageringLock } = require("../utils/bonusLock");

const MAX_USERNAMES = 500;

/**
 * Kullanıcı profilindeki manuel bonus formuyla (UserInfoEditDialog) aynı
 * cüzdan çözümleme mantığı: önce Rivo/TRON/trc-20 cüzdanı, yoksa herhangi
 * bir Rivo cüzdanı, o da yoksa kullanıcının ilk cüzdanı kullanılır.
 */
const resolveDefaultWallet = (user) => {
	const wallets = Array.isArray(user?.wallets) ? user.wallets : [];

	return (
		wallets.find(
			(w) => w.coinType === "Rivo" && w.chain === "TRON" && w.type === "trc-20"
		) ||
		wallets.find((w) => w.coinType === "Rivo") ||
		wallets[0] ||
		null
	);
};

/**
 * Girilen serbest metni (virgül ve/veya alt satır ile ayrılmış kullanıcı
 * adları) normalize edilmiş, boş olmayan, tekrarsız bir diziye çevirir.
 */
const parseUsernames = (raw) => {
	const list = Array.isArray(raw)
		? raw
		: String(raw || "")
				.split(/[\n,]/)
				.map((v) => v.trim());

	const seen = new Set();
	const result = [];

	for (const value of list) {
		const trimmed = String(value || "").trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(trimmed);
	}

	return result;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listLastBonusCategories = async () => {
	const [definedCategories, usedCategories] = await Promise.all([
		ManualBonusCategory.find({ active: true }).select("name").lean(),
		AdminManualAdjustment.distinct("category", {
			kind: "bonus",
			direction: "credit",
			category: { $exists: true, $nin: [null, ""] },
		}),
	]);

	return [
		...new Set([
			...definedCategories.map((item) => String(item.name || "").trim()),
			...usedCategories.map((name) => String(name || "").trim()),
		].filter(Boolean)),
	].sort((a, b) => a.localeCompare(b, "tr"));
};

/**
 * Admin panelindeki "Toplu Bonus Yükle" ekranı için: verilen kullanıcı adı
 * listesindeki her kullanıcıya aynı bonus tutarını/kategorisini tek tek
 * `createAdminManualAdjustment` ile işler. Opsiyonel olarak:
 *  - `affiliateCode` verilirse, sadece bu kodu kullanarak kayıt olmuş
 *    (`affiliates.redeemedCode`) üyeler bonusu alır, diğerleri atlanır.
 *  - `applyWithdrawalLock` true ve `wageringMultiplier` > 0 ise, bonus
 *    tutarı x çevrim katsayısı kadar bir ÇEVRİM ŞARTI (wagering lock)
 *    kullanıcıya uygulanır ve bu tamamlanana kadar çekim engellenir.
 *    false ise (varsayılan) bonus hiçbir çekim şartı getirmez.
 */
const createBulkManualBonus = async ({
	usernames,
	amount,
	category,
	note = "",
	wageringMultiplier = 0,
	applyWithdrawalLock = false,
	minDeposit = 0,
	minWithdraw = 0,
	affiliateCode = "",
	enforceLastBonusRule = true,
	lastBonusCategories = [],
	actorUser = null,
}) => {
	const parsedUsernames = parseUsernames(usernames);

	if (parsedUsernames.length === 0) {
		throw new Error("NO_USERNAMES_PROVIDED");
	}
	if (parsedUsernames.length > MAX_USERNAMES) {
		throw new Error("TOO_MANY_USERNAMES");
	}

	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
		throw new Error("INVALID_ADJUSTMENT_AMOUNT");
	}

	const normalizedCategory = String(category || "").trim();
	if (!normalizedCategory) {
		throw new Error("INVALID_ADJUSTMENT_CATEGORY");
	}

	const wageringMult = Number(wageringMultiplier) || 0;
	const shouldLockWithdrawal = Boolean(applyWithdrawalLock) && wageringMult > 0;
	const normalizedAffiliateCode = String(affiliateCode || "").trim();
	const shouldEnforceLastBonusRule = Boolean(enforceLastBonusRule);
	const normalizedLastBonusCategories = [
		...new Set(
			(Array.isArray(lastBonusCategories) ? lastBonusCategories : [])
				.map((name) => String(name || "").trim())
				.filter(Boolean),
		),
	];

	const usernameRegexes = parsedUsernames.map(
		(name) => new RegExp(`^${escapeRegex(name)}$`, "i")
	);

	const matchedUsers = await User.find({
		username: { $in: usernameRegexes },
	});

	const userByLowerUsername = new Map(
		matchedUsers.map((u) => [String(u.username || "").toLowerCase(), u])
	);

	const lastDepositByUserId = new Map();
	const blockingBonusByUserId = new Map();

	if (shouldEnforceLastBonusRule && matchedUsers.length) {
		const userIds = matchedUsers.map((user) => user._id);
		const deposits = await ForcelabFinanceTransaction.find({
			user: { $in: userIds },
			status: "approved",
		})
			.select("user approvedAt createdAt")
			.sort({ approvedAt: -1, createdAt: -1 })
			.lean();

		for (const deposit of deposits) {
			const userId = String(deposit.user);
			if (!lastDepositByUserId.has(userId)) {
				lastDepositByUserId.set(
					userId,
					deposit.approvedAt || deposit.createdAt,
				);
			}
		}

		if (normalizedLastBonusCategories.length) {
			const bonusRows = await AdminManualAdjustment.find({
				targetUser: { $in: userIds },
				kind: "bonus",
				direction: "credit",
				category: { $in: normalizedLastBonusCategories },
				appliedAmount: { $gt: 0 },
			})
				.select("targetUser category appliedAmount createdAt")
				.sort({ createdAt: -1 })
				.lean();

			for (const bonus of bonusRows) {
				const userId = String(bonus.targetUser);
				const lastDepositAt = lastDepositByUserId.get(userId);
				if (
					lastDepositAt &&
					bonus.createdAt > lastDepositAt &&
					!blockingBonusByUserId.has(userId)
				) {
					blockingBonusByUserId.set(userId, bonus);
				}
			}
		}
	}

	const batchId = new mongoose.Types.ObjectId();
	const results = [];
	let successCount = 0;

	for (const username of parsedUsernames) {
		const user = userByLowerUsername.get(username.toLowerCase());

		if (!user) {
			results.push({ username, status: "not_found", message: "Kullanıcı bulunamadı" });
			continue;
		}

		if (
			normalizedAffiliateCode &&
			String(user.affiliates?.redeemedCode || "").trim().toLowerCase() !==
				normalizedAffiliateCode.toLowerCase()
		) {
			results.push({
				username,
				status: "affiliate_mismatch",
				message: "Seçilen affiliate koduna ait üye değil",
			});
			continue;
		}

		if (shouldEnforceLastBonusRule) {
			const userId = String(user._id);
			const lastDepositAt = lastDepositByUserId.get(userId);
			if (!lastDepositAt) {
				results.push({
					username,
					status: "no_approved_deposit",
					message: "Onaylı yatırımı bulunamadı",
				});
				continue;
			}

			const blockingBonus = blockingBonusByUserId.get(userId);
			if (blockingBonus) {
				results.push({
					username,
					status: "last_bonus_blocked",
					message: `Son yatırım sonrası ${blockingBonus.category} alınmış`,
					blockingBonusCategory: blockingBonus.category,
					blockingBonusAt: blockingBonus.createdAt,
					lastDepositAt,
				});
				continue;
			}
		}

		const wallet = resolveDefaultWallet(user);
		if (!wallet) {
			results.push({ username, status: "no_wallet", message: "Kullanıcının cüzdanı bulunamadı" });
			continue;
		}

		try {
			const { adjustment, appliedAmount } = await createAdminManualAdjustment({
				targetUser: user,
				actorUser,
				wallet: {
					coinType: wallet.coinType,
					chain: wallet.chain,
					type: wallet.type,
				},
				kind: "bonus",
				direction: "credit",
				category: normalizedCategory,
				note,
				amount: numericAmount,
				source: "manual",
				metadata: {
					initiatedFrom: "admin-bulk-bonus",
					batchId,
					affiliateCode: normalizedAffiliateCode || null,
					wageringMultiplier: wageringMult,
					withdrawalLockApplied: shouldLockWithdrawal,
					minDeposit: Number(minDeposit) || 0,
					minWithdraw: Number(minWithdraw) || 0,
					enforceLastBonusRule: shouldEnforceLastBonusRule,
					lastBonusCategories: normalizedLastBonusCategories,
				},
			});

			if (shouldLockWithdrawal) {
				await applyWageringLock(user._id, {
					source: "manual_bulk_bonus",
					claimId: adjustment._id,
					claimModel: "AdminManualAdjustment",
					bonusAmount: appliedAmount,
					wageringMultiplier: wageringMult,
				});
			}

			successCount += 1;
			results.push({ username, status: "success", amount: appliedAmount });
		} catch (err) {
			results.push({
				username,
				status: "error",
				message: err.message || "Bilinmeyen hata",
			});
		}
	}

	return {
		batchId,
		total: parsedUsernames.length,
		successCount,
		failedCount: parsedUsernames.length - successCount,
		results,
	};
};

/**
 * "Sadece X affiliate'in üyeleri alsın" filtresi için admin ekranındaki
 * affiliate kodu seçim listesini üretir.
 *
 * ÖNEMLİ: Liste, gerçekte üyelerin kayıt olurken kullandığı kodlardan
 * (`affiliates.redeemedCode`) türetilir — sadece kendi `affiliates.code`
 * alanı set edilmiş kullanıcılardan değil. Aksi halde, kodun sahibinin
 * profilinde `affiliates.code` set edilmemiş olduğu durumlarda (veya kod
 * sahibi artık farklı bir alanla eşleşmediğinde) gerçekten kullanılan ve
 * üyesi olan kodlar listede hiç görünmez ve "0 üye" gibi yanıltıcı bir
 * sonuç oluşur. Bu yüzden önce gerçek kullanım (redeemedCode) sayılır,
 * ardından her kod için varsa sahibi (`affiliates.code` eşleşmesi) eklenir.
 */
const listAffiliateCodes = async () => {
	const [usageCounts, owners] = await Promise.all([
		User.aggregate([
			{ $match: { "affiliates.redeemedCode": { $exists: true, $nin: [null, ""] } } },
			{ $group: { _id: "$affiliates.redeemedCode", count: { $sum: 1 } } },
		]),
		User.find({ "affiliates.code": { $exists: true, $nin: [null, ""] } })
			.select("username affiliates.code")
			.lean(),
	]);

	// Kod eşleştirmesi büyük/küçük harfe duyarsız yapılır, çünkü kayıt
	// akışı affiliateCode'u kullanıcının girdiği haliyle saklar.
	const ownerByCodeLower = new Map(
		owners
			.filter((owner) => owner.affiliates?.code)
			.map((owner) => [String(owner.affiliates.code).toLowerCase(), owner])
	);

	const codesFromUsage = usageCounts.map((entry) => ({
		code: entry._id,
		ownerUsername: ownerByCodeLower.get(String(entry._id).toLowerCase())?.username || "",
		referredCount: entry.count,
	}));

	const seenCodeLower = new Set(codesFromUsage.map((c) => c.code.toLowerCase()));

	// Henüz hiç üyesi olmayan (0 üye) ama tanımlı olan kodları da listeye
	// ekle - admin bu affiliate'i seçip ileride kullanabilsin.
	const codesWithoutUsage = owners
		.filter((owner) => owner.affiliates?.code && !seenCodeLower.has(String(owner.affiliates.code).toLowerCase()))
		.map((owner) => ({
			code: owner.affiliates.code,
			ownerUsername: owner.username || "",
			referredCount: 0,
		}));

	return [...codesFromUsage, ...codesWithoutUsage].sort(
		(a, b) => b.referredCount - a.referredCount
	);
};

module.exports = {
	createBulkManualBonus,
	listAffiliateCodes,
	listLastBonusCategories,
	MAX_USERNAMES,
};
