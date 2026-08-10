const mongoose = require('mongoose');

const TelegramMessageSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true
  },
  from: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  // Eğer cevap belirli bir admin veya kullanıcıya aitse
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  // Görülme durumu
  is_read: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

TelegramMessageSchema.index({ created_at: -1 });
TelegramMessageSchema.index({ telegram_id: 1, created_at: -1 });
TelegramMessageSchema.index({ is_read: 1 });

module.exports = mongoose.model('TelegramMessage', TelegramMessageSchema);
