const axios = require('axios');

/**
 * Binance üzerinden sembolün son fiyatını getirir
 * @param {string} symbol Örn: "BTCUSDT"
 */
async function getSymbolPrice(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`;
    const { data } = await axios.get(url);
    return parseFloat(data.price);
  } catch (err) {
    console.error(`❌ [PRICE FEED ERROR] ${symbol} fiyat alınamadı:`, err.message);
    throw new Error("Fiyat alınamadı");
  }
}

module.exports = {
  getSymbolPrice
};
