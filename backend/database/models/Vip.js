const mongoose = require('mongoose');

const vipLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  levelName: { type: String, required: true },

  requiredXp: { type: Number, required: true }, 
  
  // Gereklilikler
  requiredWager: { type: Number, required: true },
  requiredDeposit: { type: Number, default: 0 },

  // Cashback
  dailyCashback: { type: Number, default: 0 },
  weeklyCashback: { type: Number, default: 0 },
  monthlyCashback: { type: Number, default: 0 },

  // Ödüller
  upgradeReward: { type: Number, default: 0 },
  dailyVipReward: { type: Number, default: 0 },
  weeklyVipReward: { type: Number, default: 0 },
  vipDayReward: { type: Number, default: 0 },
  vipDay: { type: String, default: 'Friday' },

  // Diğer bilgiler
  withdrawLimit: { type: Number, default: 0 },
  vipSupportInfo: { type: String },
  vipBadgeImage: { type: String },
  vipHeaderImage: { type: String }

}, { timestamps: true });

vipLevelSchema.index({ level: 1 }, { unique: true });
vipLevelSchema.index({ requiredXp: 1 });

module.exports = mongoose.models.Vip || mongoose.model('Vip', vipLevelSchema);
