const crypto = require("crypto");

const CURRENCY_DECIMALS = {
	BHD: 3,
	EUR: 2,
	JPY: 0,
	KRW: 0,
	KWD: 3,
	OMR: 3,
	TRY: 2,
	USD: 2,
	BRL: 2,
};

const getCurrencyDecimals = (currency) => {
	if (!currency) return 2;
	return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
};

const toSmallestUnit = (amount, currency) => {
	const decimals = getCurrencyDecimals(currency);
	return Math.round(Number(amount) * 10 ** decimals);
};

const fromSmallestUnit = (amount, currency) => {
	const decimals = getCurrencyDecimals(currency);
	return Number(amount) / 10 ** decimals;
};

const createAuthHeaders = (apiKey) => ({
	Authorization: `Bearer ${apiKey}`,
	Accept: "application/json",
	"Content-Type": "application/json",
});

const generateExternalTransactionId = (userId) => {
	const randomSuffix = crypto.randomBytes(6).toString("hex");
	return `flf_${userId}_${Date.now()}_${randomSuffix}`;
};

const verifyWebhookSignature = (payload, secret, receivedSignature) => {
	if (!payload || !secret || !receivedSignature) return false;

	const expectedSignature = crypto
		.createHmac("sha256", secret)
		.update(payload)
		.digest("hex");

	const normalizedReceived = String(receivedSignature).trim().toLowerCase();
	const normalizedExpected = expectedSignature.toLowerCase();

	const receivedBuffer = Buffer.from(normalizedReceived, "utf8");
	const expectedBuffer = Buffer.from(normalizedExpected, "utf8");

	if (receivedBuffer.length !== expectedBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

const unwrapForcelabData = (payload) => {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (!payload || typeof payload !== "object") {
		return payload;
	}

	if (payload.data !== undefined) {
		const nestedData = payload.data;

		if (Array.isArray(nestedData)) {
			return nestedData;
		}

		if (nestedData && typeof nestedData === "object") {
			return nestedData;
		}
	}

	return payload;
};

const normalizeForcelabWithdrawMetadata = (metadata = {}) => {
	const source = metadata && typeof metadata === "object" ? metadata : {};
	const normalized = {};
	const internalKeys = new Set([
		"customer",
		"iban",
		"accountName",
		"destinationAddress",
		"destinationNetwork",
		"walletAddress",
		"address",
		"network",
	]);

	for (const [key, value] of Object.entries(source)) {
		if (value === undefined || value === null || value === "") {
			continue;
		}

		if (internalKeys.has(key)) {
			continue;
		}

		normalized[key] = value;
	}

	const beneficiaryIban = source.beneficiary_iban || source.iban;
	const beneficiaryName = source.beneficiary_name || source.accountName;
	const destinationAddress =
		source.destination_address ||
		source.destinationAddress ||
		source.walletAddress ||
		source.address;
	const destinationNetwork =
		source.destination_network || source.destinationNetwork || source.network;

	if (beneficiaryIban) {
		normalized.beneficiary_iban = beneficiaryIban;
	}

	if (beneficiaryName) {
		normalized.beneficiary_name = beneficiaryName;
	}

	if (destinationAddress) {
		normalized.destination_address = destinationAddress;
	}

	if (destinationNetwork) {
		normalized.destination_network = destinationNetwork;
	}

	return normalized;
};

const mapForcelabStatus = (status) => {
	const normalizedStatus = String(status || "")
		.trim()
		.toLowerCase();

	switch (normalizedStatus) {
		case "completed":
		case "approved":
		case "success":
		case "successful":
		case "paid":
			return "approved";
		case "processing":
		case "in_progress":
		case "in-progress":
			return "processing";
		case "failed":
		case "declined":
			return "failed";
		case "rejected":
			return "rejected";
		case "cancelled":
		case "canceled":
			return "cancelled";
		case "expired":
			return "expired";
		case "pending":
		default:
			return "pending";
	}
};

module.exports = {
	createAuthHeaders,
	fromSmallestUnit,
	generateExternalTransactionId,
	mapForcelabStatus,
	normalizeForcelabWithdrawMetadata,
	toSmallestUnit,
	unwrapForcelabData,
	verifyWebhookSignature,
};