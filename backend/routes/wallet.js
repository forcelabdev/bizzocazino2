const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../database/models/User'); // Dosya yolunu projenize göre güncelle
const { authorizeUser } = require('../middleware/auth');

const coinGeckoIds = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  TRX: 'tron',
  USDT: 'tether',
  ZELO: 'zelo'
};

// ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı ve kendi cüzdanını değiştirebilir
router.post('/convert-to-fiat', authorizeUser(true), async (req, res, next) => {
  try {
    const { fiatCurrency } = req.body;
    // ⚠️ GÜVENLİK: userId'yi token'dan al (IDOR koruması)
    const userId = req.user._id;
    
    const supported = ['TRY', 'USD', 'EUR', 'INR', 'IDR', 'RUB', 'BRL', 'JPY', 'CNY'];

    if (!supported.includes(fiatCurrency)) {
      return res.status(400).json({ message: 'Unsupported fiat currency' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.balance || !Array.isArray(user.balance.data)) {
      return res.status(400).json({ message: 'User balance structure is invalid or missing' });
    }

    // Öncelikle kullanıcıdaki mevcut fiat para birimini al
    const currentFiat = user.currency.fiatCurrency || 'USD';

    if (currentFiat === fiatCurrency) {
      // Zaten aynı fiat, dönüşüm yapmaya gerek yok
      return res.json({
        message: `Balances are already in ${fiatCurrency}`,
        balances: user.balance.data
      });
    }

    // Kullanıcının balance.data'daki coin tiplerini al ve CoinGecko ID'lerine çevir
    const uniqueCoins = [...new Set(user.balance.data.map(e => e.coinType))];
    const ids = uniqueCoins.map(coin => coinGeckoIds[coin]).filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({ message: 'No valid coins for exchange rates' });
    }

    // Önce mevcut fiat'a karşı USD kuru (veya baz para) alacağız, sonra seçilen fiat kuru,
    // Çünkü elimizdeki balance değerleri mevcut fiat cinsinden, diğer fiat'a dönüştürmek için oran hesaplamamız gerekiyor.

    // 1) Mevcut fiat -> USD kuru
    const currentToUsdResponse = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
    );
    const currentToUsdRates = currentToUsdResponse.data;

    // 2) Seçilen fiat -> USD kuru
    const targetToUsdResponse = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${fiatCurrency.toLowerCase()}`
    );
    const targetToUsdRates = targetToUsdResponse.data;

    // 3) Her coin için mevcut fiat cinsinden balance'ı USD'ye çevir, sonra USD'den seçilen fiat'a
    user.balance.data = user.balance.data.map(entry => {
      const coinId = coinGeckoIds[entry.coinType];
      if (!coinId) return entry;

      // currentFiat to USD oranı (örn: TRY->USD)
      const currentFiatRate = currentToUsdRates[coinId]?.usd ?? 0;

      // targetFiat to USD oranı (örn: CNY->USD)
      const targetFiatRate = targetToUsdRates[coinId]?.[fiatCurrency.toLowerCase()] ?? 0;

      if (currentFiatRate === 0 || targetFiatRate === 0) return entry; // hata durumunda dönüşüm yok

      // Mevcut balance (mevcut fiat cinsinden)
      const currentBalanceFiat = entry.balance;

      // USD miktarı: mevcut fiat'tan USD'ye
      const balanceInUsd = currentBalanceFiat / currentFiatRate;

      // USD'den hedef fiat'a
      const convertedBalance = parseFloat((balanceInUsd * targetFiatRate).toFixed(2));

      return { ...entry, balance: convertedBalance };
    });

    user.currency.fiatCurrency = fiatCurrency;
    user.markModified('balance');
    user.markModified('currency');

    await user.save();

    res.json({
      message: `All balances converted from ${currentFiat} to ${fiatCurrency}`,
      balances: user.balance.data
    });
  } catch (err) {
    console.error('Conversion error:', err);
    next(err);
  }
});

module.exports = router;
