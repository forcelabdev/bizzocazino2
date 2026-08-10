const User = require("../database/models/User");
const LossBonusSetting = require("../database/models/LossBonusSetting");
const LossBonusClaim = require("../database/models/LossBonusClaim");
const {
	getUserApprovedFinanceTotalsInRange,
} = require("../utils/userFinanceTotals");
const {
	createAdminManualAdjustment,
} = require("./adminManualAdjustmentService");
const { RIVO_WALLET } = require("../utils/rivoWallet");
const {
	applyWageringLock,
	evaluateBonusLock,
} = require("../utils/bonusLock");

const CATEGORY = "KAYIP BONUSU";
const SOURCE = "loss_bonus";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * Tekil (singleton) Kayıp Bonusu ayar dokümanını getirir, yoksa varsayılan
 * değerlerle oluşturur.
 */
const getSettings = async () => {
	let settings = await LossBonusSetting.findOne();
	if (!settings) {
		settings = await LossBonusSetting.create({});
	}
	return settings;
};

const updateSettings = async (patch = {}, actorUser = null) => {
	const settings = await getSettings();
	const allowedFields = [
		"enabled",
		"percentage",
		"maxBonusAmount",
		"minLossAmount",
		"wageringMultiplier",
		"autoApprove",
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
 * net kaybını hesaplar.
 * Formül: Net Kayıp = Toplam Yatırım - Toplam Çekim - Güncel Bakiye
 */
const calculatePeriodLoss = async (user) => {
	const periodStart = user.lossBonus?.lastClaimAt || user.createdAt || new Date();
	const periodEnd = new Date();

	const { totalDeposit, totalWithdrawal } =
		await getUserApprovedFinanceTotalsInRange(user._id, {
			from: periodStart,
			to: periodEnd,
		});

	const currentBalance = getUserBalance(user);
	const netLoss = roundMoney(totalDeposit - totalWithdrawal - currentBalance);

	return {
		periodStart,
		periodEnd,
		totalDeposit: roundMoney(totalDeposit),
		totalWithdrawal: roundMoney(totalWithdrawal),
		currentBalance: roundMoney(currentBalance),
		netLoss,
	};
};

const computeBonusAmount = (netLoss, settings) => {
	const calculatedAmount = roundMoney(netLoss * (settings.percentage / 100));
	const appliedAmount =
		settings.maxBonusAmount > 0
			? roundMoney(Math.min(calculatedAmount, settings.maxBonusAmount))
			: calculatedAmount;
	return { calculatedAmount, appliedAmount };
};

/**
 * Oyuncunun şu an talep edebileceği potansiyel kayıp bonusunu hesaplar.
 * Bakiyeyi/veritabanını DEĞİŞTİRMEZ, sadece önizleme amaçlıdır.
 */
const getPotential = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	const period = await calculatePeriodLoss(user);

	const hasLoss = period.netLoss > 0;
	const meetsMinimum =
		hasLoss && period.netLoss >= (settings.minLossAmount || 0);
	const lockStatus = await evaluateBonusLock(user);
	const blockedByOtherBonus = lockStatus.active;
	const eligible = Boolean(
		settings.enabled && meetsMinimum && !blockedByOtherBonus
	);

	const { appliedAmount } = hasLoss
		? computeBonusAmount(period.netLoss, settings)
		: { appliedAmount: 0 };

	let message;
	if (!settings.enabled) {
		message = "Kayıp bonusu şu anda aktif değil.";
	} else if (blockedByOtherBonus && lockStatus.type === "wagering") {
		message = `Devam eden bir bonusun çevrim şartını tamamlamadan yeni bonus talep edemezsiniz. Çevrim için ${lockStatus.wageringRemaining.toLocaleString("tr-TR")} TL daha bahis yapmanız gerekiyor.`;
	} else if (blockedByOtherBonus) {
		message = "Yakın zamanda alınan bir bonus nedeniyle şu anda başka bonus talep edemezsiniz.";
	} else if (!hasLoss) {
		message = "Bu dönemde kaybınız olmadığı için bonus talep edemezsiniz.";
	} else if (!meetsMinimum) {
		message = `Bonus talep etmek için en az ${settings.minLossAmount} TL net kaybınız olmalı.`;
	} else {
		message = `${appliedAmount.toLocaleString("tr-TR")} TL kayıp bonusu talep edebilirsiniz.`;
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
 * Kayıp bonusu talebini oluşturur. Aynı dönemin birden fazla kez talep
 * edilmesini önlemek için `lossBonus.lastClaimAt` alanı üzerinde optimistic
 * lock (koşullu findOneAndUpdate) kullanılır: sorgu sırasında okunan değerle
 * eşleşmiyorsa (yani araya başka bir talep girmişse) güncelleme başarısız
 * olur ve talep reddedilir.
 */
const claim = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	if (!settings.enabled) throw new Error("LOSS_BONUS_DISABLED");

	const lockStatus = await evaluateBonusLock(user);
	if (lockStatus.active) {
		const err = new Error("OTHER_BONUS_BLOCKED");
		err.wagering = lockStatus.type === "wagering" ? lockStatus : null;
		throw err;
	}

	const period = await calculatePeriodLoss(user);
	if (period.netLoss <= 0) throw new Error("NO_LOSS_IN_PERIOD");
	if (settings.minLossAmount > 0 && period.netLoss < settings.minLossAmount) {
		throw new Error("LOSS_BELOW_MINIMUM");
	}

	const { calculatedAmount, appliedAmount } = computeBonusAmount(
		period.netLoss,
		settings
	);

	const previousClaimAt = user.lossBonus?.lastClaimAt || null;
	const lockedUser = await User.findOneAndUpdate(
		{
			_id: user._id,
			"lossBonus.lastClaimAt": previousClaimAt,
		},
		{ $set: { "lossBonus.lastClaimAt": period.periodEnd } },
		{ new: true }
	);

	if (!lockedUser) {
		throw new Error("CLAIM_IN_PROGRESS");
	}

	const claimDoc = await LossBonusClaim.create({
		user: lockedUser._id,
		userSnapshot: {
			username: lockedUser.username || "",
			name: lockedUser.name || "",
			email: lockedUser.local?.email || "",
		},
		periodStart: period.periodStart,
		periodEnd: period.periodEnd,
		totalDeposit: period.totalDeposit,
		totalWithdrawal: period.totalWithdrawal,
		netLoss: period.netLoss,
		percentage: settings.percentage,
		calculatedAmount,
		appliedAmount,
		status: settings.autoApprove ? "approved" : "pending",
		autoApproved: settings.autoApprove,
		reviewedAt: settings.autoApprove ? new Date() : null,
		otherBonusesBlockedUntil: null,
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
			note: `Otomatik kayıp bonusu (%${settings.percentage})`,
			amount: appliedAmount,
			source: SOURCE,
			sourceRef: { claimId: claimDoc._id },
		});

		// Bonus fiilen kredilendikten SONRA çevrim kilidi uygulanır.
		if (settings.wageringMultiplier > 0) {
			await applyWageringLock(lockedUser._id, {
				source: SOURCE,
				claimId: claimDoc._id,
				claimModel: "LossBonusClaim",
				bonusAmount: appliedAmount,
				wageringMultiplier: settings.wageringMultiplier,
			});
		}

		claimDoc.adjustmentRef = result.adjustment._id;
		await claimDoc.save();

		return { claim: claimDoc, newBalance: result.balanceAfter };
	} catch (err) {
		// Ödeme başarısız olursa talebi bekleyen duruma çevir; admin manuel
		// olarak onaylayabilir/reddedebilir. Dönem kilidi geri alınmaz —
		// bu, ödeme tekrar denemesi sırasında aynı dönemin tekrar sayılmasını
		// engeller.
		claimDoc.status = "pending";
		claimDoc.autoApproved = false;
		claimDoc.reviewedAt = null;
		await claimDoc.save();
		throw err;
	}
};

const approveClaim = async (claimId, actorUser) => {
	const claimDoc = await LossBonusClaim.findById(claimId);
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
		note: "Kayıp bonusu talebi onaylandı",
		amount: claimDoc.appliedAmount,
		source: SOURCE,
		sourceRef: { claimId: claimDoc._id },
	});

	if (settings.wageringMultiplier > 0) {
		await applyWageringLock(user._id, {
			source: SOURCE,
			claimId: claimDoc._id,
			claimModel: "LossBonusClaim",
			bonusAmount: claimDoc.appliedAmount,
			wageringMultiplier: settings.wageringMultiplier,
		});
	}

	claimDoc.status = "approved";
	claimDoc.reviewedBy = actorUser?._id || null;
	claimDoc.reviewedAt = new Date();
	claimDoc.adjustmentRef = result.adjustment._id;
	await claimDoc.save();

	return { claim: claimDoc, newBalance: result.balanceAfter };
};

const rejectClaim = async (claimId, actorUser, reason = "") => {
	const claimDoc = await LossBonusClaim.findById(claimId);
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
