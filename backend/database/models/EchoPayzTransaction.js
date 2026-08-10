const mongoose = require("mongoose");

const echoPayzTransactionSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		// Sizin oluşturduğunuz benzersiz işlem ID'si
		referenceId: {
			type: String,
			required: true,
		},
		// EchoPayz'ın döndürdüğü transaction_id
		echopayzTransactionId: {
			type: String,
		},
		// Kullanıcıdan alınan tutar (TL cinsinden)
		amount: {
			type: Number,
			required: true,
		},
		// Kuruş cinsinden gönderilen tutar
		grossAmount: {
			type: Number,
		},
		// Komisyon sonrası net tutar (kuruş cinsinden)
		netAmount: {
			type: Number,
		},
		// Komisyon oranı
		commissionRate: {
			type: Number,
		},
		// Komisyon tutarı (kuruş cinsinden)
		commissionAmount: {
			type: Number,
		},
		currency: {
			type: String,
			default: "TRY",
		},
		status: {
			type: String,
			enum: ["pending", "approved", "rejected", "cancelled", "expired"],
			default: "pending",
		},
		// Ödeme URL'i
		paymentUrl: {
			type: String,
		},
		// İşlem öncesi ve sonrası bakiye
		oldBalance: {
			type: Number,
			default: 0,
		},
		newBalance: {
			type: Number,
			default: 0,
		},
		// Müşteri IP adresi
		customerIp: {
			type: String,
		},
		// Ek bilgiler
		extraData: {
			type: Object,
		},
		// Red nedeni
		rejectionReason: {
			type: String,
		},
		// Son kullanma tarihi
		expiresAt: {
			type: Date,
		},
		// Onay tarihi
		approvedAt: {
			type: Date,
		},
		// Red tarihi
		rejectedAt: {
			type: Date,
		},
		// Callback ham verisi
		callbackRawData: {
			type: Object,
		},
	},
	{ timestamps: true }
);

// İndeksler
echoPayzTransactionSchema.index({ createdAt: -1 });
echoPayzTransactionSchema.index({ status: 1, createdAt: -1 });
echoPayzTransactionSchema.index({ user: 1, status: 1 });
echoPayzTransactionSchema.index({ referenceId: 1 }, { unique: true });
echoPayzTransactionSchema.index({ echopayzTransactionId: 1 });

module.exports = mongoose.model("EchoPayzTransaction", echoPayzTransactionSchema);
