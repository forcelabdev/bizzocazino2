const User = require("../database/models/User");
const FuturesBet = require("../database/models/FuturesBet");
const { getIO } = require("../utils/io");
const { subscribeSymbol } = require("../utils/priceWatcher");
const { computeLiqPrice } = require("../utils/trading");
const { closeFuturesBet } = require("./betCloser");

/* ----------------------------------------------------------
   Pozisyon Aç
---------------------------------------------------------- */
async function placeFuturesBet({
	userId,
	symbol,
	amount,
	leverage,
	direction,
	entryPrice,
	stopLossPercent = null,
	takeProfitPercent = null,
	fiatCurrency = "USDT",
	walletSelector = null,
}) {
	if (!userId) throw new Error("userId gerekli");
	if (!symbol) throw new Error("symbol gerekli");
	if (!amount || amount <= 0) throw new Error("amount > 0 olmalı");
	if (!leverage || leverage <= 0) throw new Error("leverage > 0 olmalı");
	if (!entryPrice || entryPrice <= 0)
		throw new Error("entryPrice > 0 olmalı");
	const dir = String(direction).toUpperCase();
	if (!["LONG", "SHORT"].includes(dir))
		throw new Error("direction LONG/SHORT olmalı");

	// Kullanıcı
	const user = await User.findById(userId).lean(false);
	if (!user) throw new Error("Kullanıcı bulunamadı");

	// Wallet seç
	const activeCur = user.currency;
	let walletIdx = -1;
	if (walletSelector) {
		walletIdx = user.wallets.findIndex(
			(w) =>
				w.coinType === walletSelector.coinType &&
				w.chain === walletSelector.chain &&
				w.type === walletSelector.type
		);
	} else if (activeCur) {
		walletIdx = user.wallets.findIndex(
			(w) =>
				w.coinType === activeCur.coinType &&
				w.chain === activeCur.chain &&
				w.type === activeCur.type
		);
	}
	if (walletIdx < 0) throw new Error("Cüzdan bulunamadı");

	// Bakiye düş
	const decRes = await User.findOneAndUpdate(
		{ _id: userId, [`wallets.${walletIdx}.balance`]: { $gte: amount } },
		{ $inc: { [`wallets.${walletIdx}.balance`]: -amount } },
		{ new: true }
	);
	if (!decRes) throw new Error("Yetersiz bakiye");

	// Liq fiyatı
	const liqPrice = computeLiqPrice(entryPrice, leverage, dir);

	// Bet kaydet
	const bet = await FuturesBet.create({
		user: userId,
		symbol,
		amount,
		leverage,
		direction: dir,
		entryPrice,
		stopLossPercent,
		takeProfitPercent,
		liqPrice,
		fiatCurrency: activeCur?.fiatCurrency || fiatCurrency,
		wallet: `${user.wallets[walletIdx].coinType}-${user.wallets[walletIdx].chain}`,
		status: "open",
		exitPrice: null,
		pnl: 0,
	});

	// Binance fiyat takibine abone ol
	subscribeSymbol(symbol);

	// Socket emit
	const io = getIO();
	io.of("/general").to(userId.toString()).emit("user", { user: decRes });
	io.of("/general").to(userId.toString()).emit("bet", { bet });

	return { bet, user: decRes };
}

module.exports = {
	placeFuturesBet,
	closeFuturesBet,
};
