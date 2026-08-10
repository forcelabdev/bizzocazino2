const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
    amount: { type: Number },
    type: { type: String },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    fromUser: { type: mongoose.Schema.ObjectId, ref: 'User' }, // <-- Eklenen alan
    state: { type: String },
    createdAt: { type: Date, default: Date.now }
});

balanceTransactionSchema.index({ user: 1 });
balanceTransactionSchema.index({ createdAt: -1 });
balanceTransactionSchema.index({ state: 1, createdAt: -1 });
balanceTransactionSchema.index({ user: 1, state: 1, createdAt: -1 });
balanceTransactionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);
