const mongoose = require('mongoose');

const giftTransactionSchema = new mongoose.Schema({
    amount: { type: Number },
    data: {
        transaction: { type: String }
    },
    type: { type: String },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

giftTransactionSchema.index({ user: 1 });
giftTransactionSchema.index({ createdAt: -1 });
giftTransactionSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('GiftTransaction',  giftTransactionSchema);
