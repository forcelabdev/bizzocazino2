const test = require("node:test");
const assert = require("node:assert/strict");

const {
	createFluxHeaders,
	formatTryAmount,
	generateFluxCallbackHash,
	generateFluxDepositHash,
	generateFluxWithdrawHash,
	getFluxCredentialFingerprint,
	getFluxUpstreamErrorDetails,
	isSupportedFluxCurrency,
	isDefinitiveFluxDepositFailure,
	isValidTronAddress,
	mergeFluxSettings,
	normalizeCallbackStatus,
	normalizeFluxCurrency,
	normalizeFluxNativeDepositData,
	normalizeFluxProviderTryAmount,
	normalizeFluxWithdrawData,
	verifyFluxCallbackHash,
} = require("../utils/fluxKripto");

test("Cloudflare HTML 403 cevabını upstream erişim engeli olarak sınıflandırır", () => {
	const details = getFluxUpstreamErrorDetails({
		response: {
			status: 403,
			headers: {
				server: "cloudflare",
				"content-type": "text/html; charset=UTF-8",
				"cf-ray": "9abcdef01234-IST",
			},
			data: "<!doctype html><title>Attention Required</title><p>Sorry, you have been blocked</p>",
		},
	});

	assert.deepEqual(details, {
		code: "FLUX_UPSTREAM_ACCESS_BLOCKED",
		status: 403,
		retryable: false,
		requestId: "9abcdef01234-IST",
		server: "cloudflare",
		contentType: "text/html; charset=UTF-8",
		responseType: "html",
		providerMessage: "",
	});
});

test("Flux JSON yetki hatasını HTML gövdesini sızdırmadan ayırır", () => {
	const details = getFluxUpstreamErrorDetails({
		response: {
			status: 401,
			headers: { "content-type": "application/json" },
			data: { error: "Invalid API key", secret: "must-not-leak" },
		},
	});

	assert.equal(details.code, "FLUX_UPSTREAM_UNAUTHORIZED");
	assert.equal(details.retryable, false);
	assert.equal(details.providerMessage, "Invalid API key");
	assert.equal(JSON.stringify(details).includes("must-not-leak"), false);
});

test("Cloudflare arkasındaki origin JSON 403 cevabını WAF block saymaz", () => {
	const details = getFluxUpstreamErrorDetails({
		response: {
			status: 403,
			headers: {
				server: "cloudflare",
				"content-type": "application/json",
				"cf-ray": "9abcdef01234-IST",
			},
			data: { error: "Forbidden" },
		},
	});

	assert.equal(details.code, "FLUX_UPSTREAM_FORBIDDEN");
	assert.equal(details.responseType, "json");
	assert.equal(details.providerMessage, "Forbidden");
});

test("API key tanısı için anahtarın kendisini değil kararlı fingerprintini üretir", () => {
	const fingerprint = getFluxCredentialFingerprint(" test-key ");

	assert.equal(fingerprint, "62af8704764f");
	assert.equal(fingerprint.includes("test-key"), false);
	assert.equal(getFluxCredentialFingerprint(""), "");
});

test("TRY tutarını hash sözleşmesine göre iki ondalık formatlar", () => {
	assert.equal(formatTryAmount(1000), "1000.00");
	assert.equal(formatTryAmount("12.5"), "12.50");
	assert.throws(() => formatTryAmount("not-a-number"), /Geçersiz TRY tutarı/);
});

test("FluxKripto provider TRY tutari positive, two-decimal and safe olmalidir", () => {
	assert.equal(normalizeFluxProviderTryAmount(1000), 1000);
	assert.equal(normalizeFluxProviderTryAmount("12.50"), 12.5);
	assert.throws(() => normalizeFluxProviderTryAmount("1000.001"), /provider amount/);
	assert.throws(() => normalizeFluxProviderTryAmount(0), /provider amount/);
	assert.throws(() => normalizeFluxProviderTryAmount(Number.MAX_SAFE_INTEGER), /provider amount/);
});

test("native deposit hash alan sırasını sabit tutar", () => {
	assert.equal(
		generateFluxDepositHash({
			transactionId: "TX-1",
			userId: "USER-1",
			amount: 1000,
			currency: "usdt",
			secretKey: "secret",
		}),
		"a82113d120f471dfef9260163df8042dc8aceb3446132580bb902805654efbf2",
	);
});

test("withdraw hash currency ve receiver wallet sırasını sabit tutar", () => {
	assert.equal(
		generateFluxWithdrawHash({
			transactionId: "WD-1",
			userId: "USER-1",
			currency: "USDT",
			amount: "500",
			receiverWallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
			secretKey: "secret",
		}),
		"80bc7a8a04e2848c37c135049770c3149c67dfb0af52bb282127f2e5a3f9f3b7",
	);
});

test("callback hash ham amountTRY değerini ve boolean stringini kullanır", () => {
	const hash = generateFluxCallbackHash({
		transactionId: "TX-1",
		userId: "USER-1",
		rawAmount: "1000.00",
		status: true,
		secretKey: "secret",
	});

	assert.equal(
		hash,
		"cb101b5a599b74b232435138fc4e750470b4798ad31479c0d2469609fd61fd7c",
	);
	assert.equal(
		verifyFluxCallbackHash({
			transactionId: "TX-1",
			userId: "USER-1",
			rawAmount: "1000.00",
			status: "true",
			secretKey: "secret",
			receivedHash: hash.toUpperCase(),
		}),
		true,
	);
	assert.equal(
		verifyFluxCallbackHash({
			transactionId: "TX-1",
			userId: "USER-1",
			rawAmount: "1000.00",
			status: true,
			secretKey: "secret",
			receivedHash: `${hash.slice(0, -1)}0`,
		}),
		false,
	);
});

test("callback status yalnız gerçek boolean temsillerini kabul eder", () => {
	assert.equal(normalizeCallbackStatus(true), true);
	assert.equal(normalizeCallbackStatus("false"), false);
	assert.equal(normalizeCallbackStatus(1), null);
	assert.equal(normalizeCallbackStatus("approved"), null);
});

test("yalnız TRX ve USDT para birimlerini normalize eder", () => {
	assert.equal(normalizeFluxCurrency(" usdt "), "USDT");
	assert.equal(isSupportedFluxCurrency("trx"), true);
	assert.equal(isSupportedFluxCurrency("BTC"), false);
});

test("yalnız kesin Flux deposit redlerini final hata sayar", () => {
	assert.equal(isDefinitiveFluxDepositFailure(400, {}), true);
	assert.equal(
		isDefinitiveFluxDepositFailure(503, {
			error: "No available wallets",
		}),
		true,
	);
	assert.equal(
		isDefinitiveFluxDepositFailure(500, {
			message: "Exchange rate fetch failed",
		}),
		true,
	);
	assert.equal(isDefinitiveFluxDepositFailure(503, { error: "Timeout" }), false);
	assert.equal(isDefinitiveFluxDepositFailure(429, {}), false);
});

test("TRON Base58Check adresini checksum ile doğrular", () => {
	assert.equal(
		isValidTronAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"),
		true,
	);
	assert.equal(
		isValidTronAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u"),
		false,
	);
	assert.equal(isValidTronAddress("not-a-wallet"), false);
});

test("native deposit provider alanlarını normalize edip eksik sözleşmeyi reddeder", () => {
	const normalized = normalizeFluxNativeDepositData({
		order_id: 42,
		finance_id: 99,
		transaction_id: "TX-1",
		wallet_address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
		currency: "USDT",
		amount: "12.50",
		amountTRY: "500.00",
		rate: "40.25",
		expires_at: "2026-07-10T12:30:00.000Z",
	}, {
		transactionId: "TX-1",
		amount: 500,
		currency: "USDT",
	});
	assert.equal(normalized.orderId, "42");
	assert.equal(normalized.financeId, "99");
	assert.equal(normalized.providerAmount, 500);
	assert.equal(normalized.cryptoAmount, 12.5);
	assert.equal(normalized.rate, 40.25);
	assert.equal(normalized.expiresAt.toISOString(), "2026-07-10T12:30:00.000Z");

	assert.throws(
		() =>
			normalizeFluxNativeDepositData({
				order_id: 42,
				finance_id: 99,
				transaction_id: "TX-1",
				wallet_address: "invalid",
				currency: "USDT",
				amount: 1,
				amountTRY: 500,
				rate: 1,
				expires_at: "2026-07-10T12:30:00.000Z",
			}, {
				transactionId: "TX-1",
				amount: 500,
				currency: "USDT",
			}),
		/TRON cüzdanı/,
	);
	assert.throws(
		() =>
			normalizeFluxNativeDepositData({
				order_id: 42,
				finance_id: 99,
				transaction_id: "TX-1",
				wallet_address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
				currency: "USDT",
				amount: 0,
				amountTRY: 500,
				rate: 1,
				expires_at: "2026-07-10T12:30:00.000Z",
			}, {
				transactionId: "TX-1",
				amount: 500,
				currency: "USDT",
			}),
		/kripto miktarı/,
	);
});

test("withdraw provider cevabını merchant işlemiyle birebir eşleştirir", () => {
	const data = {
		transaction_id: "WD-1",
		finance_id: 101,
		receiver_wallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
		currency: "USDT",
		amount: "5.00",
		amountTRY: "500.00",
		rate: "100.00",
		status: "pending",
	};
	const expected = {
		transactionId: "WD-1",
		amount: 500,
		currency: "USDT",
		receiverWallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
	};
	assert.deepEqual(normalizeFluxWithdrawData(data, expected), {
		financeId: "101",
		cryptoAmount: 5,
		rate: 100,
		providerStatus: "pending",
	});
	assert.throws(
		() =>
			normalizeFluxWithdrawData(
				{ ...data, transaction_id: "OTHER" },
				expected,
			),
		/işlem kimliği/,
	);
	assert.throws(
		() => normalizeFluxWithdrawData({ ...data, amountTRY: 501 }, expected),
		/TRY tutarı/,
	);
});

test("settings merge nested varsayılanları korur ve currency TRY kalır", () => {
	const settings = mergeFluxSettings({
		currency: "USD",
		methods: { deposit: false },
		currencies: { usdt: false },
	});

	assert.equal(settings.currency, "TRY");
	assert.deepEqual(settings.methods, { deposit: false, withdraw: true });
	assert.deepEqual(settings.currencies, { trx: true, usdt: false });
	assert.equal(settings.apiUrl, "https://api.fluxkripto.com");
});

test("Bearer header Flux API keyini kullanır", () => {
	assert.deepEqual(createFluxHeaders(" test-key "), {
		Authorization: "Bearer test-key",
		Accept: "application/json",
		"Content-Type": "application/json",
	});
});
