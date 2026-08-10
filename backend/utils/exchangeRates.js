// utils/exchangeRates.js

const axios = require('axios');

const coinMap = {
  BNB: 'binancecoin',
  USDC: 'usd-coin',
  XMR: 'monero',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  POL: 'polkadot',
  SOL: 'solana',
  NOT: 'notional-finance', // veya doğru id
  SHIB: 'shiba-inu',
  TRX: 'tron',
  USDT: 'tether',
  DOGS: 'dogeswap-token', // örnek
  TON: 'toncoin',
  DAI: 'dai',
  BCH: 'bitcoin-cash',
  DOGE: 'dogecoin',
  LTC: 'litecoin'
};

async function fetchRates(fiatCurrency) {
  const coinIds = Object.values(coinMap).join(',');
  const params = {
    ids: coinIds,
    vs_currencies: fiatCurrency.toLowerCase()
  };
  const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', { params });
  // data: { bitcoin: { usd: 64355, try: ... }, ethereum: { ... }, ... }

  const rates = {};
  for (const [symbol, id] of Object.entries(coinMap)) {
    if (data[id] && data[id][fiatCurrency.toLowerCase()]) {
      rates[symbol] = data[id][fiatCurrency.toLowerCase()];
    } else {
      rates[symbol] = 0;
    }
  }
  return rates;
}

module.exports = { fetchRates };
