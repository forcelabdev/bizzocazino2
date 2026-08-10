const test = require("node:test");
const assert = require("node:assert/strict");

const axiosPath = require.resolve("axios");
const userPath = require.resolve("../database/models/User");
const transactionModelPath = require.resolve(
	"../database/models/XPaymentTransaction",
);
const authPath = require.resolve("../middleware/auth");
const walletPath = require.resolve("../utils/wallet");
const servicePath = require.resolve("../services/xPaymentsService");
const routerPath = require.resolve("../routes/payment/xPayments");

const mockedPaths = [
	axiosPath,
	userPath,
	transactionModelPath,
	authPath,
	walletPath,
	servicePath,
	routerPath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

const SECRET_KEY = "xpayments-callback-secret";
let activeTransaction;
let statusResponse;
let applyCalls;

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
	create: () => ({ post: async () => ({ data: {} }) }),
	post: async () => ({ data: statusResponse }),
});
installMock(userPath, {
	findById: async () => null,
});
installMock(transactionModelPath, {
	findOne: async ({ externalTransactionId }) =>
		activeTransaction?.externalTransactionId === externalTransactionId
			? activeTransaction
			: null,
	findById: async (id) =>
		String(activeTransaction?._id) === String(id) ? activeTransaction : null,
});
installMock(authPath, {
	authorizeUser: () => (req, res, next) => next(),
});
installMock(walletPath, {
	getActiveWallet: () => ({ balance: 0 }),
});

class XPaymentsServiceError extends Error {
	constructor(message, statusCode = 400, code = "XPAYMENTS_ERROR") {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

installMock(servicePath, {
	XPaymentsServiceError,
	applyXPaymentsStatus: async (transactionId, providerStatus, payload, options) => {
		applyCalls.push({ transactionId, providerStatus, payload, options });
		activeTransaction.amount = options.providerAmount;
		activeTransaction.providerAmount = options.providerAmount;
		activeTransaction.status =
			options.normalizedStatus ||
			(providerStatus === "success" ? "approved" : "processing");
		activeTransaction.providerStatus = providerStatus;
		return { transaction: activeTransaction, alreadyFinal: false };
	},
	createPendingXPaymentsWithdraw: async () => null,
	getXPaymentsSettings: async () => ({
		apiUrl: "https://api.xpaymentsystems.com",
		apiKey: "api-key",
		secretKey: SECRET_KEY,
		methods: { deposit: true, withdraw: true },
	}),
});
delete require.cache[routerPath];

const router = require(routerPath);
const { generateXPaymentsCallbackHash } = require("../utils/xPayments");
const callbackHandler = router.stack.find(
	(layer) => layer.route?.path === "/callback" && layer.route.methods.post,
)?.route.stack.at(-1)?.handle;
const statusHandler = router.stack.find(
	(layer) => layer.route?.path === "/status/:id" && layer.route.methods.get,
)?.route.stack.at(-1)?.handle;

assert.equal(typeof callbackHandler, "function");
assert.equal(typeof statusHandler, "function");

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
});

const createTransaction = (values = {}) => ({
	_id: "local-xp-1",
	user: "user-1",
	externalTransactionId: "XP-DP-1",
	providerUserId: "provider-user-1",
	type: "deposit",
	amount: 1000,
	requestedAmount: 1000,
	providerAmount: null,
	currency: "TRY",
	status: "processing",
	providerStatus: "waiting",
	isProcessing: false,
	financeId: "77",
	account: {},
	createdAt: new Date("2026-07-10T12:00:00.000Z"),
	updatedAt: new Date("2026-07-10T12:00:00.000Z"),
	...values,
});

const createResponse = () => ({
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
});

const createCallbackBody = ({
	amount = "4000.00",
	status = true,
	type = "deposit",
} = {}) => ({
	status,
	message: status ? "Transaction approved." : "Transaction rejected.",
	data: {
		transaction_type: type,
		transaction_id: activeTransaction.externalTransactionId,
		finance_id: Number(activeTransaction.financeId),
		user_id: activeTransaction.providerUserId,
		amount,
		hash: generateXPaymentsCallbackHash({
			transactionId: activeTransaction.externalTransactionId,
			userId: activeTransaction.providerUserId,
			amount,
			status,
			secretKey: SECRET_KEY,
		}),
	},
});

test.beforeEach(() => {
	activeTransaction = createTransaction();
	statusResponse = null;
	applyCalls = [];
});

test("signed deposit callback settles the provider amount instead of returning 409", async () => {
	const response = createResponse();
	await callbackHandler(
		{ body: createCallbackBody({ amount: "4000.00" }) },
		response,
	);

	assert.equal(response.statusCode, 200);
	assert.equal(response.payload.success, true);
	assert.equal(applyCalls.length, 1);
	assert.equal(applyCalls[0].options.providerAmount, 4000);
	assert.equal(applyCalls[0].options.amountSource, "callback");
});

test("withdraw callback still requires the original local amount", async () => {
	activeTransaction = createTransaction({
		type: "withdraw",
		externalTransactionId: "XP-WD-1",
	});
	const response = createResponse();
	await callbackHandler(
		{
			body: createCallbackBody({
				amount: "4000.00",
				type: "withdraw",
			}),
		},
		response,
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.success, false);
	assert.equal(applyCalls.length, 0);
});

test("signed callback still rejects a provider amount with more than two decimals", async () => {
	const response = createResponse();
	await callbackHandler(
		{ body: createCallbackBody({ amount: "4000.001" }) },
		response,
	);

	assert.equal(response.statusCode, 400);
	assert.equal(response.payload.success, false);
	assert.equal(applyCalls.length, 0);
});

test("status reconciliation uses the provider amount and returns all amount fields", async () => {
	statusResponse = {
		status: true,
		data: {
			transaction_id: activeTransaction.externalTransactionId,
			amount: "4000.00",
			status: "success",
		},
	};
	const response = createResponse();
	await statusHandler(
		{
			params: { id: activeTransaction._id },
			user: { _id: activeTransaction.user },
		},
		response,
	);

	assert.equal(response.statusCode, 200);
	assert.equal(applyCalls.length, 1);
	assert.equal(applyCalls[0].options.providerAmount, 4000);
	assert.equal(applyCalls[0].options.amountSource, "status");
	assert.equal(response.payload.data.amount, 4000);
	assert.equal(response.payload.data.requestedAmount, 1000);
	assert.equal(response.payload.data.providerAmount, 4000);
});

test("withdraw status reconciliation still rejects a changed provider amount", async () => {
	activeTransaction = createTransaction({
		type: "withdraw",
		externalTransactionId: "XP-WD-STATUS-1",
	});
	statusResponse = {
		status: true,
		data: {
			transaction_id: activeTransaction.externalTransactionId,
			amount: "4000.00",
			status: "success",
		},
	};
	const response = createResponse();
	await statusHandler(
		{
			params: { id: activeTransaction._id },
			user: { _id: activeTransaction.user },
		},
		response,
	);

	assert.equal(response.statusCode, 502);
	assert.equal(response.payload.success, false);
	assert.equal(applyCalls.length, 0);
});
