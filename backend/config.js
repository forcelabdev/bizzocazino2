const SiteSettings = require("./database/models/SiteSettings");

const DEFAULT_MAX_ACCOUNT_BALANCE = 10000;

let cachedMaxAccountBalance = null;
let cacheTime = null;
const CACHE_TTL = 60000;

async function getMaxAccountBalance() {
	const now = Date.now();
	if (
		cachedMaxAccountBalance !== null &&
		cacheTime &&
		now - cacheTime < CACHE_TTL
	) {
		return cachedMaxAccountBalance;
	}

	try {
		const settings = await SiteSettings.findOne().lean();
		cachedMaxAccountBalance =
			settings?.maxAccountBalance ?? DEFAULT_MAX_ACCOUNT_BALANCE;
		cacheTime = now;
		return cachedMaxAccountBalance;
	} catch (error) {
		console.error("maxAccountBalance alınırken hata:", error);
		return cachedMaxAccountBalance ?? DEFAULT_MAX_ACCOUNT_BALANCE;
	}
}

function clearMaxAccountBalanceCache() {
	cachedMaxAccountBalance = null;
	cacheTime = null;
}

module.exports = {
	getMaxAccountBalance,
	clearMaxAccountBalanceCache,
};
