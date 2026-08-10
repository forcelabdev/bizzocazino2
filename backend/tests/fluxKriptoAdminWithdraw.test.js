const test = require("node:test");
const assert = require("node:assert/strict");

const axiosPath = require.resolve("axios");
const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const settingsPath = require.resolve("../database/models/SiteSettings");
const transactionPath = require.resolve(
	"../database/models/FluxKriptoTransaction",
);
const permissionPath = require.resolve("../middleware/permission");
const walletPath = require.resolve("../utils/wallet");
const routerPath = require.resolve("../routes/admin/fluxKripto");

const mockedPaths = [
	axiosPath,
	mongoosePath,
	userPath,
	settingsPath,
	transactionPath,
	permissionPath,
	walletPath,
	routerPath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

let upstreamError;
let upstreamResponse;
let axiosCalls;
let activeTransaction;
let activeUser;
let balanceUpdates;
let socketEmits;
let updateCalls;

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
	post: async () => {
		axiosCalls += 1;
		if (upstreamError) throw upstreamError;
		return upstreamResponse;
	},
});
installMock(mongoosePath, {
	startSession: async () => ({
		committed: false,
		async withTransaction(work) {
			await work();
			this.committed = true;
		},
		async endSession() {},
	}),
});
installMock(userPath, {
	findById: () => ({
		session: async () => activeUser,
	}),
});
installMock(settingsPath, {
	findOne: async () => ({
		fluxKripto: {
			isActive: true,
			apiUrl: "https://api.fluxkripto.com",
			apiKey: "api-key",
			secretKey: "secret-key",
			methods: { deposit: true, withdraw: true },
			currencies: { trx: true, usdt: true },
		},
	}),
});

const findTransactionQuery = () => ({
	session: async () => activeTransaction,
	then(resolve, reject) {
		return Promise.resolve(activeTransaction).then(resolve, reject);
	},
});

installMock(transactionPath, {
	findById: () => findTransactionQuery(),
	findOneAndUpdate: async (filter, update) => {
		if (
			filter.status === "pending" &&
			(!activeTransaction.balanceDebitedAt ||
				activeTransaction.balanceRefundedAt)
		) {
			return null;
		}
		Object.assign(activeTransaction, update.$set || {});
		return activeTransaction;
	},
	findByIdAndUpdate: async () => activeTransaction,
	updateOne: async (filter, update) => {
		updateCalls.push({ filter, update });
		Object.assign(activeTransaction, update.$set || {});
		return { acknowledged: true, modifiedCount: 1 };
	},
});
installMock(permissionPath, {
	checkPermission: () => (req, res, next) => next(),
});
installMock(walletPath, {
	emitUserBalance: () => {
		socketEmits += 1;
	},
	updateUserBalance: async (user, amount, options) => {
		assert.equal(options.emitSocket, false);
		assert.ok(options.session);
		user.wallets[0].balance += amount;
		balanceUpdates.push(amount);
		return user.wallets[0].balance;
	},
});
delete require.cache[routerPath];

const router = require(routerPath);
const approveHandler = router.stack.find(
	(layer) =>
		layer.route?.path === "/withdraw/:id/approve" &&
		layer.route.methods.post,
)?.route.stack.at(-1)?.handle;
const rejectHandler = router.stack.find(
	(layer) =>
		layer.route?.path === "/withdraw/:id/reject" &&
		layer.route.methods.post,
)?.route.stack.at(-1)?.handle;

assert.equal(typeof approveHandler, "function");
assert.equal(typeof rejectHandler, "function");

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
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

test.beforeEach(() => {
	activeUser = {
		_id: "user-1",
		wallets: [{ balance: 4000 }],
	};
	activeTransaction = {
		_id: "flux-withdraw-1",
		user: activeUser._id,
		externalTransactionId: "FLUX-WD-1",
		providerUserId: "provider-user-1",
		type: "withdraw",
		amount: 1000,
		currency: "USDT",
		receiverWallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
		status: "pending",
		providerStatus: "",
		balanceDebitedAt: new Date(),
		balanceRefundedAt: null,
		metadata: { username: "test-user", fullname: "Test User" },
		async save({ session } = {}) {
			assert.ok(session);
			return this;
		},
	};
	axiosCalls = 0;
	balanceUpdates = [];
	socketEmits = 0;
	updateCalls = [];
	upstreamError = null;
	upstreamResponse = null;
});

test("successful FluxKripto admin approve submits without a second balance movement", async () => {
	upstreamResponse = {
		data: {
			status: true,
			data: {
				transaction_id: activeTransaction.externalTransactionId,
				finance_id: 101,
				receiver_wallet: activeTransaction.receiverWallet,
				currency: activeTransaction.currency,
				amount: "10.00",
				amountTRY: "1000.00",
				rate: "100.00",
				status: "waiting",
			},
		},
	};
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 200);
	assert.equal(response.payload.success, true);
	assert.deepEqual(balanceUpdates, []);
	assert.equal(activeUser.wallets[0].balance, 4000);
	assert.ok(activeTransaction.balanceDebitedAt instanceof Date);
	assert.equal(activeTransaction.balanceRefundedAt, null);
	assert.equal(activeTransaction.status, "processing");
	assert.equal(socketEmits, 0);
});

test("definitive FluxKripto submission rejection finalizes and refunds once", async () => {
	upstreamError = Object.assign(new Error("Request failed with status code 400"), {
		response: {
			status: 400,
			data: { status: false, error: "Invalid hash" },
		},
	});
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 400);
	assert.equal(activeTransaction.status, "rejected");
	assert.equal(activeTransaction.providerStatus, "submission_rejected");
	assert.deepEqual(balanceUpdates, [1000]);
	assert.equal(activeUser.wallets[0].balance, 5000);
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);
	assert.equal(socketEmits, 1);
});

test("explicit FluxKripto status false finalizes and refunds once", async () => {
	upstreamResponse = {
		data: { status: false, error: "Provider rejected" },
	};
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 400);
	assert.equal(activeTransaction.status, "rejected");
	assert.equal(activeTransaction.providerStatus, "submission_rejected");
	assert.deepEqual(balanceUpdates, [1000]);
	assert.equal(activeUser.wallets[0].balance, 5000);
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);
	assert.equal(socketEmits, 1);
});

test("ambiguous FluxKripto submission failure keeps the balance reserved", async () => {
	upstreamError = Object.assign(new Error("Request failed with status code 503"), {
		response: {
			status: 503,
			data: { status: false, error: "Temporary unavailable" },
		},
	});
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 502);
	assert.equal(activeTransaction.status, "processing");
	assert.equal(activeTransaction.providerStatus, "submission_unknown");
	assert.deepEqual(balanceUpdates, []);
	assert.equal(activeUser.wallets[0].balance, 4000);
	assert.equal(activeTransaction.balanceRefundedAt, null);
	assert.equal(socketEmits, 0);
});

test("FluxKripto approve rejects a pending withdraw without reservation", async () => {
	activeTransaction.balanceDebitedAt = null;
	upstreamError = new Error("upstream must not be called");
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.code, "WITHDRAW_BALANCE_NOT_RESERVED");
	assert.equal(axiosCalls, 0);
	assert.deepEqual(balanceUpdates, []);
});

test("FluxKripto admin reject refunds the reserved balance only once", async () => {
	const firstResponse = createResponse();
	await rejectHandler(
		{
			params: { id: activeTransaction._id },
			body: { reason: "Admin reddi" },
		},
		firstResponse,
	);

	assert.equal(firstResponse.statusCode, 200);
	assert.equal(activeTransaction.status, "rejected");
	assert.deepEqual(balanceUpdates, [1000]);
	assert.equal(activeUser.wallets[0].balance, 5000);
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);
	assert.equal(socketEmits, 1);

	const secondResponse = createResponse();
	await rejectHandler(
		{
			params: { id: activeTransaction._id },
			body: { reason: "Tekrar red" },
		},
		secondResponse,
	);

	assert.notEqual(secondResponse.statusCode, 200);
	assert.deepEqual(balanceUpdates, [1000]);
	assert.equal(activeUser.wallets[0].balance, 5000);
	assert.equal(socketEmits, 1);
});

test("FluxKripto admin reject refuses to refund an unreserved withdrawal", async () => {
	activeTransaction.balanceDebitedAt = null;
	const response = createResponse();

	await rejectHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.code, "WITHDRAW_BALANCE_NOT_RESERVED");
	assert.deepEqual(balanceUpdates, []);
	assert.equal(activeUser.wallets[0].balance, 4000);
	assert.equal(socketEmits, 0);
});
