const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings
} = require('../controllers/telegramSettingsController');

// 🧠 Telegram bot ayarlarını getir
router.get('/', getSettings);

// 🧠 Telegram bot ayarlarını güncelle (Vuexy admin panelinden)
router.put('/', updateSettings);

module.exports = router;
