const mongoose = require('mongoose');

const TelegramUserSchema = new mongoose.Schema({
  telegram_id: {
    type: Number,
    required: true
  },
  username: {
    type: String
  },
  first_name: {
    type: String
  },
  last_name: {
    type: String
  },
  language_code: {
    type: String
  },
  is_bot: {
    type: Boolean,
    default: false
  },
  // Casino hesabıyla bağlantı kurulacaksa
  linked_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Son aktif zamanı (monthly user istatistiği için)
  last_active: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

TelegramUserSchema.index({ created_at: -1 });
TelegramUserSchema.index({ telegram_id: 1 }, { unique: true });
TelegramUserSchema.index({ linked_user_id: 1 });
TelegramUserSchema.index({ last_active: -1 });

module.exports = mongoose.model('TelegramUser', TelegramUserSchema);
