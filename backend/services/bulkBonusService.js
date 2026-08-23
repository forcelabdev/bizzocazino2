const mongoose = require("mongoose");
const User = require("../database/models/User");
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

	const usernameRegexes = parsedUsernames.map(
		(name) => new RegExp(`^${escapeRegex(name)}$`, "i")
	);

	const matchedUsers = await User.find({
		username: { $in: usernameRegexes },
	});

	const userByLowerUsername = new Map(
		matchedUsers.map((u) => [String(u.username || "").toLowerCase(), u])
	);

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
 * affiliate kodu seçim listesini üretir: her kod için kaç üye o kodla kayıt
 * olmuş (`affiliates.redeemedCode`) bilgisiyle birlikte.
 */
const listAffiliateCodes = async () => {
	const [owners, counts] = await Promise.all([
		User.find({ "affiliates.code": { $exists: true, $nin: [null, ""] } })
			.select("username affiliates.code")
			.lean(),
		User.aggregate([
			{ $match: { "affiliates.redeemedCode": { $exists: true, $nin: [null, ""] } } },
			{ $group: { _id: "$affiliates.redeemedCode", count: { $sum: 1 } } },
		]),
	]);

	const countByCode = new Map(counts.map((c) => [c._id, c.count]));

	return owners
		.map((owner) => ({
			code: owner.affiliates.code,
			ownerUsername: owner.username || "",
			referredCount: countByCode.get(owner.affiliates.code) || 0,
		}))
		.sort((a, b) => b.referredCount - a.referredCount);
};

module.exports = {
	createBulkManualBonus,
	listAffiliateCodes,
	MAX_USERNAMES,
};
