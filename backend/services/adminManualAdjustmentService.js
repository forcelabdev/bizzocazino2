const AdminManualAdjustment = require("../database/models/AdminManualAdjustment");
const { updateWalletBalance } = require("../utils/wallet");

const ALLOWED_KINDS = new Set(["balance", "bonus"]);
const ALLOWED_DIRECTIONS = new Set(["credit", "debit"]);
const DEFAULT_BALANCE_ADJUSTMENT_CATEGORY = "MANUEL BAKIYE";

const buildUserSnapshot = (user = {}) => ({
	username: user.username || "",
	name: user.name || "",
	email: user.local?.email || "",
	phone: user.phone || "",
	rank: user.rank || "user",
});

const buildWalletKey = (wallet = {}) => ({
	coinType: String(wallet.coinType || "").trim(),
	chain: String(wallet.chain || "").trim(),
	type: String(wallet.type || "").trim(),
});

const findWallet = (user, walletKey) => {
	if (!user || !Array.isArray(user.wallets)) return null;

	return (
		user.wallets.find(
			(wallet) =>
				wallet.coinType === walletKey.coinType &&
				wallet.chain === walletKey.chain &&
				wallet.type === walletKey.type
		) || null
	);
};

async function createAdminManualAdjustment({
	targetUser,
	actorUser = null,
	wallet,
	kind = "balance",
	direction = "credit",
	category,
	note = "",
	amount,
	source = "manual",
	sourceRef = null,
	metadata = {},
	emitSocket = true,
}) {
	if (!targetUser || !targetUser._id) {
		throw new Error("TARGET_USER_REQUIRED");
	}

	const normalizedKind = String(kind || "balance").trim().toLowerCase();
	if (!ALLOWED_KINDS.has(normalizedKind)) {
		throw new Error("INVALID_ADJUSTMENT_KIND");
	}

	const normalizedDirection = String(direction || "credit")
		.trim()
		.toLowerCase();
	if (!ALLOWED_DIRECTIONS.has(normalizedDirection)) {
		throw new Error("INVALID_ADJUSTMENT_DIRECTION");
	}

	const normalizedSource = String(source || "manual").trim() || "manual";
	const allowZeroAmount =
		normalizedKind === "bonus" && normalizedSource === "manual";

	const requestedAmount = Number(amount);
	if (
		!Number.isFinite(requestedAmount) ||
		requestedAmount < 0 ||
		(!allowZeroAmount && requestedAmount === 0)
	) {
		throw new Error("INVALID_ADJUSTMENT_AMOUNT");
	}

	const normalizedCategory = String(
		category ||
			(normalizedKind === "balance"
				? DEFAULT_BALANCE_ADJUSTMENT_CATEGORY
				: "")
	).trim();
	if (!normalizedCategory) {
		throw new Error("INVALID_ADJUSTMENT_CATEGORY");
	}

	const walletKey = buildWalletKey(wallet);
	if (!walletKey.coinType || !walletKey.chain || !walletKey.type) {
		throw new Error("INVALID_ADJUSTMENT_WALLET");
	}

	const targetWallet = findWallet(targetUser, walletKey);
	if (!targetWallet) {
		throw new Error("USER_WALLET_NOT_FOUND");
	}

	const balanceBefore = Number(targetWallet.balance || 0);
	const appliedAmount =
		normalizedDirection === "debit"
			? Math.min(requestedAmount, balanceBefore)
			: requestedAmount;

	if (appliedAmount < 0) {
		throw new Error("INVALID_ADJUSTMENT_AMOUNT");
	}

	if (appliedAmount === 0 && !allowZeroAmount) {
		throw new Error("INSUFFICIENT_BALANCE");
	}

	const signedAmount =
		normalizedDirection === "debit" ? -appliedAmount : appliedAmount;
	const balanceAfter = await updateWalletBalance(targetUser, targetWallet, signedAmount, {
		emitSocket,
	});

	if (balanceAfter === false) {
		throw new Error("BALANCE_UPDATE_FAILED");
	}

	const adjustment = await AdminManualAdjustment.create({
		actorUser: actorUser?._id || null,
		actorSnapshot: buildUserSnapshot(actorUser),
		targetUser: targetUser._id,
		targetSnapshot: buildUserSnapshot(targetUser),
		wallet: walletKey,
		kind: normalizedKind,
		direction: normalizedDirection,
		category: normalizedCategory,
		note: String(note || "").trim(),
		requestedAmount,
		appliedAmount,
		balanceBefore,
		balanceAfter,
		source: normalizedSource,
		sourceRef:
			sourceRef && typeof sourceRef === "object"
				? sourceRef
				: sourceRef
					? { value: sourceRef }
					: null,
		metadata: metadata && typeof metadata === "object" ? metadata : {},
	});

	return {
		adjustment,
		requestedAmount,
		appliedAmount,
		balanceBefore,
		balanceAfter,
	};
}

module.exports = {
	createAdminManualAdjustment,
};