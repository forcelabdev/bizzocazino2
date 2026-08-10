const User = require("../database/models/User");
const ReloadBonusSetting = require("../database/models/ReloadBonusSetting");
const ReloadBonusAssignment = require("../database/models/ReloadBonusAssignment");
const ReloadBonusClaim = require("../database/models/ReloadBonusClaim");
const {
	getUserApprovedFinanceTotalsInRange,
} = require("../utils/userFinanceTotals");
const {
	createAdminManualAdjustment,
} = require("./adminManualAdjustmentService");
const { RIVO_WALLET } = require("../utils/rivoWallet");
const { applyReloadWageringLock } = require("../utils/bonusLock");

const CATEGORY = "RELOAD BONUSU";
const SOURCE = "reload_bonus";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const INTERVAL_MINUTES_BY_TYPE = {
	daily: 1440,
	hourly: 60,
	minute: 1,
};

/**
 * Tekil (singleton) Reload Bonusu genel ayar dokümanını getirir, yoksa
 * varsayılan değerlerle oluşturur. Bu ayarlar sadece admin formunun
 * varsayılan değerlerini besler — atama başına gerçek değerler
 * ReloadBonusAssignment üzerinde tutulur.
 */
const getSettings = async () => {
	let settings = await ReloadBonusSetting.findOne();
	if (!settings) {
		settings = await ReloadBonusSetting.create({});
	}
	return settings;
};

const updateSettings = async (patch = {}, actorUser = null) => {
	const settings = await getSettings();
	const allowedFields = [
		"enabled",
		"defaultPercentage",
		"defaultIntervalType",
		"defaultIntervalMinutes",
		"defaultWageringMultiplier",
		"maxTotalAmount",
		"minTotalAmount",
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
 * Referans/bilgi amaçlı: kullanıcının "son Reload ataması (veya kayıt
 * tarihi) -> şu an" net kaybını hesaplar (Kayıp Bonusu ile aynı formül:
 * Toplam Yatırım - Toplam Çekim - Güncel Bakiye). Sistemi OTOMATİK
 * tetiklemez; admin panelindeki atama formunda "Bu dönem kaybı" önizlemesi
 * için kullanılır, admin bu tutarı referans olarak kullanıp isterse
 * değiştirebilir.
 */
const getReferenceLossPreview = async (userId) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const lastAssignment = await ReloadBonusAssignment.findOne({
		user: user._id,
	}).sort({ createdAt: -1 });

	const periodStart = lastAssignment?.createdAt || user.createdAt || new Date();
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
		netLoss: Math.max(netLoss, 0),
	};
};

/**
 * Verilen referans kayıp tutarı, oran, aralık tipi ve parça sayısına göre
 * bir Reload atamasının tüm hesaplanmış alanlarını üretir. Hem admin
 * panelindeki canlı önizleme hem de gerçek atama oluşturma bu fonksiyonu
 * kullanır — tutarsızlık riski olmadan aynı formül her yerde geçerli olur.
 */
const computeAssignmentPreview = ({
	referenceLossAmount,
	percentage,
	intervalType,
	intervalMinutes,
	totalPeriods,
	wageringMultiplier,
}) => {
	const normalizedType = ["daily", "hourly", "minute"].includes(intervalType)
		? intervalType
		: "daily";

	const resolvedIntervalMinutes =
		Number(intervalMinutes) > 0
			? Number(intervalMinutes)
			: INTERVAL_MINUTES_BY_TYPE[normalizedType];

	const resolvedTotalPeriods = Math.max(1, Math.round(Number(totalPeriods) || 1));

	const totalAmount = roundMoney(
		Number(referenceLossAmount || 0) * (Number(percentage || 0) / 100)
	);
	const amountPerPeriod = roundMoney(totalAmount / resolvedTotalPeriods);

	return {
		intervalType: normalizedType,
		intervalMinutes: resolvedIntervalMinutes,
		totalPeriods: resolvedTotalPeriods,
		totalAmount,
		amountPerPeriod,
		wageringMultiplier: Number(wageringMultiplier || 0),
	};
};

/**
 * Admin tarafından bir kullanıcıya manuel Reload ataması oluşturur.
 * Kullanıcının aktif bir Reload'u varsa (status="active") yeni atama
 * oluşturulamaz — aynı anda tek bir aktif Reload olabilir.
 */
const createAssignment = async ({
	userId,
	actorUser,
	referenceLossAmount,
	percentage,
	intervalType,
	intervalMinutes,
	totalPeriods,
	wageringMultiplier,
	note,
}) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const settings = await getSettings();
	if (!settings.enabled) throw new Error("RELOAD_BONUS_DISABLED");

	const existingActive = await ReloadBonusAssignment.findOne({
		user: user._id,
		status: "active",
	});
	if (existingActive) throw new Error("USER_HAS_ACTIVE_RELOAD");

	if (!Number(referenceLossAmount) || Number(referenceLossAmount) <= 0) {
		throw new Error("INVALID_REFERENCE_LOSS");
	}
	if (
		!Number.isFinite(Number(percentage)) ||
		Number(percentage) <= 0 ||
		Number(percentage) > 100
	) {
		throw new Error("INVALID_PERCENTAGE");
	}

	const preview = computeAssignmentPreview({
		referenceLossAmount,
		percentage,
		intervalType,
		intervalMinutes,
		totalPeriods,
		wageringMultiplier,
	});

	if (settings.minTotalAmount > 0 && preview.totalAmount < settings.minTotalAmount) {
		throw new Error("TOTAL_AMOUNT_BELOW_MINIMUM");
	}
	if (settings.maxTotalAmount > 0 && preview.totalAmount > settings.maxTotalAmount) {
		throw new Error("TOTAL_AMOUNT_ABOVE_MAXIMUM");
	}

	const startAt = new Date();
	const endAt = new Date(
		startAt.getTime() + preview.intervalMinutes * preview.totalPeriods * 60 * 1000
	);
	// İlk parça hemen claim edilebilir olsun diye nextClaimAt = startAt.
	const nextClaimAt = startAt;

	const assignment = await ReloadBonusAssignment.create({
		user: user._id,
		userSnapshot: {
			username: user.username || "",
			name: user.name || "",
			email: user.local?.email || "",
		},
		referenceLossAmount: roundMoney(referenceLossAmount),
		percentage: Number(percentage),
		totalAmount: preview.totalAmount,
		intervalType: preview.intervalType,
		intervalMinutes: preview.intervalMinutes,
		totalPeriods: preview.totalPeriods,
		amountPerPeriod: preview.amountPerPeriod,
		wageringMultiplier: preview.wageringMultiplier,
		startAt,
		endAt,
		nextClaimAt,
		status: "active",
		note: String(note || "").trim(),
		createdBy: actorUser?._id || null,
	});

	return assignment;
};

/**
 * Bir kullanıcının şu anki Reload durumunu döner: aktif ataması varsa
 * bir sonraki claim'in ne zaman yapılabileceği, kalan parça/tutar bilgisi.
 * Süresi geçmiş ama tüm parçaları claim edilmemiş atamaları "expired"
 * olarak işaretler.
 */
const getStatus = async (userId) => {
	const assignment = await ReloadBonusAssignment.findOne({
		user: userId,
		status: "active",
	}).sort({ createdAt: -1 });

	if (!assignment) return { hasActiveReload: false };

	const now = new Date();
	if (now > assignment.endAt && assignment.claimedPeriods < assignment.totalPeriods) {
		assignment.status = "expired";
		await assignment.save();
		return { hasActiveReload: false, expired: true };
	}

	const canClaimNow =
		assignment.claimedPeriods < assignment.totalPeriods &&
		now >= assignment.nextClaimAt;

	return {
		hasActiveReload: true,
		assignmentId: assignment._id,
		totalAmount: assignment.totalAmount,
		amountPerPeriod: assignment.amountPerPeriod,
		totalPeriods: assignment.totalPeriods,
		claimedPeriods: assignment.claimedPeriods,
		claimedAmount: assignment.claimedAmount,
		intervalType: assignment.intervalType,
		intervalMinutes: assignment.intervalMinutes,
		wageringMultiplier: assignment.wageringMultiplier,
		startAt: assignment.startAt,
		endAt: assignment.endAt,
		nextClaimAt: assignment.nextClaimAt,
		canClaimNow,
	};
};

/**
 * Kullanıcının aktif Reload atamasından bir sonraki parçayı claim eder.
 * `nextClaimAt` üzerinde optimistic lock (koşullu findOneAndUpdate)
 * kullanılarak eşzamanlı çift claim'in önüne geçilir.
 */
const claimNext = async (userId) => {
	const assignment = await ReloadBonusAssignment.findOne({
		user: userId,
		status: "active",
	}).sort({ createdAt: -1 });

	if (!assignment) throw new Error("NO_ACTIVE_RELOAD");

	const now = new Date();
	if (now > assignment.endAt) {
		assignment.status = "expired";
		await assignment.save();
		throw new Error("RELOAD_EXPIRED");
	}
	if (assignment.claimedPeriods >= assignment.totalPeriods) {
		throw new Error("RELOAD_FULLY_CLAIMED");
	}
	if (now < assignment.nextClaimAt) {
		const err = new Error("CLAIM_NOT_YET_AVAILABLE");
		err.nextClaimAt = assignment.nextClaimAt;
		throw err;
	}

	const nextPeriodIndex = assignment.claimedPeriods + 1;
	const previousNextClaimAt = assignment.nextClaimAt;

	const lockedAssignment = await ReloadBonusAssignment.findOneAndUpdate(
		{
			_id: assignment._id,
			status: "active",
			claimedPeriods: assignment.claimedPeriods,
			nextClaimAt: previousNextClaimAt,
		},
		{
			$inc: { claimedPeriods: 1, claimedAmount: assignment.amountPerPeriod },
			$set: {
				nextClaimAt: new Date(
					previousNextClaimAt.getTime() + assignment.intervalMinutes * 60 * 1000
				),
			},
		},
		{ new: true }
	);

	if (!lockedAssignment) {
		throw new Error("CLAIM_IN_PROGRESS");
	}

	const isLastPeriod = lockedAssignment.claimedPeriods >= lockedAssignment.totalPeriods;

	const user = await User.findById(userId);

	try {
		const result = await createAdminManualAdjustment({
			targetUser: user,
			actorUser: null,
			wallet: RIVO_WALLET,
			kind: "bonus",
			direction: "credit",
			category: CATEGORY,
			note: `Reload Bonusu claim (${nextPeriodIndex}/${lockedAssignment.totalPeriods})`,
			amount: lockedAssignment.amountPerPeriod,
			source: SOURCE,
			sourceRef: { assignmentId: lockedAssignment._id, periodIndex: nextPeriodIndex },
		});

		let wageringAdded = 0;
		if (lockedAssignment.wageringMultiplier > 0) {
			const lockResult = await applyReloadWageringLock(user._id, {
				assignmentId: lockedAssignment._id,
				claimAmount: lockedAssignment.amountPerPeriod,
				wageringMultiplier: lockedAssignment.wageringMultiplier,
			});
			wageringAdded = roundMoney(
				lockedAssignment.amountPerPeriod * lockedAssignment.wageringMultiplier
			);
			void lockResult;
		}

		const claimDoc = await ReloadBonusClaim.create({
			assignment: lockedAssignment._id,
			user: user._id,
			periodIndex: nextPeriodIndex,
			amount: lockedAssignment.amountPerPeriod,
			wageringMultiplier: lockedAssignment.wageringMultiplier,
			wageringAdded,
			adjustmentRef: result.adjustment._id,
		});

		if (isLastPeriod) {
			lockedAssignment.status = "completed";
			lockedAssignment.completedAt = new Date();
			await lockedAssignment.save();
		}

		return {
			claim: claimDoc,
			assignment: lockedAssignment,
			newBalance: result.balanceAfter,
		};
	} catch (err) {
		// Ödeme başarısız olursa parçayı geri al ki kullanıcı tekrar
		// deneyebilsin.
		await ReloadBonusAssignment.findByIdAndUpdate(lockedAssignment._id, {
			$inc: { claimedPeriods: -1, claimedAmount: -lockedAssignment.amountPerPeriod },
			$set: { nextClaimAt: previousNextClaimAt, status: "active" },
		});
		throw err;
	}
};

const cancelAssignment = async (assignmentId, actorUser, reason = "") => {
	const assignment = await ReloadBonusAssignment.findById(assignmentId);
	if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
	if (assignment.status !== "active") throw new Error("ASSIGNMENT_NOT_ACTIVE");

	assignment.status = "cancelled";
	assignment.cancelledBy = actorUser?._id || null;
	assignment.cancelledAt = new Date();
	assignment.cancellationReason = String(reason || "").trim();
	await assignment.save();

	return assignment;
};

const listAssignments = async ({ userId, status, page = 1, limit = 20 } = {}) => {
	const filter = {};
	if (userId) filter.user = userId;
	if (status) filter.status = status;

	const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
	const [items, total] = await Promise.all([
		ReloadBonusAssignment.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Math.max(1, Number(limit)))
			.lean(),
		ReloadBonusAssignment.countDocuments(filter),
	]);

	return { items, total, page: Number(page), limit: Number(limit) };
};

module.exports = {
	getSettings,
	updateSettings,
	getReferenceLossPreview,
	computeAssignmentPreview,
	createAssignment,
	getStatus,
	claimNext,
	cancelAssignment,
	listAssignments,
	getUserBalance,
};
