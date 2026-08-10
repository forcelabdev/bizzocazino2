const test = require("node:test");
const assert = require("node:assert/strict");

const {
	DEFAULT_XPAYMENTS_METHODS,
	DEFAULT_XPAYMENTS_SETTINGS,
	XPAYMENTS_ENDPOINTS,
	buildXPaymentsStatusRequest,
	classifyXPaymentsCancelResponse,
	formatXPaymentsAmount,
	generateXPaymentsCallbackHash,
	generateXPaymentsCancelHash,
	generateXPaymentsDepositHash,
	generateXPaymentsTransactionId,
	generateXPaymentsWithdrawHash,
	getXPaymentsDepositResponseMismatch,
	hasAtMostTwoDecimals,
	isExistingXPaymentsTransactionResponse,
	isDefinitiveXPaymentsHttpFailure,
	isValidTurkishIban,
	mapXPaymentsStatus,
	normalizeTurkishIban,
	normalizeXPaymentsProviderAmount,
	normalizeXPaymentsSettings,
	verifyXPaymentsCallbackHash,
} = require("../utils/xPayments");

const TEST_VECTOR = {
	transactionId: "MERCHANT-TXN-001",
	userId: "USER-789",
	amount: 250,
	secretKey: "test-secret",
};

test("defaults keep XPayment disabled while both native methods are enabled", () => {
	assert.equal(DEFAULT_XPAYMENTS_SETTINGS.isActive, false);
	assert.equal(
		DEFAULT_XPAYMENTS_SETTINGS.apiUrl,
		"https://api.xpaymentsystems.com",
	);
	assert.deepEqual(DEFAULT_XPAYMENTS_METHODS, {
		deposit: true,
		withdraw: true,
	});
	assert.equal(XPAYMENTS_ENDPOINTS.deposit, "/h2h/v3/deposit");
	assert.equal(XPAYMENTS_ENDPOINTS.withdraw, "/v3/withdraw");
});

test("settings normalization preserves defaults and strips trailing slashes", () => {
	assert.deepEqual(
		normalizeXPaymentsSettings({
			apiUrl: "https://api.example.com///",
			methods: { deposit: false },
		}).methods,
		{ deposit: false, withdraw: true },
	);
	assert.equal(
		normalizeXPaymentsSettings({ apiUrl: "https://api.example.com///" }).apiUrl,
		"https://api.example.com",
	);
	assert.equal(normalizeXPaymentsSettings({ currency: "USD" }).currency, "TRY");
});

test("amounts are formatted to the exact two-decimal hash representation", () => {
	assert.equal(formatXPaymentsAmount(250), "250.00");
	assert.equal(formatXPaymentsAmount("10.5"), "10.50");
	assert.equal(hasAtMostTwoDecimals("10.55"), true);
	assert.equal(hasAtMostTwoDecimals("10.555"), false);
	assert.throws(() => formatXPaymentsAmount(0), /positive number/);
	assert.throws(() => formatXPaymentsAmount("invalid"), /positive number/);
});

test("provider settlement amount accepts safe positive cents without applying create limits", () => {
	assert.equal(normalizeXPaymentsProviderAmount("4000.00"), 4000);
	assert.equal(normalizeXPaymentsProviderAmount("100000.01"), 100000.01);
	assert.throws(() => normalizeXPaymentsProviderAmount(0), /provider amount/i);
	assert.throws(() => normalizeXPaymentsProviderAmount(-1), /provider amount/i);
	assert.throws(
		() => normalizeXPaymentsProviderAmount("10.001"),
		/provider amount/i,
	);
	assert.throws(
		() => normalizeXPaymentsProviderAmount(Number.MAX_SAFE_INTEGER),
		/provider amount/i,
	);
});

test("deposit SHA256 uses tx + user + amount(2dp) + secret", () => {
	assert.equal(
		generateXPaymentsDepositHash(TEST_VECTOR),
		"4bca52d97042a8c8c3fc9e396d4a9cf682bb33050a1e5b0888cd4141c1889481",
	);
});

test("withdraw SHA256 uses normalized IBAN before the two-decimal amount", () => {
	assert.equal(
		generateXPaymentsWithdrawHash({
			...TEST_VECTOR,
			iban: "tr33 0006 1005 1978 6457 8413 26",
		}),
		"95bfcac9ef0527269972d0b9153adc6db20f27efa6ea4ce9e8189fb31b9fe8f5",
	);
});

test("cancel SHA256 uses only transaction ID and secret", () => {
	assert.equal(
		generateXPaymentsCancelHash(TEST_VECTOR),
		"416ae4f6d80c0c5fcc0ff1f7554d505cb5c9d6ef51dfe0cf80762624facf10ed",
	);
});

test("callback SHA256 preserves the provider's raw amount string", () => {
	const receivedHash =
		"17cebd3c25d0ba2286c1dc4a36dcc14400b98fb052aba5dc9fc2c782485fc9cd";
	assert.equal(
		generateXPaymentsCallbackHash({
			...TEST_VECTOR,
			amount: "250.00",
			status: true,
		}),
		receivedHash,
	);
	assert.equal(
		verifyXPaymentsCallbackHash({
			...TEST_VECTOR,
			amount: "250.00",
			status: true,
			receivedHash,
		}),
		true,
	);
	assert.equal(
		verifyXPaymentsCallbackHash({
			...TEST_VECTOR,
			amount: 250,
			status: true,
			receivedHash,
		}),
		false,
	);
	assert.equal(
		generateXPaymentsCallbackHash({
			...TEST_VECTOR,
			amount: "250.00",
			status: false,
		}),
		"5c3b388561ff088a6845385898cbcd858e4b8e9e97a3010df2cccec7e5366555",
	);
});

test("XPayment provider statuses map to non-regressing local states", () => {
	for (const status of ["starting", "waiting", "approved"]) {
		assert.equal(mapXPaymentsStatus(status), "processing");
	}
	assert.equal(mapXPaymentsStatus("success"), "approved");
	assert.equal(mapXPaymentsStatus("reject"), "rejected");
	assert.equal(mapXPaymentsStatus("cancelled"), "cancelled");
	assert.equal(mapXPaymentsStatus("leave_page"), "cancelled");
	assert.equal(mapXPaymentsStatus("unknown"), null);
});

test("Turkish IBAN normalization and TR26 validation follow the PDF", () => {
	assert.equal(
		normalizeTurkishIban("tr33 0006 1005 1978 6457 8413 26"),
		"TR330006100519786457841326",
	);
	assert.equal(isValidTurkishIban("TR330006100519786457841326"), true);
	assert.equal(isValidTurkishIban("DE330006100519786457841326"), false);
	assert.equal(isValidTurkishIban("TR33000610051978645784132"), false);
});

test("status request is Bearer-only and contains no hash", () => {
	const request = buildXPaymentsStatusRequest({
		transactionId: "MERCHANT-TXN-001",
		apiKey: "api-key",
	});
	assert.equal(request.endpoint, "/v3/status");
	assert.deepEqual(request.data, { transaction_id: "MERCHANT-TXN-001" });
	assert.equal(request.headers.Authorization, "Bearer api-key");
	assert.equal("hash" in request.data, false);
	assert.equal("hash" in request.headers, false);
});

test("only the documented HTTP 400 existing transaction body is reusable", () => {
	const body = {
		status: false,
		message: "Existing transaction found",
		data: { transaction_id: "MERCHANT-TXN-001" },
	};
	assert.equal(isExistingXPaymentsTransactionResponse(400, body), true);
	assert.equal(isExistingXPaymentsTransactionResponse(200, body), false);
	assert.equal(
		isExistingXPaymentsTransactionResponse(400, {
			...body,
			message: "Missing required fields",
		}),
		false,
	);
});

test("only documented hard failures are safe to retry or reject locally", () => {
	for (const status of [400, 401, 403, 404, 422]) {
		assert.equal(isDefinitiveXPaymentsHttpFailure(status), true);
	}
	for (const status of [0, 408, 409, 429, 500, 503]) {
		assert.equal(isDefinitiveXPaymentsHttpFailure(status), false);
	}
});

test("cancel responses distinguish success, idempotency, processing and 409", () => {
	assert.deepEqual(
		classifyXPaymentsCancelResponse(200, {
			status: true,
			message: "Withdrawal request cancelled",
			is_processing: false,
		}),
		{ canApply: true, isProcessing: false, alreadyCancelled: false },
	);
	assert.deepEqual(
		classifyXPaymentsCancelResponse(200, {
			status: true,
			message: "Withdrawal request already cancelled",
			is_processing: false,
		}),
		{ canApply: true, isProcessing: false, alreadyCancelled: true },
	);
	assert.equal(
		classifyXPaymentsCancelResponse(200, {
			status: true,
			is_processing: true,
		}).canApply,
		false,
	);
	assert.deepEqual(
		classifyXPaymentsCancelResponse(409, {
			status: false,
			is_processing: true,
		}),
		{ canApply: false, isProcessing: true, alreadyCancelled: false },
	);
});

test("existing H2H deposit may reuse the provider's different ID and amount", () => {
	assert.equal(
		getXPaymentsDepositResponseMismatch({
			requestedTransactionId: "NEW-TXN",
			requestedAmount: 500,
			providerTransactionId: "EXISTING-TXN",
			providerAmount: 250,
			reusedExisting: true,
		}),
		null,
	);
	assert.equal(
		getXPaymentsDepositResponseMismatch({
			requestedTransactionId: "NEW-TXN",
			requestedAmount: 500,
			providerTransactionId: "OTHER-TXN",
			providerAmount: 500,
			reusedExisting: false,
		}),
		"transaction_id",
	);
	assert.equal(
		getXPaymentsDepositResponseMismatch({
			requestedTransactionId: "NEW-TXN",
			requestedAmount: 500,
			providerTransactionId: "NEW-TXN",
			providerAmount: 250,
			reusedExisting: false,
		}),
		"amount",
	);
});

test("generated merchant transaction IDs identify provider and operation", () => {
	assert.match(
		generateXPaymentsTransactionId("user-1", "deposit"),
		/^XP-DP-user-1-\d+-[0-9a-f]{8}$/,
	);
	assert.match(
		generateXPaymentsTransactionId("user-1", "withdraw"),
		/^XP-WD-user-1-\d+-[0-9a-f]{8}$/,
	);
});
