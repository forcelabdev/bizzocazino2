const crypto = require("crypto");
const mongoose = require("mongoose");

const MfaOtpCode = require("../database/models/MfaOtpCode");
const User = require("../database/models/User");
const { getSmsOtpConfig } = require("./smsOtpConfigService");
const {
	MFA_METHOD_EMAIL,
	MFA_METHOD_SMS,
	createOtpHash,
	createOtpWindow,
	compareOtpCode,
	decryptOtpCode,
	encryptOtpCode,
	generateOtpCode,
	getCooldownRemainingSeconds,
	getOtpLifetimeMs,
	getOtpMaxAttempts,
	hasOtpExpired,
	maskEmailAddress,
	maskPhoneNumber,
	normalizeEmailAddress,
	normalizePhoneNumber,
} = require("../utils/mfa");
const { sendSms } = require("./uipappSmsService");
const { sendTemplatedEmail } = require("../utils/email");

const ACTIVE_OTP_STATUSES = new Set(["pending", "sent"]);
const TERMINAL_OTP_STATUSES = new Set([
	"validated",
	"expired",
	"superseded",
	"failed",
	"cancelled",
]);

const createMfaError = (message, code = "MFA_ERROR", status = 400, metadata = {}) => {
	const error = new Error(message);
	error.code = code;
	error.status = status;
	error.metadata = metadata;
	return error;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const normalizeMfaMethodType = (methodType) => {
	const normalized = String(methodType || MFA_METHOD_SMS).trim().toLowerCase();

	if ([MFA_METHOD_SMS, MFA_METHOD_EMAIL].includes(normalized)) {
		return normalized;
	}

	throw createMfaError("Invalid MFA method", "INVALID_MFA_METHOD", 400);
};

const isActiveMfaMethod = (method) =>
	Boolean(
		method &&
			!method.disabledAt &&
			[MFA_METHOD_SMS, MFA_METHOD_EMAIL].includes(method.type)
	);

const getPreferredMfaMethod = (user) => {
	const methods = Array.isArray(user?.mfa?.methods) ? user.mfa.methods : [];
	const preferredMethodId = user?.mfa?.preferredMethodId;

	if (preferredMethodId) {
		const preferredMethod = methods.find(
			(method) =>
				method?.id === preferredMethodId && isActiveMfaMethod(method)
		);

		if (preferredMethod) {
			return preferredMethod;
		}
	}

	return methods.find(isActiveMfaMethod) || null;
};

const getPreferredSmsMethod = (user) => {
	const methods = Array.isArray(user?.mfa?.methods) ? user.mfa.methods : [];
	return (
		methods.find(
			(method) => method?.type === MFA_METHOD_SMS && !method?.disabledAt
		) || null
	);
};

const ensureSmsPhone = (phone) => {
	const normalizedPhone = normalizePhoneNumber(phone);

	if (!normalizedPhone) {
		throw createMfaError("Phone number is required", "MFA_PHONE_REQUIRED", 400);
	}

	return normalizedPhone;
};

const ensureEmailAddress = (email) => {
	const normalizedEmail = normalizeEmailAddress(email);

	if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
		throw createMfaError("Email address is required", "MFA_EMAIL_REQUIRED", 400);
	}

	return normalizedEmail;
};

const buildChallengePayload = (challenge) => ({
	challengeId: String(challenge._id),
	step: "otp",
	methodType: challenge.methodType,
	maskedDestination:
		challenge.methodType === MFA_METHOD_EMAIL
			? challenge.destination?.maskedEmail || ""
			: challenge.destination?.maskedPhone || "",
	cooldownRemainingSeconds: getCooldownRemainingSeconds(
		challenge.resendAvailableAt
	),
	expiresInSeconds: Math.max(
		0,
		Math.ceil(
			(new Date(challenge.expiresAt).getTime() - Date.now()) / 1000
		)
	),
		scope: challenge.scope,
	});

const serializeMfaOtpCodeForAdmin = (record, config = null) => {
	const row = typeof record.toObject === "function" ? record.toObject() : { ...record };
	let decryptedCode = null;

	try {
		decryptedCode = decryptOtpCode(row, config);
	} catch (error) {
		decryptedCode = null;
	}

	return {
		...row,
		code: decryptedCode,
		cooldownRemainingSeconds: getCooldownRemainingSeconds(row.resendAvailableAt),
	};
};

const supersedeActiveOtpCodes = async ({ userId, scope, excludeId = null, now = new Date() }) => {
	const query = {
		user: userId,
		scope,
		status: { $in: [...ACTIVE_OTP_STATUSES] },
	};

	if (excludeId) {
		query._id = { $ne: excludeId };
	}

	await MfaOtpCode.updateMany(query, {
		$set: {
			status: "superseded",
			supersededAt: now,
			updatedAt: now,
		},
	});
};

const issueOtp = async ({
	user,
	scope,
	phone,
	email,
	methodType = MFA_METHOD_SMS,
	metadata = {},
	providerName = null,
}) => {
	if (!user?._id) {
		throw createMfaError("User is required", "MFA_USER_REQUIRED", 400);
	}

	const normalizedMethodType = normalizeMfaMethodType(methodType);
	const otpConfig = await getSmsOtpConfig();
	const code = generateOtpCode();
	const codeWindow = createOtpWindow(undefined, otpConfig);
	const encryptedCode = encryptOtpCode(code, otpConfig);
	const codeHash = createOtpHash(code, otpConfig);
	const now = codeWindow.issuedAt;
	const destination = {};
	const resolvedProviderName =
		providerName ||
		(normalizedMethodType === MFA_METHOD_EMAIL ? "smtp" : "uipapp");
	const requestId = metadata?.requestId || crypto.randomUUID();
	let normalizedPhone = "";
	let normalizedEmail = "";

	if (normalizedMethodType === MFA_METHOD_EMAIL) {
		normalizedEmail = ensureEmailAddress(
			email || user?.local?.email || user?.email
		);
		destination.email = normalizedEmail;
		destination.maskedEmail = maskEmailAddress(normalizedEmail);
	} else {
		normalizedPhone = ensureSmsPhone(phone);
		destination.phone = normalizedPhone;
		destination.maskedPhone = maskPhoneNumber(normalizedPhone);
	}

	await supersedeActiveOtpCodes({
		userId: user._id,
		scope,
		now,
	});

	const challenge = await MfaOtpCode.create({
		user: user._id,
		scope,
		methodType: normalizedMethodType,
		destination,
		codeHash,
		...encryptedCode,
		provider: {
			name: resolvedProviderName,
		},
		status: "pending",
		expiresAt: codeWindow.expiresAt,
		resendAvailableAt: codeWindow.resendAvailableAt,
		maxAttempts: getOtpMaxAttempts(otpConfig),
		metadata: metadata && typeof metadata === "object" ? metadata : {},
	});

	try {
		let providerResult = {};

		if (normalizedMethodType === MFA_METHOD_EMAIL) {
			const frontendBase =
				(process.env.SERVER_FRONTEND_URL || "")
					.split(",")[0]
					.trim()
					.replace(/\/+$/, "") || "";

			providerResult = await sendTemplatedEmail({
				to: normalizedEmail,
				type: "emailOtp",
				vars: {
					username:
						user.username ||
						user.name ||
						user?.local?.email ||
						normalizedEmail,
					email: normalizedEmail,
					otpCode: code,
					token: code,
					expiresInMinutes: Math.ceil(
						getOtpLifetimeMs(otpConfig) / (60 * 1000)
					),
					siteUrl: frontendBase,
				},
			});
		} else {
			providerResult = await sendSms({
				phoneNumbers: [normalizedPhone],
				message: code,
				smsConfig: otpConfig,
			});
		}

		challenge.provider = {
			...challenge.provider,
			name: resolvedProviderName,
			reportId: providerResult.reportId,
			messageId: providerResult.messageId,
		};
		challenge.status = "sent";
		challenge.sentAt = now;
		challenge.error = undefined;
		await challenge.save();

		console.info("[MFA issue-otp] provider dispatch succeeded", {
			requestId,
			userId: String(user._id),
			challengeId: String(challenge._id),
			methodType: normalizedMethodType,
			provider: resolvedProviderName,
			reportId: providerResult.reportId || null,
			messageId: providerResult.messageId || null,
		});

		return challenge;
	} catch (error) {
		console.error("[MFA issue-otp] provider dispatch failed", {
			requestId,
			userId: String(user._id),
			challengeId: String(challenge._id),
			scope,
			methodType: normalizedMethodType,
			provider: resolvedProviderName,
			maskedDestination:
				destination.maskedEmail || destination.maskedPhone || null,
			code: error.code || null,
			status: error.status || error.response?.status || 502,
			message: error.message || "Failed to send OTP",
			stack: error.stack,
		});

		challenge.status = "failed";
		challenge.failedAt = new Date();
		challenge.error = {
			code:
				error.code ||
				(normalizedMethodType === MFA_METHOD_EMAIL
					? "MFA_EMAIL_SEND_FAILED"
					: "MFA_SMS_SEND_FAILED"),
			message: error.message || "Failed to send OTP",
		};
		await challenge.save();

		throw createMfaError(
			error.message || "Failed to send OTP",
			error.code ||
				(normalizedMethodType === MFA_METHOD_EMAIL
					? "MFA_EMAIL_SEND_FAILED"
					: "MFA_SMS_SEND_FAILED"),
			error.status || 502
		);
	}
};

const getOtpChallenge = async ({ challengeId, userId = null }) => {
	if (!isValidObjectId(challengeId)) {
		throw createMfaError("OTP challenge not found", "OTP_CHALLENGE_NOT_FOUND", 404);
	}

	const query = { _id: challengeId };
	if (userId) {
		query.user = userId;
	}

	const challenge = await MfaOtpCode.findOne(query);

	if (!challenge) {
		throw createMfaError("OTP challenge not found", "OTP_CHALLENGE_NOT_FOUND", 404);
	}

	return challenge;
};

const resendOtp = async ({ challengeId, userId = null }) => {
	const challenge = await getOtpChallenge({ challengeId, userId });

	if (TERMINAL_OTP_STATUSES.has(challenge.status) && challenge.status !== "failed") {
		throw createMfaError(
			"OTP challenge is no longer active",
			"OTP_CHALLENGE_INACTIVE",
			400
		);
	}

	const cooldownRemainingSeconds = getCooldownRemainingSeconds(
		challenge.resendAvailableAt
	);

	if (cooldownRemainingSeconds > 0 && challenge.status !== "failed") {
		throw createMfaError(
			"OTP resend cooldown is still active",
			"OTP_RESEND_COOLDOWN",
			429,
			{ cooldownRemainingSeconds }
		);
	}

	return issueOtp({
		user: { _id: challenge.user },
		scope: challenge.scope,
		phone: challenge.destination?.phone,
		email: challenge.destination?.email,
		methodType: challenge.methodType,
		metadata: {
			...(challenge.metadata || {}),
			resendOf: String(challenge._id),
		},
		providerName:
			challenge.provider?.name ||
			(challenge.methodType === MFA_METHOD_EMAIL ? "smtp" : "uipapp"),
	});
};

const validateOtp = async ({ challengeId, code, userId = null }) => {
	const challenge = await getOtpChallenge({ challengeId, userId });
	const now = new Date();

	if (TERMINAL_OTP_STATUSES.has(challenge.status)) {
		throw createMfaError(
			"OTP challenge is no longer active",
			"OTP_CHALLENGE_INACTIVE",
			400
		);
	}

	if (hasOtpExpired(challenge.expiresAt, now)) {
		challenge.status = "expired";
		await challenge.save();

		throw createMfaError("OTP has expired", "OTP_CHALLENGE_EXPIRED", 400);
	}

	if (challenge.attemptCount >= challenge.maxAttempts) {
		challenge.status = "failed";
		challenge.failedAt = now;
		await challenge.save();

		throw createMfaError(
			"OTP attempt limit reached",
			"OTP_ATTEMPTS_EXCEEDED",
			429
		);
	}

	const smsOtpConfig = await getSmsOtpConfig();

	if (!compareOtpCode(challenge.codeHash, code, smsOtpConfig)) {
		challenge.attemptCount += 1;

		if (challenge.attemptCount >= challenge.maxAttempts) {
			challenge.status = "failed";
			challenge.failedAt = now;
		}

		await challenge.save();

		throw createMfaError("Invalid OTP code", "OTP_INVALID_CODE", 400);
	}

	challenge.attemptCount += 1;
	challenge.status = "validated";
	challenge.validatedAt = now;
	await challenge.save();

	return challenge;
};

const buildSmsMethod = ({ existingMethod = null, phone, label, now = new Date() }) => ({
	id: existingMethod?.id || crypto.randomBytes(12).toString("hex"),
	type: MFA_METHOD_SMS,
	phone,
	phoneMasked: maskPhoneNumber(phone),
	label: label || existingMethod?.label || "Primary phone",
	verifiedAt: now,
	enabledAt: existingMethod?.enabledAt || now,
	disabledAt: null,
	createdAt: existingMethod?.createdAt || now,
	updatedAt: now,
});

const buildEmailMethod = ({ existingMethod = null, email, label, now = new Date() }) => ({
	id: existingMethod?.id || crypto.randomBytes(12).toString("hex"),
	type: MFA_METHOD_EMAIL,
	email,
	emailMasked: maskEmailAddress(email),
	label: label || existingMethod?.label || "Primary email",
	verifiedAt: now,
	enabledAt: existingMethod?.enabledAt || now,
	disabledAt: null,
	createdAt: existingMethod?.createdAt || now,
	updatedAt: now,
});

const enableSmsMfaForUser = async ({ userId, phone, label = "Primary phone" }) => {
	const normalizedPhone = ensureSmsPhone(phone);
	const user = await User.findById(userId);

	if (!user) {
		throw createMfaError("User not found", "MFA_USER_NOT_FOUND", 404);
	}

	const now = new Date();
	const methods = Array.isArray(user.mfa?.methods) ? [...user.mfa.methods] : [];
	const existingMethodIndex = methods.findIndex(
		(method) => method?.type === MFA_METHOD_SMS
	);
	const existingMethod = existingMethodIndex >= 0 ? methods[existingMethodIndex] : null;
	const smsMethod = buildSmsMethod({ existingMethod, phone: normalizedPhone, label, now });

	if (existingMethodIndex >= 0) {
		methods[existingMethodIndex] = smsMethod;
	} else {
		methods.push(smsMethod);
	}

	user.mfa = {
		...(user.mfa?.toObject ? user.mfa.toObject() : user.mfa || {}),
		enabled: true,
		preferredMethodId: smsMethod.id,
		methods,
		lastVerifiedAt: now,
		disabledAt: null,
		updatedAt: now,
	};
	user.phone = normalizedPhone;
	await user.save();

	return user;
};

const enableEmailMfaForUser = async ({ userId, email, label = "Primary email" }) => {
	const normalizedEmail = ensureEmailAddress(email);
	const user = await User.findById(userId);

	if (!user) {
		throw createMfaError("User not found", "MFA_USER_NOT_FOUND", 404);
	}

	const now = new Date();
	const methods = Array.isArray(user.mfa?.methods) ? [...user.mfa.methods] : [];
	const existingMethodIndex = methods.findIndex(
		(method) => method?.type === MFA_METHOD_EMAIL
	);
	const existingMethod = existingMethodIndex >= 0 ? methods[existingMethodIndex] : null;
	const emailMethod = buildEmailMethod({
		existingMethod,
		email: normalizedEmail,
		label,
		now,
	});

	if (existingMethodIndex >= 0) {
		methods[existingMethodIndex] = emailMethod;
	} else {
		methods.push(emailMethod);
	}

	user.mfa = {
		...(user.mfa?.toObject ? user.mfa.toObject() : user.mfa || {}),
		enabled: true,
		preferredMethodId: emailMethod.id,
		methods,
		lastVerifiedAt: now,
		disabledAt: null,
		updatedAt: now,
	};
	if (user.local) {
		user.local.email = normalizedEmail;
		user.local.emailVerified = true;
	}
	await user.save();

	return user;
};

const disableMfaForUser = async ({ userId }) => {
	const user = await User.findById(userId);

	if (!user) {
		throw createMfaError("User not found", "MFA_USER_NOT_FOUND", 404);
	}

	const now = new Date();
	const methods = Array.isArray(user.mfa?.methods)
		? user.mfa.methods.map((method) => ({
				...method.toObject?.(),
				disabledAt: now,
				updatedAt: now,
		  }))
		: [];

	user.mfa = {
		...(user.mfa?.toObject ? user.mfa.toObject() : user.mfa || {}),
		enabled: false,
		methods,
		lastVerifiedAt: now,
		disabledAt: now,
		updatedAt: now,
	};

	await user.save();
	await MfaOtpCode.updateMany(
		{ user: user._id, status: { $in: [...ACTIVE_OTP_STATUSES] } },
		{
			$set: {
				status: "cancelled",
				updatedAt: now,
			},
		}
	);

	return user;
};

const changeSmsMfaPhoneForUser = async ({ userId, phone }) => {
	const normalizedPhone = ensureSmsPhone(phone);
	const user = await User.findById(userId);

	if (!user) {
		throw createMfaError("User not found", "MFA_USER_NOT_FOUND", 404);
	}

	const currentMethod = getPreferredSmsMethod(user);
	const now = new Date();
	const methods = Array.isArray(user.mfa?.methods) ? [...user.mfa.methods] : [];
	const nextMethod = buildSmsMethod({
		existingMethod: currentMethod,
		phone: normalizedPhone,
		label: currentMethod?.label || "Primary phone",
		now,
	});
	const currentIndex = methods.findIndex((method) => method?.id === nextMethod.id);

	if (currentIndex >= 0) {
		methods[currentIndex] = nextMethod;
	} else {
		methods.push(nextMethod);
	}

	user.mfa = {
		...(user.mfa?.toObject ? user.mfa.toObject() : user.mfa || {}),
		enabled: true,
		preferredMethodId: nextMethod.id,
		methods,
		lastVerifiedAt: now,
		disabledAt: null,
		updatedAt: now,
	};
	user.phone = normalizedPhone;
	await user.save();

	return user;
};

const applyValidatedMfaChallenge = async (challenge) => {
	const normalizedScope = String(challenge?.scope || "").trim();

	switch (normalizedScope) {
		case "enable":
			if (challenge.methodType === MFA_METHOD_EMAIL) {
				return enableEmailMfaForUser({
					userId: challenge.user,
					email: challenge.destination?.email,
					label: challenge.metadata?.label,
				});
			}

			return enableSmsMfaForUser({
				userId: challenge.user,
				phone: challenge.destination?.phone,
				label: challenge.metadata?.label,
			});
		case "disable":
			return disableMfaForUser({ userId: challenge.user });
		case "change-phone":
			return changeSmsMfaPhoneForUser({
				userId: challenge.user,
				phone: challenge.destination?.phone,
			});
		default:
			return null;
	}
};

const getUserMfaSummary = (user) => {
	const method = getPreferredMfaMethod(user);
	const methodType = method?.type || null;
	const phone = methodType === MFA_METHOD_SMS
		? method?.phone || normalizePhoneNumber(user?.phone || "")
		: "";
	const email = methodType === MFA_METHOD_EMAIL
		? method?.email || normalizeEmailAddress(user?.local?.email || user?.email || "")
		: "";

	return {
		enabled: Boolean(user?.mfa?.enabled && method),
		preferredMethodId: user?.mfa?.preferredMethodId || method?.id || null,
		preferredMethodType: methodType,
		maskedDestination:
			methodType === MFA_METHOD_EMAIL
				? method?.emailMasked || maskEmailAddress(email)
				: method?.phoneMasked || maskPhoneNumber(phone),
		maskedPhone: method?.phoneMasked || maskPhoneNumber(phone),
		phone,
		maskedEmail: method?.emailMasked || maskEmailAddress(email),
		email,
	};
};

const getMfaCodesForUser = async ({ userId, page = 1, limit = 20 }) => {
	const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
	const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
	const skip = (safePage - 1) * safeLimit;

	const [items, total] = await Promise.all([
		MfaOtpCode.find({ user: userId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(safeLimit)
			.lean(),
		MfaOtpCode.countDocuments({ user: userId }),
	]);
	const smsOtpConfig = await getSmsOtpConfig();

	return {
		items: items.map((item) => serializeMfaOtpCodeForAdmin(item, smsOtpConfig)),
		total,
		page: safePage,
		limit: safeLimit,
	};
};

module.exports = {
	ACTIVE_OTP_STATUSES,
	applyValidatedMfaChallenge,
	buildChallengePayload,
	changeSmsMfaPhoneForUser,
	createMfaError,
	disableMfaForUser,
	enableEmailMfaForUser,
	enableSmsMfaForUser,
	getMfaCodesForUser,
	getOtpChallenge,
	getPreferredMfaMethod,
	getPreferredSmsMethod,
	getUserMfaSummary,
	issueOtp,
	normalizeMfaMethodType,
	resendOtp,
	serializeMfaOtpCodeForAdmin,
	validateOtp,
};
