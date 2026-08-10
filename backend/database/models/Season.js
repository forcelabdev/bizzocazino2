const mongoose = require('mongoose');

const SeasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  premiumPrice: {
    type: Number,
    required: true,
    min: 0
  },
  premiumBenefits: {
    type: [String],
    required: true
  },
  totalLevels: {
    type: Number,
    required: true,
    min: 1
  },
  xpPerLevel: {
    type: [Number],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === this.totalLevels;
      },
      message: 'XP array length must match total levels'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SeasonSchema.pre('save', async function (next) {
  if (this.isActive) {
    const active = await this.constructor.findOne({ isActive: true });
    if (active && !active._id.equals(this._id)) {
      throw new Error('There can be only one active season');
    }
  }
  next();
});

SeasonSchema.index({ createdAt: -1 });
SeasonSchema.index({ isActive: 1 });

module.exports = mongoose.model('Season', SeasonSchema);
