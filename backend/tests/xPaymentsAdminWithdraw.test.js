const test = require("node:test");
const assert = require("node:assert/strict");

const axiosPath = require.resolve("axios");
const mongoosePath = require.resolve("mongoose");
const userPath = require.resolve("../database/models/User");
const siteSettingsPath = require.resolve("../database/models/SiteSettings");
const transactionPath = require.resolve(
	"../database/models/XPaymentTransaction",
);
const permissionPath = require.resolve("../middleware/permission");
const servicePath = require.resolve("../services/xPaymentsService");
const routerPath = require.resolve("../routes/admin/xPayments");

const mockedPaths = [
	axiosPath,
	mongoosePath,
	userPath,
	siteSettingsPath,
	transactionPath,
	permissionPath,
	servicePath,
	routerPath,
];
const originalCache = new Map(
	mockedPaths.map((modulePath) => [modulePath, require.cache[modulePath]]),
);

let upstreamError;
let activeTransaction;
let applyCalls;
let updateCalls;
let axiosCalls;

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
		return {
			data: {
				status: true,
				data: {
					transaction_id: activeTransaction.externalTransactionId,
					finance_id: 101,
				},
			},
		};
	},
});
installMock(mongoosePath, {
	isValidObjectId: () => true,
});
installMock(userPath, {});
installMock(siteSettingsPath, {});
installMock(transactionPath, {
	findOneAndUpdate: async (filter) => {
		if (
			filter.status === "pending" &&
			(!activeTransaction.balanceDebitedAt ||
				activeTransaction.balanceRefundedAt)
		) {
			return null;
		}
		activeTransaction.status = "processing";
		activeTransaction.submissionState = "submitting";
		return activeTransaction;
	},
	findById: async () => activeTransaction,
	updateOne: async (filter, update) => {
		updateCalls.push({ filter, update });
		return { acknowledged: true, modifiedCount: 1 };
	},
});
installMock(permissionPath, {
	checkPermission: () => (req, res, next) => next(),
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
		if (!activeTransaction.balanceDebitedAt) {
			throw new XPaymentsServiceError(
				"Çekim bakiyesi talep sırasında rezerve edilmemiş.",
				409,
				"WITHDRAW_BALANCE_NOT_RESERVED",
			);
		}
		applyCalls.push({ transactionId, providerStatus, payload, options });
		activeTransaction.status = "rejected";
		activeTransaction.providerStatus = "reject";
		activeTransaction.submissionState = options.submissionState;
		activeTransaction.balanceRefundedAt = new Date();
		return { transaction: activeTransaction, alreadyFinal: false };
	},
	getXPaymentsSettings: async () => ({
		isActive: true,
		apiUrl: "https://api.xpaymentsystems.com",
		apiKey: "api-key",
		secretKey: "secret-key",
		methods: { deposit: true, withdraw: true },
	}),
	sanitizeXPaymentsSettings: () => ({}),
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
	activeTransaction = {
		_id: "withdraw-1",
		user: "user-1",
		providerUserId: "provider-user-1",
		externalTransactionId: "XP-WD-1",
		type: "withdraw",
		amount: 1000,
		status: "pending",
		providerStatus: "",
		submissionState: "not_submitted",
		balanceDebitedAt: new Date(),
		balanceRefundedAt: null,
		withdrawal: {
			accountHolder: "Test User",
			iban: "TR330006100519786457841326",
		},
		metadata: {
			customer: {
				providerUserId: "provider-user-1",
				username: "test-user",
				fullname: "Test User",
			},
		},
	};
	applyCalls = [];
	updateCalls = [];
	axiosCalls = 0;
	upstreamError = null;
});

test("successful XPayment admin approve submits without a second balance movement", async () => {
	const debitedAt = activeTransaction.balanceDebitedAt;
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 200);
	assert.equal(response.payload.success, true);
	assert.equal(applyCalls.length, 0);
	assert.equal(activeTransaction.balanceDebitedAt, debitedAt);
	assert.equal(activeTransaction.balanceRefundedAt, null);
	assert.equal(activeTransaction.status, "processing");
});

test("definitive XPayment submission rejection finalizes and refunds through the service", async () => {
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
	assert.equal(applyCalls.length, 1);
	assert.equal(applyCalls[0].providerStatus, "reject");
	assert.equal(applyCalls[0].options.normalizedStatus, "rejected");
	assert.deepEqual(applyCalls[0].options.allowedCurrentStatuses, ["processing"]);
	assert.equal(applyCalls[0].options.submissionState, "failed");
	assert.equal(activeTransaction.status, "rejected");
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);
	assert.equal(updateCalls.length, 0);
});

test("explicit XPayment status false finalizes and refunds through the service", async () => {
	installMock(axiosPath, {
		post: async () => {
			axiosCalls += 1;
			return {
				data: { status: false, error: "Provider rejected" },
			};
		},
	});
	delete require.cache[routerPath];
	const statusFalseRouter = require(routerPath);
	const statusFalseApproveHandler = statusFalseRouter.stack.find(
		(layer) =>
			layer.route?.path === "/withdraw/:id/approve" &&
			layer.route.methods.post,
	)?.route.stack.at(-1)?.handle;
	const response = createResponse();

	await statusFalseApproveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 400);
	assert.equal(applyCalls.length, 1);
	assert.equal(activeTransaction.status, "rejected");
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);

	installMock(axiosPath, {
		post: async () => {
			axiosCalls += 1;
			if (upstreamError) throw upstreamError;
			return {
				data: {
					status: true,
					data: {
						transaction_id: activeTransaction.externalTransactionId,
						finance_id: 101,
					},
				},
			};
		},
	});
	delete require.cache[routerPath];
});

test("ambiguous XPayment submission failure keeps the balance reserved", async () => {
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
	assert.equal(applyCalls.length, 0);
	assert.equal(updateCalls.length, 1);
	assert.equal(updateCalls[0].update.$set.status, "processing");
	assert.equal(updateCalls[0].update.$set.submissionState, "unknown");
	assert.equal(activeTransaction.balanceRefundedAt, null);
});

test("XPayment approve rejects an unreserved withdrawal before calling upstream", async () => {
	activeTransaction.balanceDebitedAt = null;
	const response = createResponse();

	await approveHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.code, "WITHDRAW_BALANCE_NOT_RESERVED");
	assert.equal(axiosCalls, 0);
	assert.equal(applyCalls.length, 0);
});

test("XPayment admin reject applies one refund transition only", async () => {
	const firstResponse = createResponse();
	await rejectHandler(
		{
			params: { id: activeTransaction._id },
			body: { reason: "Admin reddi" },
		},
		firstResponse,
	);

	assert.equal(firstResponse.statusCode, 200);
	assert.equal(applyCalls.length, 1);
	assert.equal(activeTransaction.status, "rejected");
	assert.ok(activeTransaction.balanceRefundedAt instanceof Date);

	const secondResponse = createResponse();
	await rejectHandler(
		{
			params: { id: activeTransaction._id },
			body: { reason: "Tekrar red" },
		},
		secondResponse,
	);

	assert.equal(secondResponse.statusCode, 409);
	assert.equal(applyCalls.length, 1);
});

test("XPayment admin reject refuses to refund an unreserved withdrawal", async () => {
	activeTransaction.balanceDebitedAt = null;
	const response = createResponse();

	await rejectHandler(
		{ params: { id: activeTransaction._id }, body: {} },
		response,
	);

	assert.equal(response.statusCode, 409);
	assert.equal(response.payload.code, "WITHDRAW_BALANCE_NOT_RESERVED");
	assert.equal(applyCalls.length, 0);
});
