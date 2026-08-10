// models/BonusSetting.js
const mongoose = require('mongoose');

const BonusSettingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['first_deposit', 'second_deposit', 'third_deposit', 'fourth_deposit', 'regular_deposit'], // günlük bonus için eklendi
  },
  percentage: Number,
  minAmount: Number,          // ilk yatırımlar için anlamlı
  maxAmount: Number,          // maksimum bonus miktarı
  maxDepositLimit: Number,    // sadece "deposit" için anlamlı (örn: 50.000 tavan)
  dailyLimit: Number,         // sadece "deposit" için anlamlı (günlük 1 kez gibi)
  enabled: Boolean
});


BonusSettingSchema.index({ type: 1 }, { unique: true });

module.exports = mongoose.model('BonusSetting', BonusSettingSchema);
