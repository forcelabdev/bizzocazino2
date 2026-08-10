const mongoose = require('mongoose');

const rollBetSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    game: { type: mongoose.Schema.ObjectId, ref: 'RollGame' },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
     fiatCurrency: { type: String, required: true }, // TRY, USD, EUR
    coinType: { type: String },
chain: { type: String },
walletType: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

rollBetSchema.index({ user: 1 });
rollBetSchema.index({ createdAt: -1 });
rollBetSchema.index({ game: 1 });
rollBetSchema.index({ payout: 1, updatedAt: -1 });

module.exports = mongoose.model('RollBet', rollBetSchema);
