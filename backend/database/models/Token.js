const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    token: { type: String },
    type: { type: String },
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    meta: { type: mongoose.Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

tokenSchema.index({ user: 1 });
tokenSchema.index({ createdAt: -1 });
tokenSchema.index({ token: 1, type: 1, user: 1 });

module.exports = mongoose.model('Token',  tokenSchema);