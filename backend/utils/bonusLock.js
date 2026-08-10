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
	if (!lock || (!lock.blockedUntil && !lock.wageringRequired)) {
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
 * Gerçek para çekim taleplerinin oluşturulduğu TÜM uç noktalarda kullanılır.
 * Aktif bir çevrim (wagering) kilidi varsa hata fırlatır. Zaman bazlı eski
 * kilit tipi (`type === "time"`) çekimi ENGELLEMEZ — o sadece diğer
 * bonusları engellemek için var olan geriye dönük davranıştır.
 */
const assertWithdrawalNotBlocked = async (user) => {
	const status = await evaluateBonusLock(user);
	if (status.active && status.type === "wagering") {
		const err = new Error(
			`Devam eden bir bonus çevrim şartınız var. Çekim yapabilmek için ${status.wageringRemaining} TL daha çevrim yapmanız gerekiyor.`
		);
		err.code = "WAGERING_REQUIREMENT_NOT_MET";
		err.wagering = status;
		throw err;
	}
	return status;
};

module.exports = {
	applyBonusLock,
	applyWageringLock,
	evaluateBonusLock,
	assertWithdrawalNotBlocked,
};
