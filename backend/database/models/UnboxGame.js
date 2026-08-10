const mongoose = require('mongoose');

const unboxGameSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    outcome: { type: Number },
    box: { type: mongoose.Schema.ObjectId, ref: 'Box' },
    fair: {
        seed: { type: mongoose.Schema.ObjectId, ref: 'UserSeed' },
        nonce: { type: Number }
    },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },

    // ✅ Multi-fiat / multi-chain alanları
    fiatCurrency: { type: String, default: 'USD' },
    coinType: { type: String },
    chain: { type: String },
    walletType: { type: String },

    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

unboxGameSchema.index({ user: 1 });
unboxGameSchema.index({ createdAt: -1 });
unboxGameSchema.index({ state: 1, createdAt: -1 });
unboxGameSchema.index({ payout: 1, updatedAt: -1 });

module.exports = mongoose.model('UnboxGame', unboxGameSchema);
