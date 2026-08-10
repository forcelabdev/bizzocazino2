const WingoGame = require("../database/models/WingoGame");
const WingoBet = require("../database/models/WingoBet");
const WingoConfig = require("../database/models/WingoConfig");
const User = require("../database/models/User");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { updateUserBalance, emitUserBalance } = require("../utils/wallet");

// Ödeme oranları
const PAYOUTS = {
	color: {
		red: 1.95,
		green: 1.95,
		violet: 4.5,
	},
	number: 9,
};

// Yeni round başlat
async function startNewRound() {
	const config =
		(await WingoConfig.findOne()) || (await WingoConfig.create({}));

	const startAt = new Date();
	const endAt = new Date(Date.now() + config.roundDuration);

	// ❗ roundId üretimi ve kayıt işlemini, eşzamanlı (concurrent) çağrılardan
	// kaynaklanan "duplicate key" hatalarına karşı dayanıklı hale getir.
	// Böyle bir hata artık process'i çökertmez, bir sonraki round numarasıyla
	// tekrar denenir.
	const MAX_ATTEMPTS = 5;
	let lastError = null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		const serverSeed = crypto.randomBytes(16).toString("hex");
		const clientSeed = crypto.randomBytes(16).toString("hex");

		// ❗ Son oyunu bul ve artır
		const lastGame = await WingoGame.findOne().sort({ createdAt: -1 });
		let newRoundNumber = 1 + attempt;

		if (lastGame && lastGame.roundId?.startsWith("raxen-")) {
			const parts = lastGame.roundId.split("-");
			const lastNumber = parseInt(parts[1]);
			if (!isNaN(lastNumber)) newRoundNumber = lastNumber + 1 + attempt;
		}

		const newRoundId = `raxen-${newRoundNumber}`;

		try {
			const newGame = await WingoGame.create({
				roundId: newRoundId,
				startAt,
				endAt,
				serverSeed,
				clientSeed,
				nonce: 0,
			});

			return newGame;
		} catch (err) {
			const isDuplicateKey =
				err?.code === 11000 || err?.name === "MongoServerError";
			if (!isDuplicateKey) throw err;
			lastError = err;
			console.warn(
				`[WINGO] roundId çakışması (${newRoundId}), tekrar deneniyor (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
			);
		}
	}

	throw lastError || new Error("Yeni round oluşturulamadı.");
}

async function placeBet(user, { roundId, betType, choice, amount, wallet }) {
	const match = user.wallets.find(
		(w) =>
			w.coinType === wallet.coinType &&
			w.chain === wallet.chain &&
			w.type === wallet.type
	);

	if (!match) {
		console.warn("[BET] Eşleşen cüzdan bulunamadı.");
		throw new Error("Geçersiz cüzdan");
	}

	if (match.balance < amount) {
		console.warn("[BET] Yetersiz bakiye:", match.balance, "<", amount);
		throw new Error("Yetersiz bakiye");
	}

	// Bakiyeyi düş
	await updateUserBalance(user, -amount, { emitSocket: true });

	// Bahsi kaydet
	await WingoBet.create({
		user: user._id,
		roundId,
		betType,
		choice,
		amount,
		wallet: {
			coinType: wallet.coinType,
			chain: wallet.chain,
			type: wallet.type,
			currency: user.currency.fiatCurrency, // ✅ burada düzeltme yap
		},
	});
}

async function completeRound(game, io, userSockets) {
	const config = await WingoConfig.findOne();
	let colorResult, numberResult;

	if (config.forceNext.enabled) {
		// Admin zorlamışsa
		colorResult = config.forceNext.forcedColor || getRandomColor();
		numberResult = config.forceNext.forcedNumber ?? getRandomNumber();

		config.forceNext.enabled = false;
		config.forceNext.forcedColor = null;
		config.forceNext.forcedNumber = null;
		await config.save();
	} else {
		const allBets = await WingoBet.find({ roundId: game.roundId });

		if (config.mode === "platform_win") {
			({ colorResult, numberResult } = calculatePlatformWin(allBets));
		} else if (config.mode === "user_win") {
			({ colorResult, numberResult } = calculateUserWin(allBets));
		} else {
			colorResult = getRandomColor();
			numberResult = getRandomNumber();
		}
	}

	game.colorResult = colorResult;
	game.numberResult = numberResult;
	game.status = "completed";
	await game.save();

	await calculateWinners(game, io, userSockets);

	return { colorResult, numberResult };
}

async function calculateWinners(game, io, userSockets) {
	const bets = await WingoBet.find({ roundId: game.roundId }).populate(
		"user"
	);

	for (const bet of bets) {
		const user = bet.user;

		let isWin = false;
		let payout = 0;

		if (bet.betType === "color" && bet.choice === game.colorResult) {
			isWin = true;
			const multiplier = PAYOUTS.color[bet.choice];
			if (!multiplier) {
				console.warn(`[KAZANÇ] Tanımsız oran: ${bet.choice}`);
				continue;
			}
			payout = bet.amount * multiplier;
		}

		if (
			bet.betType === "number" &&
			parseInt(bet.choice) === game.numberResult
		) {
			isWin = true;
			payout = bet.amount * PAYOUTS.number;
		}

		if (!isWin) {
			continue;
		}

		bet.isWin = true;
		bet.payout = payout;
		await bet.save();

		const wallet = user.wallets.find(
			(w) =>
				w.coinType === bet.wallet.coinType &&
				w.chain === bet.wallet.chain &&
				w.type === bet.wallet.type &&
				(!w.currency ||
					(typeof w.currency === "object"
						? w.currency.fiatCurrency === bet.wallet.currency
						: w.currency === bet.wallet.currency))
		);

		if (wallet) {
			await updateUserBalance(user, payout, { emitSocket: false });

			const socketId = userSockets.get(user._id.toString());
			if (socketId) {
				io.to(socketId).emit("wingo:balance:update", {
					wallets: user.wallets,
				});
			}
			// Ayrıca genel socket üzerinden de bildir
			emitUserBalance(io, user);
		} else {
			console.warn("[KAZANÇ] Cüzdan eşleşmedi, kazanç yatırılmadı:", {
				userId: user._id,
				betWallet: bet.wallet,
				userWallets: user.wallets,
			});
		}
	}
}

function getRandomColor() {
	const options = ["red", "green", "violet"];
	return options[Math.floor(Math.random() * options.length)];
}

function getRandomNumber() {
	return Math.floor(Math.random() * 10);
}

module.exports = {
	startNewRound,
	placeBet,
	completeRound,
};
