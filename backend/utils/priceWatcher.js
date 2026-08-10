const WebSocket = require("ws");
const FuturesBet = require("../database/models/FuturesBet");
const { checkAndCloseBet } = require("../services/betChecker");

const activeStreams = {}; // açık websocketler

function subscribeSymbol(symbol) {
  const sym = symbol.toLowerCase();
  if (activeStreams[sym]) return; // zaten bağlıysa tekrar bağlanma

  console.log(`📡 [PRICE WATCH] Subscribing ${symbol} price stream`);

  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@trade`);

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      const price = parseFloat(data.p);

      // O semboldeki tüm açık pozisyonları kontrol et
      const bets = await FuturesBet.find({ symbol: symbol.toUpperCase(), status: "open" });
      for (const bet of bets) {
        await checkAndCloseBet(bet, price);
      }
    } catch (err) {
      console.error("💥 [PRICE WATCH ERROR]", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error(`❌ Binance WS error for ${symbol}:`, err.message);
    setTimeout(() => subscribeSymbol(symbol), 5000);
  });

  ws.on("close", () => {
    console.warn(`⚠️ Binance WS closed for ${symbol}, reconnecting...`);
    delete activeStreams[sym];
    setTimeout(() => subscribeSymbol(symbol), 5000);
  });

  activeStreams[sym] = ws;
}

module.exports = { subscribeSymbol };
