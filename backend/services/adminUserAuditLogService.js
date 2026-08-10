const AdminUserAuditLog = require("../database/models/AdminUserAuditLog");

const OMITTED_TOP_LEVEL_KEYS = new Set([
	"walletUpdate",
	"walletUpdates",
	"wallets",
	"activeWallet",
	"fiatCurrency",
	"createdAt",
	"updatedAt",
	"__v",
	"manualAdjustment",
]);

const buildUserSnapshot = (user = {}) => ({
	username: user.username || "",
	name: user.name || "",
	email: user.local?.email || "",
	phone: user.phone || "",
	rank: user.rank || "user",
});

const isPlainObject = (value) =>
	Object.prototype.toString.call(value) === "[object Object]";

const getValueByPath = (source, path) => {
	if (!source || !path) return undefined;

	return path
		.split(".")
		.reduce((value, segment) => (value == null ? undefined : value[segment]), source);
};

const normalizeValue = (path, value) => {
	if (path === "local.password") {
		return value ? "[updated]" : null;
	}

	if (value === undefined || value === null) return null;
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
		return value;
	}
	if (typeof value?.toHexString === "function") {
		return value.toHexString();
	}
	if (Array.isArray(value)) {
		return value.map((item) => normalizeValue(path, item));
	}
	if (isPlainObject(value)) {
		return Object.keys(value)
			.sort()
			.reduce((accumulator, key) => {
				accumulator[key] = normalizeValue(`${path}.${key}`, value[key]);
				return accumulator;
			}, {});
	}

	return String(value);
};

const collectLeafPaths = (input, parentPath = "") => {
	if (!isPlainObject(input)) {
		return parentPath ? [parentPath] : [];
	}

	const entries = Object.entries(input);
	if (!entries.length) {
		return parentPath ? [parentPath] : [];
	}

	return entries.flatMap(([key, value]) => {
		if (!parentPath && OMITTED_TOP_LEVEL_KEYS.has(key)) {
			return [];
		}

		const currentPath = parentPath ? `${parentPath}.${key}` : key;
		if (currentPath === "local.password") {
			return value ? [currentPath] : [];
		}

		return isPlainObject(value)
			? collectLeafPaths(value, currentPath)
			: [currentPath];
	});
};

const buildUserUpdateChanges = (originalUser, updatedUser, updates = {}) => {
	const paths = [...new Set(collectLeafPaths(updates))];

	return paths.flatMap((path) => {
		if (!path) return [];

		if (path === "local.password") {
			return [{ field: path, from: "[hidden]", to: "[updated]" }];
		}

		const previousValue = normalizeValue(path, getValueByPath(originalUser, path));
		const nextValue = normalizeValue(path, getValueByPath(updatedUser, path));

		if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
			return [];
		}

		return [{
			field: path,
			from: previousValue,
			to: nextValue,
		}];
	});
};

async function createAdminUserAuditLog({
	targetUser,
	actorUser = null,
	action = "profile_update",
	summary = "",
	changes = [],
	source = "admin-user-profile",
	metadata = {},
}) {
	if (!targetUser || !targetUser._id) {
		throw new Error("TARGET_USER_REQUIRED");
	}

	const normalizedChanges = Array.isArray(changes)
		? changes
				.filter((change) => change && String(change.field || "").trim())
				.map((change) => ({
					field: String(change.field).trim(),
					from: change.from ?? null,
					to: change.to ?? null,
				}))
		: [];

	if (!normalizedChanges.length) {
		return null;
	}

	return AdminUserAuditLog.create({
		actorUser: actorUser?._id || null,
		actorSnapshot: buildUserSnapshot(actorUser),
		targetUser: targetUser._id,
		targetSnapshot: buildUserSnapshot(targetUser),
		action: String(action || "profile_update").trim() || "profile_update",
		summary: String(summary || "").trim(),
		changes: normalizedChanges,
		source: String(source || "admin-user-profile").trim() || "admin-user-profile",
		metadata: metadata && typeof metadata === "object" ? metadata : {},
	});
}

module.exports = {
	buildUserUpdateChanges,
	createAdminUserAuditLog,
};