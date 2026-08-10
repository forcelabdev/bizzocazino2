const mongoose = require('mongoose');

const towersGameSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    risk: { type: String },
    deck: [[{ type: String }]],
    revealed: [
        {
            tile: { type: Number },
            row: [{ type: String }]
        }
    ],
    fair: {
        seed: { type: mongoose.Schema.ObjectId, ref: 'UserSeed' },
        nonce: { type: Number }
    },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
     fiatCurrency: { type: String, required: true }, // TRY, USD, EUR
    coinType: { type: String },
chain: { type: String },
walletType: { type: String },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

towersGameSchema.index({ user: 1 });
towersGameSchema.index({ createdAt: -1 });
towersGameSchema.index({ state: 1, createdAt: -1 });
towersGameSchema.index({ payout: 1, updatedAt: -1 });
towersGameSchema.index({ user: 1, state: 1 });

module.exports = mongoose.model('TowersGame',  towersGameSchema);