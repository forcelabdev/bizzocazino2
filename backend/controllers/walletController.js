const axios = require('axios');
const Wallet = require('../models/Wallet');

async function getRates() {
  const ids = ['bitcoin','ethereum','tether','bnb','usdc','xmr','polkadot','solana','tron','dogecoin','litecoin','ripple','matic-network','avalanche-2','monero'];
  const vs = ['usd','eur','try','inr','idr','brl','jpy','cny'];
  const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: { ids: ids.join(','), vs_currencies: vs.join(',') }
  });
  return data; // data[coin][fiat]
}

function calculateFiat(wallets, selectedCurrency, priceData) {
  let total = 0;
  for (const [coin, amount] of Object.entries(wallets)) {
    const price = priceData[coin]?.[selectedCurrency] || 0;
    total += price * amount;
  }
  return parseFloat(total.toFixed(2));
}

async function getWalletBalance(req, res) {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id }).lean();
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet yok' });

    const prices = await getRates();
    const fiatBalance = calculateFiat(wallet.wallets, wallet.selectedCurrency, prices);

    res.json({ success: true, selectedCurrency: wallet.selectedCurrency, wallets: wallet.wallets, fiatBalance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
