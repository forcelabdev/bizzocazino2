const mongoose = require("mongoose");

// Reload Bonusu: tek kayıtlık (singleton) genel ayar dokümanı.
// Reload, Yatırım/Kayıp Bonusu gibi otomatik/genel bir bonus değildir —
// admin, belirli bir kullanıcının belirli bir dönemdeki kaybına bakarak
// manuel olarak bir Reload ataması (ReloadBonusAssignment) oluşturur. Bu
// ayar dokümanı sadece admin panelindeki formun varsayılan değerlerini ve
// izin verilen sınırları tutar.
const reloadBonusSettingSchema = new mongoose.Schema(
	{
		enabled: { type: Boolean, default: true },

		// Admin formunda varsayılan olarak gelecek oran (%) ve aralık tipi.
		defaultPercentage: { type: Number, default: 15, min: 0, max: 100 },

		// "daily" | "hourly" | "minute"
		defaultIntervalType: {
			type: String,
			enum: ["daily", "hourly", "minute"],
			default: "daily",
		},
		defaultIntervalMinutes: { type: Number, default: 1440, min: 1 }, // 1440dk=1gün

		// Admin formunda varsayılan çevrim katsayısı (x). 0 = çevrim şartı yok.
		defaultWageringMultiplier: { type: Number, default: 1, min: 0 },

		// Talep başına / toplamda izin verilen maksimum tutar (TL). 0 = limitsiz.
		maxTotalAmount: { type: Number, default: 0, min: 0 },

		// Bir kullanıcıya atanabilecek minimum toplam tutar (TL).
		minTotalAmount: { type: Number, default: 0, min: 0 },

		note: { type: String, default: "", trim: true },

		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("ReloadBonusSetting", reloadBonusSettingSchema);
