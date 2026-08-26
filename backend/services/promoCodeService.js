// Load database models
const User = require("../database/models/User");
const PromoCode = require("../database/models/PromoCode");
const BalanceTransaction = require("../database/models/BalanceTransaction");

// Load utils
const { evaluateConditions } = require("../utils/promoConditionEngine");
const {
	getUserLastApprovedDepositAmount,
} = require("../utils/userFinanceTotals");
const { updateUserBalance } = require("../utils/wallet");

// Aynı kullanıcı + kod çifti için eşzamanlı (çift tıklama / race condition)
// claim isteklerini engellemek için basit in-memory kilit. `sockets/general/promo`
// akışındaki `generalPromoClaimBlock` dizisiyle aynı amaca hizmet eder.
const claimLocks = new Set();

const ERROR = (errorCode, message) => ({
	success: false,
	errorCode,
	message,
});

/**
 * Bir kullanıcının promosyon kodu talebini uçtan uca doğrular ve uygular.
 * `routes/promoCodes.js` (POST /promo-codes/claim) tarafından kullanılır.
 *
 * NOT: Bu, `sockets/general/promo` (event: "sendPromoClaim") akışının
 * YERİNE GEÇMEZ — o akış hâlâ mevcuttur ve site içi (WebSocket bağlı)
 * frontend tarafından kullanılır. Bu servis, dış/harici frontend'lerin
 * düz REST/HTTP ile entegre olabilmesi için eklenmiştir ve PromoCode
 * modelindeki TÜM şartları (levelMin, redeemptionsMax, perUserLimit,
 * affiliateCodes, minLastDeposit, conditions, applyWageringLock/
 * wageringMultiplier, minWithdraw) uygular — eski socket akışı sadece
 * levelMin ve basit tekrar-claim kontrolü yapıyordu.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} rawCode
 * @returns {Promise<{success:true, code:string, reward:number, balance:number, claimedAt:Date} | {success:false, errorCode:string, message:string}>}
 */
const claimPromoCode = async (userId, rawCode) => {
	const code = String(rawCode || "")
		.trim()
		.toUpperCase();

	if (!code) {
		return ERROR("CODE_REQUIRED", "Promosyon kodu gerekli.");
	}

	const lockKey = `${userId}:${code}`;
	if (claimLocks.has(lockKey)) {
		return ERROR(
			"ALREADY_PROCESSING",
			"İsteğiniz işleniyor, lütfen bekleyin.",
		);
	}
	claimLocks.add(lockKey);

	try {
		const [user, promo] = await Promise.all([
			User.findById(userId).select(
				"xp affiliates limits createdAt username wallets currency",
			),
			PromoCode.findOne({ code }),
		]);

		if (!user) {
			return ERROR("USER_NOT_FOUND", "Kullanıcı bulunamadı.");
		}
		if (!promo) {
			return ERROR(
				"CODE_NOT_FOUND",
				"Girdiğiniz promosyon kodu bulunamadı.",
			);
		}
		if (!promo.isActive) {
			return ERROR(
				"CODE_INACTIVE",
				"Bu promosyon kodu artık aktif değil.",
			);
		}

		const now = new Date();
		if (promo.startsAt && now < promo.startsAt) {
			return ERROR(
				"CODE_NOT_STARTED",
				"Bu promosyon kodu henüz başlamadı.",
			);
		}
		if (promo.expiresAt && now > promo.expiresAt) {
			return ERROR(
				"CODE_EXPIRED",
				"Bu promosyon kodunun süresi doldu.",
			);
		}

		// Toplam kullanım limiti — 0/tanımsız = limitsiz kabul edilir.
		// (Eski socket akışında 0, yanlışlıkla "hemen doldu" anlamına
		// geliyordu; burada kasıtlı olarak düzeltildi.)
		if (
			promo.redeemptionsMax > 0 &&
			promo.redeemptionsTotal >= promo.redeemptionsMax
		) {
			return ERROR(
				"TOTAL_LIMIT_REACHED",
				"Bu promosyon kodu için tüm haklar kullanıldı.",
			);
		}

		// Kullanıcı bazlı limit (varsayılan 1).
		const userClaimCount = (promo.redeemers || []).filter(
			(entry) => entry.user && entry.user.toString() === userId.toString(),
		).length;
		if (userClaimCount >= (promo.perUserLimit || 1)) {
			return ERROR(
				"USER_LIMIT_REACHED",
				"Bu promosyon kodunu zaten kullandınız.",
			);
		}

		// Seviye şartı — mevcut socket akışıyla aynı seviye formülü.
		const userLevel = Math.floor(
			Math.pow((user.xp || 0) / 1000 / 100, 1 / 3),
		);
		if (promo.levelMin > userLevel) {
			return ERROR(
				"VIP_LEVEL_REQUIRED",
				`Bu kodu kullanmak için minimum seviye ${promo.levelMin} olmalısınız.`,
			);
		}

		// Affiliate/partner grubu kısıtlaması: promo.affiliateCodes doluysa,
		// kullanıcının KAYIT SIRASINDA kullandığı referans kodu
		// (affiliates.redeemedCode) bu listede olmalı.
		if (Array.isArray(promo.affiliateCodes) && promo.affiliateCodes.length > 0) {
			const userAffiliateCode = String(
				user.affiliates?.redeemedCode || "",
			).trim().toLowerCase();
			const allowed = promo.affiliateCodes.some(
				(entry) => String(entry).trim().toLowerCase() === userAffiliateCode,
			);
			if (!allowed) {
				return ERROR(
					"AFFILIATE_NOT_ELIGIBLE",
					"Bu promosyon kodu affiliate grubunuza uygun değil.",
				);
			}
		}

		// Son onaylı yatırım şartı.
		if (promo.minLastDeposit > 0) {
			const lastDeposit = await getUserLastApprovedDepositAmount(user._id);
			if (lastDeposit < promo.minLastDeposit) {
				return ERROR(
					"DEPOSIT_REQUIRED",
					`Bu kodu kullanmak için en az ${promo.minLastDeposit} TL yatırım yapmış olmalısınız.`,
				);
			}
		}

		// Segment/koşul motoru (deposit / withdraw / membershipAgeDays / depositSinceDate).
		if (Array.isArray(promo.conditions) && promo.conditions.length > 0) {
			const { allPassed, firstFailed } = await evaluateConditions(
				user,
				promo.conditions,
			);
			if (!allPassed) {
				return ERROR(
					"CONDITIONS_NOT_MET",
					firstFailed
						? `Şart karşılanmadı: ${firstFailed.label}`
						: "Bu promosyon kodu için gerekli şartları karşılamıyorsunuz.",
				);
			}
		}

		// --- Tüm şartlar geçti, ödülü uygula ---
		// ⚠️ ÖNEMLİ: Bakiye ASLA `User.balance` (eski/kullanılmayan alan)
		// üzerine `$inc` ile yazılmaz. Sitedeki gerçek/görünen bakiye
		// `wallets[0].balance`'tır ve yatırım callback'leri, admin
		// ayarlamaları, VIP ödülleri gibi TÜM akışlar `updateUserBalance`
		// (utils/wallet.js) üzerinden günceller — bu fonksiyon hem doğru
		// alanı `$inc`'ler hem de socket "user" event'iyle frontend'e
		// anlık bildirim gönderir hem de deneme bonusu hedef bakiye
		// kontrolünü tetikler. Eski socket akışı (controllers/general/
		// promo/index.js) bu deseni kullanmıyordu ve muhtemelen aynı
		// bakiye-güncellenmeme hatasına sahipti; burada kasıtlı olarak
		// düzeltildi.
		const limitsIncUpdate = {};
		if (promo.applyWageringLock && promo.wageringMultiplier > 0) {
			limitsIncUpdate["limits.betToWithdraw"] =
				promo.reward * promo.wageringMultiplier;
		}

		const limitsSetUpdate = { updatedAt: Date.now() };
		if (promo.minWithdraw > 0) {
			limitsSetUpdate["limits.minWithdraw"] = Math.max(
				user.limits?.minWithdraw || 0,
				promo.minWithdraw,
			);
		}

		const otherUpdates = [
			PromoCode.findByIdAndUpdate(promo._id, {
				$push: { redeemers: { user: user._id, claimedAt: now } },
				$inc: { redeemptionsTotal: 1 },
				$set: { updatedAt: now },
			}),
			BalanceTransaction.create({
				amount: promo.reward,
				type: "promoCodeClaim",
				user: user._id,
				state: "completed",
			}),
		];
		if (Object.keys(limitsIncUpdate).length > 0) {
			otherUpdates.push(
				User.findByIdAndUpdate(user._id, {
					$inc: limitsIncUpdate,
					$set: limitsSetUpdate,
				}),
			);
		} else if (Object.keys(limitsSetUpdate).length > 1) {
			otherUpdates.push(
				User.findByIdAndUpdate(user._id, { $set: limitsSetUpdate }),
			);
		}

		const [newBalance] = await Promise.all([
			updateUserBalance(user, promo.reward),
			...otherUpdates,
		]);

		// updateUserBalance başarısız olursa (cüzdan bulunamadı/yarış durumu)
		// sessizce "başarılı" dönmeyelim — kullanıcıya "eklendi" yazıp gerçekte
		// bakiyeye hiçbir şey geçmemesi tam olarak bu kontrolün eksikliğinden
		// kaynaklanıyordu.
		if (newBalance === false) {
			throw new Error(
				`Promosyon kodu ödülü bakiyeye eklenemedi (userId: ${user._id}, code: ${promo.code}). ` +
					"Cüzdan güncellenemedi; lütfen tekrar deneyin veya destek ile iletişime geçin.",
			);
		}

		return {
			success: true,
			code: promo.code,
			reward: promo.reward,
			balance: newBalance,
			claimedAt: now,
		};
	} finally {
		claimLocks.delete(lockKey);
	}
};

module.exports = { claimPromoCode };
