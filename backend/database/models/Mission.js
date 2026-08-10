const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  missionType: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'SEASONAL', 'SPECIAL', 'GAME_SPECIFIC'],
    required: true
  },
  targetValue: {
    type: Number,
    required: true,
    min: 1
  },
  xpReward: {
    type: Number,
    required: true,
    min: 0
  },
  tokenReward: {
    type: Number,
    default: 0,
    min: 0
  },
  resetInterval: {
    type: String,
    required: function () {
      return ['DAILY', 'WEEKLY'].includes(this.missionType);
    },
    match: [/^\d+[hd]$/, 'Use format like 24h or 7d']
  },
  isRepeatable: {
    type: Boolean,
    default: false
  },
  gameSpecific: {
    type: String,
    required: function () {
      return this.missionType === 'GAME_SPECIFIC';
    }
  },
   img: {
    type: String, // image URL or file path
    default: ''
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function (val) {
        return !this.startDate || val > this.startDate;
      },
      message: 'End date must be after start date'
    }
  }
}, {
  timestamps: true
});

MissionSchema.index({ seasonId: 1, name: 1 }, { unique: true });

MissionSchema.index({ type: 1 });

module.exports = mongoose.model('Mission', MissionSchema);
