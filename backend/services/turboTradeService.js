const User = require("../database/models/User");
const TurboTrade = require("../database/models/TurboTrade");
const { getIO } = require("../utils/io");
const { getSymbolPrice } = require("../utils/priceFeed"); // Binance fiyatı için

// payout oranları duration’a göre
function getPayoutRate(duration) {
	switch (duration) {
		case 15:
			return 1.8; // %90 → 100 yatırırsa 90 alır
		case 30:
			return 2.0; // %100 → 100 yatırırsa 100 alır
		case 60:
			return 2.1; // %110 → 100 yatırırsa 110 alır
		case 90:
			return 2.2; // %120 → 100 yatırırsa 120 alır
		case 120:
			return 2.3; // %130 → 100 yatırırsa 130 alır
		default:
			return 1.0; // fallback → %100
	}
}

/* ----------------------------------------------------------
   Pozisyon Aç
---------------------------------------------------------- */
async function placeTurboTrade({
	userId,
	symbol,
	amount,
	direction,
	duration,
	walletSelector = null,
}) {
	if (!userId) throw new Error("userId gerekli");
	if (!symbol) throw new Error("symbol gerekli");
	if (!amount || amount <= 0) throw new Error("amount > 0 olmalı");
	if (!["UP", "DOWN"].includes(direction))
		throw new Error("direction UP/DOWN olmalı");
	if (![15, 30, 60, 90, 120].includes(duration))
		throw new Error("duration geçersiz");

	// Kullanıcıyı getir
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

	// Bakiye kontrol ve düş
	const decRes = await User.findOneAndUpdate(
		{ _id: userId, [`wallets.${walletIdx}.balance`]: { $gte: amount } },
		{ $inc: { [`wallets.${walletIdx}.balance`]: -amount } },
		{ new: true }
	);
	if (!decRes) throw new Error("Yetersiz bakiye");

	// Entry fiyat
	const entryPrice = await getSymbolPrice(symbol);

	// Pozisyon kaydet
	const startTime = new Date();
	const endTime = new Date(startTime.getTime() + duration * 1000);
	const payoutRate = getPayoutRate(duration);

	const trade = await TurboTrade.create({
		user: userId,
		symbol,
		amount,
		direction,
		entryPrice,
		duration,
		startTime,
		endTime,
		payoutRate,
		fiatCurrency: activeCur?.fiatCurrency || "USDT",
		wallet: `${user.wallets[walletIdx].coinType}-${user.wallets[walletIdx].chain}`,
	});

	// ✅ Otomatik kapatma için scheduler
	setTimeout(async () => {
		try {
			const price = await getSymbolPrice(symbol);
			await closeTurboTrade({ tradeId: trade._id, currentPrice: price });
			console.log(`✅ [TURBO CLOSE] ${symbol} trade kapandı @ ${price}`);
		} catch (err) {
			console.error("💥 [TURBO AUTO CLOSE ERROR]", err);
		}
	}, duration * 1000);

	// Emit user + trade
	const io = getIO();
	io.of("/general").to(userId.toString()).emit("user", { user: decRes });
	io.of("/general").to(userId.toString()).emit("turbo:trade", { trade });

	return { trade, user: decRes };
}

/* ----------------------------------------------------------
   Pozisyon Kapat
---------------------------------------------------------- */
async function closeTurboTrade({ tradeId, currentPrice }) {
	const trade = await TurboTrade.findById(tradeId).populate("user");
	if (!trade) throw new Error("Trade bulunamadı");
	if (trade.status === "closed") return { trade, user: trade.user };

	if (!currentPrice) {
		currentPrice = await getSymbolPrice(trade.symbol);
	}

	trade.closePrice = currentPrice;

	let isWin = false;
	if (trade.direction === "UP" && trade.closePrice > trade.entryPrice)
		isWin = true;
	if (trade.direction === "DOWN" && trade.closePrice < trade.entryPrice)
		isWin = true;

	const payoutRate = getPayoutRate(trade.duration);
	trade.payoutRate = payoutRate;
	trade.result = isWin ? "win" : "lose";
	trade.status = "closed";
	trade.closedAt = new Date();

	let payoutAmount = 0;
	if (isWin) {
		payoutAmount = parseFloat((trade.amount * payoutRate).toFixed(2));
		trade.payoutAmount = payoutAmount;

		const user = await User.findById(trade.user._id).lean(false);
		const walletIdx = user.wallets.findIndex(
			(w) => `${w.coinType}-${w.chain}` === trade.wallet
		);

		if (walletIdx >= 0) {
			user.wallets[walletIdx].balance = parseFloat(
				(user.wallets[walletIdx].balance + payoutAmount).toFixed(2)
			);
			await user.save();

			const io = getIO();
			io.of("/general").to(user._id.toString()).emit("user", { user });
		}
	} else {
		trade.payoutAmount = 0;
	}

	await trade.save();

	const io = getIO();
	io.of("/general")
		.to(trade.user._id.toString())
		.emit("turbo:trade", { trade });

	return { trade, user: trade.user };
}

module.exports = {
	placeTurboTrade,
	closeTurboTrade,
	getPayoutRate,
};
