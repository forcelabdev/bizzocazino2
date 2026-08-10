const SiteSettings = require("../database/models/SiteSettings");

const DEFAULT_UIPAPP_BASE_URL =
	"https://sms.uipapp.com/api/v1/hub/index.php";
const LEGACY_UIPAPP_BASE_URL =
	"https://www.dise.uipapp.com/api/international-sms/";
const DEFAULT_OTP_TTL_MS = 5 * 60 * 1000;
const DEFAULT_RESEND_COOLDOWN_MS = 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

const getPositiveNumber = (value, fallback) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPreferredString = (value, fallback = "") => {
	const normalized = String(value ?? "").trim();
	return normalized || fallback;
};

const getUipappEndpoint = (value) => {
	const endpoint = getPreferredString(
		value,
		getPreferredString(process.env.UIPAPP_SMS_BASE_URL, DEFAULT_UIPAPP_BASE_URL)
	);

	// Mongoose default değişikliği mevcut dokümanlardaki eski URL'yi güncellemez.
	return endpoint.replace(/\/+$/, "") === LEGACY_UIPAPP_BASE_URL.replace(/\/+$/, "")
		? DEFAULT_UIPAPP_BASE_URL
		: endpoint;
};

const buildStoredSmsOtpConfig = (smsOtp = {}) => ({
	apiKey: getPreferredString(
		smsOtp.apiKey,
		getPreferredString(
			process.env.UIPAPP_SMS_API_KEY,
			// Eski kaydı yalnızca kesintisiz yönetim paneli geçişi için oku.
			getPreferredString(smsOtp.userToken, process.env.UIPAPP_SMS_USER_TOKEN)
		)
	),
	baseUrl: getUipappEndpoint(smsOtp.baseUrl),
	otpTtlMs: getPositiveNumber(
		smsOtp.otpTtlMs,
		getPositiveNumber(process.env.MFA_OTP_TTL_MS, DEFAULT_OTP_TTL_MS)
	),
	resendCooldownMs: getPositiveNumber(
		smsOtp.resendCooldownMs,
		getPositiveNumber(
			process.env.MFA_OTP_RESEND_COOLDOWN_MS,
			DEFAULT_RESEND_COOLDOWN_MS
		)
	),
	maxAttempts: getPositiveNumber(
		smsOtp.maxAttempts,
		getPositiveNumber(process.env.MFA_OTP_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS)
	),
	encryptionKey: getPreferredString(
		smsOtp.encryptionKey,
		getPreferredString(process.env.MFA_OTP_ENCRYPTION_KEY)
	),
	hashSecret: getPreferredString(
		smsOtp.hashSecret,
		getPreferredString(process.env.MFA_OTP_HASH_SECRET)
	),
});

const getStoredSmsOtpConfig = async () => {
	try {
		const siteSettings = await SiteSettings.findOne()
			.select("smsOtp")
			.lean();

		return buildStoredSmsOtpConfig(siteSettings?.smsOtp || {});
	} catch (error) {
		console.error("SMS OTP ayarları yüklenirken hata:", error);
		return buildStoredSmsOtpConfig();
	}
};

const getSmsOtpConfig = async () => {
	const config = await getStoredSmsOtpConfig();

	return {
		...config,
		hashSecret:
			config.hashSecret ||
			config.encryptionKey ||
			String(
				process.env.TOKEN_SECRET ||
					process.env.JWT_SECRET ||
					"mfa-otp-fallback-secret"
			),
	};
};

module.exports = {
	DEFAULT_MAX_ATTEMPTS,
	DEFAULT_OTP_TTL_MS,
	DEFAULT_RESEND_COOLDOWN_MS,
	DEFAULT_UIPAPP_BASE_URL,
	getSmsOtpConfig,
	getStoredSmsOtpConfig,
};
