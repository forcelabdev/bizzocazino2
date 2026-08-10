const test = require("node:test");
const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const settingsPath = require.resolve("../database/models/SiteSettings");
const transactionPath = require.resolve(
	"../database/models/XPaymentTransaction",
);
const walletPath = require.resolve("../utils/wallet");
const servicePath = require.resolve("../services/xPaymentsService");

const mockedPaths = [
	mongoosePath,
	userPath,
	settingsPath,
	transactionPath,
	walletPath,
	servicePath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

let activeUser;
let createdTransactions;
let balanceUpdates;
let socketEmits;
let activeSession;

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
	updateOne: async () => ({ acknowledged: true }),
});
installMock(settingsPath, {
	findOne: async () => null,
});

class MockXPaymentTransaction {
	constructor(values) {
		Object.assign(this, values);
		this._id = "xp-withdraw-local-1";
		createdTransactions.push(this);
	}

	async save({ session } = {}) {
		assert.equal(session, activeSession);
		return this;
	}
}

MockXPaymentTransaction.findById = () => ({
	session: async () => null,
});
installMock(transactionPath, MockXPaymentTransaction);
installMock(walletPath, {
	emitUserBalance: (io, user) => {
		assert.equal(io, null);
		assert.equal(user, activeUser);
		assert.equal(activeSession.committed, true);
		socketEmits += 1;
	},
	getActiveWallet: (user) => user.wallets[0],
	updateUserBalance: async (user, amount, options) => {
		assert.equal(options.emitSocket, false);
		assert.equal(options.session, activeSession);
		user.wallets[0].balance += amount;
		balanceUpdates.push(amount);
		return user.wallets[0].balance;
	},
});
delete require.cache[servicePath];

const { createPendingXPaymentsWithdraw } = require(servicePath);

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
});

test.beforeEach(() => {
	activeUser = {
		_id: "user-1",
		wallets: [{ balance: 5000 }],
	};
	createdTransactions = [];
	balanceUpdates = [];
	socketEmits = 0;
	activeSession = null;
});

test("XPayment withdraw reserves balance when the user creates the request", async () => {
	const transaction = await createPendingXPaymentsWithdraw({
		userId: activeUser._id,
		providerUserId: "provider-user-1",
		externalTransactionId: "XP-WD-1",
		amount: 1000,
		accountHolder: "Test User",
		iban: "TR330006100519786457841326",
		metadata: {},
	});

	assert.equal(activeUser.wallets[0].balance, 4000);
	assert.deepEqual(balanceUpdates, [-1000]);
	assert.equal(transaction.status, "pending");
	assert.equal(transaction.oldBalance, 5000);
	assert.equal(transaction.newBalance, 4000);
	assert.ok(transaction.balanceDebitedAt instanceof Date);
	assert.equal(transaction.balanceRefundedAt, undefined);
	assert.equal(createdTransactions.length, 1);
	assert.equal(socketEmits, 1);
});

test("XPayment insufficient balance creates no withdraw and no balance movement", async () => {
	activeUser.wallets[0].balance = 500;

	await assert.rejects(
		() =>
			createPendingXPaymentsWithdraw({
				userId: activeUser._id,
				providerUserId: "provider-user-1",
				externalTransactionId: "XP-WD-2",
				amount: 1000,
				accountHolder: "Test User",
				iban: "TR330006100519786457841326",
				metadata: {},
			}),
		(error) => error.code === "INSUFFICIENT_BALANCE",
	);
	assert.equal(activeUser.wallets[0].balance, 500);
	assert.deepEqual(balanceUpdates, []);
	assert.equal(createdTransactions.length, 0);
	assert.equal(socketEmits, 0);
});
