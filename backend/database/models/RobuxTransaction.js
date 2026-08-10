const mongoose = require('mongoose');

const robuxTransactionSchema = new mongoose.Schema({
    amount: { type: Number },
    data: {
        productId: { type: String },
    },
    deposit: {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' },
        offer: { type: mongoose.Schema.ObjectId, ref: 'RobuxOffer' }
    },
    withdraw: {
        user: { type: mongoose.Schema.ObjectId, ref: 'User' },
        offer: { type: mongoose.Schema.ObjectId, ref: 'RobuxOffer' }
    },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

robuxTransactionSchema.index({ user: 1 });
robuxTransactionSchema.index({ createdAt: -1 });
robuxTransactionSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('RobuxTransaction',  robuxTransactionSchema);