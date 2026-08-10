const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wallets: {
    btc: { type: Number, default: 0 },
    eth: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 },
    bnb: { type: Number, default: 0 },
    usdc: { type: Number, default: 0 },
    xmr: { type: Number, default: 0 },
    pol: { type: Number, default: 0 },
    sol: { type: Number, default: 0 },
    not: { type: Number, default: 0 },
    shib: { type: Number, default: 0 },
    trx: { type: Number, default: 0 },
    dogs: { type: Number, default: 0 },
    ton: { type: Number, default: 0 },
    dai: { type: Number, default: 0 },
    bch: { type: Number, default: 0 },
    doge: { type: Number, default: 0 },
    ltc: { type: Number, default: 0 },
    avax: { type: Number, default: 0 },
    ada: { type: Number, default: 0 },
    dot: { type: Number, default: 0 },
    matic: { type: Number, default: 0 },
    xrp: { type: Number, default: 0 },
  },
  selectedCurrency: {
    type: String,
    enum: ['try', 'usd', 'eur', 'inr', 'idr', 'brl', 'jpy', 'cny'],
    default: 'usd',
  },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

WalletSchema.index({ user: 1 }, { unique: true });
WalletSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Wallet', WalletSchema);
