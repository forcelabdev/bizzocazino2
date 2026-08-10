const mongoose = require("mongoose");

const creditTransactionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true }, // sistem coin'inde miktar (örneğin USDT)
    user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },

    type: { type: String, required: true }, // örn: "deposit" veya "withdraw"

    data: {
      providerId: { type: String, required: true }, // API sağlayıcı ID'si (örn: PradaPay idTransaction)
      providerUrl: { type: String, required: true }, // QR base64, PDF veya ödeme URL'si
      currency: { type: String, required: true }, // örn: BRL
      amountCurrency: { type: Number, required: true }, // BRL miktarı

      paymentMethod: { type: String, enum: ['pix', 'boleto', 'card'], required: true },
      paymentCode: { type: String }, // Pix code
      paymentCodeBase64: { type: String }, // QR base64 resmi
      idTransaction: { type: String }, // PradaPay Transaction ID
      postbackUrl: { type: String }, // callback endpoint'imiz
    },

    state: {
      type: String,
      enum: ['pending', 'success', 'failed', 'expired', 'refunded'],
      default: 'pending'
    },

    rawResponse: { type: Object }, // orijinal API cevabı
    webhookVerified: { type: Boolean, default: false },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

creditTransactionSchema.index({ user: 1 });
creditTransactionSchema.index({ user: 1, state: 1 });
creditTransactionSchema.index({ user: 1, state: 1, type: 1 });
creditTransactionSchema.index({ "data.providerId": 1 });
creditTransactionSchema.index({ state: 1 });

module.exports = mongoose.model("CreditTransaction", creditTransactionSchema);
