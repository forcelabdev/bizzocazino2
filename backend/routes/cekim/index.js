const express = require('express');
const router = express.Router();
const Withdrawal = require("../../database/models/Withdrawal");
const User = require("../../database/models/User");
const axios = require('axios');
const crypto = require('crypto');
const { authorizeUser } = require("../../middleware/auth");
const { authenticateAdmin } = require("../../middleware/permission");

// ⚠️ GÜVENLİK: API Bilgileri environment variable'dan alınmalı
const MERCHANT_SID = process.env.MAKSIPARA_MERCHANT_SID;
const MERCHANT_KEY = process.env.MAKSIPARA_MERCHANT_KEY;

// Başlangıçta API key kontrolü
if (!MERCHANT_SID || !MERCHANT_KEY) {
    console.warn('⚠️ UYARI: MAKSIPARA_MERCHANT_SID veya MAKSIPARA_MERCHANT_KEY environment variable\'ları tanımlı değil!');
}

// **Çekim Talebi Oluşturma (Kullanıcı tarafından)**
// ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı ve kendi hesabından çekim yapabilir
router.post('/create', authorizeUser(true), async (req, res) => {
    try {
        // ⚠️ GÜVENLİK: userId'yi token'dan al, body'den DEĞİL (IDOR koruması)
        const userId = req.user._id;
        const { method, amount, details } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        if (!user.name || !user.local.email) {
            return res.status(400).json({ error: 'Kullanıcı bilgileri eksik. Lütfen "name" ve "email" alanlarını doldurun.' });
        }

        // ⚠️ GÜVENLİK: Minimum/maksimum çekim limiti kontrolü
        if (amount <= 0) {
            return res.status(400).json({ error: 'Geçersiz çekim miktarı.' });
        }

        // ⚠️ GÜVENLİK: Bakiye kontrolü
        if (user.balance < amount) {
            return res.status(400).json({ error: 'Yetersiz bakiye.' });
        }

        const trx = crypto.randomUUID();

        const withdrawal = new Withdrawal({
            user: user._id,
            username: user.username,
            fullname: user.name,
            method, // Çekim yöntemi (papara, bank-transfer, payfix)
            amount,
            details, // Özel bilgiler (Papara hesap no, IBAN vb.)
            trx,
            status: 'pending' // Beklemede
        });

        await withdrawal.save();

        res.status(200).json({ message: 'Çekim talebi oluşturuldu ve admin onayına gönderildi.', withdrawal });
    } catch (err) {
        console.error('Error creating withdrawal:', err.message);
        res.status(500).json({ error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' });
    }
});

// **Çekim Talebini Admin Onaylar ve Maksipara'ya İletir**
// ⚠️ GÜVENLİK: Sadece admin bu işlemi yapabilir
router.post('/approve', authenticateAdmin, async (req, res) => {
    try {
        const { withdrawalId } = req.body;

        // ⚠️ GÜVENLİK: API key kontrolü
        if (!MERCHANT_SID || !MERCHANT_KEY) {
            return res.status(500).json({ error: 'Maksipara API yapılandırması eksik.' });
        }

        const withdrawal = await Withdrawal.findById(withdrawalId).populate('user');
        if (!withdrawal || withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Geçersiz veya zaten işlenmiş çekim talebi.' });
        }

        // Maksipara API'ye gönderilecek parametreleri oluştur
        const payload = {
            sid: MERCHANT_SID,
            key: MERCHANT_KEY,
            user_id: withdrawal.user._id.toString(),
            username: withdrawal.username,
            trx: withdrawal.trx,
            fullname: withdrawal.fullname,
            amount: withdrawal.amount.toFixed(2),
            ...withdrawal.details // Yönteme özel bilgiler (Papara hesap no, IBAN vb.)
        };

        // Maksipara API çağrısı
        const response = await axios.post(`https://api.maksipara.com/Withdrawal/${withdrawal.method}/`, payload);

        if (response.data.code === 200) {
            withdrawal.status = 'approved'; // Onaylandı
            withdrawal.updatedAt = new Date();
            await withdrawal.save();

            res.status(200).json({ message: 'Çekim talebi başarıyla Maksipara\'ya iletildi.', response: response.data });
        } else {
            withdrawal.status = 'rejected';
            withdrawal.reason = response.data.message; // Reddedilme nedeni
            withdrawal.updatedAt = new Date();
            await withdrawal.save();

            res.status(400).json({ error: 'Maksipara çekim talebi reddedildi.', response: response.data });
        }
    } catch (err) {
        console.error('Error approving withdrawal:', err.message);
        res.status(500).json({ error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' });
    }
});

// **Çekim Talebini Reddetme (Admin tarafından)**
// ⚠️ GÜVENLİK: Sadece admin bu işlemi yapabilir
router.post('/reject', authenticateAdmin, async (req, res) => {
    try {
        const { withdrawalId, reason } = req.body;

        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal || withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Geçersiz veya zaten işlenmiş çekim talebi.' });
        }

        withdrawal.status = 'rejected'; // Reddedildi
        withdrawal.reason = reason || 'Admin tarafından reddedildi.';
        withdrawal.updatedAt = new Date();
        await withdrawal.save();

        res.status(200).json({ message: 'Çekim talebi reddedildi.', withdrawal });
    } catch (err) {
        console.error('Error rejecting withdrawal:', err.message);
        res.status(500).json({ error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' });
    }
});

module.exports = router;
