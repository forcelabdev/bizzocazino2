const User = require("../database/models/User");
const { sumUserBetsSince } = require("./userBetActivity");

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

/**
 * Kullanıcı üzerine, verilen süre (saat) boyunca geçerli, ZAMAN BAZLI bir
 * bonus kilidi uygular. Sadece diğer bonusların talep edilmesini engeller,
 * çekimi engellemez. `wageringMultiplier` ayarı 0 (kapalı) olduğunda
 * kullanılan eski/basit davranıştır. `source` hangi bonusun kilidi
 * koyduğunu belirtir (örn. "deposit_bonus").
 */
const applyBonusLock = async (userId, durationHours, source) => {
	if (!durationHours || durationHours <= 0) return null;
	const blockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
	await User.findByIdAndUpdate(userId, {
		$set: {
			bonusLock: {
				source,
				claimId: null,
				claimModel: "",
				bonusAmount: 0,
				wageringMultiplier: 0,
				wageringRequired: 0,
				wageringSince: null,
				blockedUntil,
				completedAt: null,
			},
		},
	});
	return blockedUntil;
};

/**
 * Kullanıcı üzerine ÇEVRİM BAZLI bir bonus kilidi uygular. Süre sınırı
 * yoktur: kilit, kullanıcı `wageringRequired` tutarında bahis yapana kadar
 * aktif kalır. Onaylanan bonus tutarı ile ayarlardaki çevrim katsayısı
 * çarpılarak çevrim gereksinimi hesaplanır; katsayı 0 ise kilit uygulanmaz
 * (null döner) ve çağıran taraf zaman bazlı `applyBonusLock`'a düşmelidir.
 */
const applyWageringLock = async (
	userId,
	{ source, claimId, claimModel, bonusAmount, wageringMultiplier }
) => {
	const wageringRequired = roundMoney(
		Number(bonusAmount || 0) * Number(wageringMultiplier || 0)
	);
	if (wageringRequired <= 0) return null;

	const wageringSince = new Date();
	await User.findByIdAndUpdate(userId, {
		$set: {
			bonusLock: {
				source,
				claimId: claimId || null,
				claimModel: claimModel || "",
				bonusAmount: roundMoney(bonusAmount),
				wageringMultiplier: Number(wageringMultiplier || 0),
				wageringRequired,
				wageringSince,
				blockedUntil: null,
				completedAt: null,
			},
		},
	});

	return { wageringRequired, wageringSince };
};

/**
 * `bonusLock` alanının tek doğruluk kaynağı: kilidin şu an aktif olup
 * olmadığını, çevrim bazlıysa canlı ilerlemeyi (`sumUserBetsSince`)
 * hesaplayarak döner. Çevrim tamamlanmışsa `bonusLock.completedAt` alanını
 * veritabanında işaretler.
 *
 * @param {import("../database/models/User")} user - `bonusLock` alanı dolu
 * (lean veya doküman) bir User nesnesi.
 * @returns {Promise<object>} `{ active: boolean, type?, ... }`
 */
const evaluateBonusLock = async (user) => {
	const lock = user?.bonusLock;
	if (!lock) return { active: false };

	// Deneme Bonusu — İnceleme Kilidi: çevrim/hedef bakiye tamamlandığında
	// tetiklenir ve SADECE admin "İncelemeyi Tamamla" dediğinde kapanır.
	// Süre/çevrim hesaplamasının önüne geçer, otomatik açılmaz.
	if (lock.reviewRequired) {
		return {
			active: true,
			type: "review",
			source: lock.source || "",
			reviewReason: lock.reviewReason || "",
			lockedForReviewAt: lock.lockedForReviewAt || null,
		};
	}

	if (!lock.blockedUntil && !lock.wageringRequired) {
		return { active: false };
	}

	const wageringRequired = Number(lock.wageringRequired || 0);

	if (wageringRequired <= 0) {
		// Eski davranış: sadece zaman bazlı kilit, sadece diğer bonusları
		// engeller (çekimi engellemez).
		const active = Boolean(
			lock.blockedUntil && new Date(lock.blockedUntil) > new Date()
		);
		if (!active) return { active: false };
		return {
			active: true,
			type: "time",
			source: lock.source || "",
			blockedUntil: lock.blockedUntil,
		};
	}

	if (lock.completedAt) {
		return { active: false };
	}

	const wageringProgress = await sumUserBetsSince(user._id, lock.wageringSince);

	if (wageringProgress >= wageringRequired) {
		await User.findByIdAndUpdate(user._id, {
			$set: { "bonusLock.completedAt": new Date() },
		});
		return { active: false, justCompleted: true };
	}

	return {
		active: true,
		type: "wagering",
		source: lock.source || "",
		bonusAmount: lock.bonusAmount,
		wageringMultiplier: lock.wageringMultiplier,
		wageringRequired,
		wageringProgress: roundMoney(wageringProgress),
		wageringRemaining: roundMoney(wageringRequired - wageringProgress),
		wageringSince: lock.wageringSince,
	};
};

/**
 * Reload Bonusu için ÇEVRİM BAZLI bağımsız kilit uygular. `bonusLock`
 * (Yatırım/Kayıp Bonusu) alanından tamamen ayrıdır: Reload diğer bonusları
 * bloklamaz ve onlardan bloklanmaz — her ikisi de aynı anda aktif olabilir
 * ve çekim, ikisinden HERHANGİ biri aktifse engellenir. `wageringMultiplier`
 * 0 ise kilit uygulanmaz (null döner).
 *
 * Reload'un doğası nedeniyle çevrim gereksinimi zamanla ARTAR: her claim
 * yeni bir çevrim şartı ekler (mevcut `wageringRequired` üzerine eklenir),
 * `wageringSince` ise ilk claim anında sabitlenir ki tüm dönem boyunca
 * yapılan bahisler toplam çevrime sayılsın.
 */
const applyReloadWageringLock = async (
	userId,
	{ assignmentId, claimAmount, wageringMultiplier }
) => {
	const addedRequirement = roundMoney(
		Number(claimAmount || 0) * Number(wageringMultiplier || 0)
	);
	if (addedRequirement <= 0) return null;

	const user = await User.findById(userId).select("reloadLock");
	const existingLock = user?.reloadLock;
	const alreadyActive = Boolean(
		existingLock &&
			existingLock.wageringRequired > 0 &&
			!existingLock.completedAt &&
			String(existingLock.assignmentId || "") === String(assignmentId)
	);

	const wageringSince = alreadyActive
		? existingLock.wageringSince
		: new Date();
	const totalAmount = roundMoney(
		(alreadyActive ? existingLock.totalAmount : 0) + Number(claimAmount || 0)
	);
	const wageringRequired = roundMoney(
		(alreadyActive ? existingLock.wageringRequired : 0) + addedRequirement
	);

	await User.findByIdAndUpdate(userId, {
		$set: {
			reloadLock: {
				assignmentId,
				totalAmount,
				wageringMultiplier: Number(wageringMultiplier || 0),
				wageringRequired,
				wageringSince,
				completedAt: null,
			},
		},
	});

	return { wageringRequired, wageringSince };
};

/**
 * `reloadLock` alanının tek doğruluk kaynağı. `evaluateBonusLock` ile aynı
 * mantığı izler ama tamamen bağımsız bir alan üzerinde çalışır.
 */
const evaluateReloadLock = async (user) => {
	const lock = user?.reloadLock;
	const wageringRequired = Number(lock?.wageringRequired || 0);
	if (!lock || wageringRequired <= 0) {
		return { active: false };
	}

	if (lock.completedAt) {
		return { active: false };
	}

	const wageringProgress = await sumUserBetsSince(user._id, lock.wageringSince);

	if (wageringProgress >= wageringRequired) {
		await User.findByIdAndUpdate(user._id, {
			$set: { "reloadLock.completedAt": new Date() },
		});
		return { active: false, justCompleted: true };
	}

	return {
		active: true,
		type: "wagering",
		source: "reload_bonus",
		assignmentId: lock.assignmentId,
		totalAmount: lock.totalAmount,
		wageringMultiplier: lock.wageringMultiplier,
		wageringRequired,
		wageringProgress: roundMoney(wageringProgress),
		wageringRemaining: roundMoney(wageringRequired - wageringProgress),
		wageringSince: lock.wageringSince,
	};
};

/**
 * Gerçek para çekim taleplerinin oluşturulduğu TÜM uç noktalarda kullanılır.
 * Aktif bir çevrim (wagering) kilidi varsa (bonusLock VEYA reloadLock,
 * hangisi önce bulunursa) hata fırlatır. Zaman bazlı eski kilit tipi
 * (`type === "time"`) çekimi ENGELLEMEZ — o sadece diğer bonusları
 * engellemek için var olan geriye dönük davranıştır.
 */
const assertWithdrawalNotBlocked = async (user) => {
	const status = await evaluateBonusLock(user);
	if (status.active && status.type === "review") {
		const err = new Error(
			"Hesabınız deneme bonusu incelemesi nedeniyle geçici olarak kilitlendi. Canlı destek ile iletişime geçin."
		);
		err.code = "TRIAL_BONUS_REVIEW_REQUIRED";
		err.wagering = status;
		throw err;
	}
	if (status.active && status.type === "wagering") {
		const err = new Error(
			`Devam eden bir bonus çevrim şartınız var. Çekim yapabilmek için ${status.wageringRemaining} TL daha çevrim yapmanız gerekiyor.`
		);
		err.code = "WAGERING_REQUIREMENT_NOT_MET";
		err.wagering = status;
		throw err;
	}

	const reloadStatus = await evaluateReloadLock(user);
	if (reloadStatus.active) {
		const err = new Error(
			`Devam eden bir Reload Bonusu çevrim şartınız var. Çekim yapabilmek için ${reloadStatus.wageringRemaining} TL daha çevrim yapmanız gerekiyor.`
		);
		err.code = "WAGERING_REQUIREMENT_NOT_MET";
		err.wagering = reloadStatus;
		throw err;
	}

	return status;
};

/**
 * Deneme Bonusu çevrim şartı tamamlandığında VEYA hedef bakiyeye
 * ulaşıldığında çağrılır. Kullanıcıyı hem bahis/oyun hem çekim için
 * kilitler; kilit SADECE `resolveTrialBonusReviewLock` ile admin
 * tarafından açılır (otomatik açılma yoktur).
 *
 * @param {object} user - Mongoose User dokümanı (kaydedilebilir olmalı).
 * @param {"wagering_completed"|"target_balance_reached"} reason
 * @param {{ session?: object }} [options]
 */
const triggerTrialBonusReviewLock = async (user, reason, { session } = {}) => {
	if (!user || user.bonusLock?.reviewRequired) return false;

	user.bonusLock.reviewRequired = true;
	user.bonusLock.reviewReason = reason;
	user.bonusLock.lockedForReviewAt = new Date();

	user.betAccess = user.betAccess || {};
	user.betAccess.blocked = true;
	user.betAccess.reason = "trial_bonus_review";
	user.betAccess.updatedAt = new Date();

	await user.save(session ? { session } : undefined);

	// Fire-and-forget: aktif oturumu soket üzerinden kes. Sinyali göndermek
	// başarısız olsa da kilidin kendisi zaten veritabanında aktif.
	try {
		const { getIO } = require("./io");
		const { notifyAndKickUserForTrialBonusReview } = require("./trialBonusReviewKick");
		const io = getIO();
		notifyAndKickUserForTrialBonusReview(io, user._id).catch((err) =>
			console.error("❌ triggerTrialBonusReviewLock → soket bildirimi hatası:", err.message)
		);
	} catch (err) {
		console.error("❌ triggerTrialBonusReviewLock → soket bildirimi kurulamadı:", err.message);
	}

	return true;
};

/**
 * Admin panelinden "İncelemeyi Tamamla ve Kilidi Aç" aksiyonu tarafından
 * çağrılır. Sadece `betAccess.reason === "trial_bonus_review"` ise
 * betAccess kilidini temizler — başka bir sebeple (admin manuel engeli vb.)
 * bloklanmışsa dokunmaz.
 */
const resolveTrialBonusReviewLock = async (user) => {
	if (!user || !user.bonusLock?.reviewRequired) return false;

	user.bonusLock.reviewRequired = false;
	user.bonusLock.completedAt = new Date();

	if (user.betAccess?.reason === "trial_bonus_review") {
		user.betAccess.blocked = false;
		user.betAccess.reason = "";
		user.betAccess.updatedAt = new Date();
	}

	await user.save();
	return true;
};

/**
 * GÜVENLİK: Kullanıcı gerçek bir yatırım (deposit) yaptığında, hâlâ
 * tamamlanmamış bir Deneme Bonusu çevrim (wagering) kilidi varsa anında
 * sonlandırır. Amaç: deneme bonusu çevrimini tamamlamadan gerçek para
 * yatıran bir kullanıcının, hâlâ deneme bonusu agent'ı (bizzodeneme)
 * üzerinden gerçek parayla oyun oynamasını ÖNLEMEK — çevrimden kalan tutar
 * ne olursa olsun (1 TL bile olsa) kullanıcı bir dahaki oyun açılışında
 * normal (varsayılan) agent'a döner.
 *
 * Zaten inceleme kilidindeyse (`reviewRequired`) dokunmaz — o akış zaten
 * admin onayı bekliyor ve ayrı bir güvenlik katmanı. Sadece süren
 * ("wagering", henüz tamamlanmamış) bir Deneme Bonusu kilidini kapatır.
 *
 * @param {import("../database/models/User")} user
 * @returns {Promise<boolean>} kilit gerçekten sonlandırıldıysa true
 */
const forfeitTrialWageringLockOnDeposit = async (user) => {
	const lock = user?.bonusLock;
	if (!lock || lock.source !== "trial_bonus") return false;
	if (lock.reviewRequired || lock.completedAt) return false;
	if (!lock.wageringRequired || lock.wageringRequired <= 0) return false;

	await User.findByIdAndUpdate(user._id, {
		$set: {
			"bonusLock.completedAt": new Date(),
			"bonusLock.targetBalanceAmount": 0,
			"bonusLock.forfeitedReason": "real_deposit",
		},
	});

	return true;
};

module.exports = {
	applyBonusLock,
	applyWageringLock,
	evaluateBonusLock,
	applyReloadWageringLock,
	evaluateReloadLock,
	assertWithdrawalNotBlocked,
	triggerTrialBonusReviewLock,
	resolveTrialBonusReviewLock,
	forfeitTrialWageringLockOnDeposit,
};
