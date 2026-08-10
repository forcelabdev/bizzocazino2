const mongoose = require('mongoose');

const upgraderGameSchema = new mongoose.Schema({
    amount: { type: Number },
    payout: { type: Number },
    multiplier: { type: Number },
    mode: { type: String },
    outcome: { type: Number },
    fair: {
        seed: { type: mongoose.Schema.ObjectId, ref: 'UserSeed' },
        nonce: { type: Number }
    },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

upgraderGameSchema.index({ user: 1 });
upgraderGameSchema.index({ createdAt: -1 });
upgraderGameSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('UpgraderGame',  upgraderGameSchema);