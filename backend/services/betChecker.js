const { computePnl } = require("../utils/trading");
const { closeFuturesBet } = require("./betCloser");

/**
 * Pozisyonu kontrol et ve gerekirse kapat
 */
async function checkAndCloseBet(bet, currentPrice) {
	const dir = bet.direction.toUpperCase();

	// PnL / ROI hesapla
	const pnl = computePnl({
		entryPrice: bet.entryPrice,
		exitPrice: currentPrice,
		leverage: bet.leverage,
		amount: bet.amount,
		direction: bet.direction,
	});
	const roiPercent = (pnl / bet.amount) * 100;

	// 1. Liquidation
	if (
		(dir === "LONG" && currentPrice <= bet.liqPrice) ||
		(dir === "SHORT" && currentPrice >= bet.liqPrice)
	) {
		console.log(`💀 [AUTO-LIQ] Pozisyon likide oldu: ${bet.symbol}`);
		return await closeFuturesBet({
			userId: bet.user,
			betId: bet._id,
			closePrice: currentPrice,
		});
	}

	// 2. Stop Loss
	if (bet.stopLossPercent && roiPercent <= -bet.stopLossPercent) {
		console.log(`📉 [STOP LOSS] Pozisyon kapandı: ${bet.symbol}`);
		return await closeFuturesBet({
			userId: bet.user,
			betId: bet._id,
			closePrice: currentPrice,
		});
	}

	// 3. Take Profit
	if (bet.takeProfitPercent && roiPercent >= bet.takeProfitPercent) {
		console.log(`📈 [TAKE PROFIT] Pozisyon kapandı: ${bet.symbol}`);
		return await closeFuturesBet({
			userId: bet.user,
			betId: bet._id,
			closePrice: currentPrice,
		});
	}

	return null;
}

module.exports = { checkAndCloseBet };
