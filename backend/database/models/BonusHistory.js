const mongoose = require('mongoose');

const bonusHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // upgradeReward, dailyVipReward, etc.
  amount: { type: Number, required: true },
  level: { type: Number }, // Alındığı VIP seviyesi
  claimedAt: { type: Date, default: Date.now },
  details: { type: Object }, // Ekstra bilgiler için esnek alan
});

bonusHistorySchema.index({ userId: 1 });
bonusHistorySchema.index({ userId: 1, type: 1, claimedAt: -1 });
bonusHistorySchema.index({ claimedAt: -1 });

module.exports = mongoose.model('BonusHistory', bonusHistorySchema);
