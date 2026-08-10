const express = require('express')
const router = express.Router()

const TelegramUser = require('../database/models/TelegramUser')
const TelegramMessage = require('../database/models/TelegramMessage')
const { sendAdminMessageToUser } = require('../utils/telegramBot')
const { authenticateAdmin } = require('../middleware/permission')

// ⚠️ GÜVENLİK: Tüm telegram endpoint'leri admin yetkisi gerektirir
router.use(authenticateAdmin)

// ✅ [GET] Kullanıcı listesi
router.get('/users', async (req, res) => {
  try {
    const users = await TelegramUser.find({})
      .sort({ last_active: -1 })
      .select('telegram_id username first_name last_name last_active')
      .lean()

    res.json({ success: true, data: users })
  } catch (err) {
    console.error('Telegram /users error:', err)
    res.status(500).json({ success: false, message: 'Kullanıcı listesi alınamadı.' })
  }
})

// ✅ [GET] Mesaj geçmişi (tek kullanıcı)
router.get('/messages/:telegram_id', async (req, res) => {
  try {
    const { telegram_id } = req.params
    const messages = await TelegramMessage.find({ telegram_id }).sort({ createdAt: 1 }).lean()

    res.json({ success: true, data: messages })
  } catch (err) {
    console.error('Telegram /messages error:', err)
    res.status(500).json({ success: false, message: 'Mesaj geçmişi alınamadı.' })
  }
})

// ✅ [POST] Admin → Kullanıcıya mesaj gönder
router.post('/send', async (req, res) => {
  try {
    const { telegram_id, text } = req.body
    if (!telegram_id || !text) {
      return res.status(400).json({ success: false, message: 'Eksik parametre.' })
    }

    await sendAdminMessageToUser(telegram_id, text)

    res.json({ success: true, message: 'Mesaj gönderildi.' })
  } catch (err) {
    console.error('Telegram /send error:', err)
    res.status(500).json({ success: false, message: 'Mesaj gönderilemedi.' })
  }
})

// ✅ [POST] Tüm kullanıcılara duyuru gönder
router.post('/broadcast', async (req, res) => {
  try {
    const { message } = req.body
    if (!message) return res.status(400).json({ success: false, message: 'Mesaj gerekli.' })

    const users = await TelegramUser.find({}).select('telegram_id').lean()
    let successCount = 0

    for (const u of users) {
      try {
        await sendAdminMessageToUser(u.telegram_id, message)
        successCount++
      } catch (e) {
        console.warn(`Kullanıcıya gönderilemedi: ${u.telegram_id}`)
      }
    }

    res.json({
      success: true,
      message: `Toplam ${successCount} kullanıcıya mesaj gönderildi.`,
    })
  } catch (err) {
    console.error('Telegram /broadcast error:', err)
    res.status(500).json({ success: false, message: 'Toplu mesaj gönderimi başarısız.' })
  }
})

module.exports = router
