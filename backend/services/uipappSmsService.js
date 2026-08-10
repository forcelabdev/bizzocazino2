const axios = require("axios");
const {
	DEFAULT_UIPAPP_BASE_URL,
	getSmsOtpConfig,
} = require("./smsOtpConfigService");

const UIPAPP_TIMEOUT_MS = 50 * 1000;

const createSmsServiceError = (message, code = "SMS_SERVICE_ERROR", status = 500) => {
	const error = new Error(message);
	error.code = code;
	error.status = status;
	return error;
};
const getUipappConfig = async (smsConfig = null) => {
	const resolvedConfig = smsConfig || (await getSmsOtpConfig());
	const apiKey = resolvedConfig.apiKey;

	if (!apiKey) {
		throw createSmsServiceError(
			"SMS API key is not configured",
			"SMS_PROVIDER_NOT_CONFIGURED",
			500
		);
	}

	return {
		baseUrl: String(resolvedConfig.baseUrl || DEFAULT_UIPAPP_BASE_URL).trim(),
		apiKey,
	};
};

const postToUipapp = async (payload, smsConfig = null) => {
	const { baseUrl, apiKey } = await getUipappConfig(smsConfig);

	try {
		const response = await axios.post(baseUrl, payload, {
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			timeout: UIPAPP_TIMEOUT_MS,
		});

		return response.data;
	} catch (error) {
		const providerMessage =
			error.response?.data?.message ||
			error.response?.data?.error ||
			error.message ||
			"UIPAPP request failed";

		throw createSmsServiceError(
			providerMessage,
			"SMS_PROVIDER_REQUEST_FAILED",
			error.response?.status || 502
		);
	}
};

const normalizeNumbers = (phoneNumbers) => {
	if (!Array.isArray(phoneNumbers) || !phoneNumbers.length) {
		throw createSmsServiceError(
			"At least one phone number is required",
			"SMS_PHONE_REQUIRED",
			400
		);
	}

	const normalizedNumbers = phoneNumbers
		.map((number) => String(number || "").trim())
		.filter(Boolean);

	if (!normalizedNumbers.length) {
		throw createSmsServiceError(
			"At least one phone number is required",
			"SMS_PHONE_REQUIRED",
			400
		);
	}

	return normalizedNumbers;
};

const ensureSuccessfulResponse = (payload, fallbackMessage) => {
	if (payload && String(payload.status || "").toLowerCase() === "success") {
		return payload;
	}

	throw createSmsServiceError(
		payload?.message || fallbackMessage,
		"SMS_PROVIDER_REJECTED",
		502
	);
};

const sendSms = async ({ phoneNumbers, message, smsConfig = null }) => {
	const config = await getUipappConfig(smsConfig);
	const otpCode = String(message || "").trim();
	if (!/^\d+$/.test(otpCode)) {
		throw createSmsServiceError(
			"OTP message must contain digits only",
			"SMS_OTP_CODE_INVALID",
			400
		);
	}

	const payload = await postToUipapp(
		{
			action: "send",
			message: otpCode,
			numbers: normalizeNumbers(phoneNumbers),
		},
		config
	);

	const result = ensureSuccessfulResponse(payload, "SMS submission failed");

	return {
		provider: "uipapp",
		reportId: result.batch_id ? String(result.batch_id) : null,
		raw: result,
	};
};

const getSmsBalance = async () => {
	const config = await getUipappConfig();
	const payload = await postToUipapp({ action: "balance" }, config);

	const result = ensureSuccessfulResponse(payload, "SMS balance request failed");

	return {
		balance: result.balance,
		balanceUsd: result.balance_usd,
		billingMode: result.billing_mode,
		raw: result,
	};
};

const getSmsReport = async ({ reportId }) => {
	const config = await getUipappConfig();
	const payload = await postToUipapp(
		{
			action: "reports",
			campaign_id: reportId,
		},
		config
	);

	const result = ensureSuccessfulResponse(payload, "SMS report request failed");

	return {
		campaignId: result.campaign_id,
		status: result.general_status,
		date: result.date,
		details: result.details || [],
		raw: result,
	};
};

module.exports = {
	getSmsBalance,
	getSmsReport,
	getUipappConfig,
	sendSms,
	UIPAPP_BASE_URL: DEFAULT_UIPAPP_BASE_URL,
};
