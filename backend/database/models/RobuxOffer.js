const mongoose = require('mongoose');

const robuxOfferSchema = new mongoose.Schema({
    amount: { type: Number },
    amountProcessed: { type: Number, default: 0 },
    type: { type: String },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

robuxOfferSchema.index({ user: 1 });
robuxOfferSchema.index({ createdAt: -1 });
robuxOfferSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('RobuxOffer',  robuxOfferSchema);