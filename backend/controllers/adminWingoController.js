const WingoConfig = require('../database/models/WingoConfig');

// Config’i getir
exports.getWingoConfig = async (req, res) => {
  try {
    const config = await WingoConfig.findOne() || await WingoConfig.create({});
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Config alınamadı', details: err });
  }
};

// Mod değiştirme veya force ayarı
exports.updateWingoConfig = async (req, res) => {
  try {
    const { mode, roundDuration } = req.body;

    const config = await WingoConfig.findOne() || await WingoConfig.create({});
    if (mode) config.mode = mode;
    if (roundDuration) config.roundDuration = roundDuration;

    await config.save();
    res.json({ message: 'Güncellendi', config });
  } catch (err) {
    res.status(500).json({ error: 'Config güncellenemedi', details: err });
  }
};

// Bir sonraki round için renk/sayı zorlama
exports.forceNextRound = async (req, res) => {
  try {
    const { forcedColor, forcedNumber } = req.body;

    const config = await WingoConfig.findOne() || await WingoConfig.create({});
    config.forceNext = {
      enabled: true,
      forcedColor: forcedColor || null,
      forcedNumber: forcedNumber ?? null
    };

    await config.save();
    res.json({ message: 'Sonraki round zorlandı', config });
  } catch (err) {
    res.status(500).json({ error: 'forceNext ayarlanamadı', details: err });
  }
};
