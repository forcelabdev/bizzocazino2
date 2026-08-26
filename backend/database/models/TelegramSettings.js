const mongoose = require('mongoose');

const TelegramSettingsSchema = new mongoose.Schema({
  // Canlı destek yanıtı
  support_message: {
    type: String,
    default: '💬 Destek ekibimiz kısa süre içinde sizinle iletişime geçecektir.'
  },
  // Kampanyalar yanıtı
  promotions_message: {
    type: String,
    default: '🎯 Güncel Kampanyalar:\n\n1️⃣ %50 İlk Yatırım Bonusu 💰\n2️⃣ %3 Günlük Rakeback 🔁\n3️⃣ Slot Turnuvası Devam Ediyor 🎰'
  },
  // Casino linki yanıtı
  casino_link_message: {
    type: String,
    default: '🌐 https://sizin-alan-adiniz.com adresinden hemen giriş yapabilirsin.'
  },
  // Başlangıç mesajı
  start_message: {
    type: String,
    default: '🎰 Merhaba! Casino Telegram botuna hoş geldin.\n\nBuradan canlı destek alabilir, kampanyaları görebilir veya özel linklere ulaşabilirsin.'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

TelegramSettingsSchema.index({ type: 1 });

module.exports = mongoose.model('TelegramSettings', TelegramSettingsSchema);
