const mongoose = require('mongoose');

const steamTransactionSchema = new mongoose.Schema({
    amount: { type: Number },
    data: {
        providerId: { type: String },
        providerUrl: { type: String }
    },
    type: { type: String },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

steamTransactionSchema.index({ user: 1 });
steamTransactionSchema.index({ createdAt: -1 });
steamTransactionSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('SteamTransaction',  steamTransactionSchema);