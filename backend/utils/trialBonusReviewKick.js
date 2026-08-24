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

const notifyAndKickUserForTrialBonusReview = async (io, userId) => {
	const normalizedUserId = String(userId || "");
	if (!io || !normalizedUserId) return 0;

	const namespaces = io._nsps instanceof Map ? [...io._nsps.values()] : [];
	const sockets = namespaces.flatMap((namespace) =>
		[...(namespace?.sockets?.values?.() || [])].filter((socket) => {
			const decodedUserId = socket?.decoded?._id || socket?.decoded?.id;
			return decodedUserId && String(decodedUserId) === normalizedUserId;
		})
	);
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

module.exports = {
	TRIAL_BONUS_REVIEW_CODE,
	TRIAL_BONUS_REVIEW_EVENT,
	TRIAL_BONUS_REVIEW_MESSAGE,
	buildTrialBonusReviewPayload,
	notifyAndKickUserForTrialBonusReview,
};
