const mongoose = require('mongoose');

const wingoConfigSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['platform_win', 'fair', 'user_win'],
    default: 'fair'
  },
  forceNext: {
    enabled: { type: Boolean, default: false },
    forcedColor: {
  type: String,
  enum: [null, 'red', 'green', 'violet'], // 🛠 null da enum'a eklendi
  default: null
},


    forcedNumber: { type: Number, min: 0, max: 9, default: null }
  },
  roundDuration: {
    type: Number,
    default: 30000 // 30 saniye
  }
}, { timestamps: true });

wingoConfigSchema.index({ mode: 1 });
wingoConfigSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WingoConfig', wingoConfigSchema);
