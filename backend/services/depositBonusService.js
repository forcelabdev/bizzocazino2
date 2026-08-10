const User = require("../database/models/User");
const DepositBonusSetting = require("../database/models/DepositBonusSetting");
const DepositBonusClaim = require("../database/models/DepositBonusClaim");
const {
	getUserApprovedFinanceTotalsInRange,
} = require("../utils/userFinanceTotals");
const { hasUserBetSince } = require("../utils/userBetActivity");
const {
	createAdminManualAdjustment,
} = require("./adminManualAdjustmentService");
const { RIVO_WALLET } = require("../utils/rivoWallet");
const {
	isBonusLocked,
	getBonusLockInfo,
	applyBonusLock,
} = require("../utils/bonusLock");

const CATEGORY = "YATIRIM BONUSU";
const SOURCE = "deposit_bonus";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * Tekil (singleton) Yatırım Bonusu ayar dokümanını getirir, yoksa varsayılan
 * değerlerle oluşturur.
 */
const getSettings = async () => {
	let settings = await DepositBonusSetting.findOne();
	if (!settings) {
		settings = await DepositBonusSetting.create({});
	}
	return settings;
};

const updateSettings = async (patch = {}, actorUser = null) => {
	const settings = await getSettings();
	const allowedFields = [
		"enabled",
		"name",
		"percentage",
		"fixedAmount",
		"maxBonusAmount",
		"minDepositAmount",
		"maxDepositAmount",
		"wageringMultiplier",
		"durationHours",
		"autoApprove",
		"blockOtherBonuses",
		"note",
	];

	for (const field of allowedFields) {
		if (patch[field] !== undefined) {
			settings[field] = patch[field];
		}
	}

	settings.updatedBy = actorUser?._id || null;
	await settings.save();
	return settings;
};

const getUserBalance = (user) => {
	const wallets = Array.isArray(user?.wallets) ? user.wallets : [];
	const wallet =
		wallets.find(
			(w) =>
				w.coinType === RIVO_WALLET.coinType &&
				w.chain === RIVO_WALLET.chain &&
				w.type === RIVO_WALLET.type
		) || wallets[0];
	return Number(wallet?.balance || 0);
};

/**
 * Kullanıcının "son talep tarihi (veya kayıt tarihi) -> şu an" aralığındaki
 * toplam yatırımını ve bu dönemde HERHANGİ bir bahis yapıp yapmadığını
 * hesaplar. Tek bir bahis dahi tespit edilirse dönem "kirlenmiş" sayılır ve
 * bonus talep edilemez — kullanıcı yeniden yatırım yapıp bahis oynamadan
 * talep etmelidir.
 */
const calculatePeriod = async (user) => {
	const periodStart = user.depositBonus?.lastClaimAt || user.createdAt || new Date();
	const periodEnd = new Date();

	const [{ totalDeposit }, hasBet] = await Promise.all([
		getUserApprovedFinanceTotalsInRange(user._id, {
			from: periodStart,
			to: periodEnd,
		}),
		hasUserBetSince(user._id, periodStart),
	]);

	return {
		periodStart,
		periodEnd,
		totalDeposit: roundMoney(totalDeposit),
		hasBet,
	};
};

const computeBonusAmount = (totalDeposit, settings) => {
	const percentageAmount = roundMoney(totalDeposit * (settings.percentage / 100));
	const calculatedAmount =
		settings.fixedAmount > 0
			? roundMoney(settings.fixedAmount)
			: percentageAmount;
	const appliedAmount =
		settings.maxBonusAmount > 0
			? roundMoney(Math.min(calculatedAmount, settings.maxBonusAmount))
			: calculatedAmount;
	return { calculatedAmount, appliedAmount };
};

/**
 * Oyuncunun şu an talep edebileceği potansiyel yatırım bonusunu hesaplar.
 * Bakiyeyi/veritabanını DEĞİŞTİRMEZ, sadece önizleme amaçlıdır.
 */
const getPotential = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	const period = await calculatePeriod(user);

	const hasDeposit = period.totalDeposit > 0;
	const meetsMinimum =
		hasDeposit && period.totalDeposit >= (settings.minDepositAmount || 0);
	const withinMax =
		!settings.maxDepositAmount ||
		settings.maxDepositAmount <= 0 ||
		period.totalDeposit <= settings.maxDepositAmount;
	const blockedByOtherBonus = isBonusLocked(user);
	const eligible = Boolean(
		settings.enabled &&
			meetsMinimum &&
			withinMax &&
			!period.hasBet &&
			!blockedByOtherBonus
	);

	const { appliedAmount } = hasDeposit
		? computeBonusAmount(period.totalDeposit, settings)
		: { appliedAmount: 0 };

	let message;
	if (!settings.enabled) {
		message = "Yatırım bonusu şu anda aktif değil.";
	} else if (blockedByOtherBonus) {
		const lockInfo = getBonusLockInfo(user);
		const until = lockInfo?.blockedUntil
			? new Date(lockInfo.blockedUntil).toLocaleString("tr-TR")
			: "";
		message = `Yakın zamanda alınan bir bonus nedeniyle ${until} tarihine kadar başka bonus talep edemezsiniz.`;
	} else if (!hasDeposit) {
		message = "Talep edebileceğiniz bir yatırımınız bulunmuyor.";
	} else if (period.hasBet) {
		message = "Yatırımınızdan sonra bir oyuna/bahse katıldığınız için bu bonusu talep edemezsiniz.";
	} else if (!meetsMinimum) {
		message = `Bonus talep etmek için en az ${settings.minDepositAmount} TL yatırımınız olmalı.`;
	} else if (!withinMax) {
		message = `Bonus, ${settings.maxDepositAmount} TL üzerindeki yatırımları kapsamıyor.`;
	} else {
		message = `${appliedAmount.toLocaleString("tr-TR")} TL yatırım bonusu talep edebilirsiniz.`;
	}

	return {
		...period,
		percentage: settings.percentage,
		potentialBonus: appliedAmount,
		eligible,
		message,
		autoApprove: settings.autoApprove,
	};
};

/**
 * Yatırım bonusu talebini oluşturur. Aynı dönemin birden fazla kez talep
 * edilmesini önlemek için `depositBonus.lastClaimAt` alanı üzerinde
 * optimistic lock (koşullu findOneAndUpdate) kullanılır.
 */
const claim = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	if (!settings.enabled) throw new Error("DEPOSIT_BONUS_DISABLED");

	if (isBonusLocked(user)) {
		throw new Error("OTHER_BONUS_BLOCKED");
	}

	const period = await calculatePeriod(user);
	if (period.hasBet) throw new Error("BET_PLACED_SINCE_DEPOSIT");
	if (period.totalDeposit <= 0) throw new Error("NO_DEPOSIT_IN_PERIOD");
	if (
		settings.minDepositAmount > 0 &&
		period.totalDeposit < settings.minDepositAmount
	) {
		throw new Error("DEPOSIT_BELOW_MINIMUM");
	}
	if (
		settings.maxDepositAmount > 0 &&
		period.totalDeposit > settings.maxDepositAmount
	) {
		throw new Error("DEPOSIT_ABOVE_MAXIMUM");
	}

	const { calculatedAmount, appliedAmount } = computeBonusAmount(
		period.totalDeposit,
		settings
	);

	const previousClaimAt = user.depositBonus?.lastClaimAt || null;
	const lockedUser = await User.findOneAndUpdate(
		{
			_id: user._id,
			"depositBonus.lastClaimAt": previousClaimAt,
		},
		{
			$set: {
				"depositBonus.lastClaimAt": period.periodEnd,
			},
		},
		{ new: true }
	);

	if (!lockedUser) {
		throw new Error("CLAIM_IN_PROGRESS");
	}

	const blockedUntil = settings.blockOtherBonuses
		? await applyBonusLock(
				lockedUser._id,
				Math.max(settings.durationHours || 0, 0),
				SOURCE
			)
		: null;

	const claimDoc = await DepositBonusClaim.create({
		user: lockedUser._id,
		userSnapshot: {
			username: lockedUser.username || "",
			name: lockedUser.name || "",
			email: lockedUser.local?.email || "",
		},
		periodStart: period.periodStart,
		periodEnd: period.periodEnd,
		totalDeposit: period.totalDeposit,
		percentage: settings.percentage,
		calculatedAmount,
		appliedAmount,
		status: settings.autoApprove ? "approved" : "pending",
		autoApproved: settings.autoApprove,
		reviewedAt: settings.autoApprove ? new Date() : null,
		otherBonusesBlockedUntil: blockedUntil,
	});

	if (!settings.autoApprove) {
		return { claim: claimDoc, newBalance: getUserBalance(lockedUser) };
	}

	try {
		const result = await createAdminManualAdjustment({
			targetUser: lockedUser,
			actorUser: null,
			wallet: RIVO_WALLET,
			kind: "bonus",
			direction: "credit",
			category: CATEGORY,
			note: `Otomatik yatırım bonusu (%${settings.percentage})`,
			amount: appliedAmount,
			source: SOURCE,
			sourceRef: { claimId: claimDoc._id },
		});

		claimDoc.adjustmentRef = result.adjustment._id;
		await claimDoc.save();

		return { claim: claimDoc, newBalance: result.balanceAfter };
	} catch (err) {
		// Ödeme başarısız olursa talebi bekleyen duruma çevir; admin manuel
		// olarak onaylayabilir/reddedebilir. Dönem kilidi geri alınmaz.
		claimDoc.status = "pending";
		claimDoc.autoApproved = false;
		claimDoc.reviewedAt = null;
		await claimDoc.save();
		throw err;
	}
};

const approveClaim = async (claimId, actorUser) => {
	const claimDoc = await DepositBonusClaim.findById(claimId);
	if (!claimDoc) throw new Error("CLAIM_NOT_FOUND");
	if (claimDoc.status !== "pending") throw new Error("CLAIM_NOT_PENDING");

	const user = await User.findById(claimDoc.user);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();

	const result = await createAdminManualAdjustment({
		targetUser: user,
		actorUser,
		wallet: RIVO_WALLET,
		kind: "bonus",
		direction: "credit",
		category: CATEGORY,
		note: "Yatırım bonusu talebi onaylandı",
		amount: claimDoc.appliedAmount,
		source: SOURCE,
		sourceRef: { claimId: claimDoc._id },
	});

	let blockedUntil = null;
	if (settings.blockOtherBonuses) {
		blockedUntil = await applyBonusLock(
			user._id,
			Math.max(settings.durationHours || 0, 0),
			SOURCE
		);
	}

	claimDoc.otherBonusesBlockedUntil = blockedUntil;
	claimDoc.status = "approved";
	claimDoc.reviewedBy = actorUser?._id || null;
	claimDoc.reviewedAt = new Date();
	claimDoc.adjustmentRef = result.adjustment._id;
	await claimDoc.save();

	return { claim: claimDoc, newBalance: result.balanceAfter };
};

const rejectClaim = async (claimId, actorUser, reason = "") => {
	const claimDoc = await DepositBonusClaim.findById(claimId);
	if (!claimDoc) throw new Error("CLAIM_NOT_FOUND");
	if (claimDoc.status !== "pending") throw new Error("CLAIM_NOT_PENDING");

	claimDoc.status = "rejected";
	claimDoc.reviewedBy = actorUser?._id || null;
	claimDoc.reviewedAt = new Date();
	claimDoc.rejectionReason = String(reason || "").trim();
	await claimDoc.save();

	return claimDoc;
};

module.exports = {
	getSettings,
	updateSettings,
	getPotential,
	claim,
	approveClaim,
	rejectClaim,
};
