const test = require("node:test");
const assert = require("node:assert/strict");

const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const siteSettingsPath = require.resolve("../database/models/SiteSettings");
const transactionModelPath = require.resolve(
	"../database/models/XPaymentTransaction",
);
const walletPath = require.resolve("../utils/wallet");
const servicePath = require.resolve("../services/xPaymentsService");

const mockedPaths = [
	mongoosePath,
	userPath,
	siteSettingsPath,
	transactionModelPath,
	walletPath,
	servicePath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

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
	findOne: async () => null,
});
installMock(transactionModelPath, {
	findById: (transactionId) => ({
		session: (session) =>
			activeHarness.findTransaction(transactionId, session),
	}),
});
installMock(walletPath, {
	emitUserBalance: (io, user) => activeHarness.emitUserBalance(io, user),
	getActiveWallet: (user) => user.wallets[0],
	updateUserBalance: (user, amount, options) =>
		activeHarness.updateUserBalance(user, amount, options),
});
delete require.cache[servicePath];

const { applyXPaymentsStatus } = require(servicePath);

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
		providerStatus: "",
		isProcessing: false,
		providerResponse: {},
		callbackRawData: {},
		...transaction,
		async save({ session } = {}) {
			assert.ok(session, "transaction save must use the Mongo session");
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
				ended: false,
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
					session.ended = true;
					events.push({ type: "end", sessionId: session.id });
				},
			};
			sessions.set(session.id, session);
			return session;
		},
		async findTransaction(transactionId, session) {
			assert.ok(session);
			return transactionId === transactionDocument._id
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
			return { acknowledged: true, modifiedCount: 1 };
		},
		emitUserBalance(io, emittedUser) {
			assert.equal(io, null);
			assert.equal(emittedUser, user);
			const session = sessions.get(user.lastBalanceSessionId);
			const emittedAfterCommit = Boolean(session?.committed);
			socketEmits.push({
				sessionId: user.lastBalanceSessionId,
				emittedAfterCommit,
			});
			events.push({ type: "emit", sessionId: user.lastBalanceSessionId });
		},
	};

	return harness;
};

test("concurrent and repeated approved deposits credit balance and stats once", async () => {
	activeHarness = createHarness({
		balance: 10,
		transaction: {
			_id: "deposit-1",
			user: "user-1",
			type: "deposit",
			amount: 125.5,
			status: "processing",
			isProcessing: true,
		},
	});

	const results = await Promise.all([
		applyXPaymentsStatus("deposit-1", "success", {
			data: { finance_id: "finance-1", is_processing: true },
		}),
		applyXPaymentsStatus("deposit-1", "success", {
			data: { finance_id: "finance-1", is_processing: true },
		}),
	]);
	const repeated = await applyXPaymentsStatus("deposit-1", "success", {
		data: { finance_id: "finance-1" },
	});

	assert.deepEqual(
		results.map((result) => result.alreadyFinal).sort(),
		[false, true],
	);
	assert.equal(repeated.alreadyFinal, true);
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
	assert.equal(activeHarness.transaction.providerStatus, "success");
	assert.equal(activeHarness.transaction.financeId, "finance-1");
	assert.equal(activeHarness.transaction.isProcessing, false);
	assert.ok(activeHarness.transaction.balanceCreditedAt instanceof Date);
	assert.ok(activeHarness.transaction.statsAppliedAt instanceof Date);

	const regressive = await applyXPaymentsStatus("deposit-1", "reject", {
		message: "late rejection",
	});
	assert.equal(regressive.alreadyFinal, true);
	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.transaction.providerStatus, "success");
	assert.equal(activeHarness.balanceUpdates.length, 1);
	assert.equal(activeHarness.statsUpdates.length, 1);
});

test("corrected provider deposit amount is persisted and credited atomically once", async () => {
	activeHarness = createHarness({
		balance: 10,
		transaction: {
			_id: "corrected-deposit",
			externalTransactionId: "XP-DP-CORRECTED",
			user: "corrected-user",
			type: "deposit",
			amount: 1000,
			requestedAmount: 1000,
			providerAmount: 1000,
			status: "processing",
			isProcessing: true,
		},
	});

	const callback = {
		status: true,
		data: { amount: "4000.00", finance_id: "corrected-finance" },
	};
	const options = {
		providerAmount: 4000,
		amountSource: "callback",
		persistCallbackRawData: true,
		callbackRawData: callback,
	};
	const originalConsoleInfo = console.info;
	const infoLogs = [];
	console.info = (...values) => infoLogs.push(values);
	let results;
	let repeated;
	try {
		results = await Promise.all([
			applyXPaymentsStatus("corrected-deposit", "success", callback, options),
			applyXPaymentsStatus("corrected-deposit", "success", callback, options),
		]);
		repeated = await applyXPaymentsStatus(
			"corrected-deposit",
			"success",
			callback,
			options,
		);
	} finally {
		console.info = originalConsoleInfo;
	}

	assert.deepEqual(
		results.map((result) => result.alreadyFinal).sort(),
		[false, true],
	);
	assert.equal(repeated.alreadyFinal, true);
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
		activeHarness.statsUpdates.map(({ amount }) => amount),
		[4000],
	);
	assert.equal(activeHarness.socketEmits.length, 1);
	assert.equal(activeHarness.socketEmits[0].emittedAfterCommit, true);
	assert.equal(infoLogs.length, 1);
	assert.equal(infoLogs[0][0], "XPayment deposit amount adjusted:");
	assert.deepEqual(JSON.parse(infoLogs[0][1]), {
		externalTransactionId: "XP-DP-CORRECTED",
		source: "callback",
		requestedAmount: 1000,
		providerAmount: 4000,
	});

	await assert.rejects(
		() =>
			applyXPaymentsStatus("corrected-deposit", "success", {
				data: { amount: "5000.00" },
			}, {
				providerAmount: 5000,
				amountSource: "callback",
			}),
		(error) =>
			error instanceof Error &&
			error.statusCode === 409 &&
			error.code === "FINAL_AMOUNT_MISMATCH",
	);
	assert.equal(activeHarness.transaction.amount, 4000);
	assert.equal(activeHarness.balanceUpdates.length, 1);
	assert.equal(activeHarness.statsUpdates.length, 1);
});

test("legacy deposits preserve their local amount as requestedAmount on settlement", async () => {
	activeHarness = createHarness({
		balance: 0,
		transaction: {
			_id: "legacy-deposit",
			user: "legacy-user",
			type: "deposit",
			amount: 750,
			status: "processing",
		},
	});

	await applyXPaymentsStatus(
		"legacy-deposit",
		"success",
		{ data: { amount: "800.00" } },
		{ providerAmount: 800, amountSource: "status" },
	);

	assert.equal(activeHarness.transaction.requestedAmount, 750);
	assert.equal(activeHarness.transaction.providerAmount, 800);
	assert.equal(activeHarness.transaction.amount, 800);
	assert.equal(activeHarness.user.wallets[0].balance, 800);
	assert.equal(activeHarness.user.stats.deposit, 800);
});

test("service rejects unsafe provider amounts before any financial mutation", async () => {
	activeHarness = createHarness({
		balance: 0,
		transaction: {
			_id: "invalid-provider-amount",
			user: "invalid-provider-user",
			type: "deposit",
			amount: 1000,
			status: "processing",
		},
	});

	await assert.rejects(
		() =>
			applyXPaymentsStatus(
				"invalid-provider-amount",
				"success",
				{},
				{ providerAmount: "1000.001", amountSource: "callback" },
			),
		(error) =>
			error instanceof Error &&
			error.statusCode === 400 &&
			error.code === "INVALID_PROVIDER_AMOUNT",
	);
	assert.equal(activeHarness.transaction.status, "processing");
	assert.equal(activeHarness.transaction.amount, 1000);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
});

test("a rejected final deposit also rejects a different provider amount", async () => {
	activeHarness = createHarness({
		balance: 0,
		transaction: {
			_id: "rejected-final-deposit",
			user: "rejected-final-user",
			type: "deposit",
			amount: 1000,
			requestedAmount: 1000,
			providerAmount: 1000,
			status: "rejected",
			providerStatus: "reject",
		},
	});

	await assert.rejects(
		() =>
			applyXPaymentsStatus(
				"rejected-final-deposit",
				"reject",
				{ data: { amount: "2000.00" } },
				{ providerAmount: 2000, amountSource: "callback" },
			),
		(error) =>
			error instanceof Error &&
			error.statusCode === 409 &&
			error.code === "FINAL_AMOUNT_MISMATCH",
	);
	assert.equal(activeHarness.transaction.amount, 1000);
	assert.equal(activeHarness.transaction.providerAmount, 1000);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
});

test("approved XPayment withdrawals apply stats once without a second debit", async () => {
	activeHarness = createHarness({
		balance: 25,
		transaction: {
			_id: "approved-withdraw",
			user: "approved-withdraw-user",
			type: "withdraw",
			amount: 75,
			status: "processing",
			isProcessing: true,
			balanceDebitedAt: new Date(),
		},
	});

	await Promise.all([
		applyXPaymentsStatus("approved-withdraw", "success"),
		applyXPaymentsStatus("approved-withdraw", "success"),
	]);
	await applyXPaymentsStatus("approved-withdraw", "success");

	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.transaction.isProcessing, false);
	assert.equal(activeHarness.user.wallets[0].balance, 25);
	assert.equal(activeHarness.user.stats.withdraw, 75);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.deepEqual(
		activeHarness.statsUpdates.map(({ stat, amount }) => ({ stat, amount })),
		[{ stat: "withdraw", amount: 75 }],
	);
	assert.equal(activeHarness.socketEmits.length, 0);
	assert.ok(activeHarness.transaction.statsAppliedAt instanceof Date);
});

test("repeated rejected and cancelled withdrawals refund the balance once", async () => {
	for (const [providerStatus, expectedStatus] of [
		["reject", "rejected"],
		["cancelled", "cancelled"],
	]) {
		activeHarness = createHarness({
			balance: 25,
			transaction: {
				_id: `withdraw-${expectedStatus}`,
				user: `user-${expectedStatus}`,
				type: "withdraw",
				amount: 75,
				status: "processing",
				isProcessing: true,
				balanceDebitedAt: new Date(),
			},
		});

		const transactionId = activeHarness.transaction._id;
		await Promise.all([
			applyXPaymentsStatus(transactionId, providerStatus),
			applyXPaymentsStatus(transactionId, providerStatus),
		]);
		await applyXPaymentsStatus(
			transactionId,
			providerStatus === "reject" ? "cancelled" : "reject",
		);

		assert.equal(activeHarness.transaction.status, expectedStatus);
		assert.equal(activeHarness.transaction.isProcessing, false);
		assert.equal(activeHarness.user.wallets[0].balance, 100);
		assert.deepEqual(
			activeHarness.balanceUpdates.map(({ amount }) => amount),
			[75],
		);
		assert.equal(activeHarness.statsUpdates.length, 0);
		assert.equal(activeHarness.socketEmits.length, 1);
		assert.equal(activeHarness.socketEmits[0].emittedAfterCommit, true);
		assert.ok(activeHarness.transaction.balanceRefundedAt instanceof Date);
	}
});

test("withdraw finalization without a debit reservation is rejected without balance movement", async () => {
	for (const providerStatus of ["success", "reject", "cancelled"]) {
		activeHarness = createHarness({
			balance: 25,
			transaction: {
				_id: "unreserved-withdraw-" + providerStatus,
				user: "unreserved-user-" + providerStatus,
				type: "withdraw",
				amount: 75,
				status: "processing",
				isProcessing: true,
			},
		});

		await assert.rejects(
			() =>
				applyXPaymentsStatus(
					activeHarness.transaction._id,
					providerStatus,
				),
			(error) =>
				error instanceof Error &&
				error.statusCode === 409 &&
				error.code === "WITHDRAW_BALANCE_NOT_RESERVED",
		);
		assert.equal(activeHarness.transaction.status, "processing");
		assert.equal(activeHarness.user.wallets[0].balance, 25);
		assert.equal(activeHarness.balanceUpdates.length, 0);
		assert.equal(activeHarness.statsUpdates.length, 0);
		assert.equal(activeHarness.socketEmits.length, 0);
	}
});

test("balance socket notification waits until the fake transaction commits", async () => {
	const commitGate = deferred();
	const reachedCommit = deferred();
	activeHarness = createHarness({
		balance: 0,
		beforeCommit: async () => {
			reachedCommit.resolve();
			await commitGate.promise;
		},
		transaction: {
			_id: "deposit-with-gate",
			user: "user-with-gate",
			type: "deposit",
			amount: 50,
			status: "processing",
			isProcessing: true,
		},
	});

	const application = applyXPaymentsStatus("deposit-with-gate", "success");
	await reachedCommit.promise;
	assert.equal(activeHarness.balanceUpdates.length, 1);
	assert.equal(activeHarness.socketEmits.length, 0);

	commitGate.resolve();
	await application;
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

test("an already-final transaction clears stale isProcessing without regressing", async () => {
	activeHarness = createHarness({
		transaction: {
			_id: "final-with-stale-processing",
			user: "final-user",
			type: "deposit",
			amount: 20,
			status: "approved",
			providerStatus: "success",
			isProcessing: true,
			balanceCreditedAt: new Date(),
			statsAppliedAt: new Date(),
		},
	});

	const callback = {
		status: false,
		data: { finance_id: "late-finance" },
	};
	const result = await applyXPaymentsStatus(
		"final-with-stale-processing",
		"reject",
		callback,
		{ persistCallbackRawData: true, callbackRawData: callback },
	);

	assert.equal(result.alreadyFinal, true);
	assert.equal(activeHarness.transaction.status, "approved");
	assert.equal(activeHarness.transaction.providerStatus, "success");
	assert.equal(activeHarness.transaction.isProcessing, false);
	assert.equal(activeHarness.transaction.financeId, "late-finance");
	assert.deepEqual(activeHarness.transaction.callbackRawData, callback);
	assert.equal(activeHarness.balanceUpdates.length, 0);
	assert.equal(activeHarness.statsUpdates.length, 0);
	assert.equal(activeHarness.socketEmits.length, 0);
	assert.equal(
		activeHarness.events.filter((event) => event.type === "save").length,
		1,
	);
});
