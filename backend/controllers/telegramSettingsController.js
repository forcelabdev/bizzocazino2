const TelegramSettings = require('../database/models/TelegramSettings');

// ✅ [GET] Telegram bot ayarlarını getir
exports.getSettings = async (req, res) => {
  try {
    let settings = await TelegramSettings.findOne();

    // Eğer hiç kayıt yoksa oluştur ve geri dön
    if (!settings) {
      settings = await TelegramSettings.create({});
    }

    // 🧠 Default'ları her ihtimale karşı garanti et
    const responseData = {
      start_message: settings.start_message || '🎰 Merhaba! Rivo Casino Telegram botuna hoş geldin.\n\nBuradan canlı destek alabilir, kampanyaları görebilir veya özel linklere ulaşabilirsin.',
      support_message: settings.support_message || '💬 Destek ekibimiz kısa süre içinde sizinle iletişime geçecektir.',
      promotions_message: settings.promotions_message || '🎯 Güncel Kampanyalar:\n\n1️⃣ %50 İlk Yatırım Bonusu 💰\n2️⃣ %3 Günlük Rakeback 🔁\n3️⃣ Slot Turnuvası Devam Ediyor 🎰',
      casino_link_message: settings.casino_link_message || '🌐 https://rivo.games adresinden hemen giriş yapabilirsin.',
      updated_at: settings.updated_at || new Date()
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('getSettings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası: Telegram ayarları getirilemedi.'
    });
  }
};


// ✅ [PUT] Telegram bot ayarlarını güncelle
exports.updateSettings = async (req, res) => {
  try {
    const {
      support_message,
      promotions_message,
      casino_link_message,
      start_message
    } = req.body;

    const updated = await TelegramSettings.findOneAndUpdate(
      {},
      {
        support_message,
        promotions_message,
        casino_link_message,
        start_message,
        updated_at: new Date()
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Telegram bot ayarları başarıyla güncellendi.',
      data: updated
    });
  } catch (error) {
    console.error('updateSettings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası: Telegram ayarları güncellenemedi.'
    });
  }
};
