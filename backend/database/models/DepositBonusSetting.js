const mongoose = require("mongoose");

// Yatırım Bonusu (Çevrimsiz / oto-talep): tek kayıtlık (singleton) ayar
// dokümanı. Kullanıcı yatırım yaptıktan sonra HİÇBİR oyuna/bahse
// katılmadıysa yatırımının belirlenen yüzdesini bonus olarak otomatik
// talep edebilir. Talebi anda tek bir bahis dahi tespit edilirse talep
// reddedilir.
const depositBonusSettingSchema = new mongoose.Schema(
	{
		enabled: { type: Boolean, default: false },

		name: { type: String, default: "Yatırım Bonusu", trim: true },

		// Yatırım tutarı üzerinden ödenecek oran (%). Örn: 15 => %15.
		percentage: { type: Number, default: 15, min: 0, max: 100 },

		// Yüzde yerine/yanında sabit tutar kullanılacaksa (0 = kullanılmıyor).
		fixedAmount: { type: Number, default: 0, min: 0 },

		// Talep başına maksimum bonus tutarı (TL). 0 = limitsiz.
		maxBonusAmount: { type: Number, default: 1000, min: 0 },

		// Bonusa dahil edilecek minimum / maksimum yatırım tutarı (TL).
		// maxDepositAmount = 0 => limitsiz.
		minDepositAmount: { type: Number, default: 50, min: 0 },
		maxDepositAmount: { type: Number, default: 0, min: 0 },

		// Bilgilendirme amaçlı çevrim katsayısı (x). Şu an otomatik
		// çevrim takibi yapılmıyor; admin panelinde referans olarak tutulur.
		wageringMultiplier: { type: Number, default: 1, min: 0 },

		// blockOtherBonuses açıkken, bu bonus alındığında diğer bonusların
		// kaç saat boyunca engelleneceği. blockOtherBonuses kapalıyken
		// kullanılmaz.
		durationHours: { type: Number, default: 720, min: 0 },

		// true: talep anında otomatik onaylanır ve bakiyeye geçer.
		// false: talep PENDING olarak düşer, admin onaylamalıdır.
		autoApprove: { type: Boolean, default: true },

		// Bu bonus alındığında, belirlenen süre boyunca kullanıcının başka
		// bonus talep etmesi / bonus alması engellenir (Kayıp Bonusu, manuel
		// bonus vb.).
		blockOtherBonuses: { type: Boolean, default: true },

		note: { type: String, default: "", trim: true },

		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("DepositBonusSetting", depositBonusSettingSchema);
