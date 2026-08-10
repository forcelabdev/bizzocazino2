const mongoose = require('mongoose');

const minesGameSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    minesCount: { type: Number },
    deck: [{ type: String }],
    revealed: [
        {
            tile: { type: Number },
            value: { type: String }
        }
    ],
    fair: {
        seed: { type: mongoose.Schema.ObjectId, ref: 'UserSeed' },
        nonce: { type: Number }
    },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    fiatCurrency: { type: String, default: 'USD' },
    coinType: { type: String },
chain: { type: String },
walletType: { type: String },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

minesGameSchema.index({ user: 1 });
minesGameSchema.index({ createdAt: -1 });
minesGameSchema.index({ state: 1, createdAt: -1 });
minesGameSchema.index({ payout: 1, updatedAt: -1 });
minesGameSchema.index({ user: 1, state: 1 });

module.exports = mongoose.model('MinesGame',  minesGameSchema);