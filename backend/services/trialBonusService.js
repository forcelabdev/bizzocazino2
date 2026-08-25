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
	triggerTrialBonusReviewLock,
	resolveTrialBonusReviewLock,
	cancelTrialBonusLock,
	forfeitTrialWageringLockOnDeposit,
} = require("../utils/bonusLock");
const { sumUserBetsSince } = require("../utils/userBetActivity");
const {
	getUserApprovedFinanceTotals,
} = require("../utils/userFinanceTotals");

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
		"targetBalanceEnabled",
		"targetBalanceAmount",
		"registrationCutoffEnabled",
		"registeredAfter",
		"blockIfDeposited",
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
 * Deneme bonusu talebi için yeni uygunluk kuralları: kayıt tarihi sınırı ve
 * önceden onaylı yatırımı olma durumu. Bakiyeyi/veritabanını DEĞİŞTİRMEZ.
 *
 * @returns {Promise<{ eligible: boolean, reason?: string, message?: string }>}
 */
const checkClaimEligibility = async (user, settings) => {
	// GÜVENLİK: bu kullanıcı için daha önce sonlanmış (tamamlanmış VEYA iptal
	// edilmiş) bir Deneme Bonusu kaydı varsa, bir daha talep edemez. Bu kontrol
	// `existingClaim` (TrialBonusClaim status: pending/approved) kontrolünden
	// BAĞIMSIZ ve ona ek bir güvenlik katmanıdır — çünkü `trialBonusHistory`
	// hiçbir zaman silinmez/değişmez, kalıcı bir kayıttır.
	if (Array.isArray(user.trialBonusHistory) && user.trialBonusHistory.length > 0) {
		return {
			eligible: false,
			reason: "HAS_TRIAL_BONUS_HISTORY",
			message:
				"Deneme bonusunu daha önce kullandığınız için tekrar talep edemezsiniz.",
		};
	}

	if (settings.registrationCutoffEnabled && settings.registeredAfter) {
		const cutoff = new Date(settings.registeredAfter);
		const registeredAt = new Date(user.createdAt);
		if (registeredAt < cutoff) {
			return {
				eligible: false,
				reason: "REGISTERED_BEFORE_CUTOFF",
				message:
					"Bu tarihten önce kayıt olan üyeler deneme bonusu talep edemez.",
			};
		}
	}

	if (settings.blockIfDeposited) {
		const totalsByUser = await getUserApprovedFinanceTotals([user._id]);
		const totals = totalsByUser.get(String(user._id));
		if (totals && totals.depositCount > 0) {
			return {
				eligible: false,
				reason: "HAS_APPROVED_DEPOSIT",
				message:
					"Daha önce yatırım yapmış üyeler deneme bonusu talep edemez.",
			};
		}
	}

	return { eligible: true };
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
	const eligibilityCheck = await checkClaimEligibility(user, settings);
	const eligible = Boolean(
		settings.enabled &&
			!existingClaim &&
			!blockedByOtherBonus &&
			eligibilityCheck.eligible
	);

	let message;
	if (!settings.enabled) {
		message = "Deneme bonusu şu anda aktif değil.";
	} else if (existingClaim) {
		message = "Deneme bonusunu daha önce talep ettiniz.";
	} else if (!eligibilityCheck.eligible) {
		message = eligibilityCheck.message;
	} else if (blockedByOtherBonus && lockStatus.type === "review") {
		message =
			"Hesabınız deneme bonusu incelemesi nedeniyle kilitli. Canlı destek ile iletişime geçin.";
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

	const eligibilityCheck = await checkClaimEligibility(user, settings);
	if (!eligibilityCheck.eligible) {
		const err = new Error(eligibilityCheck.reason || "NOT_ELIGIBLE");
		err.code = eligibilityCheck.reason || "NOT_ELIGIBLE";
		err.message = eligibilityCheck.message || err.message;
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

		// Hedef Bakiye ayarının anlık değerini kullanıcı üzerinde sabitle
		// (snapshot) — ayar sonradan değişse de bu talep için sabit kalır.
		await User.findByIdAndUpdate(user._id, {
			$set: {
				"bonusLock.targetBalanceAmount": settings.targetBalanceEnabled
					? roundMoney(settings.targetBalanceAmount)
					: 0,
			},
		});

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

	// Hedef Bakiye ayarının anlık değerini kullanıcı üzerinde sabitle
	// (snapshot) — ayar sonradan değişse de bu talep için sabit kalır.
	await User.findByIdAndUpdate(user._id, {
		$set: {
			"bonusLock.targetBalanceAmount": settings.targetBalanceEnabled
				? roundMoney(settings.targetBalanceAmount)
				: 0,
		},
	});

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
 * Kullanıcının HÂLÂ SONLANMAMIŞ bir Deneme Bonusu kaydı olup olmadığına
 * bakar. Betinovi oyun başlatma akışında (game_launch), true dönerse
 * kullanıcı RTP override YERİNE ayrı bir Betinovi agent'ına
 * (BETINOVI_AGENT_CODE_2 / BETINOVI_AGENT_TOKEN_2 / BETINOVI_API_ENDPOINT_2
 * — "bizzodeneme") yönlendirilir.
 *
 * GÜVENLİK NOTU: `evaluateBonusLock`'un `type === "wagering"` kontrolüne
 * dayanmaz — çünkü Çevrim Katsayısı 0 (kapalı) ayarlandığında
 * `applyWageringLock` HİÇBİR çevrim kilidi kurmaz (bkz. bonusLock.js:
 * `wageringRequired <= 0` ise `null` döner) ve `evaluateBonusLock` bu
 * durumda asla `"wagering"` tipini döndürmez — Hedef Bakiye tek başına
 * aktif olsa bile. Bunun yerine doğrudan `user.bonusLock` üzerindeki tek
 * doğruluk kaynağına bakılır: kilit bu deneme bonusuna aitse (`source`) ve
 * henüz sonlanmamışsa (`completedAt` yok — ne tamamlanmış ne iptal
 * edilmiş), çevrim şartı olsun olmasın, hedef bakiye takibi sürüyor olsun
 * ya da inceleme kilidinde olsun, kullanıcı "bizzodeneme" agent'ında
 * kalmalıdır. Kilit sonlandığı (çevrim/hedef bakiye tamamlanıp admin
 * inceleyip açtığında VEYA iptal edildiğinde) anda `completedAt` set
 * edilir ve burası otomatik olarak false dönmeye başlar; kullanıcı bir
 * dahaki oyun açılışında normal (bizzocasinoyeni) agent'a geri döner.
 */
const hasActiveTrialWageringLock = async (user) => {
	if (!user) return false;

	const lock = user.bonusLock;
	if (!lock || lock.source !== SOURCE) return false;
	if (lock.completedAt) return false;

	return true;
};

/**
 * `wagerHooks.js → onBetSettled` tarafından HER bahis sonuçlandığında
 * (tüm iç oyunlar + tüm dış sağlayıcı callback'leri kapsar) çağrılır.
 * Kullanıcının deneme bonusu çevrim şartı tamamlandıysa inceleme kilidini
 * tetikler. Zaten inceleme kilidindeyse veya tamamlanmışsa hemen çıkar —
 * performans etkisi minimaldir.
 */
const checkTrialBonusWageringCompletion = async (userId) => {
	if (!userId) return;

	const user = await User.findById(userId);
	if (!user) return;

	const lock = user.bonusLock;
	if (
		!lock ||
		lock.source !== SOURCE ||
		lock.reviewRequired ||
		lock.completedAt ||
		!lock.wageringRequired ||
		lock.wageringRequired <= 0
	) {
		return;
	}

	const wageringProgress = await sumUserBetsSince(user._id, lock.wageringSince);
	if (wageringProgress >= lock.wageringRequired) {
		await triggerTrialBonusReviewLock(user, "wagering_completed");
	}
};

/**
 * `wallet.js → updateWalletBalance` tarafından HER bakiye değişikliğinde
 * (bet, kazanç, bonus kredisi, admin ayarı — hepsi) çağrılır. Kullanıcının
 * deneme bonusu hedef bakiyesi varsa ve yeni bakiye o hedefe ulaştıysa/
 * geçtiyse inceleme kilidini tetikler. Aksi halde hemen çıkar.
 *
 * AYRICA doğrudan sağlayıcı callback route'larından (betinoviApi.js/
 * goldApi.js) da çağrılır — bunlar bakiyeyi `wallet.js`'i ATLAYARAK ham
 * `findOneAndUpdate({ $inc: { "wallets.$[elem].balance": ... } })` ile
 * güncelledikleri için `updateWalletBalance` hook'undan hiç geçmezler.
 *
 * GÜVENLİK: Bu yüzden `user` parametresine (2. argüman `newBalance` hariç)
 * ASLA güvenmiyoruz — çağıran taraf genellikle `.select("wallets currency")`
 * gibi KISITLI bir projeksiyonla belge döndürür ve bu durumda
 * `user.bonusLock` her zaman `undefined` gelir, kontrol de sessizce
 * atlanırdı (tam olarak Çevrim Katsayısı=0 + Hedef Bakiye senaryosunda
 * yaşanan bug). Bu yüzden burada HER ZAMAN kendi taze/tam kullanıcı
 * dokümanımızı `userId` ile çekiyoruz.
 */
const checkTrialBonusTargetBalance = async (userOrId, newBalance) => {
	const userId = userOrId?._id || userOrId;
	if (!userId) return;

	const freshUser = await User.findById(userId);
	if (!freshUser) return;

	const lock = freshUser.bonusLock;
	if (!lock || lock.source !== SOURCE || lock.completedAt) return;

	// OTOMATİK İPTAL: bakiye tam 0 TL'ye düştüyse, kilit hangi aşamada
	// olursa olsun (çevrim/hedef bakiye sürerken VEYA inceleme kilidindeyken)
	// deneme bonusunu anında "İptal Edildi" olarak sonlandır ve betAccess
	// kilidini aç. Hedef bakiye kontrolünün ÖNÜNE geçer.
	if (Number(newBalance) <= 0) {
		await cancelTrialBonusLock(freshUser, "zero_balance");
		return;
	}

	if (
		lock.reviewRequired ||
		!lock.targetBalanceAmount ||
		lock.targetBalanceAmount <= 0
	) {
		return;
	}

	if (Number(newBalance) >= Number(lock.targetBalanceAmount)) {
		await triggerTrialBonusReviewLock(freshUser, "target_balance_reached");
	}
};

/**
 * GÜVENLİK: Tüm ödeme sağlayıcı yatırım onay noktaları (GalaxyPay, MeelDev,
 * ForcelabFinance, FluxKripto, xPayments, Pix, Oxapay/Kripto) tarafından
 * kullanıcıya GERÇEK bir yatırım tutarı kredilendiğinde çağrılır. Kullanıcının
 * hâlâ tamamlanmamış bir Deneme Bonusu çevrim kilidi varsa anında sonlandırır
 * — böylece bir dahaki oyun açılışında (game_launch) `hasActiveTrialWageringLock`
 * false döner ve kullanıcı normal (varsayılan) agent'a yönlendirilir. Ana
 * yatırım akışını asla bloklamaz/başarısız etmez, hatalar sadece loglanır.
 */
const handleRealDepositCredited = async (userId) => {
	if (!userId) return;
	try {
		const user = await User.findById(userId);
		if (!user) return;
		await forfeitTrialWageringLockOnDeposit(user);
	} catch (err) {
		console.error(
			"❌ handleRealDepositCredited → deneme bonusu kilidi sonlandırma hatası:",
			err.message
		);
	}
};

/**
 * Admin panelinden "İncelemeyi Tamamla ve Kilidi Aç" aksiyonu tarafından
 * çağrılır.
 */
const resolveTrialBonusReview = async ({ userId }) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");
	if (!user.bonusLock?.reviewRequired) {
		throw new Error("REVIEW_NOT_REQUIRED");
	}

	await resolveTrialBonusReviewLock(user);
	return user;
};

/**
 * Admin panelinden "Deneme Bonusunu İptal Et" aksiyonu tarafından çağrılır.
 * Deneme bonusu aktif olduğu HER aşamada (çevrim/hedef bakiye sürerken VEYA
 * inceleme kilidindeyken) çalışır — `resolveTrialBonusReview`'ın aksine
 * `reviewRequired` beklemez. Kullanıcı bir dahaki oyun açılışında normal
 * (varsayılan) agent'a döner ve betAccess kilidi (varsa) hemen açılır.
 */
const cancelTrialBonus = async ({ userId, reason = "admin_manual" }) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");
	if (!user.bonusLock || user.bonusLock.source !== SOURCE) {
		throw new Error("NO_ACTIVE_TRIAL_BONUS");
	}
	if (user.bonusLock.completedAt) {
		throw new Error("NO_ACTIVE_TRIAL_BONUS");
	}

	const cancelled = await cancelTrialBonusLock(user, reason);
	if (!cancelled) throw new Error("NO_ACTIVE_TRIAL_BONUS");

	return user;
};

module.exports = {
  getSettings,
  updateSettings,
  getPotential,
  claim,
  approveClaim,
  rejectClaim,
  getApprovedClaimsMap,
  hasActiveTrialWageringLock,
  checkTrialBonusWageringCompletion,
  checkTrialBonusTargetBalance,
  resolveTrialBonusReview,
  cancelTrialBonus,
  handleRealDepositCredited,
  // Bakiye Analizi'nin "Kalan Deneme Bonus Bakiyesi" hesaplamasında
  // (backend/services/balanceAnalysisService.js) AdminManualAdjustment
  // kayıtlarını bu kategoriye göre filtrelemek için dışa aktarılır.
  TRIAL_BONUS_CATEGORY: CATEGORY,
  };
