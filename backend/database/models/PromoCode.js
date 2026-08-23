const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  reward: { type: Number, required: true, min: 0 },
  levelMin: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  affiliateCodes: { type: [String], default: [] },
  redeemers: [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    claimedAt: { type: Date, default: Date.now },
  }],
  redeemptionsTotal: { type: Number, default: 0, min: 0 },
  redeemptionsMax: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  minLastDeposit: { type: Number, default: 0, min: 0 },
  applyWageringLock: { type: Boolean, default: false },
  wageringMultiplier: { type: Number, default: 0, min: 0 },
  minWithdraw: { type: Number, default: 0, min: 0 },
  // 🎯 Segment/koşul motoru: mevcut levelMin/minLastDeposit alanlarına EK
  // olarak, hepsi AND ile birleşen daha zengin koşullar (bkz. promoCodeService.js).
  conditions: {
    type: [{
      metric: {
        type: String,
        enum: ["deposit", "withdraw", "membershipAgeDays", "depositSinceDate"],
        required: true,
      },
      operator: {
        type: String,
        enum: ["gte", "lte", "eq", "gt", "lt"],
        required: true,
      },
      value: { type: Number, required: true },
      // dateFrom/dateTo: "deposit"/"withdraw" metrikleri için tarih aralığı.
      // dateFrom dolu + dateTo boş = dateFrom'dan bugüne kadar.
      dateFrom: { type: Date, default: null },
      dateTo: { type: Date, default: null },
    }],
    default: [],
  },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ createdAt: -1 });

// Eğer model zaten tanımlıysa yeniden tanımlama, mevcut modeli kullan
module.exports = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);
