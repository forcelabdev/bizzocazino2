const mongoose = require('mongoose');

const battlesBetSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    outcomes: [{ type: Number }],
    slot: { type: Number },
    game: { type: mongoose.Schema.ObjectId, ref: 'BattlesGame' },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    fiatCurrency: { type: String, default: 'USD' },
    bot: { type: Boolean },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

battlesBetSchema.index({ user: 1 });
battlesBetSchema.index({ createdAt: -1 });
battlesBetSchema.index({ game: 1 });
battlesBetSchema.index({ payout: 1, bot: 1, updatedAt: -1 });

module.exports = mongoose.model('BattlesBet', battlesBetSchema);