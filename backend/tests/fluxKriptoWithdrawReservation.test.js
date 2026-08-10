const test = require("node:test");
const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const settingsPath = require.resolve("../database/models/SiteSettings");
const transactionPath = require.resolve(
	"../database/models/FluxKriptoTransaction",
);
const authPath = require.resolve("../middleware/auth");
const walletPath = require.resolve("../utils/wallet");
const routerPath = require.resolve("../routes/payment/fluxKripto");

const mockedPaths = [
	mongoosePath,
	userPath,
	settingsPath,
	transactionPath,
	authPath,
	walletPath,
	routerPath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

let activeUser;
let activeSession;
let createdTransactions;
let socketEmits;

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

installMock(mongoosePath, {
	startSession: async () => {
		activeSession = {
			committed: false,
			async withTransaction(work) {
				await work();
				this.committed = true;
			},
			async endSession() {},
		};
		return activeSession;
	},
});
installMock(userPath, {
	findById: () => ({
		session: async () => activeUser,
	}),
	findOneAndUpdate: async (filter, update, options) => {
		assert.equal(options.session, activeSession);
		const amount = -Number(update.$inc["wallets.0.balance"]);
		if (activeUser.wallets[0].balance < amount) return null;
		activeUser.wallets[0].balance -= amount;
		return activeUser;
	},
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
			minAmount: 100,
			maxAmount: 100000,
		},
	}),
});
installMock(transactionPath, {
	create: async (values, options) => {
		assert.equal(options.session, activeSession);
		const transaction = {
			_id: "flux-withdraw-local-1",
			createdAt: new Date(),
			updatedAt: new Date(),
			...values[0],
		};
		createdTransactions.push(transaction);
		return [transaction];
	},
});
installMock(authPath, {
	authorizeUser: () => (req, res, next) => next(),
});
installMock(walletPath, {
	emitUserBalance: (io, user) => {
		assert.equal(io, null);
		assert.equal(user, activeUser);
		assert.equal(activeSession.committed, true);
		socketEmits += 1;
	},
	getActiveWallet: (user) => user.wallets[0],
	getActiveWalletIndex: () => 0,
	updateUserBalance: async () => false,
});
delete require.cache[routerPath];

const router = require(routerPath);
const withdrawHandler = router.stack.find(
	(layer) => layer.route?.path === "/withdraw" && layer.route.methods.post,
)?.route.stack.at(-1)?.handle;

assert.equal(typeof withdrawHandler, "function");

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

const invokeWithdraw = async () => {
	const response = createResponse();
	await withdrawHandler(
		{
			user: { _id: activeUser._id },
			body: {
				amount: 1000,
				currency: "USDT",
				receiverWallet: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
			},
		},
		response,
	);
	return response;
};

test.beforeEach(() => {
	activeUser = {
		_id: {
			toString: () => "user-1",
		},
		numericId: 12345,
		username: "test-user",
		name: "Test User",
		wallets: [{ balance: 5000 }],
	};
	activeSession = null;
	createdTransactions = [];
	socketEmits = 0;
});

test("FluxKripto withdraw reserves balance when the user creates the request", async () => {
	const response = await invokeWithdraw();

	assert.equal(response.statusCode, 200);
	assert.equal(response.payload.success, true);
	assert.equal(activeUser.wallets[0].balance, 4000);
	assert.equal(createdTransactions.length, 1);
	assert.equal(createdTransactions[0].status, "pending");
	assert.equal(createdTransactions[0].oldBalance, 5000);
	assert.equal(createdTransactions[0].newBalance, 4000);
	assert.ok(createdTransactions[0].balanceDebitedAt instanceof Date);
	assert.equal(socketEmits, 1);
});

test("FluxKripto insufficient balance creates no withdraw and no balance movement", async () => {
	activeUser.wallets[0].balance = 500;
	const response = await invokeWithdraw();

	assert.equal(response.statusCode, 400);
	assert.equal(response.payload.success, false);
	assert.equal(activeUser.wallets[0].balance, 500);
	assert.equal(createdTransactions.length, 0);
	assert.equal(socketEmits, 0);
});
