const mongoose = require('mongoose');

const rainSchema = new mongoose.Schema({
    amount: { type: Number },
    participants: [
        {
            user: { type: mongoose.Schema.ObjectId, ref: 'User' }
        }
    ],
    creator: { type: mongoose.Schema.ObjectId, ref: 'User' },
    type: { type: String },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

rainSchema.index({ user: 1 });
rainSchema.index({ createdAt: -1 });
rainSchema.index({ state: 1, createdAt: -1 });
rainSchema.index({ type: 1, state: 1 });
rainSchema.index({ "participants.user": 1 });

module.exports = mongoose.model('Rain',  rainSchema);
