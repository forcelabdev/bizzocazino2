const User = require("../database/models/User");
const TrialBonusSetting = require("../database/models/TrialBonusSetting");
const TrialBonusClaim = require("../database/models/TrialBonusClaim");
const {
	createAdminManualAdjustment,
} = require("./adminManualAdjustmentService");
// (Aynı dizin: backend/services/adminManualAdjustmentService.js)
const { RIVO_WALLET } = require("../utils/rivoWallet");
const {
	applyBonusLock,
	applyWageringLock,
	evaluateBonusLock,
} = require("../utils/bonusLock");

const CATEGORY = "DENEME BONUSU";
const SOURCE = "trial_bonus";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const getSettings = async () => {
	let settings = await TrialBonusSetting.findOne();
	if (!settings) {
		settings = await TrialBonusSetting.create({});
	}
	return settings;
};

const updateSettings = async (patch = {}, actorUser = null) => {
	const settings = await getSettings();
	const allowedFields = [
		"enabled",
		"name",
		"amount",
		"autoApprove",
		"wageringMultiplier",
		"durationHours",
		"blockOtherBonuses",
		"trialRtpLow",
		"trialRtpHigh",
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
 * Kullanıcının deneme bonusunu talep edip edemeyeceğini döner. Bakiyeyi/
 * veritabanını DEĞİŞTİRMEZ, sadece önizleme amaçlıdır.
 */
const getPotential = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	const existingClaim = await TrialBonusClaim.findOne({
		user: userId,
		status: { $in: ["pending", "approved"] },
	});

	const lockStatus = await evaluateBonusLock(user);
	const blockedByOtherBonus = lockStatus.active;
	const eligible = Boolean(
		settings.enabled && !existingClaim && !blockedByOtherBonus
	);

	let message;
	if (!settings.enabled) {
		message = "Deneme bonusu şu anda aktif değil.";
	} else if (existingClaim) {
		message = "Deneme bonusunu daha önce talep ettiniz.";
	} else if (blockedByOtherBonus && lockStatus.type === "wagering") {
		message = `Devam eden bir bonusun çevrim şartını tamamlamadan yeni bonus talep edemezsiniz. Çevrim için ${lockStatus.wageringRemaining.toLocaleString("tr-TR")} TL daha bahis yapmanız gerekiyor.`;
	} else if (blockedByOtherBonus) {
		const until = lockStatus.blockedUntil
			? new Date(lockStatus.blockedUntil).toLocaleString("tr-TR")
			: "";
		message = `Yakın zamanda alınan bir bonus nedeniyle ${until} tarihine kadar başka bonus talep edemezsiniz.`;
	} else {
		message = `${settings.amount.toLocaleString("tr-TR")} TL deneme bonusu talep edebilirsiniz.`;
	}

	return {
		amount: settings.amount,
		eligible,
		message,
		autoApprove: settings.autoApprove,
		alreadyClaimed: Boolean(existingClaim),
	};
};

/**
 * Deneme bonusu talebini oluşturur. Hesap başına bir talep sınırı,
 * TrialBonusClaim üzerindeki partial unique index (user + status in
 * [pending, approved]) ile veritabanı seviyesinde de korunur.
 */
const claim = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	if (!settings.enabled) throw new Error("TRIAL_BONUS_DISABLED");

	const lockStatus = await evaluateBonusLock(user);
	if (lockStatus.active) {
		const err = new Error("OTHER_BONUS_BLOCKED");
		err.wagering = lockStatus.type === "wagering" ? lockStatus : null;
		throw err;
	}

	const existingClaim = await TrialBonusClaim.findOne({
		user: userId,
		status: { $in: ["pending", "approved"] },
	});
	if (existingClaim) throw new Error("ALREADY_CLAIMED");

	const amount = roundMoney(settings.amount);
	if (amount <= 0) throw new Error("TRIAL_BONUS_AMOUNT_INVALID");

	let claimDoc;
	try {
		claimDoc = await TrialBonusClaim.create({
			user: user._id,
			userSnapshot: {
				username: user.username || "",
				name: user.name || "",
				email: user.local?.email || "",
			},
			amount,
			status: settings.autoApprove ? "approved" : "pending",
			autoApproved: settings.autoApprove,
			reviewedAt: settings.autoApprove ? new Date() : null,
		});
	} catch (err) {
		// Unique index ihlali => zaten talep edilmiş (yarış durumu).
		if (err?.code === 11000) throw new Error("ALREADY_CLAIMED");
		throw err;
	}

	if (!settings.autoApprove) {
		return { claim: claimDoc, newBalance: getUserBalance(user) };
	}

	try {
		const result = await createAdminManualAdjustment({
			targetUser: user,
			actorUser: null,
			wallet: RIVO_WALLET,
			kind: "bonus",
			direction: "credit",
			category: CATEGORY,
			note: "Otomatik deneme bonusu",
			amount,
			source: SOURCE,
			sourceRef: { claimId: claimDoc._id },
		});

		const wageringLock =
			settings.wageringMultiplier > 0
				? await applyWageringLock(user._id, {
						source: SOURCE,
						claimId: claimDoc._id,
						claimModel: "TrialBonusClaim",
						bonusAmount: amount,
						wageringMultiplier: settings.wageringMultiplier,
					})
				: null;
		const blockedUntil = wageringLock
			? null
			: settings.blockOtherBonuses
				? await applyBonusLock(
						user._id,
						Math.max(settings.durationHours || 0, 0),
						SOURCE
					)
				: null;

		claimDoc.otherBonusesBlockedUntil = blockedUntil;
		claimDoc.adjustmentRef = result.adjustment._id;
		await claimDoc.save();

		return { claim: claimDoc, newBalance: result.balanceAfter };
	} catch (err) {
		claimDoc.status = "pending";
		claimDoc.autoApproved = false;
		claimDoc.reviewedAt = null;
		await claimDoc.save();
		throw err;
	}
};

const approveClaim = async (claimId, actorUser) => {
	const claimDoc = await TrialBonusClaim.findById(claimId);
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
		note: "Deneme bonusu talebi onaylandı",
		amount: claimDoc.amount,
		source: SOURCE,
		sourceRef: { claimId: claimDoc._id },
	});

	const wageringLock =
		settings.wageringMultiplier > 0
			? await applyWageringLock(user._id, {
					source: SOURCE,
					claimId: claimDoc._id,
					claimModel: "TrialBonusClaim",
					bonusAmount: claimDoc.amount,
					wageringMultiplier: settings.wageringMultiplier,
				})
			: null;
	const blockedUntil = wageringLock
		? null
		: settings.blockOtherBonuses
			? await applyBonusLock(
					user._id,
					Math.max(settings.durationHours || 0, 0),
					SOURCE
				)
			: null;

	claimDoc.otherBonusesBlockedUntil = blockedUntil;
	claimDoc.status = "approved";
	claimDoc.reviewedBy = actorUser?._id || null;
	claimDoc.reviewedAt = new Date();
	claimDoc.adjustmentRef = result.adjustment._id;
	await claimDoc.save();

	return { claim: claimDoc, newBalance: result.balanceAfter };
};

const rejectClaim = async (claimId, actorUser, reason = "") => {
	const claimDoc = await TrialBonusClaim.findById(claimId);
	if (!claimDoc) throw new Error("CLAIM_NOT_FOUND");
	if (claimDoc.status !== "pending") throw new Error("CLAIM_NOT_PENDING");

	claimDoc.status = "rejected";
	claimDoc.reviewedBy = actorUser?._id || null;
	claimDoc.reviewedAt = new Date();
	claimDoc.rejectionReason = String(reason || "").trim();
	await claimDoc.save();

	return claimDoc;
};

/**
 * Verilen kullanıcı ID listesi için onaylanmış deneme bonusu bilgisini
 * (tutar + tarih) haritalar. Call Management (control-game) ekranındaki
 * "Deneme Bonusu" rozeti/filtresi için kullanılır — RTP/çarpan/oyun sonucu
 * hesaplaması YAPMAZ, sadece bilgi amaçlıdır.
 */
const getApprovedClaimsMap = async (userIds = []) => {
	const validIds = [...new Set(userIds)].filter((id) =>
		require("mongoose").Types.ObjectId.isValid(id)
	);
	if (!validIds.length) return {};

	const claims = await TrialBonusClaim.find({
		user: { $in: validIds },
		status: "approved",
	})
		.select("user amount reviewedAt createdAt")
		.lean();

	const map = {};
	for (const claimDoc of claims) {
		map[String(claimDoc.user)] = {
			amount: claimDoc.amount,
			claimedAt: claimDoc.reviewedAt || claimDoc.createdAt,
		};
	}
	return map;
};

/**
 * Kullanıcının deneme bonusundan kalan bir çevrim (wagering) şartı aktifse
 * yükseltilmiş RTP değerlerini döner, yoksa null döner. Oyun her açılışında
 * (GetGameUrl) canlı olarak çağrılır — çevrim tamamlandığı anda
 * evaluateBonusLock kilidi otomatik kapatır ve burası null dönmeye başlar,
 * böylece RTP ek bir job/cron olmadan kendiliğinden normale döner.
 */
const getActiveRtp = async (user) => {
	if (!user) return null;

	const settings = await getSettings();
	const low = Number(settings.trialRtpLow || 0);
	const high = Number(settings.trialRtpHigh || 0);
	if (low <= 0 && high <= 0) return null;

	const lockStatus = await evaluateBonusLock(user);
	if (!lockStatus.active) return null;
	if (lockStatus.type !== "wagering") return null;
	if (lockStatus.source !== SOURCE) return null;

	return {
		lowRtp: low > 0 ? low : undefined,
		highRtp: high > 0 ? high : undefined,
	};
};

module.exports = {
	getSettings,
	updateSettings,
	getPotential,
	claim,
	approveClaim,
	rejectClaim,
	getApprovedClaimsMap,
	getActiveRtp,
};
