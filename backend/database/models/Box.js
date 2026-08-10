const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
    name: { type: String },
    slug: { type: String },
    amount: { type: Number },
    levelMin: { type: Number },
    items: [
        {
            item: { type: mongoose.Schema.ObjectId, ref: 'LimitedItem' },
            tickets: { type: Number }
        }
    ],
    categories: [{ type: String }],
    type: { type: String },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

boxSchema.index({ createdAt: -1 });
boxSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('Box', boxSchema);