const crypto = require("crypto");

const DEFAULT_XPAYMENTS_METHODS = Object.freeze({
	deposit: true,
	withdraw: true,
});

const DEFAULT_XPAYMENTS_SETTINGS = Object.freeze({
	isActive: false,
	name: "XPayment",
	logo: "",
	minAmount: 100,
	maxAmount: 100000,
	currency: "TRY",
	apiUrl: "https://api.xpaymentsystems.com",
	apiKey: "",
	secretKey: "",
	methods: DEFAULT_XPAYMENTS_METHODS,
});

const XPAYMENTS_ENDPOINTS = Object.freeze({
	deposit: "/h2h/v3/deposit",
	withdraw: "/v3/withdraw",
	cancelWithdraw: "/v3/cancel-withdraw",
	status: "/v3/status",
});

const FINAL_XPAYMENTS_STATUSES = new Set([
	"approved",
	"rejected",
	"cancelled",
	"failed",
]);

const DEFINITIVE_XPAYMENTS_HTTP_FAILURES = new Set([
	400,
	401,
	403,
	404,
	422,
]);

const normalizeXPaymentsSettings = (settings = {}) => ({
	...DEFAULT_XPAYMENTS_SETTINGS,
	...(settings || {}),
	currency: "TRY",
	apiUrl: String(
		settings?.apiUrl || DEFAULT_XPAYMENTS_SETTINGS.apiUrl,
	).replace(/\/+$/, ""),
	methods: {
		...DEFAULT_XPAYMENTS_METHODS,
		...(settings?.methods || {}),
	},
});

const formatXPaymentsAmount = (amount) => {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
		throw new TypeError("Amount must be a positive number.");
	}
	return numericAmount.toFixed(2);
};

const hasAtMostTwoDecimals = (amount) => {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount)) return false;
	return Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) < 1e-8;
};

const normalizeXPaymentsProviderAmount = (amount) => {
	const numericAmount = Number(amount);
	const cents = Math.round(numericAmount * 100);
	if (
		!Number.isFinite(numericAmount) ||
		numericAmount <= 0 ||
		!hasAtMostTwoDecimals(amount) ||
		!Number.isSafeInteger(cents)
	) {
		throw new TypeError("Invalid XPayment provider amount.");
	}
	return Number(numericAmount.toFixed(2));
};

const sha256 = (value) =>
	crypto.createHash("sha256").update(String(value), "utf8").digest("hex");

const generateXPaymentsTransactionId = (userId, type = "deposit") => {
	const prefix = type === "withdraw" ? "XP-WD" : "XP-DP";
	return `${prefix}-${userId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
};

const generateXPaymentsDepositHash = ({
	transactionId,
	userId,
	amount,
	secretKey,
}) =>
	sha256(
		`${transactionId}${userId}${formatXPaymentsAmount(amount)}${secretKey}`,
	);

const generateXPaymentsWithdrawHash = ({
	transactionId,
	userId,
	iban,
	amount,
	secretKey,
}) =>
	sha256(
		`${transactionId}${userId}${normalizeTurkishIban(iban)}${formatXPaymentsAmount(
			amount,
		)}${secretKey}`,
	);

const generateXPaymentsCancelHash = ({ transactionId, secretKey }) =>
	sha256(`${transactionId}${secretKey}`);

const generateXPaymentsCallbackHash = ({
	transactionId,
	userId,
	amount,
	status,
	secretKey,
}) =>
	sha256(
		`${transactionId}${userId}${String(amount)}${String(status).toLowerCase()}${secretKey}`,
	);

const safeTimingEqual = (left, right) => {
	const leftBuffer = Buffer.from(String(left || "").toLowerCase(), "utf8");
	const rightBuffer = Buffer.from(String(right || "").toLowerCase(), "utf8");
	if (leftBuffer.length !== rightBuffer.length) return false;
	return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeCallbackBoolean = (status) => {
	if (status === true || status === "true") return true;
	if (status === false || status === "false") return false;
	return null;
};

const verifyXPaymentsCallbackHash = ({
	transactionId,
	userId,
	amount,
	status,
	secretKey,
	receivedHash,
}) => {
	const normalizedStatus = normalizeCallbackBoolean(status);
	if (
		!transactionId ||
		!userId ||
		amount === undefined ||
		amount === null ||
		normalizedStatus === null ||
		!secretKey ||
		!receivedHash
	) {
		return false;
	}

	return safeTimingEqual(
		receivedHash,
		generateXPaymentsCallbackHash({
			transactionId,
			userId,
			amount,
			status: normalizedStatus,
			secretKey,
		}),
	);
};

const normalizeTurkishIban = (iban) =>
	String(iban || "").replace(/\s+/g, "").toUpperCase();

const isValidTurkishIban = (iban) =>
	/^TR[A-Z0-9]{24}$/.test(normalizeTurkishIban(iban));

const mapXPaymentsStatus = (status) => {
	const normalized = String(status || "").trim().toLowerCase();
	if (["starting", "waiting", "approved"].includes(normalized)) {
		return "processing";
	}
	if (normalized === "success") return "approved";
	if (normalized === "reject") return "rejected";
	if (["cancelled", "leave_page"].includes(normalized)) return "cancelled";
	return null;
};

const createXPaymentsHeaders = (apiKey) => ({
	Authorization: `Bearer ${apiKey}`,
	Accept: "application/json",
	"Content-Type": "application/json",
});

const buildXPaymentsStatusRequest = ({ transactionId, apiKey }) => ({
	endpoint: XPAYMENTS_ENDPOINTS.status,
	data: { transaction_id: transactionId },
	headers: createXPaymentsHeaders(apiKey),
});

const isExistingXPaymentsTransactionResponse = (statusCode, body = {}) =>
	Number(statusCode) === 400 &&
	String(body?.message || "").trim().toLowerCase() ===
		"existing transaction found" &&
	body?.data &&
	typeof body.data === "object";

const isDefinitiveXPaymentsHttpFailure = (statusCode) =>
	DEFINITIVE_XPAYMENTS_HTTP_FAILURES.has(Number(statusCode));

const classifyXPaymentsCancelResponse = (statusCode, body = {}) => {
	const isProcessing = body?.is_processing === true;
	const alreadyCancelled = /already cancelled/i.test(
		String(body?.message || ""),
	);
	const canApply =
		Number(statusCode) !== 409 && body?.status === true && !isProcessing;

	return { canApply, isProcessing, alreadyCancelled };
};

const getXPaymentsDepositResponseMismatch = ({
	requestedTransactionId,
	requestedAmount,
	providerTransactionId,
	providerAmount,
	reusedExisting = false,
}) => {
	if (
		!reusedExisting &&
		String(providerTransactionId) !== String(requestedTransactionId)
	) {
		return "transaction_id";
	}
	if (
		!reusedExisting &&
		formatXPaymentsAmount(providerAmount) !==
			formatXPaymentsAmount(requestedAmount)
	) {
		return "amount";
	}
	return null;
};

const getXPaymentsErrorMessage = (error, fallback) =>
	error?.response?.data?.message ||
	error?.response?.data?.error ||
	error?.message ||
	fallback;

module.exports = {
	DEFAULT_XPAYMENTS_METHODS,
	DEFAULT_XPAYMENTS_SETTINGS,
	FINAL_XPAYMENTS_STATUSES,
	XPAYMENTS_ENDPOINTS,
	buildXPaymentsStatusRequest,
	classifyXPaymentsCancelResponse,
	createXPaymentsHeaders,
	formatXPaymentsAmount,
	generateXPaymentsCallbackHash,
	generateXPaymentsCancelHash,
	generateXPaymentsDepositHash,
	generateXPaymentsTransactionId,
	generateXPaymentsWithdrawHash,
	getXPaymentsDepositResponseMismatch,
	getXPaymentsErrorMessage,
	hasAtMostTwoDecimals,
	isExistingXPaymentsTransactionResponse,
	isDefinitiveXPaymentsHttpFailure,
	isValidTurkishIban,
	mapXPaymentsStatus,
	normalizeCallbackBoolean,
	normalizeTurkishIban,
	normalizeXPaymentsProviderAmount,
	normalizeXPaymentsSettings,
	safeTimingEqual,
	verifyXPaymentsCallbackHash,
};
