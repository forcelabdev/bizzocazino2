const test = require("node:test");
const assert = require("node:assert/strict");

const {
	ACCOUNT_SUSPENDED_CODE,
	ACCOUNT_SUSPENDED_MESSAGE,
	assertUserNotSuspended,
	buildUserSuspensionPayload,
	createSocketUserSuspensionError,
	isActiveUserSuspension,
	notifyAndDisconnectSuspendedUser,
	sendUserSuspensionResponse,
} = require("../utils/userSuspension");

test("askı durumunu yalnızca gelecekteki bitiş tarihleri için aktif sayar", () => {
	const now = new Date("2026-07-22T10:00:00.000Z");

	assert.equal(
		isActiveUserSuspension(
			{ ban: { expire: "2026-07-22T10:01:00.000Z" } },
			now
		),
		true
	);
	assert.equal(
		isActiveUserSuspension(
			{ ban: { expire: "2026-07-22T09:59:00.000Z" } },
			now
		),
		false
	);
	assert.equal(isActiveUserSuspension({ ban: {} }, now), false);
});

test("HTTP ve socket için detay sızdırmayan kararlı hesap durumu üretir", () => {
	const payload = buildUserSuspensionPayload();

	assert.deepEqual(payload, {
		success: false,
		code: "ACCOUNT_SUSPENDED",
		accountStatus: "suspended",
		message: ACCOUNT_SUSPENDED_MESSAGE,
		error: {
			type: "account_suspended",
			code: "ACCOUNT_SUSPENDED",
			message: ACCOUNT_SUSPENDED_MESSAGE,
		},
	});
	assert.equal("reason" in payload, false);
	assert.equal("expiresAt" in payload, false);

	const socketError = createSocketUserSuspensionError();
	assert.equal(socketError.code, ACCOUNT_SUSPENDED_CODE);
	assert.deepEqual(socketError.data, payload);
});

test("askılı kullanıcı doğrulaması sebep ve tarih metadata'sı üretmez", () => {
	assert.throws(
		() =>
			assertUserNotSuspended({
				ban: {
					expire: new Date(Date.now() + 60_000),
					reason: "Kullanıcıya açılmaması gereken sebep",
				},
			}),
		(error) =>
			error.code === ACCOUNT_SUSPENDED_CODE &&
			error.status === 403 &&
			error.metadata === undefined
	);
});

test("HTTP cevabını 403 ve standart payload ile gönderir", () => {
	let statusCode;
	let responseBody;
	const res = {
		status(value) {
			statusCode = value;
			return this;
		},
		json(value) {
			responseBody = value;
			return value;
		},
	};

	sendUserSuspensionResponse(res);

	assert.equal(statusCode, 403);
	assert.deepEqual(responseBody, buildUserSuspensionPayload());
});

test("kullanıcının bütün authenticated socketlerini bilgilendirip düşürür", async () => {
	const events = [];
	const disconnected = [];
	const createSocket = (id, decoded) => ({
		id,
		decoded,
		emit(event, payload) {
			events.push({ id, event, payload });
		},
		disconnect(closeTransport) {
			disconnected.push({ id, closeTransport });
		},
	});
	const targetGeneral = createSocket("general-target", { _id: "user-1" });
	const targetCashier = createSocket("cashier-target", { id: "user-1" });
	const otherUser = createSocket("other-user", { _id: "user-2" });
	const io = {
		_nsps: new Map([
			[
				"/general",
				{ sockets: new Map([[targetGeneral.id, targetGeneral], [otherUser.id, otherUser]]) },
			],
			[
				"/cashier",
				{ sockets: new Map([[targetCashier.id, targetCashier]]) },
			],
		]),
	};

	const count = await notifyAndDisconnectSuspendedUser(io, "user-1");

	assert.equal(count, 2);
	assert.deepEqual(
		events.map(({ id, event }) => ({ id, event })),
		[
			{ id: "general-target", event: "account:suspended" },
			{ id: "cashier-target", event: "account:suspended" },
		]
	);
	assert.deepEqual(disconnected, [
		{ id: "general-target", closeTransport: false },
		{ id: "cashier-target", closeTransport: false },
	]);
	assert.deepEqual(events[0].payload, buildUserSuspensionPayload());
});

test("socket bağlantı kontrolü askılı hesabı standart connect_error ile reddeder", async () => {
	const userModelPath = require.resolve("../database/models/User");
	const socketUtilsPath = require.resolve("../utils/socket");
	const originalUserModel = require.cache[userModelPath];
	const originalSocketUtils = require.cache[socketUtilsPath];
	let activeUser = {
		ban: { expire: new Date(Date.now() + 60_000) },
	};

	require.cache[userModelPath] = {
		id: userModelPath,
		filename: userModelPath,
		loaded: true,
		exports: {
			findById: () => ({
				select: () => ({
					lean: async () => activeUser,
				}),
			}),
		},
	};
	delete require.cache[socketUtilsPath];

	try {
		const { socketCheckUserSuspension } = require(socketUtilsPath);

		await assert.rejects(
			() => socketCheckUserSuspension({ _id: "user-1" }),
			(error) =>
				error.code === ACCOUNT_SUSPENDED_CODE &&
				error.data?.accountStatus === "suspended"
		);

		activeUser = { ban: { expire: new Date(Date.now() - 60_000) } };
		await socketCheckUserSuspension({ id: "user-1" });
	} finally {
		if (originalUserModel) require.cache[userModelPath] = originalUserModel;
		else delete require.cache[userModelPath];
		if (originalSocketUtils) require.cache[socketUtilsPath] = originalSocketUtils;
		else delete require.cache[socketUtilsPath];
	}
});
