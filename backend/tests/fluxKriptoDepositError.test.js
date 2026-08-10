const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const axiosPath = require.resolve("axios");
const userPath = require.resolve("../database/models/User");
const siteSettingsPath = require.resolve("../database/models/SiteSettings");
const transactionModelPath = require.resolve(
	"../database/models/FluxKriptoTransaction",
);
const authPath = require.resolve("../middleware/auth");
const walletPath = require.resolve("../utils/wallet");
const routerPath = require.resolve("../routes/payment/fluxKripto");

const mockedPaths = [
	axiosPath,
	userPath,
	siteSettingsPath,
	transactionModelPath,
	authPath,
	walletPath,
	routerPath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

const API_KEY = "flux-api-key-that-must-not-leak";
const SECRET_KEY = "flux-secret-key-that-must-not-leak";
const CLOUDFLARE_HTML =
	"<!doctype html><html><title>Attention Required</title>" +
	"<body>Sorry, you have been blocked by Cloudflare.</body></html>";
const CF_RAY = "8f1234567890abcd-IST";
const API_URL = "https://api.fluxkripto.com/";
const SITE_URL = "https://merchant.example/payments";

let upstreamPostCount = 0;
let axiosOptions = null;
let createdTransaction = null;
let siteSettingsFailure = null;
const transactionUpdates = [];

const installMock = (modulePath, exports) => {
	require.cache[modulePath] = {
		id: modulePath,
		filename: modulePath,
		loaded: true,
		exports,
		children: [],
		paths: [],
	};
};

installMock(axiosPath, {
	create: (options) => {
		axiosOptions = options;
		return {
			post: async () => {
				upstreamPostCount += 1;
				const error = new Error("Request failed with status code 403");
				error.response = {
					status: 403,
					headers: {
						"content-type": "text/html; charset=UTF-8",
						server: "cloudflare",
						"cf-ray": CF_RAY,
					},
					data: CLOUDFLARE_HTML,
				};
				throw error;
			},
		};
	},
});
installMock(userPath, {
	findById: async () => ({
		_id: {
			toString: () => "user-1",
		},
		numericId: 12345,
		username: "test-user",
		name: "Test User",
		wallets: [{ balance: 250 }],
	}),
});
installMock(siteSettingsPath, {
	findOne: async () => {
		if (siteSettingsFailure) throw siteSettingsFailure;
		return {
			fluxKripto: {
				isActive: true,
				minAmount: 100,
				maxAmount: 100000,
				apiUrl: API_URL,
				siteUrl: SITE_URL,
				apiKey: API_KEY,
				secretKey: SECRET_KEY,
				methods: { deposit: true, withdraw: true },
				currencies: { trx: true, usdt: true },
			},
		};
	},
});
installMock(transactionModelPath, {
	create: async (values) => {
		createdTransaction = { _id: "local-flux-deposit-1", ...values };
		return createdTransaction;
	},
	updateOne: async (filter, update) => {
		transactionUpdates.push({ filter, update });
		return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
	},
});
installMock(authPath, {
	authorizeUser: () => (req, res, next) => next(),
});
installMock(walletPath, {
	emitUserBalance: () => {},
	getActiveWallet: (user) => user.wallets[0],
	getActiveWalletIndex: () => 0,
	updateUserBalance: async () => false,
});
delete require.cache[routerPath];

const router = require(routerPath);
const depositHandler = router.stack.find(
	(layer) => layer.route?.path === "/deposit" && layer.route.methods.post,
)?.route.stack.at(-1)?.handle;

assert.equal(typeof depositHandler, "function", "deposit route handler bulunamadı");

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
});

const invokeDeposit = async () => {
	const response = {
		statusCode: 200,
		payload: null,
		status(statusCode) {
			this.statusCode = statusCode;
			return this;
		},
		json(payload) {
			this.payload = payload;
			return this;
		},
	};

	await depositHandler(
		{
			body: { amount: 500, currency: "USDT" },
			user: { _id: "user-1" },
		},
		response,
	);
	return response;
};

test("Cloudflare HTML 403 is sanitized, non-retryable, and persisted as access blocked", async () => {
	const originalConsoleError = console.error;
	const errorLogs = [];
	console.error = (...values) => errorLogs.push(values);

	let response;
	try {
		response = await invokeDeposit();
	} finally {
		console.error = originalConsoleError;
	}

	assert.equal(upstreamPostCount, 1);
	assert.equal(axiosOptions.baseURL, "https://api.fluxkripto.com");
	assert.equal(response.statusCode, 502);
	assert.deepEqual(response.payload, {
		success: false,
		error: "FluxKripto şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
		code: "FLUX_UPSTREAM_ACCESS_BLOCKED",
		retryable: false,
	});

	assert.equal(createdTransaction.status, "pending");
	assert.equal(transactionUpdates.length, 1);
	const persisted = transactionUpdates[0].update.$set;
	assert.equal(persisted.status, "failed");
	assert.equal(persisted.providerStatus, "access_blocked");
	assert.deepEqual(persisted.upstreamDiagnostic, {
		code: "FLUX_UPSTREAM_ACCESS_BLOCKED",
		status: 403,
		cfRay: CF_RAY,
		contentType: "text/html; charset=UTF-8",
		server: "cloudflare",
		apiHost: "api.fluxkripto.com",
		siteHost: "merchant.example",
		apiKeyFingerprint: crypto
			.createHash("sha256")
			.update(API_KEY, "utf8")
			.digest("hex")
			.slice(0, 12),
		proxyConfigured: Boolean(
			process.env.HTTPS_PROXY ||
				process.env.HTTP_PROXY ||
				process.env.ALL_PROXY,
		),
	});
	assert.deepEqual(Object.keys(persisted.upstreamDiagnostic).sort(), [
		"apiHost",
		"apiKeyFingerprint",
		"cfRay",
		"code",
		"contentType",
		"proxyConfigured",
		"server",
		"siteHost",
		"status",
	]);

	const externallyVisible = JSON.stringify(response.payload);
	const persistedData = JSON.stringify(persisted);
	const loggedData = JSON.stringify(errorLogs);
	assert.equal(loggedData.includes("FluxKripto deposit upstream hatası"), true);
	assert.equal(loggedData.includes(CF_RAY), true);
	assert.equal(
		loggedData.includes(persisted.upstreamDiagnostic.apiKeyFingerprint),
		true,
	);
	for (const sensitiveValue of [API_KEY, SECRET_KEY, CLOUDFLARE_HTML]) {
		assert.equal(externallyVisible.includes(sensitiveValue), false);
		assert.equal(persistedData.includes(sensitiveValue), false);
		assert.equal(loggedData.includes(sensitiveValue), false);
	}
	assert.equal("providerResponse" in persisted, false);
});

test("internal runtime error codes are not exposed as public Flux error codes", async () => {
	const originalConsoleError = console.error;
	console.error = () => {};
	siteSettingsFailure = Object.assign(new Error("database connection failed"), {
		code: "ECONNRESET",
	});

	let response;
	try {
		response = await invokeDeposit();
	} finally {
		siteSettingsFailure = null;
		console.error = originalConsoleError;
	}

	assert.equal(response.statusCode, 500);
	assert.deepEqual(response.payload, {
		success: false,
		error: "FluxKripto yatırım işlemi başlatılamadı.",
	});
});
