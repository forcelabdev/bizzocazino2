const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  currentLevel: {
    type: Number,
    default: 1,
    min: 1
  },
  currentXP: {
    type: Number,
    default: 0,
    min: 0
  },
  premium: {
    type: Boolean,
    default: false
  },
  premiumPurchaseDate: {
    type: Date
  },
  completedMissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission'
  }],
  claimedRewards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

UserProgressSchema.index({ userId: 1, seasonId: 1 }, { unique: true });

UserProgressSchema.index({ userId: 1 });

module.exports = mongoose.model('UserProgress', UserProgressSchema);
