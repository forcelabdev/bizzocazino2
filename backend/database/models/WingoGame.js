const mongoose = require('mongoose');

const wingoGameSchema = new mongoose.Schema({
  roundId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['waiting', 'completed'], default: 'waiting' },

 colorResult: {
  type: String,
  enum: [null, 'red', 'green', 'violet'],
  default: null
},

  numberResult: {
    type: Number,
    min: 0,
    max: 9,
    default: null
  },

  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },

  serverSeed: { type: String, required: true },
  clientSeed: { type: String, required: true },
  nonce: { type: Number, default: 0 }
}, { timestamps: true });

wingoGameSchema.index({ status: 1 });
wingoGameSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WingoGame', wingoGameSchema);
