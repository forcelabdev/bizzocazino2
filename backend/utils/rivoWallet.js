const RIVO_WALLET = Object.freeze({
	coinType: "Rivo",
	chain: "TRON",
	type: "trc-20",
});

const toFiniteNumber = (value, fallback = 0) => {
	const normalizedValue = Number(value);
	return Number.isFinite(normalizedValue) ? normalizedValue : fallback;
};

const isRivoWallet = (wallet = {}) =>
	wallet.coinType === RIVO_WALLET.coinType &&
	wallet.chain === RIVO_WALLET.chain &&
	wallet.type === RIVO_WALLET.type;

const createRivoWallet = (balance = 0) => ({
	...RIVO_WALLET,
	balance: toFiniteNumber(balance, 0),
});

const findActiveWallet = (wallets = [], currency = {}) => {
	if (!Array.isArray(wallets) || wallets.length === 0) return null;

	const { coinType, chain, type } = currency || {};
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

const pickRivoBalance = ({ wallets = [], currency = {} } = {}) => {
	if (!Array.isArray(wallets) || wallets.length === 0) return 0;

	const activeWallet = findActiveWallet(wallets, currency);
	if (activeWallet) {
		return toFiniteNumber(activeWallet.balance, 0);
	}

	const rivoWallet = wallets.find(isRivoWallet);
	if (rivoWallet) {
		return toFiniteNumber(rivoWallet.balance, 0);
	}

	return toFiniteNumber(wallets[0]?.balance, 0);
};

const normalizeCurrency = (currency = {}) => ({
	fiatCurrency: currency?.fiatCurrency || "USD",
	coinType: RIVO_WALLET.coinType,
	chain: RIVO_WALLET.chain,
	type: RIVO_WALLET.type,
	coins: toFiniteNumber(currency?.coins, 0),
});

const normalizeWalletState = ({ wallets = [], currency = {} } = {}) => ({
	wallets: [createRivoWallet(pickRivoBalance({ wallets, currency }))],
	currency: normalizeCurrency(currency),
});

const hasOnlyRivoWallet = ({ wallets = [], currency = {} } = {}) => {
	if (!Array.isArray(wallets) || wallets.length !== 1) return false;
	if (!isRivoWallet(wallets[0])) return false;

	return (
		currency?.coinType === RIVO_WALLET.coinType &&
		currency?.chain === RIVO_WALLET.chain &&
		currency?.type === RIVO_WALLET.type
	);
};

module.exports = {
	RIVO_WALLET,
	createRivoWallet,
	findActiveWallet,
	hasOnlyRivoWallet,
	isRivoWallet,
	normalizeCurrency,
	normalizeWalletState,
};