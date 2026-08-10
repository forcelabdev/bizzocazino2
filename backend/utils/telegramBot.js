const TelegramBot = require('node-telegram-bot-api');
const TelegramUser = require('../database/models/TelegramUser');
const TelegramMessage = require('../database/models/TelegramMessage');
const TelegramSettings = require('../database/models/TelegramSettings');
require('dotenv').config();

let botInstance = null;

/**
 * Telegram botu başlatır ve Socket.IO bağlantısı ile entegre eder
 */
function initTelegramBot(io) {
  if (botInstance) {
    console.log('⚙️ Telegram bot zaten çalışıyor.');
    return botInstance;
  }

  console.log('🚀 Telegram bot başlatılıyor...');

  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  botInstance = bot;

  // 📥 Mesaj Dinleyici
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const username = msg.from.username || 'Unknown';
      const text = msg.text?.trim() || '';
      const first_name = msg.from.first_name || '';
      const last_name = msg.from.last_name || '';
      const language_code = msg.from.language_code || 'unknown';

      // 🔒 Bot’tan gelen mesajları görmezden gel
      if (msg.from.is_bot) return;

      // 🧾 Kullanıcı kaydı
      const user = await TelegramUser.findOneAndUpdate(
        { telegram_id: chatId },
        {
          username,
          first_name,
          last_name,
          language_code,
          is_bot: msg.from.is_bot || false,
          last_active: new Date(),
        },
        { upsert: true, new: true }
      );

      // 💬 Mesajı veritabanına kaydet
      const newMessage = await TelegramMessage.create({
        telegram_id: chatId,
        from: 'user',
        text,
      });

      // 🧠 Bot ayarlarını getir
      let settings = await TelegramSettings.findOne();
      if (!settings) settings = await TelegramSettings.create({});

      // ==========================
      // 📍 Komut ve Buton Yanıtları
      // ==========================

      if (text === '/start') {
        return bot.sendMessage(chatId, settings.start_message, {
          reply_markup: {
            keyboard: [
              ['💬 Canlı Destek', '🎁 Kampanyalar'],
              ['🔗 Casino Linki'],
            ],
            resize_keyboard: true,
          },
        });
      }

      if (text === '💬 Canlı Destek') {
        return bot.sendMessage(chatId, settings.support_message);
      }

      if (text === '🎁 Kampanyalar') {
        return bot.sendMessage(chatId, settings.promotions_message);
      }

      if (text === '🔗 Casino Linki') {
        return bot.sendMessage(chatId, settings.casino_link_message);
      }

     

      // 🛰️ Anlık olarak admin paneline mesaj gönder (Socket.IO)
      io.emit('telegram:new_message', {
        telegram_id: chatId,
        username: user.username,
        first_name: user.first_name,
        text: newMessage.text,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error('Telegram Bot Error:', error.message);
    }
  });

  console.log('✅ Telegram bot aktif ve dinlemede.');
  return botInstance;
}

/**
 * Admin panelinden kullanıcıya mesaj gönderme
 */
async function sendAdminMessageToUser(telegram_id, text, io = null) {
  try {
    if (!botInstance) throw new Error('Bot henüz başlatılmadı.');

    await botInstance.sendMessage(telegram_id, text);

    const msg = await TelegramMessage.create({
      telegram_id,
      from: 'admin',
      text,
    });

    // Anlık olarak frontende bildir
    if (io) {
      io.emit('telegram:admin_message', msg);
    }

    console.log(`📨 Admin → ${telegram_id}: ${text}`);
  } catch (error) {
    console.error('Admin -> User mesaj hatası:', error.message);
  }
}

module.exports = { initTelegramBot, sendAdminMessageToUser };
