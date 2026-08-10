const User = require("../database/models/User");
const { getIO } = require("../utils/io");
const FuturesBet = require("../database/models/FuturesBet");
const { computePnl } = require("../utils/trading");

/**
 * Pozisyonu kapatır ve kullanıcı bakiyesini günceller
 */
async function closeFuturesBet({ userId, betId, closePrice }) {
	if (!userId) throw new Error("userId gerekli");
	if (!betId) throw new Error("betId gerekli");
	if (!closePrice || closePrice <= 0)
		throw new Error("closePrice > 0 olmalı");

	const bet = await FuturesBet.findOne({
		_id: betId,
		user: userId,
		status: "open",
	});
	if (!bet) throw new Error("Pozisyon bulunamadı veya zaten kapalı");

	// PnL hesapla
	let pnl = computePnl({
		entryPrice: bet.entryPrice,
		exitPrice: closePrice,
		leverage: bet.leverage,
		amount: bet.amount,
		direction: bet.direction,
	});

	if (pnl < -bet.amount) pnl = -bet.amount; // clamp

	// 🔽 Ondalık normalize
	pnl = parseFloat(pnl.toFixed(2));

	// Pozisyonu güncelle
	bet.status = "closed";
	bet.exitPrice = closePrice;
	bet.pnl = pnl;
	await bet.save();

	// Kullanıcı bakiyesi
	const user = await User.findById(userId).lean(false);
	if (!user) throw new Error("Kullanıcı bulunamadı");
	const walletIdx = user.wallets.findIndex(
		(w) => `${w.coinType}-${w.chain}` === bet.wallet
	);
	if (walletIdx < 0) throw new Error("Cüzdan bulunamadı");

	let incAmount = bet.amount + pnl;
	if (incAmount < 0) incAmount = 0;

	// 🔽 normalize
	incAmount = parseFloat(incAmount.toFixed(2));

	const upd = await User.findOneAndUpdate(
		{ _id: userId },
		{ $inc: { [`wallets.${walletIdx}.balance`]: incAmount } },
		{ new: true }
	);

	// Emit socket
	const io = getIO();
	io.of("/general").to(userId.toString()).emit("user", { user: upd });
	io.of("/general").to(userId.toString()).emit("bet", { bet });

	return { bet, user: upd };
}

module.exports = { closeFuturesBet };
