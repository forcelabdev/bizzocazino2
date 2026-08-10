const User = require("../database/models/User");

/**
 * Kullanıcının şu an paylaşımlı bonus kilidi altında olup olmadığını
 * kontrol eder. Bir bonus türü (örn. Yatırım Bonusu) alındığında diğer
 * bonusların (örn. Kayıp Bonusu) belirli bir süre talep edilmesini
 * engellemek için kullanılır.
 */
const isBonusLocked = (user) => {
	const blockedUntil = user?.bonusLock?.blockedUntil;
	return Boolean(blockedUntil && new Date(blockedUntil) > new Date());
};

const getBonusLockInfo = (user) => {
	if (!isBonusLocked(user)) return null;
	return {
		blockedUntil: user.bonusLock.blockedUntil,
		source: user.bonusLock.source || "",
	};
};

/**
 * Kullanıcı üzerine, verilen süre (saat) boyunca geçerli bir bonus kilidi
 * uygular. `source` hangi bonusun kilidi koyduğunu belirtir (örn.
 * "deposit_bonus").
 */
const applyBonusLock = async (userId, durationHours, source) => {
	if (!durationHours || durationHours <= 0) return null;
	const blockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
	await User.findByIdAndUpdate(userId, {
		$set: {
			"bonusLock.blockedUntil": blockedUntil,
			"bonusLock.source": source,
		},
	});
	return blockedUntil;
};

module.exports = {
	isBonusLocked,
	getBonusLockInfo,
	applyBonusLock,
};
