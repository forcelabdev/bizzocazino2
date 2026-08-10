// Sadece matematiksel yardımcı fonksiyonlar (tamamen bağımsız)

function computeLiqPrice(entryPrice, leverage, direction) {
  if (!entryPrice || !leverage || leverage <= 0) return null;
  const d = String(direction).toUpperCase();
  if (d === 'LONG') return entryPrice - (entryPrice / leverage);
  if (d === 'SHORT') return entryPrice + (entryPrice / leverage);
  return null;
}

function computePnl({ entryPrice, exitPrice, leverage, amount, direction }) {
  if (!entryPrice || !exitPrice || !leverage || !amount) return 0;
  const dir = String(direction).toUpperCase();
  const base = amount / entryPrice;
  const raw = (exitPrice - entryPrice) * leverage * base;
  return dir === 'LONG' ? raw : -raw;
}

module.exports = {
  computeLiqPrice,
  computePnl
};
