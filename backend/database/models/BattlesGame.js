const mongoose = require('mongoose');

const battlesGameSchema = new mongoose.Schema({
    amount: { type: Number },
    playerCount: { type: Number },
    mode: { type: String },
    boxes: [
        {
            box: { type: mongoose.Schema.ObjectId, ref: 'Box' },
            count: { type: Number }
        }
    ],
    options: {
        levelMin: { type: Number },
        funding: { type: Number },
        cursed: { type: Boolean },
        terminal: { type: Boolean },
        private: { type: Boolean },
        affiliateOnly: { type: Boolean }
    },
    fair: {
        seedServer: { type: String },
        hash: { type: String },
        seedPublic: { type: String },
        blockId: { type: String }
    },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Reverse populate with virtuals
battlesGameSchema.virtual('bets', {
    ref: 'BattlesBet',
    localField: '_id',
    foreignField: 'game',
    justOne: false
});

battlesGameSchema.index({ createdAt: -1 });
battlesGameSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('BattlesGame', battlesGameSchema);