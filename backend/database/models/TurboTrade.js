const mongoose = require('mongoose');

const TurboTradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  symbol: { // Örn: BTCUSDT
    type: String,
    required: true
  },

  amount: { // Yatırılan miktar
    type: Number,
    required: true,
    min: 1
  },

  direction: { // UP veya DOWN
    type: String,
    enum: ['UP', 'DOWN'],
    required: true
  },

  entryPrice: { // İşlem başladığında fiyat
    type: Number,
    required: true
  },

  closePrice: { // Süre sonunda fiyat
    type: Number
  },

  duration: { // Saniye cinsinden (15,30,60,90,120)
    type: Number,
    required: true,
    enum: [15, 30, 60, 90, 120]
  },

  startTime: { // Pozisyon açılış zamanı
    type: Date,
    required: true,
    default: Date.now
  },

  endTime: { // Ne zaman kapanacak?
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open'
  },

  result: { // Kullanıcı kazandı mı kaybetti mi?
    type: String,
    enum: ['win', 'lose', 'draw', null],
    default: null
  },

  payoutRate: { // Örn: %85 payout için 1.85
    type: Number,
    required: true,
    default: 1.85
  },

  payoutAmount: { // Kullanıcıya ödenecek tutar
    type: Number,
    default: 0
  },

  // Multi-currency / wallet bilgisi
  fiatCurrency: { type: String, default: 'USDT' },
  wallet: { type: String }, // Örn: BTC-ERC20, USDT-TRC20

  // Audit / log
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date }
});

TurboTradeSchema.index({ user: 1 });
TurboTradeSchema.index({ createdAt: -1 });
TurboTradeSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('TurboTrade', TurboTradeSchema);
