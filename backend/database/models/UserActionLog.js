const mongoose = require('mongoose');

const UserActionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { type: String, enum: ['game_start', 'spin', 'bet', 'stake', 'login', 'win'], required: true },
  gameId: { type: String },
  betAmount: { type: Number },
  winAmount: { type: Number },
  amount: { type: Number }, // örneğin spin sayısı
  metadata: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

UserActionLogSchema.index({ userId: 1 });
UserActionLogSchema.index({ userId: 1, actionType: 1, timestamp: -1 });
UserActionLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('UserActionLog', UserActionLogSchema);
