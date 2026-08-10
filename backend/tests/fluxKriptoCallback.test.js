const test = require("node:test");
const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const siteSettingsPath = require.resolve("../database/models/SiteSettings");
const transactionModelPath = require.resolve(
	"../database/models/FluxKriptoTransaction",
);
const authPath = require.resolve("../middleware/auth");
const walletPath = require.resolve("../utils/wallet");
const routerPath = require.resolve("../routes/payment/fluxKripto");

const mockedPaths = [
	mongoosePath,
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

const SECRET_KEY = "flux-callback-secret";
let activeHarness;

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
	startSession: () => activeHarness.startSession(),
});
installMock(userPath, {
	findById: (userId) => ({
		session: (session) => activeHarness.findUser(userId, session),
	}),
	updateOne: (filter, update, options) =>
		activeHarness.updateStats(filter, update, options),
});
installMock(siteSettingsPath, {
	findOne: async () => ({
		fluxKripto: {
			apiKey: "flux-api-key",
			secretKey: SECRET_KEY,
		},
	}),
});
installMock(transactionModelPath, {
	findOne: (filter) => ({
		session: (session) => activeHarness.findTransaction(filter, session),
	}),
});
installMock(authPath, {
	authorizeUser: () => (req, res, next) => next(),
});
installMock(walletPath, {
	emitUserBalance: (io, user) => activeHarness.emitUserBalance(io, user),
	getActiveWallet: (user) => user.wallets[0],
	getActiveWalletIndex: () => 0,
	updateUserBalance: (user, amount, options) =>
		activeHarness.updateUserBalance(user, amount, options),
});
delete require.cache[routerPath];

const router = require(routerPath);
const { generateFluxCallbackHash } = require("../utils/fluxKripto");
const callbackHandler = router.stack.find(
	(layer) => layer.route?.path === "/callback" && layer.route.methods.post,
)?.route.stack.at(-1)?.handle;

assert.equal(typeof callbackHandler, "function", "callback route handler bulunamadı");

test.after(() => {
	for (const modulePath of mockedPaths) {
		const original = originalCache.get(modulePath);
		if (original) require.cache[modulePath] = original;
		else delete require.cache[modulePath];
	}
});

const deferred = () => {
	let resolve;
	const promise = new Promise((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
};

const createHarness = ({ transaction, balance = 0, beforeCommit } = {}) => {
	let lock = Promise.resolve();
	let sessionSequence = 0;
	const sessions = new Map();
	const events = [];
	const balanceUpdates = [];
	const statsUpdates = [];
	const socketEmits = [];
	const user = {
		_id: transaction.user,
		wallets: [{ balance }],
		stats: { deposit: 0, withdraw: 0 },
	};
	const transactionDocument = {
		financeId: "",
		providerStatus: "",
		callbackRawData: {},
		...transaction,
		async save({ session } = {}) {
			assert.ok(session, "transaction save Mongo session kullanmalı");
			events.push({ type: "save", sessionId: session.id });
			return this;
		},
	};

	const harness = {
		transaction: transactionDocument,
		user,
		events,
		balanceUpdates,
		statsUpdates,
		socketEmits,
		async startSession() {
			const session = {
				id: ++sessionSequence,
				committed: false,
				async withTransaction(work) {
					let release;
					const previous = lock;
					lock = new Promise((resolveLock) => {
						release = resolveLock;
					});
					await previous;
					events.push({ type: "begin", sessionId: session.id });
					try {
						await work();
						events.push({ type: "before-commit", sessionId: session.id });
						if (beforeCommit) await beforeCommit(session, events);
						session.committed = true;
						events.push({ type: "commit", sessionId: session.id });
					} finally {
						release();
					}
				},
				async endSession() {
					events.push({ type: "end", sessionId: session.id });
				},
			};
			sessions.set(session.id, session);
			return session;
		},
		async findTransaction(filter, session) {
			assert.ok(session);
			return filter.externalTransactionId ===
				transactionDocument.externalTransactionId
				? transactionDocument
				: null;
		},
		async findUser(userId, session) {
			assert.ok(session);
			return String(userId) === String(user._id) ? user : null;
		},
		async updateUserBalance(foundUser, amount, options) {
			assert.equal(foundUser, user);
			assert.equal(options.emitSocket, false);
			assert.ok(options.session);
			user.wallets[0].balance += amount;
			user.lastBalanceSessionId = options.session.id;
			balanceUpdates.push({ amount, sessionId: options.session.id });
			events.push({ type: "balance", sessionId: options.session.id });
			return user.wallets[0].balance;
		},
		async updateStats(filter, update, options) {
			assert.equal(String(filter._id), String(user._id));
			assert.ok(options.session);
			const [field, amount] = Object.entries(update.$inc)[0];
			const stat = field.split(".")[1];
			user.stats[stat] += amount;
			statsUpdates.push({ stat, amount, sessionId: options.session.id });
			events.push({ type: "stats", sessionId: options.session.id });
			return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
		},
		emitUserBalance(io, emittedUser) {
			assert.equal(io, null);
			assert.equal(emittedUser, user);
			const session = sessions.get(user.lastBalanceSessionId);
			socketEmits.push({
				sessionId: user.lastBalanceSessionId,
				emittedAfterCommit: Boolean(session?.committed),
			});
			events.push({ type: "emit", sessionId: user.lastBalanceSessionId });
		},
	};

	return harness;
};

const createCallbackBody = ({ transaction, status, rawAmount, financeId }) => ({
	status,
	data: {
		transaction_type: transaction.type,
		transaction_id: transaction.externalTransactionId,
		finance_id: financeId,
		user_id: transaction.providerUserId,
		amountTRY: rawAmount,
		hash: generateFluxCallbackHash({
			transactionId: transaction.externalTransactionId,
			userId: transaction.providerUserId,
			rawAmount,
			status,
			secretKey: SECRET_KEY,
		}),
	},
});

const invokeCallback = async (body) => {
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

	await callbackHandler({ body }, response);
	return response;
};

test("concurrent and repeated approved deposit callbacks credit once and cannot regress", async () => {
	activeHarness = createHarness({
		balance: 10,
		transaction: {
			_id: "flux-deposit-local-1",
			externalTransactionId: "FLUX-DP-1",
			providerUserId: "provider-user-1",
			user: "user-1",
			type: "deposit",
			amount: 125.5,
			status: "processing",
		},
	});
	const approvedBody = createCallbackBody({
		transaction: activeHarness.transaction,
		status: true,
		rawAmount: "125.50",
		financeId: "finance-1",
	});

	const concurrentResponses = await Promise.all([
		invokeCallback(approvedBody),
		invokeCallback(approvedBody),
	]);
	const duplicateResponse = await invokeCallback(approvedBody);

	for (const response of [...concurrentResponses, duplicateResponse]) {
		assert.equal(response.statusCode, 200);
		assert.equal(response.payload.success, true);
	}
	assert.deepEqual(
		concurrentResponses
			.map((response) => response.payload.data.alreadyProcessed)
			.sort(),
		[false, true],
	);
	assert.equal(duplicateResponse.payload.data.alreadyProcessed, true);
	assert.equal(activeHarness.user.wallets[0].balance, 135.5);
	assert.equal(activeHarness.user.stats.deposit, 125.5);
	assert.deepEqual(
		activeHarness.balanceUpdates.map(({ amount }) => amount),
		[125.5],
	);
	assert.equal(activeHarness.statsUpdates.length, 1);
	assert.equal(activeHarness.socketEmits.length, 1);
	assert.equal(activeHarness.socketEmits[0].emittedAfterCommit, true);
	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.transaction.providerStatus, "true");
	assert.equal(activeHarness.transaction.financeId, "finance-1");
	assert.ok(activeHarness.transaction.balanceCreditedAt instanceof Date);

	const lateRejection = await invokeCallback(
		createCallbackBody({
			transaction: activeHarness.transaction,
			status: false,
			rawAmount: "125.50",
			financeId: "finance-1",
		}),
	);
	assert.equal(lateRejection.statusCode, 200);
	assert.equal(lateRejection.payload.data.alreadyProcessed, true);
	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.transaction.providerStatus, "true");
	assert.equal(activeHarness.balanceUpdates.length, 1);
	assert.equal(activeHarness.statsUpdates.length, 1);
});

test("approved deposit callback credits the provider amount when FluxKripto adjusts it", async () => {
	activeHarness = createHarness({
		balance: 10,
		transaction: {
			_id: "flux-adjusted-deposit",
			externalTransactionId: "FLUX-DP-ADJUSTED",
			providerUserId: "provider-adjusted",
			user: "user-adjusted",
			type: "deposit",
			amount: 1000,
			status: "processing",
		},
	});
	const response = await invokeCallback(
		createCallbackBody({
			transaction: activeHarness.transaction,
			status: true,
			rawAmount: "4000.00",
			financeId: "finance-adjusted",
		}),
	);

	assert.equal(response.statusCode, 200);
	assert.equal(response.payload.success, true);
	assert.equal(activeHarness.transaction.requestedAmount, 1000);
	assert.equal(activeHarness.transaction.providerAmount, 4000);
	assert.equal(activeHarness.transaction.amount, 4000);
	assert.equal(activeHarness.user.wallets[0].balance, 4010);
	assert.equal(activeHarness.user.stats.deposit, 4000);
	assert.deepEqual(
		activeHarness.balanceUpdates.map(({ amount }) => amount),
		[4000],
	);
	assert.deepEqual(
		activeHarness.statsUpdates.map(({ stat, amount }) => ({ stat, amount })),
		[{ stat: "deposit", amount: 4000 }],
	);
	assert.equal(activeHarness.socketEmits.length, 1);
});

test("final approved deposit rejects a later callback with a different provider amount", async () => {
	activeHarness = createHarness({
		balance: 4010,
		transaction: {
			_id: "flux-final-adjusted-deposit",
			externalTransactionId: "FLUX-DP-FINAL-ADJUSTED",
			providerUserId: "provider-final-adjusted",
			user: "user-final-adjusted",
			type: "deposit",
			amount: 4000,
			requestedAmount: 1000,
			providerAmount: 4000,
			status: "approved",
			balanceCreditedAt: new Date(),
		},
	});
	const response = await invokeCallback(
		createCallbackBody({
			transaction: activeHarness.transaction,
			status: true,
			rawAmount: "5000.00",
			financeId: "finance-final-adjusted",
		}),
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.success, false);
	assert.equal(activeHarness.transaction.amount, 4000);
	assert.equal(activeHarness.transaction.providerAmount, 4000);
	assert.equal(activeHarness.user.wallets[0].balance, 4010);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
	assert.equal(activeHarness.socketEmits.length, 0);
});

test("withdraw callback still rejects a provider amount that differs from the reserved amount", async () => {
	activeHarness = createHarness({
		balance: 25,
		transaction: {
			_id: "flux-withdraw-mismatch",
			externalTransactionId: "FLUX-WD-MISMATCH",
			providerUserId: "provider-withdraw-mismatch",
			user: "user-withdraw-mismatch",
			type: "withdraw",
			amount: 1000,
			status: "processing",
			balanceDebitedAt: new Date(),
		},
	});
	const response = await invokeCallback(
		createCallbackBody({
			transaction: activeHarness.transaction,
			status: true,
			rawAmount: "4000.00",
			financeId: "finance-withdraw-mismatch",
		}),
	);

	assert.equal(response.statusCode, 400);
	assert.equal(response.payload.success, false);
	assert.match(response.payload.error, /tutar/i);
	assert.equal(activeHarness.transaction.status, "processing");
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
});

test("approved FluxKripto withdraw callbacks apply stats once without a second debit", async () => {
	activeHarness = createHarness({
		balance: 25,
		transaction: {
			_id: "flux-approved-withdraw",
			externalTransactionId: "FLUX-WD-APPROVED",
			providerUserId: "provider-approved-withdraw",
			user: "user-approved-withdraw",
			type: "withdraw",
			amount: 75,
			status: "processing",
			balanceDebitedAt: new Date(),
		},
	});
	const approvedBody = createCallbackBody({
		transaction: activeHarness.transaction,
		status: true,
		rawAmount: "75.00",
		financeId: "finance-approved-withdraw",
	});

	const responses = await Promise.all([
		invokeCallback(approvedBody),
		invokeCallback(approvedBody),
	]);
	const duplicateResponse = await invokeCallback(approvedBody);

	for (const response of [...responses, duplicateResponse]) {
		assert.equal(response.statusCode, 200);
		assert.equal(response.payload.success, true);
	}
	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.user.wallets[0].balance, 25);
	assert.equal(activeHarness.user.stats.withdraw, 75);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.deepEqual(
		activeHarness.statsUpdates.map(({ stat, amount }) => ({ stat, amount })),
		[{ stat: "withdraw", amount: 75 }],
	);
	assert.equal(activeHarness.socketEmits.length, 0);
});

test("repeated valid rejected withdraw callbacks refund once and return HTTP 200", async () => {
	activeHarness = createHarness({
		balance: 25,
		transaction: {
			_id: "flux-withdraw-local-1",
			externalTransactionId: "FLUX-WD-1",
			providerUserId: "provider-user-2",
			user: "user-2",
			type: "withdraw",
			amount: 75,
			status: "processing",
			balanceDebitedAt: new Date(),
		},
	});
	const rejectedBody = createCallbackBody({
		transaction: activeHarness.transaction,
		status: false,
		rawAmount: "75.00",
		financeId: "finance-2",
	});

	const responses = await Promise.all([
		invokeCallback(rejectedBody),
		invokeCallback(rejectedBody),
	]);
	const duplicateResponse = await invokeCallback(rejectedBody);

	for (const response of [...responses, duplicateResponse]) {
		assert.equal(response.statusCode, 200);
		assert.equal(response.payload.success, true);
	}
	assert.deepEqual(
		responses
			.map((response) => response.payload.data.alreadyProcessed)
			.sort(),
		[false, true],
	);
	assert.equal(duplicateResponse.payload.data.alreadyProcessed, true);
	assert.equal(activeHarness.transaction.status, "rejected");
	assert.equal(activeHarness.user.wallets[0].balance, 100);
	assert.deepEqual(
		activeHarness.balanceUpdates.map(({ amount }) => amount),
		[75],
	);
	assert.equal(activeHarness.statsUpdates.length, 0);
	assert.equal(activeHarness.socketEmits.length, 1);
	assert.equal(activeHarness.socketEmits[0].emittedAfterCommit, true);
	assert.ok(activeHarness.transaction.balanceRefundedAt instanceof Date);
});

test("withdraw callback without a debit reservation returns 409 and never credits balance", async () => {
	activeHarness = createHarness({
		balance: 25,
		transaction: {
			_id: "flux-unreserved-withdraw",
			externalTransactionId: "FLUX-WD-UNRESERVED",
			providerUserId: "provider-unreserved",
			user: "user-unreserved",
			type: "withdraw",
			amount: 75,
			status: "processing",
		},
	});
	const body = createCallbackBody({
		transaction: activeHarness.transaction,
		status: false,
		rawAmount: "75.00",
		financeId: "finance-unreserved",
	});

	const response = await invokeCallback(body);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.success, false);
	assert.equal(activeHarness.transaction.status, "processing");
	assert.equal(activeHarness.user.wallets[0].balance, 25);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
	assert.equal(activeHarness.socketEmits.length, 0);
});

test("balance socket emit waits until the fake Mongo transaction commits", async () => {
	const commitGate = deferred();
	const reachedCommit = deferred();
	activeHarness = createHarness({
		balance: 0,
		beforeCommit: async () => {
			reachedCommit.resolve();
			await commitGate.promise;
		},
		transaction: {
			_id: "flux-deposit-local-gated",
			externalTransactionId: "FLUX-DP-GATED",
			providerUserId: "provider-user-gated",
			user: "user-gated",
			type: "deposit",
			amount: 50,
			status: "processing",
		},
	});
	const body = createCallbackBody({
		transaction: activeHarness.transaction,
		status: true,
		rawAmount: "50.00",
		financeId: "finance-gated",
	});

	const callback = invokeCallback(body);
	await reachedCommit.promise;
	assert.equal(activeHarness.balanceUpdates.length, 1);
	assert.equal(activeHarness.socketEmits.length, 0);

	commitGate.resolve();
	const response = await callback;
	assert.equal(response.statusCode, 200);
	assert.equal(activeHarness.socketEmits.length, 1);
	assert.equal(activeHarness.socketEmits[0].emittedAfterCommit, true);
	const commitIndex = activeHarness.events.findIndex(
		(event) => event.type === "commit",
	);
	const emitIndex = activeHarness.events.findIndex(
		(event) => event.type === "emit",
	);
	assert.ok(commitIndex >= 0 && emitIndex > commitIndex);
});
