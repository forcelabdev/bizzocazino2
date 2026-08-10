const ACCOUNT_SUSPENDED_CODE = "ACCOUNT_SUSPENDED";
const ACCOUNT_SUSPENDED_STATUS = "suspended";
const ACCOUNT_SUSPENDED_MESSAGE =
	"Hesabınız pasif durumdadır. Canlı destek ile iletişime geçin.";

const isActiveUserSuspension = (user, now = new Date()) => {
	if (!user || !user.ban) return false;

	const expire = user.ban.expire;
	if (!expire) return false;

	const expireTime = new Date(expire).getTime();
	return Number.isFinite(expireTime) && expireTime > now.getTime();
};

const getUserSuspensionMessage = () => {
	return ACCOUNT_SUSPENDED_MESSAGE;
};

const buildUserSuspensionPayload = () => ({
	success: false,
	code: ACCOUNT_SUSPENDED_CODE,
	accountStatus: ACCOUNT_SUSPENDED_STATUS,
	message: ACCOUNT_SUSPENDED_MESSAGE,
	error: {
		type: "account_suspended",
		code: ACCOUNT_SUSPENDED_CODE,
		message: ACCOUNT_SUSPENDED_MESSAGE,
	},
});

const sendUserSuspensionResponse = (res) =>
	res.status(403).json(buildUserSuspensionPayload());

const createSocketUserSuspensionError = () => {
	const error = new Error(ACCOUNT_SUSPENDED_MESSAGE);
	error.code = ACCOUNT_SUSPENDED_CODE;
	error.data = buildUserSuspensionPayload();
	return error;
};

const createUserSuspensionError = (user) => {
	const error = new Error(getUserSuspensionMessage(user));
	error.status = 403;
	error.code = ACCOUNT_SUSPENDED_CODE;

	return error;
};

const assertUserNotSuspended = (user) => {
	if (isActiveUserSuspension(user)) {
		throw createUserSuspensionError(user);
	}
};

const notifyAndDisconnectSuspendedUser = async (io, userId) => {
	const normalizedUserId = String(userId || "");
	if (!io || !normalizedUserId) return 0;

	const namespaces = io._nsps instanceof Map ? [...io._nsps.values()] : [];
	const sockets = namespaces.flatMap((namespace) =>
		[...(namespace?.sockets?.values?.() || [])].filter((socket) => {
			const decodedUserId = socket?.decoded?._id || socket?.decoded?.id;
			return decodedUserId && String(decodedUserId) === normalizedUserId;
		})
	);
	const payload = buildUserSuspensionPayload();

	for (const socket of sockets) {
		socket.emit("account:suspended", payload);
	}
	for (const socket of sockets) {
		// Namespace'i kapat; önce gönderilen olayın istemciye ulaşmasını engelleme.
		socket.disconnect(false);
	}

	return sockets.length;
};

module.exports = {
	ACCOUNT_SUSPENDED_CODE,
	ACCOUNT_SUSPENDED_MESSAGE,
	assertUserNotSuspended,
	buildUserSuspensionPayload,
	createSocketUserSuspensionError,
	createUserSuspensionError,
	getUserSuspensionMessage,
	isActiveUserSuspension,
	notifyAndDisconnectSuspendedUser,
	sendUserSuspensionResponse,
};
