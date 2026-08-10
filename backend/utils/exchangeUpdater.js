const Setting = require("../database/models/Setting");
const axios = require("axios");

async function updateExchangeRates() {
  try {
    console.log("🔄 Döviz kurları güncelleniyor...");

    // USD bazlı kur verisi çekiyoruz
    const res = await axios.get(`https://open.er-api.com/v6/latest/USD`);
    const rates = res.data.rates;

    if (!rates) throw new Error("Kur verisi alınamadı");

    // Senin schema root'ta exchangeRates bekliyor
    const supportedCurrencies = [
      "USD","GBP","CAD","AUD","EUR","TRY","BRL","MXN","INR","JPY","KRW",
      "PHP","ZAR","RUB","SEK","NOK","DKK","SGD","MYR","THB","VND",
      "ARS","COP","CLP","CNY"
    ];

    const filteredRates = {};
    for (const c of supportedCurrencies) {
      if (rates[c]) {
        filteredRates[c] = rates[c];
      }
    }

    // Güncelle
    await Setting.updateMany({}, {
      $set: {
        exchangeRates: filteredRates,
        updatedAt: new Date()
      }
    });

    console.log("✅ Döviz kurları güncellendi:", filteredRates);
  } catch (err) {
    console.error("❌ Döviz güncelleme hatası:", err.message);
  }
}

module.exports = { updateExchangeRates };
