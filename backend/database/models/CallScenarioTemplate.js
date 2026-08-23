const mongoose = require("mongoose");

// Çağrı Senaryosu Şablonu: müşteri temsilcilerinin telefonda üyeye
// sunduğu "Call Özel Davet Bonusu" gibi senaryoların tanımını tutar.
// Bu şablon, gerçek para/bonus hareketini kendisi yapmaz — sadece
// varsayılan değerleri ve kural metnini taşır. Bir üyeye uygulanan her
// senaryo, ayrı bir CallScenarioAssignment kaydı olarak saklanır.
const callScenarioTemplateSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, unique: true, trim: true },

		// Üyeye tanımlanacak nakit bonus tutarı (TL). Örn. 1000.
		bonusAmount: { type: Number, default: 0, min: 0 },

		// Üyenin yapması gereken yatırım tutarı (TL). Örn. 2000.
		requiredDepositAmount: { type: Number, default: 0, min: 0 },

		// Çevrim şartı katı (x). Örn. 1 => yatırım tutarının 1 katı.
		wageringMultiplier: { type: Number, default: 0, min: 0 },

		// Minimum / maksimum çekim tutarı (TL).
		minWithdrawalAmount: { type: Number, default: 0, min: 0 },
		maxWithdrawalAmount: { type: Number, default: 0, min: 0 },

		// Senaryonun geçerli olduğu oyun sağlayıcısı/sağlayıcıları
		// (serbest metin, örn. "Pragmatic Play").
		allowedProviders: { type: String, default: "", trim: true },

		// Senaryonun geçerli OLMADIĞI kategoriler (serbest metin, örn.
		// "Casino, Canlı Casino, Spor Bahisleri").
		excludedCategories: { type: String, default: "", trim: true },

		// Senaryonun tam kural metni — admin panelinde textarea olarak
		// düzenlenir, temsilciye üyeye anlatması için referans olur.
		rulesText: { type: String, default: "", trim: true },

		// true ise, aynı üyeye bu senaryo yalnızca 1 kez atanabilir
		// (iptal edilmemiş bir atama varsa yeni atama reddedilir).
		preventDuplicatePerUser: { type: Boolean, default: true },

		active: { type: Boolean, default: true },

		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true }
);

callScenarioTemplateSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model(
	"CallScenarioTemplate",
	callScenarioTemplateSchema
);
