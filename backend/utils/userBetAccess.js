const BET_ACCESS_BLOCKED_CODE = "BET_ACCESS_BLOCKED";
const BET_ACCESS_BLOCKED_MESSAGE =
	"Şu anda oyunlara erişiminiz kapalı, lütfen destek ekibimizle iletişime geçin.";

const isUserBetAccessBlocked = (user) =>
	user?.betAccess?.blocked === true;

const getProviderVisibleBalance = (user, balance) =>
	isUserBetAccessBlocked(user) ? 0 : Number(balance) || 0;

module.exports = {
	BET_ACCESS_BLOCKED_CODE,
	BET_ACCESS_BLOCKED_MESSAGE,
	getProviderVisibleBalance,
	isUserBetAccessBlocked,
};
