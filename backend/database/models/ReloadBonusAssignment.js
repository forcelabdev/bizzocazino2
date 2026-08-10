const mongoose = require("mongoose");

const userSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
	},
	{ _id: false }
);

// Reload Bonusu ataması: admin, bir kullanıcı için referans bir kayıp
// tutarı ve oran (%) girerek toplam bir Reload tutarı belirler. Bu tutar,
// seçilen aralık tipine (günlük/saatlik/dakika) göre eşit parçalara
// bölünür ve kullanıcı her aralıkta bir parçayı claim edebilir.
//
// Örnek: referansLoss=10.000, percentage=%15 => totalAmount=1.500
// intervalType="daily", totalPeriods=7 => her gün 214,28 TL claim edilebilir.
const reloadBonusAssignmentSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		userSnapshot: {
			type: userSnapshotSchema,
			default: () => ({}),
		},

		// Admin'in referans aldığı dönem/kayıp bilgisi (sadece hesaplama ve
		// rapor amaçlı, sistem tarafından otomatik hesaplanmaz — admin bu
		// tutarı manuel girer ya da mevcut kayıp raporundan referans alır).
		referenceLossAmount: { type: Number, required: true, min: 0 },
		percentage: { type: Number, required: true, min: 0, max: 100 },

		// Hesaplanan toplam Reload tutarı = referenceLossAmount * percentage/100
		totalAmount: { type: Number, required: true, min: 0 },

		// "daily" | "hourly" | "minute"
		intervalType: {
			type: String,
			enum: ["daily", "hourly", "minute"],
			required: true,
		},
		// Aralık uzunluğu (dakika cinsinden). daily=1440, hourly=60, minute=1
		// gibi varsayılanlar kullanılabilir ama admin özelleştirebilir
		// (örn. her 10 dakikada bir).
		intervalMinutes: { type: Number, required: true, min: 1 },

		// Toplam kaç parçaya bölünecek (örn. 7 günlük reload => 7).
		totalPeriods: { type: Number, required: true, min: 1 },

		// Her parçanın tutarı = totalAmount / totalPeriods
		amountPerPeriod: { type: Number, required: true, min: 0 },

		// Şimdiye kadar claim edilen parça sayısı ve tutarı.
		claimedPeriods: { type: Number, default: 0, min: 0 },
		claimedAmount: { type: Number, default: 0, min: 0 },

		// Çevrim katsayısı (x). 0 = çevrim şartı yok. Her claim'de, claim
		// edilen tutar * bu katsayı kadar ek çevrim şartı User.reloadLock'a
		// eklenir.
		wageringMultiplier: { type: Number, default: 0, min: 0 },

		// Reload periyodunun başlangıç/bitiş zamanı ve bir sonraki claim'in
		// yapılabileceği en erken zaman.
		startAt: { type: Date, required: true },
		endAt: { type: Date, required: true },
		nextClaimAt: { type: Date, required: true },

		status: {
			type: String,
			enum: ["active", "completed", "expired", "cancelled"],
			default: "active",
		},

		note: { type: String, default: "", trim: true },

		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		cancelledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		cancelledAt: { type: Date, default: null },
		cancellationReason: { type: String, default: "", trim: true },

		completedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

reloadBonusAssignmentSchema.index({ user: 1, createdAt: -1 });
reloadBonusAssignmentSchema.index({ status: 1, nextClaimAt: 1 });

module.exports = mongoose.model(
	"ReloadBonusAssignment",
	reloadBonusAssignmentSchema
);
