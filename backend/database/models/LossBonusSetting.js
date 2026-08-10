const mongoose = require("mongoose");

// Kayıp Bonusu: tek kayıtlık (singleton) ayar dokümanı.
const lossBonusSettingSchema = new mongoose.Schema(
	{
		enabled: { type: Boolean, default: false },

		// Net kayıp üzerinden geri ödenecek oran (%). Örn: 10 => %10.
		percentage: { type: Number, default: 20, min: 0, max: 100 },

		// Talep başına maksimum bonus tutarı (TL). 0 = limitsiz.
		maxBonusAmount: { type: Number, default: 5000, min: 0 },

		// Talep edilebilmesi için gereken minimum net kayıp (TL).
		minLossAmount: { type: Number, default: 0, min: 0 },

		// true: talep anında otomatik onaylanır ve bakiyeye geçer.
		// false: talep PENDING olarak düşer, admin onaylamalıdır.
		autoApprove: { type: Boolean, default: true },

		note: { type: String, default: "", trim: true },

		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("LossBonusSetting", lossBonusSettingSchema);
