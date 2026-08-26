// Deneme Bonusu — İnceleme Kilidi tetiklendiğinde (çevrim tamamlandı VEYA
// hedef bakiyeye ulaşıldı), kullanıcının aktif socket bağlantılarına bir
// "review required" olayı gönderip bağlantıyı keser. `utils/userSuspension.js`
// içindeki `notifyAndDisconnectSuspendedUser` deseninin birebir kopyasıdır.
//
// Frontend (oyuncu sitesi), `trial_bonus:review_required` olayını dinleyip
// ekranı yenileme / canlı destek mesajı gösterme UI'ını kendi tarafında
// yönetir — biz burada sadece sinyali ve standart payload'ı sağlıyoruz.

const TRIAL_BONUS_REVIEW_CODE = "TRIAL_BONUS_REVIEW";
const TRIAL_BONUS_REVIEW_EVENT = "trial_bonus:review_required";
const TRIAL_BONUS_REVIEW_MESSAGE =
	"Deneme bonusu çevrim/hedef şartı tamamlandı. Hesabınız incelemeye alındı, canlı destek ile iletişime geçin.";

const buildTrialBonusReviewPayload = () => ({
	success: false,
	code: TRIAL_BONUS_REVIEW_CODE,
	message: TRIAL_BONUS_REVIEW_MESSAGE,
	error: {
		type: "trial_bonus_review",
		code: TRIAL_BONUS_REVIEW_CODE,
		message: TRIAL_BONUS_REVIEW_MESSAGE,
	},
});

const findUserSockets = (io, userId) => {
	const normalizedUserId = String(userId || "");
	if (!io || !normalizedUserId) return [];

	const namespaces = io._nsps instanceof Map ? [...io._nsps.values()] : [];
	return namespaces.flatMap((namespace) =>
		[...(namespace?.sockets?.values?.() || [])].filter((socket) => {
			const decodedUserId = socket?.decoded?._id || socket?.decoded?.id;
			return decodedUserId && String(decodedUserId) === normalizedUserId;
		})
	);
};

const notifyAndKickUserForTrialBonusReview = async (io, userId) => {
	const sockets = findUserSockets(io, userId);
	const payload = buildTrialBonusReviewPayload();

	for (const socket of sockets) {
		socket.emit(TRIAL_BONUS_REVIEW_EVENT, payload);
	}
	for (const socket of sockets) {
		// Önce olayın istemciye ulaşmasına izin ver, sonra bağlantıyı kes.
		socket.disconnect(false);
	}

	return sockets.length;
};

// Deneme Bonusu admin tarafından İPTAL EDİLDİĞİNDE (çevrim/hedef bakiye hâlâ
// sürerken VEYA gerçek yatırım nedeniyle otomatik sonlandırıldığında) çağrılır.
// Amaç: kullanıcı o an "bizzodeneme" (trial) agent'ı üzerinden AÇIK bir oyun
// oturumundaysa bile, sitedeki aktif bağlantısını hemen keserek bir dahaki
// oyun açılışının (game_launch) doğru agent'a (varsayılan) yönlenmesini
// garantiye almak — kullanıcı iptal sonrası "agent 2" üzerinden devam edemez.
const TRIAL_BONUS_CANCELLED_EVENT = "trial_bonus:cancelled";
const TRIAL_BONUS_CANCELLED_MESSAGE =
	"Deneme bonusunuz iptal edildi. Oyunlara erişim için sayfayı yenileyin.";

const buildTrialBonusCancelledPayload = (reason) => ({
	success: false,
	code: "TRIAL_BONUS_CANCELLED",
	message: TRIAL_BONUS_CANCELLED_MESSAGE,
	error: {
		type: "trial_bonus_cancelled",
		code: "TRIAL_BONUS_CANCELLED",
		reason: reason || "",
		message: TRIAL_BONUS_CANCELLED_MESSAGE,
	},
});

const notifyAndKickUserForTrialBonusCancelled = async (io, userId, reason) => {
	const sockets = findUserSockets(io, userId);
	const payload = buildTrialBonusCancelledPayload(reason);

	for (const socket of sockets) {
		socket.emit(TRIAL_BONUS_CANCELLED_EVENT, payload);
	}
	for (const socket of sockets) {
		socket.disconnect(false);
	}

	return sockets.length;
};

module.exports = {
	TRIAL_BONUS_REVIEW_CODE,
	TRIAL_BONUS_REVIEW_EVENT,
	TRIAL_BONUS_REVIEW_MESSAGE,
	TRIAL_BONUS_CANCELLED_EVENT,
	TRIAL_BONUS_CANCELLED_MESSAGE,
	buildTrialBonusReviewPayload,
	buildTrialBonusCancelledPayload,
	notifyAndKickUserForTrialBonusReview,
	notifyAndKickUserForTrialBonusCancelled,
};
