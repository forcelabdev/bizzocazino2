const { createAdminNotification } = require("./adminNotification");

/**
 * TÜM ödeme sağlayıcı yatırım onay noktalarının (GalaxyPay, MeelDev,
 * ForcelabFinance, FluxKripto, xPayments, Pix, Oxapay/Kripto) tek çağırdığı
 * ortak nokta. Kullanıcıya GERÇEK bir yatırım tutarı kredilendiğinde
 * (bakiye güncellemesinden SONRA) çağrılmalıdır. İki şey yapar:
 *
 *  1) Admin paneline "Yeni Yatırım İşlemi" bildirimi gönderir (socket +
 *     veritabanı kaydı + admin panelinde ses — bkz. useAdminNotifications.js).
 *  2) Kullanıcının hâlâ tamamlanmamış bir Deneme Bonusu çevrim kilidi varsa
 *     GÜVENLİK NEDENİYLE anında sonlandırır (bkz. trialBonusService.js →
 *     handleRealDepositCredited) — kullanıcı bir dahaki oyun açılışında
 *     normal (varsayılan) Betinovi agent'ına döner.
 *
 * Ana yatırım/callback akışını ASLA bloklamaz veya başarısız etmez; tüm
 * hatalar yutulup sadece loglanır (fire-and-forget).
 *
 * @param {object} user - En az `_id` ve `username` içeren User nesnesi.
 * @param {number} amount - Yatırım tutarı (₺, kullanıcının fiat cinsinden).
 * @param {string} provider - Sağlayıcı adı (örn. "GalaxyPay", "MeelDev").
 */
const notifyRealDepositCredited = (user, amount, provider) => {
	const userId = user?._id;
	const username = user?.username || "Kullanıcı";

	try {
		createAdminNotification(
			"deposit",
			"Yeni Yatırım İşlemi",
			`${username} kullanıcısı ${amount} ₺ tutarında ${provider} yatırımı yaptı.`,
			"/apps/finance/deposit",
			{ provider, amount, username, userId }
		);
	} catch (err) {
		console.error(
			"❌ notifyRealDepositCredited → admin bildirimi hatası:",
			err.message
		);
	}

	try {
		require("../services/trialBonusService")
			.handleRealDepositCredited(userId)
			.catch((err) =>
				console.error(
					"❌ notifyRealDepositCredited → deneme bonusu kilidi sonlandırma hatası:",
					err.message
				)
			);
	} catch (err) {
		console.error(
			"❌ notifyRealDepositCredited → deneme bonusu kilidi sonlandırma kurulamadı:",
			err.message
		);
	}
};

module.exports = { notifyRealDepositCredited };
