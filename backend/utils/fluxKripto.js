const crypto = require("crypto");

const DEFAULT_FLUX_KRIPTO_SETTINGS = Object.freeze({
	isActive: false,
	name: "FluxKripto",
	logo: "",
	minAmount: 100,
	maxAmount: 100000,
	currency: "TRY",
	apiUrl: "https://api.fluxkripto.com",
	siteUrl: "",
	apiKey: "",
	secretKey: "",
	methods: Object.freeze({
		deposit: true,
		withdraw: true,
	}),
	currencies: Object.freeze({
		trx: true,
		usdt: true,
	}),
});

const SUPPORTED_FLUX_CURRENCIES = Object.freeze(["TRX", "USDT"]);

const formatTryAmount = (amount) => {
	const number = Number(amount);
	if (!Number.isFinite(number)) {
		throw new TypeError("Geçersiz TRY tutarı.");
	}

	return number.toFixed(2);
};

const hasAtMostTwoDecimals = (amount) => {
	const numericAmount = Number(amount);
	if (!Number.isFinite(numericAmount)) return false;
	return Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) < 1e-8;
};

const normalizeFluxProviderTryAmount = (amount) => {
	const numericAmount = Number(amount);
	const cents = Math.round(numericAmount * 100);
	if (
		!Number.isFinite(numericAmount) ||
		numericAmount <= 0 ||
		!hasAtMostTwoDecimals(amount) ||
		!Number.isSafeInteger(cents)
	) {
		throw new TypeError("Invalid FluxKripto provider amount.");
	}
	return Number(numericAmount.toFixed(2));
};

const normalizeFluxCurrency = (currency) =>
	String(currency || "")
		.trim()
		.toUpperCase();

const isSupportedFluxCurrency = (currency) =>
	SUPPORTED_FLUX_CURRENCIES.includes(normalizeFluxCurrency(currency));

const isDefinitiveFluxDepositFailure = (statusCode, body = {}) => {
	const status = Number(statusCode);
	if ([400, 401, 403, 404, 422].includes(status)) return true;

	const providerError = `${body?.error || ""} ${body?.message || ""}`
		.trim()
		.toLowerCase();
	return (
		(status === 503 && providerError.includes("no available wallets")) ||
		(status === 500 && providerError.includes("exchange rate fetch failed"))
	);
};

const sha256 = (value) =>
	crypto.createHash("sha256").update(String(value), "utf8").digest("hex");

const getFluxCredentialFingerprint = (apiKey) => {
	const normalized = String(apiKey || "").trim();
	return normalized ? sha256(normalized).slice(0, 12) : "";
};

const getFluxResponseHeader = (headers, name) => {
	if (!headers) return "";

	if (typeof headers.get === "function") {
		const value = headers.get(name);
		if (value !== undefined && value !== null) return String(value).trim();
	}

	const target = name.toLowerCase();
	const key = Object.keys(headers).find(
		(headerName) => headerName.toLowerCase() === target,
	);
	return key && headers[key] !== undefined && headers[key] !== null
		? String(headers[key]).trim()
		: "";
};

const getFluxProviderMessage = (body) => {
	if (!body || typeof body !== "object" || Array.isArray(body)) return "";

	const candidates = [
		body.message,
		typeof body.error === "object" ? body.error?.message : body.error,
	];
	const message = candidates.find(
		(value) =>
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean",
	);
	return message === undefined ? "" : String(message).trim().slice(0, 300);
};

const getFluxUpstreamErrorDetails = (error = {}) => {
	const response = error.response;
	const numericStatus = Number(response?.status);
	const status = Number.isFinite(numericStatus) ? numericStatus : null;
	const server = getFluxResponseHeader(response?.headers, "server").slice(0, 100);
	const contentType = getFluxResponseHeader(
		response?.headers,
		"content-type",
	).slice(0, 150);
	const requestId = (
		getFluxResponseHeader(response?.headers, "cf-ray") ||
		getFluxResponseHeader(response?.headers, "x-request-id") ||
		getFluxResponseHeader(response?.headers, "x-correlation-id")
	).slice(0, 150);
	const body = response?.data;
	const responseType =
		typeof body === "string"
			? /html/i.test(contentType) || /<\s*!?doctype|<\s*html/i.test(body)
				? "html"
				: "text"
			: body && typeof body === "object"
				? "json"
				: "empty";
	const bodySummary = typeof body === "string" ? body.slice(0, 2000) : "";
	const blockedPageMarker =
		/attention required|sorry, you have been blocked|cloudflare ray id/i.test(
			bodySummary,
		);
	const cloudflareBlocked =
		status === 403 &&
		(blockedPageMarker ||
			(responseType === "html" &&
				(/cloudflare/i.test(server) ||
					Boolean(getFluxResponseHeader(response?.headers, "cf-ray")))));

	let code = "FLUX_UPSTREAM_ERROR";
	if (!response) code = "FLUX_UPSTREAM_NETWORK_ERROR";
	else if (cloudflareBlocked) code = "FLUX_UPSTREAM_ACCESS_BLOCKED";
	else if (status === 403) code = "FLUX_UPSTREAM_FORBIDDEN";
	else if (status === 401) code = "FLUX_UPSTREAM_UNAUTHORIZED";
	else if (status === 429) code = "FLUX_UPSTREAM_RATE_LIMITED";

	return {
		code,
		status,
		retryable: false,
		requestId,
		server,
		contentType,
		responseType,
		providerMessage: getFluxProviderMessage(body),
	};
};

const generateFluxTransactionId = (userId, type = "deposit") => {
	const prefix = type === "withdraw" ? "FLUX-WD" : "FLUX-DP";
	const suffix = crypto.randomBytes(6).toString("hex");
	return `${prefix}-${userId}-${Date.now()}-${suffix}`;
};

const generateFluxDepositHash = ({
	transactionId,
	userId,
	amount,
	currency,
	secretKey,
}) =>
	sha256(
		`${transactionId}${userId}${formatTryAmount(amount)}${normalizeFluxCurrency(
			currency,
		)}${secretKey}`,
	);

const generateFluxWithdrawHash = ({
	transactionId,
	userId,
	currency,
	amount,
	receiverWallet,
	secretKey,
}) =>
	sha256(
		`${transactionId}${userId}${normalizeFluxCurrency(currency)}${formatTryAmount(
			amount,
		)}${String(receiverWallet || "").trim()}${secretKey}`,
	);

const normalizeCallbackStatus = (status) => {
	if (status === true || status === "true") return true;
	if (status === false || status === "false") return false;
	return null;
};

const generateFluxCallbackHash = ({
	transactionId,
	userId,
	rawAmount,
	status,
	secretKey,
}) => {
	const normalizedStatus = normalizeCallbackStatus(status);
	if (normalizedStatus === null) {
		throw new TypeError("Geçersiz callback durumu.");
	}

	return sha256(
		`${transactionId}${userId}${String(rawAmount)}${String(
			normalizedStatus,
		)}${secretKey}`,
	);
};

const safeTimingEqual = (left, right) => {
	const leftBuffer = Buffer.from(String(left || "").trim().toLowerCase(), "utf8");
	const rightBuffer = Buffer.from(
		String(right || "").trim().toLowerCase(),
		"utf8",
	);

	if (leftBuffer.length !== rightBuffer.length) return false;
	return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyFluxCallbackHash = ({ receivedHash, ...values }) => {
	if (!receivedHash || !values.secretKey) return false;

	try {
		return safeTimingEqual(receivedHash, generateFluxCallbackHash(values));
	} catch {
		return false;
	}
};

const createFluxHeaders = (apiKey) => ({
	Authorization: `Bearer ${String(apiKey || "").trim()}`,
	Accept: "application/json",
	"Content-Type": "application/json",
});

const mergeFluxSettings = (settings = {}) => ({
	...DEFAULT_FLUX_KRIPTO_SETTINGS,
	...(settings || {}),
	currency: "TRY",
	methods: {
		...DEFAULT_FLUX_KRIPTO_SETTINGS.methods,
		...(settings?.methods || {}),
	},
	currencies: {
		...DEFAULT_FLUX_KRIPTO_SETTINGS.currencies,
		...(settings?.currencies || {}),
	},
});

const BASE58_ALPHABET =
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const decodeBase58 = (value) => {
	const input = String(value || "");
	if (!input) return null;

	let decoded = 0n;
	for (const character of input) {
		const index = BASE58_ALPHABET.indexOf(character);
		if (index < 0) return null;
		decoded = decoded * 58n + BigInt(index);
	}

	let hex = decoded.toString(16);
	if (hex.length % 2 !== 0) hex = `0${hex}`;
	let buffer = hex ? Buffer.from(hex, "hex") : Buffer.alloc(0);

	let leadingZeroCount = 0;
	while (leadingZeroCount < input.length && input[leadingZeroCount] === "1") {
		leadingZeroCount += 1;
	}

	if (leadingZeroCount > 0) {
		buffer = Buffer.concat([Buffer.alloc(leadingZeroCount), buffer]);
	}

	return buffer;
};

const isValidTronAddress = (address) => {
	const normalized = String(address || "").trim();
	if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(normalized)) return false;

	const decoded = decodeBase58(normalized);
	if (!decoded || decoded.length !== 25 || decoded[0] !== 0x41) return false;

	const payload = decoded.subarray(0, 21);
	const checksum = decoded.subarray(21);
	const firstHash = crypto.createHash("sha256").update(payload).digest();
	const expectedChecksum = crypto
		.createHash("sha256")
		.update(firstHash)
		.digest()
		.subarray(0, 4);

	return crypto.timingSafeEqual(checksum, expectedChecksum);
};

const normalizeFluxNativeDepositData = (data = {}, expected = {}) => {
	const transactionId = String(data.transaction_id || "").trim();
	const currency = normalizeFluxCurrency(data.currency);
	const walletAddress = String(data.wallet_address || "").trim();
	const cryptoAmount = Number(data.amount);
	const rate = Number(data.rate);
	const expiresAt = new Date(data.expires_at);
	let amountTRY;

	try {
		amountTRY = normalizeFluxProviderTryAmount(data.amountTRY);
	} catch {
		throw new TypeError("FluxKripto geçersiz bir TRY tutarı döndürdü.");
	}

	if (!transactionId || transactionId !== String(expected.transactionId || "")) {
		throw new TypeError("FluxKripto farklı bir işlem kimliği döndürdü.");
	}
	if (!isSupportedFluxCurrency(currency) || currency !== expected.currency) {
		throw new TypeError("FluxKripto farklı bir para birimi döndürdü.");
	}
	if (formatTryAmount(amountTRY) !== formatTryAmount(expected.amount)) {
		throw new TypeError("FluxKripto farklı bir TRY tutarı döndürdü.");
	}
	if (!data.order_id || data.finance_id === null || data.finance_id === undefined) {
		throw new TypeError("FluxKripto eksik provider kimliği döndürdü.");
	}
	if (!isValidTronAddress(walletAddress)) {
		throw new TypeError("FluxKripto geçersiz bir TRON cüzdanı döndürdü.");
	}
	if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
		throw new TypeError("FluxKripto geçersiz bir kripto miktarı döndürdü.");
	}
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new TypeError("FluxKripto geçersiz bir kur döndürdü.");
	}
	if (Number.isNaN(expiresAt.getTime())) {
		throw new TypeError("FluxKripto geçersiz bir son kullanım zamanı döndürdü.");
	}

	return {
		orderId: String(data.order_id),
		financeId: String(data.finance_id),
		providerAmount: amountTRY,
		walletAddress,
		cryptoAmount,
		rate,
		expiresAt,
	};
};

const normalizeFluxWithdrawData = (data = {}, expected = {}) => {
	const transactionId = String(data.transaction_id || "").trim();
	const receiverWallet = String(data.receiver_wallet || "").trim();
	const currency = normalizeFluxCurrency(data.currency);
	const cryptoAmount = Number(data.amount);
	const rate = Number(data.rate);
	let amountTRY;

	try {
		amountTRY = normalizeFluxProviderTryAmount(data.amountTRY);
	} catch {
		throw new TypeError("FluxKripto geçersiz bir TRY tutarı döndürdü.");
	}

	if (transactionId !== String(expected.transactionId || "")) {
		throw new TypeError("FluxKripto farklı bir işlem kimliği döndürdü.");
	}
	if (receiverWallet !== String(expected.receiverWallet || "").trim()) {
		throw new TypeError("FluxKripto farklı bir alıcı cüzdanı döndürdü.");
	}
	if (currency !== expected.currency) {
		throw new TypeError("FluxKripto farklı bir para birimi döndürdü.");
	}
	if (formatTryAmount(amountTRY) !== formatTryAmount(expected.amount)) {
		throw new TypeError("FluxKripto farklı bir TRY tutarı döndürdü.");
	}
	if (data.finance_id === null || data.finance_id === undefined) {
		throw new TypeError("FluxKripto eksik finance ID döndürdü.");
	}
	if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
		throw new TypeError("FluxKripto geçersiz bir kripto miktarı döndürdü.");
	}
	if (!Number.isFinite(rate) || rate <= 0) {
		throw new TypeError("FluxKripto geçersiz bir kur döndürdü.");
	}

	return {
		financeId: String(data.finance_id),
		cryptoAmount,
		rate,
		providerStatus: String(data.status || "pending"),
	};
};

module.exports = {
	DEFAULT_FLUX_KRIPTO_SETTINGS,
	SUPPORTED_FLUX_CURRENCIES,
	createFluxHeaders,
	formatTryAmount,
	generateFluxCallbackHash,
	generateFluxDepositHash,
	generateFluxTransactionId,
	generateFluxWithdrawHash,
	getFluxCredentialFingerprint,
	getFluxUpstreamErrorDetails,
	isSupportedFluxCurrency,
	isDefinitiveFluxDepositFailure,
	isValidTronAddress,
	mergeFluxSettings,
	normalizeFluxNativeDepositData,
	normalizeFluxProviderTryAmount,
	normalizeFluxWithdrawData,
	normalizeCallbackStatus,
	normalizeFluxCurrency,
	safeTimingEqual,
	verifyFluxCallbackHash,
};
