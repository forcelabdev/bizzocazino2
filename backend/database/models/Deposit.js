const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    method: { type: String, enum: ['Papara', 'BankTransfer', 'Payfix'], required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

depositSchema.index({ user: 1 });
depositSchema.index({ createdAt: -1 });
depositSchema.index({ status: 1, createdAt: -1 });
depositSchema.index({ transactionId: 1 });
depositSchema.index({ method: 1 });

module.exports = mongoose.model('Deposit', depositSchema);
