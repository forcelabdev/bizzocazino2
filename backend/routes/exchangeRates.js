const express = require('express');
const axiosRaw = require('axios');
const User = require('../database/models/User');
const router = express.Router();
const { authorizeUser } = require('../middleware/auth');

const axios = axiosRaw.create({ baseURL: '', timeout: 5000 });

const supportedFiats = ['USD', 'EUR', 'TRY', 'BRL', 'CNY', 'INR', 'IDR', 'RUB'];

// ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.post('/switch-fiat-currency', authorizeUser(true), async (req, res) => {
  // ⚠️ GÜVENLİK: userId'yi token'dan al (IDOR koruması)
  const userId = req.user._id;
  const newFiat = req.body.newFiat?.toUpperCase();

  if (!supportedFiats.includes(newFiat)) {
    return res.status(400).json({ success: false, message: 'Desteklenmeyen fiat para birimi.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });

    const oldFiat = user.currency.fiatCurrency?.toUpperCase();

    if (oldFiat === newFiat) {
      return res.status(200).json({ success: true, message: 'Zaten bu fiat seçili.' });
    }

    // Yeni API — Frankfurter
    const url = `https://api.frankfurter.app/latest?from=${oldFiat}&to=${newFiat}`;
    console.log('API URL:', url);

    const { data } = await axios.get(url);
    console.log('Exchange API response:', JSON.stringify(data, null, 2));

    const rate = data?.rates?.[newFiat];
    if (!rate) return res.status(400).json({ success: false, message: 'Kur bilgisi alınamadı.' });

    const updatedWallets = user.wallets.map(wallet => ({
      ...wallet.toObject(),
      balance: parseFloat((wallet.balance * rate).toFixed(2))
    }));

    user.wallets = updatedWallets;
    user.currency.fiatCurrency = newFiat;
    await user.save();

    res.json({ success: true, message: 'Fiat para birimi güncellendi.', rate, newFiat });

  } catch (err) {
    console.error('Fiat switch error:', err.message);
    res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
  }
});

module.exports = router;
