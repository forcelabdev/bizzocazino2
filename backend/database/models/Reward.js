const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  rewardType: {
    type: String,
    enum: ['TOKEN', 'FREE_SPINS', 'VIP_TICKET', 'NFT', 'BONUS'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function () {
      return ['NFT', 'VIP_TICKET'].includes(this.rewardType);
    }
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

   img: {
    type: String, // image URL or file path
    default: ''
  },

  claimable: {
    type: Boolean,
    default: true
  },
  claimedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

RewardSchema.index({ seasonId: 1, level: 1, rewardType: 1 }, { unique: true });

RewardSchema.index({ type: 1 });

module.exports = mongoose.model('Reward', RewardSchema);
