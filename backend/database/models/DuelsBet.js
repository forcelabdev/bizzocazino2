const mongoose = require('mongoose');

const duelsBetSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    roll: { type: Number },
    game: { type: mongoose.Schema.ObjectId, ref: 'DuelsGame' },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    fiatCurrency: { type: String, default: 'USD' },   // Örn: TRY, USD
    fiatRate: { type: Number }, // Örn: 31.00 (1 BTC = 31 USD gibi)
    bot: { type: Boolean },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

duelsBetSchema.index({ user: 1 });
duelsBetSchema.index({ createdAt: -1 });
duelsBetSchema.index({ game: 1 });
duelsBetSchema.index({ payout: 1, bot: 1, updatedAt: -1 });

module.exports = mongoose.model('DuelsBet', duelsBetSchema);
