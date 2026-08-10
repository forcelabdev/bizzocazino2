const axios = require("axios");
const SiteSettings = require("../database/models/SiteSettings");

const DEFAULT_ADMIN_API_SETTINGS = {
	betinoviReports: {
		enabled: true,
		baseUrl: "",
		agentCode: "",
		agentToken: "",
		currencyCode: "TRY",
		timeoutMs: 30000,
		methods: {
			wagerIndex: "ReportById",
			byAgent: "ReportByDate",
			byVendor: "ReportByDate",
			settlement: "ReportByDate",
			riskUsers: "ReportByDate",
		},
	},
	controlGame: {
		enabled: true,
		baseUrl: "",
		agentCode: "",
		agentToken: "",
		currencyCode: "TRY",
		timeoutMs: 30000,
		methods: {
			onlineUsers: "GetCurrentPlayers",
			callList: "GetCallList",
			callHistory: "GetCallHistory",
			applyCall: "CallApply",
			cancelCall: "CallCancel",
			getUserSetting: "GetUserSetting",
			changeUserSetting: "ChangeUserSetting",
			getAgentSetting: "GetAgentSetting",
			changeAgentSetting: "ChangeAgentSetting",
		},
	},
};

const METHOD_ALIASES = {
	betinoviReports: {
		getriskusers: "ReportByDate",
	},
	controlGame: {
		getplayingusers: "GetCurrentPlayers",
		getcallresult: "GetCallList",
		givecall: "CallApply",
	},
};

const ENV_FALLBACK = {
	baseUrl: "BETINOVI_API_ENDPOINT",
	agentCode: "BETINOVI_AGENT_CODE",
	agentToken: "BETINOVI_AGENT_TOKEN",
};

const toPlainObject = (value) => {
	if (!value) return {};
	if (typeof value.toObject === "function") return value.toObject();
	return value;
};

const normalizeString = (value) => String(value || "").trim();

const normalizeMethodName = (sectionKey, method) => {
	const methodName = normalizeString(method);
	const alias = METHOD_ALIASES[sectionKey]?.[methodName.toLowerCase()];

	return alias || methodName;
};

const normalizeTimeoutMs = (value, fallback = 30000) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed >= 1000 ? parsed : fallback;
};

const normalizeSection = (sectionKey, section = {}, defaults = {}) => {
	const source = toPlainObject(section);
	const defaultMethods = defaults.methods || {};
	const sourceMethods = toPlainObject(source.methods);
	const legacyMethods = {
		callList: sourceMethods.callResult,
		applyCall: sourceMethods.giveCall,
	};

	const methods = Object.entries(defaultMethods).reduce(
		(acc, [key, defaultMethod]) => {
			acc[key] = normalizeMethodName(
				sectionKey,
				normalizeString(sourceMethods[key] || legacyMethods[key]) || defaultMethod,
			);
			return acc;
		},
		{},
	);

	return {
		enabled:
			source.enabled !== undefined ? Boolean(source.enabled) : defaults.enabled,
		baseUrl: normalizeString(source.baseUrl),
		agentCode: normalizeString(source.agentCode),
		agentToken: normalizeString(source.agentToken),
		currencyCode:
			normalizeString(source.currencyCode || defaults.currencyCode).toUpperCase() ||
			"TRY",
		timeoutMs: normalizeTimeoutMs(source.timeoutMs, defaults.timeoutMs),
		methods,
	};
};

const normalizeAdminApiSettings = (apiSettings = {}) => {
	const source = toPlainObject(apiSettings);

	return {
		betinoviReports: normalizeSection(
			"betinoviReports",
			source.betinoviReports,
			DEFAULT_ADMIN_API_SETTINGS.betinoviReports,
		),
		controlGame: normalizeSection(
			"controlGame",
			source.controlGame,
			DEFAULT_ADMIN_API_SETTINGS.controlGame,
		),
	};
};

const withEnvFallbackMeta = (section) => ({
	...section,
	envFallbacks: {
		baseUrl: !section.baseUrl && Boolean(process.env[ENV_FALLBACK.baseUrl]),
		agentCode:
			!section.agentCode && Boolean(process.env[ENV_FALLBACK.agentCode]),
		agentToken:
			!section.agentToken && Boolean(process.env[ENV_FALLBACK.agentToken]),
	},
});

const getClientAdminApiSettings = async () => {
	const siteSettings = await SiteSettings.findOne().lean();
	const settings = normalizeAdminApiSettings(siteSettings?.apiSettings);

	return {
		betinoviReports: withEnvFallbackMeta(settings.betinoviReports),
		controlGame: withEnvFallbackMeta(settings.controlGame),
	};
};

const saveClientAdminApiSettings = async (payload = {}) => {
	let siteSettings = await SiteSettings.findOne();
	if (!siteSettings) siteSettings = new SiteSettings();

	const existing = normalizeAdminApiSettings(siteSettings.apiSettings);
	const incoming = toPlainObject(payload);

	const nextSettings = {
		betinoviReports: normalizeSection(
			"betinoviReports",
			{
				...existing.betinoviReports,
				...toPlainObject(incoming.betinoviReports),
				methods: {
					...existing.betinoviReports.methods,
					...toPlainObject(incoming.betinoviReports?.methods),
				},
			},
			DEFAULT_ADMIN_API_SETTINGS.betinoviReports,
		),
		controlGame: normalizeSection(
			"controlGame",
			{
				...existing.controlGame,
				...toPlainObject(incoming.controlGame),
				methods: {
					...existing.controlGame.methods,
					...toPlainObject(incoming.controlGame?.methods),
				},
			},
			DEFAULT_ADMIN_API_SETTINGS.controlGame,
		),
	};

	siteSettings.apiSettings = nextSettings;
	siteSettings.markModified("apiSettings");
	await siteSettings.save();

	return getClientAdminApiSettings();
};

const resolveRuntimeConfig = async (sectionKey) => {
	const siteSettings = await SiteSettings.findOne().lean();
	const settings = normalizeAdminApiSettings(siteSettings?.apiSettings);
	const section = settings[sectionKey];

	if (!section) {
		const error = new Error("Geçersiz Betinovi admin API alanı.");
		error.statusCode = 400;
		throw error;
	}

	if (!section.enabled) {
		const error = new Error("Bu Betinovi admin API alanı pasif durumda.");
		error.statusCode = 400;
		throw error;
	}

	const config = {
		...section,
		baseUrl: section.baseUrl || process.env[ENV_FALLBACK.baseUrl] || "",
		agentCode:
			section.agentCode || process.env[ENV_FALLBACK.agentCode] || "",
		agentToken:
			section.agentToken || process.env[ENV_FALLBACK.agentToken] || "",
	};

	if (!config.baseUrl || !config.agentCode || !config.agentToken) {
		const error = new Error(
			"Betinovi API URL, agent kodu veya token bilgisi eksik.",
		);
		error.statusCode = 400;
		throw error;
	}

	return config;
};

const sanitizePayload = (payload = {}) => {
	const sanitized = {};

	for (const [key, value] of Object.entries(payload || {})) {
		if (["method", "token", "agentCode"].includes(key)) continue;
		if (value === undefined || value === null || value === "") continue;
		sanitized[key] = value;
	}

	return sanitized;
};

const cleanPayload = (payload = {}, keepEmptyKeys = []) => {
	const keepEmpty = new Set(keepEmptyKeys);
	const cleaned = {};

	for (const [key, value] of Object.entries(payload || {})) {
		if (value === undefined || value === null) continue;
		if (value === "" && !keepEmpty.has(key)) continue;
		cleaned[key] = value;
	}

	return cleaned;
};

const toInteger = (value, fallback = 0) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : value;
};

const padDatePart = (value) => String(value).padStart(2, "0");

const formatDateObject = (date) => {
	const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

	return [
		`${safeDate.getUTCFullYear()}-${padDatePart(
			safeDate.getUTCMonth() + 1,
		)}-${padDatePart(safeDate.getUTCDate())}`,
		`${padDatePart(safeDate.getUTCHours())}:${padDatePart(
			safeDate.getUTCMinutes(),
		)}:${padDatePart(safeDate.getUTCSeconds())}`,
	].join(" ");
};

const normalizeDateTime = (value, fallbackDate = new Date()) => {
	const text = normalizeString(value);

	if (!text) return formatDateObject(fallbackDate);
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 00:00:00`;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
		return `${text.replace("T", " ")}:00`;
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) {
		return text.replace("T", " ");
	}
	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return `${text}:00`;

	const parsed = new Date(text);
	if (!Number.isNaN(parsed.getTime())) return formatDateObject(parsed);

	return text;
};

const parseDateTime = (value) => {
	const text = normalizeDateTime(value);
	const parsed = new Date(text.replace(" ", "T"));

	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ensureRequired = (payload, fields) => {
	const missingFields = fields.filter((field) => {
		const value = payload[field];
		return value === undefined || value === null || value === "";
	});

	if (missingFields.length) {
		const error = new Error(`Eksik Betinovi API parametresi: ${missingFields.join(", ")}`);
		error.statusCode = 400;
		throw error;
	}
};

const validateReportDateRange = (startDate, endDate) => {
	const start = parseDateTime(startDate);
	const end = parseDateTime(endDate);

	if (!start || !end) return;

	const diffMs = end.getTime() - start.getTime();
	if (diffMs < 0 || diffMs > 5 * 60 * 1000) {
		const error = new Error(
			"ReportByDate için başlangıç ve bitiş aralığı en fazla 5 dakika olmalı.",
		);
		error.statusCode = 400;
		throw error;
	}
};

const firstDefinedPayloadValue = (source, keys) => {
	for (const key of keys) {
		const value = source[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}

	return undefined;
};

const normalizeOptionalString = (value) => {
	const text = normalizeString(value);
	return text || undefined;
};

const buildReportFilters = (source) =>
	cleanPayload({
		userCode: normalizeOptionalString(
			firstDefinedPayloadValue(source, ["userCode", "user_code", "userId", "user_id"]),
		),
		vendorCode: normalizeOptionalString(
			firstDefinedPayloadValue(source, ["vendorCode", "vendor_code", "vendor"]),
		),
		gameCode: normalizeOptionalString(
			firstDefinedPayloadValue(source, ["gameCode", "game_code"]),
		),
		period: normalizeOptionalString(source.period),
		riskLevel: normalizeOptionalString(
			firstDefinedPayloadValue(source, ["riskLevel", "risk_level"]),
		),
		currencyCode: normalizeOptionalString(
			firstDefinedPayloadValue(source, ["currencyCode", "currency_code"]),
		)?.toUpperCase(),
	});

const buildReportPayload = (methodName, payload = {}) => {
	const source = sanitizePayload(payload);
	const now = new Date();
	const defaultEnd = now;
	const defaultStart = new Date(now.getTime() - 5 * 60 * 1000);

	switch (methodName) {
		case "ReportByDate": {
			const startDate = normalizeDateTime(
				source.startDate || source.startTime,
				defaultStart,
			);
			const endDate = normalizeDateTime(source.endDate || source.endTime, defaultEnd);
			validateReportDateRange(startDate, endDate);

			return cleanPayload({
				startDate,
				endDate,
				count: source.count === undefined ? undefined : toInteger(source.count, 100),
				...buildReportFilters(source),
			});
		}
		case "ReportById":
			return cleanPayload({
				startWagerId: toInteger(source.startWagerId, 0),
				count: toInteger(source.count, 100),
				...buildReportFilters(source),
			});
		case "GetWagerInfo": {
			const nextPayload = { wagerId: source.wagerId };
			ensureRequired(nextPayload, ["wagerId"]);

			return nextPayload;
		}
		case "GetDetailUrl": {
			const nextPayload = { wagerId: source.wagerId };
			ensureRequired(nextPayload, ["wagerId"]);

			return nextPayload;
		}
		default:
			return source;
	}
};

const buildControlGamePayload = (methodName, payload = {}, config = {}) => {
	const source = sanitizePayload(payload);
	const currencyCode = normalizeString(
		source.currencyCode || config.currencyCode,
	).toUpperCase();
	const now = new Date();
	const defaultEnd = now;
	const defaultStart = new Date(now.getTime() - 60 * 60 * 1000);

	switch (methodName) {
		case "GetCurrentPlayers": {
			const nextPayload = { vendorCode: source.vendorCode };
			ensureRequired(nextPayload, ["vendorCode"]);

			return nextPayload;
		}
		case "GetCallList": {
			const nextPayload = {
				vendorCode: source.vendorCode,
				gameCode: source.gameCode,
				callType: source.callType || source.requestType,
			};
			ensureRequired(nextPayload, ["vendorCode", "gameCode", "callType"]);

			return nextPayload;
		}
		case "CallApply": {
			const nextPayload = {
				userCode: source.userCode,
				gameCode: source.gameCode,
				currencyCode,
				vendorCode: source.vendorCode,
				callRtp: toNumber(source.callRtp ?? source.targetRtp),
				betAmount: toNumber(source.betAmount),
				callType: source.callType || source.requestType,
			};
			ensureRequired(nextPayload, [
				"userCode",
				"gameCode",
				"currencyCode",
				"vendorCode",
				"callRtp",
				"betAmount",
				"callType",
			]);

			return nextPayload;
		}
		case "CallCancel": {
			const nextPayload = {
				userCode: source.userCode,
				gameCode: source.gameCode,
				currencyCode,
				vendorCode: source.vendorCode,
				callRtp: toNumber(source.callRtp ?? source.targetRtp),
				betAmount: toNumber(source.betAmount),
				callId: toInteger(source.callId, undefined),
			};
			ensureRequired(nextPayload, [
				"userCode",
				"gameCode",
				"currencyCode",
				"vendorCode",
				"callRtp",
				"betAmount",
				"callId",
			]);

			return nextPayload;
		}
		case "GetCallHistory": {
			const nextPayload = {
				vendorCode: source.vendorCode,
				startTime: normalizeDateTime(source.startTime || source.startDate, defaultStart),
				endTime: normalizeDateTime(source.endTime || source.endDate, defaultEnd),
				offset: toInteger(source.offset, 0),
				limit: toInteger(source.limit || source.count, 100),
			};
			ensureRequired(nextPayload, ["vendorCode", "startTime", "endTime"]);

			return nextPayload;
		}
		case "GetUserSetting": {
			const nextPayload = cleanPayload(
				{
					userCode: source.userCode,
					gameCode: source.gameCode,
					currencyCode,
					vendorCode: source.vendorCode,
					category: source.category,
					key: source.key ?? "",
				},
				["key"],
			);
			ensureRequired(nextPayload, [
				"userCode",
				"gameCode",
				"currencyCode",
				"vendorCode",
				"category",
			]);

			return nextPayload;
		}
		case "ChangeUserSetting": {
			const nextPayload = {
				...buildControlGamePayload("GetUserSetting", source, config),
				value: source.value,
			};
			ensureRequired(nextPayload, ["value"]);

			return nextPayload;
		}
		case "GetAgentSetting": {
			const nextPayload = cleanPayload(
				{
					gameCode: source.gameCode,
					currencyCode,
					vendorCode: source.vendorCode,
					category: source.category,
					key: source.key ?? "",
				},
				["key"],
			);
			ensureRequired(nextPayload, [
				"gameCode",
				"currencyCode",
				"vendorCode",
				"category",
			]);

			return nextPayload;
		}
		case "ChangeAgentSetting": {
			const nextPayload = {
				...buildControlGamePayload("GetAgentSetting", source, config),
				value: source.value,
			};
			ensureRequired(nextPayload, ["value"]);

			return nextPayload;
		}
		default:
			return source;
	}
};

const buildRequestPayload = (sectionKey, methodName, payload, config) => {
	if (sectionKey === "betinoviReports") return buildReportPayload(methodName, payload);
	if (sectionKey === "controlGame") {
		return buildControlGamePayload(methodName, payload, config);
	}

	return sanitizePayload(payload);
};

const betinoviAdminRequest = async (sectionKey, method, payload = {}) => {
	const config = await resolveRuntimeConfig(sectionKey);
	const methodName = normalizeMethodName(sectionKey, method);

	if (!methodName) {
		const error = new Error("Betinovi API method bilgisi eksik.");
		error.statusCode = 400;
		throw error;
	}

	const requestPayload = buildRequestPayload(sectionKey, methodName, payload, config);
	const requestBody = {
		...requestPayload,
		method: methodName,
		token: config.agentToken,
		agentCode: config.agentCode,
	};

	const response = await axios.post(config.baseUrl, requestBody, {
		headers: { "Content-Type": "application/json" },
		timeout: config.timeoutMs,
	});

	return response.data;
};

module.exports = {
	DEFAULT_ADMIN_API_SETTINGS,
	getClientAdminApiSettings,
	saveClientAdminApiSettings,
	betinoviAdminRequest,
};