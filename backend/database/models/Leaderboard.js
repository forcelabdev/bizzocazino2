const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    winners: [
        {
            prize: { type: Number },
            points: { type: Number },
            user: { type: mongoose.Schema.ObjectId, ref: 'User' },
            fiatCurrency: { type: String, default: 'USD' }
        }
    ],
    duration: { type: Number },
    type: { type: String },
    state: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

leaderboardSchema.index({ user: 1 });
leaderboardSchema.index({ createdAt: -1 });
leaderboardSchema.index({ state: 1, createdAt: -1 });
leaderboardSchema.index({ type: 1, state: 1 });

module.exports = mongoose.model('Leaderboard',  leaderboardSchema);