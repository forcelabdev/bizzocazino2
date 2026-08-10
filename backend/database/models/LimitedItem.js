const mongoose = require('mongoose');

const limitedItemSchema = new mongoose.Schema({
    assetId: { type: String },
    name: { type: String },
    image: { type: String },
    amount: { type: Number },
    amountFixed: { type: Number },
    accepted: { type: Boolean },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

limitedItemSchema.index({ createdAt: -1 });
limitedItemSchema.index({ assetId: 1 });
limitedItemSchema.index({ accepted: 1 });
limitedItemSchema.index({ name: 1 });

module.exports = mongoose.model('LimitedItem', limitedItemSchema);