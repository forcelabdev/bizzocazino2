const { getIO } = require("./io");
const User = require("../database/models/User");
const {
	createRivoWallet,
	normalizeCurrency,
	normalizeWalletState,
} = require("./rivoWallet");

const getActiveWalletIndex = (user) => {
	if (!user || !Array.isArray(user.wallets)) return -1;

	const activeWallet = getActiveWallet(user);
	if (!activeWallet) return -1;

	const index = user.wallets.findIndex(
		(w) =>
			w.coinType === activeWallet.coinType &&
			w.chain === activeWallet.chain &&
			w.type === activeWallet.type
	);
	return index >= 0 ? index : -1;
};

const getActiveWallet = (user) => {
	if (!user) return null;

	const { wallets, currency } = normalizeWalletState(user);
	const { coinType, chain, type } = currency;
	if (!coinType || !chain || !type) return null;
	return (
		wallets.find(
			(wallet) =>
				wallet.coinType === coinType &&
				wallet.chain === chain &&
				wallet.type === type
		) || null
	);
};

const getWallet = (user, coinType, chain, type) => {
	if (!user || !user.currency) return null;
	if (!coinType || !chain || !type) return null;
	return (
		getWallets(user).find(
			(wallet) =>
				wallet.coinType === coinType &&
				wallet.chain === chain &&
				wallet.type === type
		) || null
	);
};

const getWallets = (user) => {
	if (!user) return [];
	if (Array.isArray(user.wallets) && user.wallets.length > 0) {
		return user.wallets;
	}
	return [createRivoWallet()];
};

const getCurrency = (user) => {
	if (!user) return null;
	return normalizeCurrency(user.currency || {});
};

function getWalletKeyFromIndex(user, walletIndex) {
	const w = user.wallets?.[walletIndex];
	if (!w) throw new Error("Aktif cüzdan bulunamadı");
	const { coinType, chain, type } = w;
	if (!coinType || !chain || !type) throw new Error("Cüzdan anahtarı eksik");
	return { coinType, chain, type };
}

async function updateWalletBalance(user, wallet, amount, options = {}) {
	const { emitSocket = true, session = null } = options;

	if (!user || !wallet) return false;
	
	// Find wallet index for atomic update
	const walletIndex = user.wallets.findIndex(
		(w) => w.coinType === wallet.coinType && w.chain === wallet.chain && w.type === wallet.type
	);
	
	if (walletIndex === -1) return false;

	try {
		const updatedUser = await User.findOneAndUpdate(
			{ _id: user._id },
			{ $inc: { [`wallets.${walletIndex}.balance`]: amount } },
			{ new: true, session }
		);

		if (!updatedUser) {
			console.error(`updateWalletBalance: User ${user._id} not found`);
			return false;
		}

		// Update local user object with new data
		user.wallets = updatedUser.wallets;
		user.__v = updatedUser.__v;

		const newBalance = updatedUser.wallets[walletIndex]?.balance || 0;

		if (emitSocket && user._id) emitUserBalance(null, updatedUser);
		return newBalance;
	} catch (error) {
		console.error("updateWalletBalance failed:", error.message);
		throw error;
	}
}

async function updateUserBalance(user, amount, options = {}) {
	return updateWalletBalance(user, getActiveWallet(user), amount, options);
}

/**
 * Kullanıcıya socket üzerinden bakiye güncellemesi bildir
 * @param {object} io - Socket.io instance
 * @param {object} user - User objesi (wallets ve currency içermeli)
 */
function emitUserBalance(io, user) {
	if (!user || !user._id) return;
	try {
		const socketIo = io || getIO();
		socketIo
			.of("/general")
			.to(user._id.toString())
			.emit("user", {
				user: {
					_id: user._id,
					wallets: user.wallets,
					currency: user.currency,
				},
			});
	} catch (err) {
		console.error("Socket emit error in emitUserBalance:", err.message);
	}
}

module.exports = {
	getActiveWallet,
	getActiveWalletIndex,
	getWalletKeyFromIndex,
	getWallets,
	getCurrency,
	updateWalletBalance,
	updateUserBalance,
	getWallet,
	emitUserBalance,
};
