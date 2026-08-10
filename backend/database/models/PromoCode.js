const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String },
  reward: { type: Number },
  levelMin: { type: Number },
  redeemers: [
    {
      user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    },
  ],
  redeemptionsTotal: { type: Number, default: 0 },
  redeemptionsMax: { type: Number },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ createdAt: -1 });

// Eğer model zaten tanımlıysa yeniden tanımlama, mevcut modeli kullan
module.exports = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);
