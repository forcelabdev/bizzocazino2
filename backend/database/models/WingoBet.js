    const mongoose = require('mongoose');

const wingoBetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundId: { type: String, required: true },

  betType: { type: String, enum: ['color', 'number'], required: true }, // Renk mi sayı mı
  choice: { type: String, required: true }, // 'red', 'green', 'violet' ya da '0'–'9'

  amount: { type: Number, required: true },

  payout: { type: Number, default: 0 }, // Kazanırsa ne kadar alacak
  isWin: { type: Boolean, default: false },

  wallet: {
    coinType: { type: String, required: true },
    chain: { type: String, required: true },
    type: { type: String, required: true },
    currency: { type: String, required: true }
  }

}, { timestamps: true });

wingoBetSchema.index({ user: 1 });
  wingoBetSchema.index({ roundId: 1 });
  wingoBetSchema.index({ createdAt: -1 });
module.exports = mongoose.model('WingoBet', wingoBetSchema);
