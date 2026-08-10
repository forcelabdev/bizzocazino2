const mongoose = require('mongoose');

const rollSeedSchema = new mongoose.Schema({
    seedServer: { type: String },
    hash: { type: String },
    seedPublic: { type: String },
    chain: { type: String },
    state: { type: String },
    createdAt: { type: Date, default: Date.now }
});

rollSeedSchema.index({ createdAt: -1 });
rollSeedSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('RollSeed', rollSeedSchema);
