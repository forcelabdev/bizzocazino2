const crypto = require("crypto");

const MFA_METHOD_SMS = "sms";
const MFA_METHOD_EMAIL = "email";
const MFA_OTP_LENGTH = 6;
const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000;
const DEFAULT_RESEND_COOLDOWN_MS = 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

const getNumericEnv = (value, fallback) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getOtpLifetimeMs = (config = null) =>
	getNumericEnv(config?.otpTtlMs, DEFAULT_OTP_TTL_MS);

const getOtpCooldownMs = (config = null) =>
	getNumericEnv(config?.resendCooldownMs, DEFAULT_RESEND_COOLDOWN_MS);

const getOtpMaxAttempts = (config = null) =>
	getNumericEnv(config?.maxAttempts, DEFAULT_MAX_ATTEMPTS);

const normalizePhoneNumber = (phone) => {
	if (phone === undefined || phone === null) return "";

	const trimmed = String(phone).trim();
	if (!trimmed) return "";

	const compact = trimmed.replace(/[\s().-]/g, "");

	if (compact.startsWith("00")) {
		return `+${compact.slice(2).replace(/\D/g, "")}`;
	}

	if (compact.startsWith("+")) {
		return `+${compact.slice(1).replace(/\D/g, "")}`;
	}

	return compact.replace(/\D/g, "");
};

const normalizeEmailAddress = (email) =>
	String(email ?? "")
		.trim()
		.toLowerCase();

const maskPhoneNumber = (phone) => {
	const normalized = normalizePhoneNumber(phone);
	if (!normalized) return "";

	const hasPlus = normalized.startsWith("+");
	const digits = normalized.replace(/^\+/, "");

	if (digits.length <= 3) {
		return normalized;
	}

	const visible = digits.slice(-3);
	const maskedDigits = `${"*".repeat(digits.length - 3)}${visible}`;

	return hasPlus ? `+${maskedDigits}` : maskedDigits;
};

const maskEmailAddress = (email) => {
	const normalized = normalizeEmailAddress(email);
	if (!normalized || !normalized.includes("@")) return "";

	const [localPart, domain] = normalized.split("@");
	if (!localPart || !domain) return normalized;

	const visibleLocal = localPart.slice(0, Math.min(2, localPart.length));
	const maskedLocal = `${visibleLocal}${"*".repeat(
		Math.max(1, localPart.length - visibleLocal.length)
	)}`;

	return `${maskedLocal}@${domain}`;
};

const generateOtpCode = (length = MFA_OTP_LENGTH) => {
	const min = 10 ** (length - 1);
	const max = 10 ** length;

	return String(crypto.randomInt(min, max));
};

const getEncryptionSecret = (config = null) => {
	const secret = config?.encryptionKey;

	if (!secret) {
		throw new Error("MFA OTP encryption key is not configured");
	}

	return crypto.createHash("sha256").update(String(secret)).digest();
};

const getHashSecret = (config = null) =>
	String(
		config?.hashSecret ||
			config?.encryptionKey ||
			process.env.TOKEN_SECRET ||
			process.env.JWT_SECRET ||
			"mfa-otp-fallback-secret"
	);

const createOtpHash = (code, config = null) =>
	crypto
		.createHmac("sha256", getHashSecret(config))
		.update(String(code))
		.digest("hex");

const encryptOtpCode = (code, config = null) => {
	const key = getEncryptionSecret(config);
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

	const encrypted = Buffer.concat([
		cipher.update(String(code), "utf8"),
		cipher.final(),
	]);

	return {
		encryptedCode: encrypted.toString("base64"),
		encryptionIv: iv.toString("base64"),
		encryptionTag: cipher.getAuthTag().toString("base64"),
	};
};

const decryptOtpCode = (
	{ encryptedCode, encryptionIv, encryptionTag },
	config = null
) => {
	const key = getEncryptionSecret(config);
	const decipher = crypto.createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(String(encryptionIv), "base64")
	);

	decipher.setAuthTag(Buffer.from(String(encryptionTag), "base64"));

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(String(encryptedCode), "base64")),
		decipher.final(),
	]);

	return decrypted.toString("utf8");
};

const compareOtpCode = (storedHash, code, config = null) => {
	const providedHash = createOtpHash(code, config);
	const left = Buffer.from(String(storedHash), "utf8");
	const right = Buffer.from(String(providedHash), "utf8");

	if (left.length !== right.length) {
		return false;
	}

	return crypto.timingSafeEqual(left, right);
};

const createOtpWindow = (baseDate = new Date(), config = null) => {
	const issuedAt = new Date(baseDate);
	return {
		issuedAt,
		expiresAt: new Date(issuedAt.getTime() + getOtpLifetimeMs(config)),
		resendAvailableAt: new Date(
			issuedAt.getTime() + getOtpCooldownMs(config)
		),
	};
};

const getCooldownRemainingSeconds = (resendAvailableAt, now = new Date()) => {
	if (!resendAvailableAt) return 0;

	const diffMs = new Date(resendAvailableAt).getTime() - new Date(now).getTime();

	if (diffMs <= 0) return 0;

	return Math.ceil(diffMs / 1000);
};

const hasOtpExpired = (expiresAt, now = new Date()) => {
	if (!expiresAt) return true;
	return new Date(expiresAt).getTime() <= new Date(now).getTime();
};

module.exports = {
	MFA_METHOD_EMAIL,
	MFA_METHOD_SMS,
	createOtpHash,
	createOtpWindow,
	compareOtpCode,
	decryptOtpCode,
	encryptOtpCode,
	generateOtpCode,
	getCooldownRemainingSeconds,
	getOtpCooldownMs,
	getOtpLifetimeMs,
	getOtpMaxAttempts,
	hasOtpExpired,
	maskEmailAddress,
	maskPhoneNumber,
	normalizeEmailAddress,
	normalizePhoneNumber,
};