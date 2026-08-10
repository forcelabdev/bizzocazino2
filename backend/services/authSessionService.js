const jwt = require("jsonwebtoken");

const User = require("../database/models/User");
const logEvent = require("./logEvent");
const { updateMissionProgress } = require("./MissionEngine");
const { authGenerateJwtToken } = require("../utils/auth");
const { processUserAvatar } = require("../utils/avatar");
const { getClientIp } = require("../utils/ip");
const { assertUserNotSuspended } = require("../utils/userSuspension");

const JWT_SECRET =
	process.env.TOKEN_SECRET || process.env.JWT_SECRET || "yourSecretKey";

const getRequestIp = getClientIp;

const buildAdminAbilities = (user) => {
	let userAbilities = [];
	let isSuperAdmin = false;
	let userPermissions = [];

	if (user.adminRole) {
		isSuperAdmin = user.adminRole.isSuperAdmin;

		if (isSuperAdmin) {
			userAbilities = [{ action: "manage", subject: "all" }];
			userPermissions = ["*"];
		} else {
			const permissions = user.adminRole.permissions || [];
			userPermissions = permissions.map((permission) => permission.code);

			permissions.forEach((permission) => {
				userAbilities.push({
					action: permission.action,
					subject: permission.resource,
				});
			});

			userAbilities.push({ action: "read", subject: "Auth" });
		}
	} else {
		userAbilities = [{ action: "read", subject: "Auth" }];
	}

	return {
		isSuperAdmin,
		userAbilities,
		userPermissions,
	};
};

const finalizeUserLoginSession = async ({ userId, req }) => {
	const user = await User.findById(userId).select("rank ips ban").lean();

	if (!user) {
		throw new Error("User not found");
	}

	assertUserNotSuspended(user);

	const userIp = getRequestIp(req);
	const isAdmin = user.rank === "admin";
	const updateData = {
		updatedAt: new Date().getTime(),
	};

	if (isAdmin) {
		updateData.ips = [];
	} else {
		const nextIps = Array.isArray(user.ips) ? [...user.ips] : [];
		nextIps.unshift({ address: userIp });
		updateData.ips = nextIps.slice(0, 25);
	}

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ $set: updateData },
		{ new: true }
	)
		.select(
			"local.email local.emailVerified roblox.id discord.id username avatar rank balance xp vault phone name stats rakeback fair anonymous mute ban verifiedAt updatedAt createdAt mfa"
		)
		.lean();

	const accessToken = authGenerateJwtToken(updatedUser._id);

	await logEvent("login", {
		userId: updatedUser._id,
	});

	await updateMissionProgress("login", {
		userId: updatedUser._id,
		amount: 1,
	});

	const userWithAvatar = await processUserAvatar(updatedUser);

	return {
		success: true,
		token: accessToken,
		user: userWithAvatar,
	};
};

const createAdminSessionPayload = async ({ userId }) => {
	const user = await User.findById(userId).populate({
		path: "adminRole",
		populate: {
			path: "permissions",
			select: "code name resource action",
		},
	});

	if (!user) {
		throw new Error("User not found");
	}

	assertUserNotSuspended(user);

	if (user.rank !== "admin") {
		throw new Error("You are not authorized to access this panel");
	}

	const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, {
		expiresIn: "1d",
	});

	const { isSuperAdmin, userAbilities, userPermissions } = buildAdminAbilities(user);

	await User.findByIdAndUpdate(user._id, {
		$set: { ips: [] },
	});

	return {
		accessToken,
		userData: {
			id: user._id,
			email: user.local.email,
			fullName: user.name || user.username,
			role: "admin",
			adminRole: user.adminRole
				? {
						_id: user.adminRole._id,
						name: user.adminRole.name,
						displayName: user.adminRole.displayName,
						isSuperAdmin: user.adminRole.isSuperAdmin,
						color: user.adminRole.color,
						icon: user.adminRole.icon,
				  }
				: null,
			isSuperAdmin,
		},
		userAbilities,
		userPermissions,
	};
};

module.exports = {
	buildAdminAbilities,
	createAdminSessionPayload,
	finalizeUserLoginSession,
	getRequestIp,
};