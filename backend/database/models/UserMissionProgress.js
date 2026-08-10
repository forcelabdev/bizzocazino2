const mongoose = require('mongoose');

const UserMissionProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  missionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission',
    required: true
  },
  currentProgress: {
    type: Number,
    default: 0,
    min: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  lastClaimed: {
    type: Date
  },
  nextReset: {
    type: Date
  }
}, {
  timestamps: true
});

UserMissionProgressSchema.index({ userId: 1, missionId: 1 }, { unique: true });

// Otomatik reset ayarlaması
UserMissionProgressSchema.pre('save', async function (next) {
  if (this.isModified('isCompleted') && this.isCompleted) {
    const Mission = mongoose.model('Mission');
    const mission = await Mission.findById(this.missionId);

    if (mission && mission.resetInterval) {
      const match = mission.resetInterval.match(/^(\d+)([hd])$/);
      if (match) {
        const [_, amount, unit] = match;
        const hours = unit === 'd' ? parseInt(amount) * 24 : parseInt(amount);
        this.nextReset = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }
  }
  next();
});

UserMissionProgressSchema.index({ userId: 1 });

module.exports = mongoose.model('UserMissionProgress', UserMissionProgressSchema);
