const mongoose = require('mongoose');

const tipTransactionSchema = new mongoose.Schema({
    amount: { type: Number },
    sender: {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' }
    },
    receiver: {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' }
    },
    state: { type: String },
    createdAt: { type: Date, default: Date.now }
});

tipTransactionSchema.index({ "sender.user": 1, state: 1, createdAt: -1 });
tipTransactionSchema.index({ "receiver.user": 1, state: 1, createdAt: -1 });
tipTransactionSchema.index({ createdAt: -1 });
tipTransactionSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('TipTransaction',  tipTransactionSchema);