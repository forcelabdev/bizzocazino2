const mongoose = require("mongoose");

// Deneme Bonusu: tek kayıtlık (singleton) ayar dokümanı. Kullanıcı, kayıt
// sonrası HERHANGİ bir yatırım yapmadan, hesabı başına BİR KEZ sabit bir
// deneme bonusu talep edebilir. Gerçek oyun/bahis sonuçlarına dokunmaz —
// sadece bakiyeye tanımlanan bir bonus tutarıdır ve normal çevrim/kilit
// mekanizmasına tabidir.
const trialBonusSettingSchema = new mongoose.Schema(
	{
		enabled: { type: Boolean, default: false },

		name: { type: String, default: "Deneme Bonusu", trim: true },

		// Sabit deneme bonusu tutarı (TL).
		amount: { type: Number, default: 1000, min: 0 },

		// true: talep anında otomatik onaylanır ve bakiyeye geçer.
		// false: talep PENDING olarak düşer, admin onaylamalıdır.
		autoApprove: { type: Boolean, default: true },

		// Çevrim katsayısı (x). 0 = çevrim şartı yok.
		wageringMultiplier: { type: Number, default: 0, min: 0 },

		// wageringMultiplier === 0 iken, blockOtherBonuses açıksa, bu bonus
		// alındığında diğer bonusların kaç saat boyunca engelleneceği.
		durationHours: { type: Number, default: 0, min: 0 },

		blockOtherBonuses: { type: Boolean, default: false },

		note: { type: String, default: "", trim: true },

		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("TrialBonusSetting", trialBonusSettingSchema);
