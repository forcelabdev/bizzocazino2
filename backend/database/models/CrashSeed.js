const mongoose = require('mongoose');

const crashSeedSchema = new mongoose.Schema({
    seedServer: { type: String },
    hash: { type: String },
    seedPublic: { type: String },
    chain: { type: String },
    state: { type: String },
    createdAt: { type: Date, default: Date.now }
});

crashSeedSchema.index({ createdAt: -1 });
crashSeedSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('CrashSeed', crashSeedSchema);
