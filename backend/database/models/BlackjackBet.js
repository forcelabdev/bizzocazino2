const mongoose = require('mongoose');

const blackjackBetSchema = new mongoose.Schema({
    amount: {
        main: { type: Number },
        sideLeft: { type: Number },
        sideRight: { type: Number }
    },
    payout: { type: Number },
    multiplier: { type: Number },
    cards: [
        {
            rank: { type: String },
            suit: { type: String }
        }
    ],
    cardsLeft: [
        {
            rank: { type: String },
            suit: { type: String }
        }
    ],
    cardsRight: [
        {
            rank: { type: String },
            suit: { type: String }
        }
    ],
    actions: [{ type: String }],
    seat: { type: Number },
    game: { type: mongoose.Schema.ObjectId, ref: 'BlackjackGame' },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

blackjackBetSchema.index({ user: 1 });
blackjackBetSchema.index({ createdAt: -1 });
blackjackBetSchema.index({ game: 1 });
blackjackBetSchema.index({ payout: 1, updatedAt: -1 });

module.exports = mongoose.model('BlackjackBet', blackjackBetSchema);
