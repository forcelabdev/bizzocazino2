const axios = require("axios");
const SiteSettings = require("../database/models/SiteSettings");
const Transaction = require("../database/models/Transaction");

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
			vendors: "GetVendors",
			vendorGames: "GetVendorGames",
			onlineUsers: "GetCurrentPlayers",
			callList: "GetCallList",
			callHistory: "GetCallHistory",
			applyCall: "CallApply",
			cancelCall: "CallCancel",
			getUserSetting: "GetUserSetting",
			changeUserSetting: "ChangeUserSetting",
			getAgentSetting: "GetAgentSetting",
			changeAgentSetting: "ChangeAgentSetting",
			agentInfo: "GetAgentInfo",
			subAgentBalances: "GetSubAgentBalances",
			freeRoundList: "GetFreeRoundList",
			applyFreeRound: "ApplyFreeRound",
			cancelFreeRound: "CancelFreeRound",
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
		case "GetVendors":
		case "GetAgentInfo":
		case "GetSubAgentBalances":
			return {};
		case "GetVendorGames": {
			const nextPayload = { vendorCode: source.vendorCode };
			ensureRequired(nextPayload, ["vendorCode"]);

			return nextPayload;
		}
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
		case "GetFreeRoundList": {
			const nextPayload = cleanPayload({
				vendorCode: source.vendorCode,
				gameCode: source.gameCode,
				currencyCode,
			});
			ensureRequired(nextPayload, ["vendorCode", "gameCode"]);

			return nextPayload;
		}
		case "ApplyFreeRound": {
			const nextPayload = cleanPayload({
				userCode: source.userCode,
				vendorCode: source.vendorCode,
				gameCode: source.gameCode,
				currencyCode,
				betAmount: toNumber(source.betAmount),
				spinCount: toInteger(source.spinCount ?? source.count, undefined),
				expireHours: toNumber(source.expireHours ?? source.hours),
			});
			ensureRequired(nextPayload, [
				"userCode",
				"vendorCode",
				"gameCode",
				"betAmount",
				"spinCount",
				"expireHours",
			]);

			return nextPayload;
		}
		case "CancelFreeRound": {
			const nextPayload = cleanPayload({
				userCode: source.userCode,
				vendorCode: source.vendorCode,
				gameCode: source.gameCode,
				currencyCode,
			});
			ensureRequired(nextPayload, ["userCode", "vendorCode", "gameCode"]);

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
		// NOT: "GetUserSetting" / "ChangeUserSetting" / "GetAgentSetting" /
		// "ChangeAgentSetting" Betinovi ForceLab API Specification v1.0.3'te
		// belgelenmiş metodlar DEĞİL. Kalıcı kullanıcı RTP tanımı bu API
		// üzerinden desteklenmiyor; sadece GetGameUrl çağrısına gönderilen
		// oturum bazlı lowRtp/highRtp (bkz. "apply-call"/"give-call") var.
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

// Vendor adı vendor API'sinden bazen JSON string olarak gelir: '{"en":"Pragmatic Play"}'
const parseVendorName = (rawName, fallbackCode) => {
	const text = normalizeString(rawName);
	if (!text) return fallbackCode;

	if (text.startsWith("{")) {
		try {
			const parsed = JSON.parse(text);
			return parsed.en || parsed.tr || Object.values(parsed)[0] || fallbackCode;
		} catch {
			return text;
		}
	}

	return text;
};

const SLOT_GAME_TYPE = 1;

/**
 * Slot Call & RTP paneli için vendor listesini getirir.
 * Sadece slot vendorları (gameType === 1) döndürülür, vendorName JSON parse edilir.
 */
const getControlGameVendors = async () => {
	const settings = await getClientAdminApiSettings();
	const method = settings.controlGame.methods.vendors;
	const data = await betinoviAdminRequest("controlGame", method, {});
	const vendors = Array.isArray(data?.vendors) ? data.vendors : [];

	return vendors
		.filter((vendor) => Number(vendor.gameType) === SLOT_GAME_TYPE)
		.map((vendor) => ({
			vendorCode: vendor.vendorCode,
			vendorName: parseVendorName(vendor.vendorName, vendor.vendorCode),
			gameType: vendor.gameType,
		}));
};

/**
 * Vendor API (GetCurrentPlayers) bazen aynı userCode için birden fazla satır
 * döner: kullanıcı bir oyundan çıkıp başka bir oyuna girdiğinde eski oturum
 * satırı hemen düşmeyebiliyor, bu da panelde "aynı oyuncu 2 kez, biri eski
 * oyunda kalmış" görünümüne yol açıyor. Burada userCode başına SADECE tek
 * satır bırakılır: o kullanıcının `transactions` koleksiyonundaki en güncel
 * (created_at DESC) game_code'una eşleşen satır "gerçek/güncel" sayılır.
 * Eşleşme bulunamazsa (örn. transaction'lar henüz yazılmadıysa) o kullanıcı
 * için vendor listesindeki ilk satır kullanılır; asla iki satır birden
 * bırakılmaz.
 */
const dedupeCurrentPlayersByLatestTransaction = async (players) => {
	if (!Array.isArray(players) || players.length < 2) return players;

	const byUserCode = new Map();
	for (const player of players) {
		const code = player?.userCode;
		if (!code) continue;
		if (!byUserCode.has(code)) byUserCode.set(code, []);
		byUserCode.get(code).push(player);
	}

	const duplicateUserCodes = [...byUserCode.entries()]
		.filter(([, rows]) => rows.length > 1)
		.map(([code]) => code);

	if (!duplicateUserCodes.length) return players;

	const latestGameByUserCode = new Map();
	await Promise.all(
		duplicateUserCodes.map(async (userCode) => {
			try {
				const latestTxn = await Transaction.findOne({ user_code: userCode })
					.sort({ created_at: -1 })
					.select("game_code")
					.lean();
				if (latestTxn?.game_code) {
					latestGameByUserCode.set(userCode, latestTxn.game_code);
				}
			} catch {
				// Sorgu başarısız olursa bu kullanıcı için fallback (ilk satır) kullanılır.
			}
		}),
	);

	const seenUserCodes = new Set();
	const deduped = [];
	for (const player of players) {
		const code = player?.userCode;
		if (!code) {
			deduped.push(player);
			continue;
		}
		if (seenUserCodes.has(code)) continue;

		const rows = byUserCode.get(code);
		if (rows.length > 1) {
			const latestGameCode = latestGameByUserCode.get(code);
			const matched = latestGameCode
				? rows.find((row) => row.gameCode === latestGameCode)
				: null;
			deduped.push(matched || rows[0]);
		} else {
			deduped.push(player);
		}
		seenUserCodes.add(code);
	}

	return deduped;
};

/**
 * "Akıllı kombinasyon": GetCurrentPlayers'tan gelen oyuncu listesini döner,
 * hasPendingCall === true olan oyuncular için (sadece bunlar için, paralel)
 * GetCallList ile zenginleştirme yapar. Diğer oyuncular için vendor API'sine
 * gereksiz istek atılmaz (hasPendingCall === false olan oyuncularda GetCallList
 * "Invalid post result from game" hatası döndürüyor).
 */
const getEnrichedCurrentPlayers = async (vendorCode) => {
	const settings = await getClientAdminApiSettings();
	const onlineUsersMethod = settings.controlGame.methods.onlineUsers;
	const callListMethod = settings.controlGame.methods.callList;

	const playersData = await betinoviAdminRequest("controlGame", onlineUsersMethod, {
		vendorCode,
	});
	const rawPlayers = Array.isArray(playersData?.playerInfos)
		? playersData.playerInfos
		: [];
	const players = await dedupeCurrentPlayersByLatestTransaction(rawPlayers);

	const pendingPlayers = players.filter((player) => player.hasPendingCall);

	const callResults = await Promise.allSettled(
		pendingPlayers.map((player) =>
			betinoviAdminRequest("controlGame", callListMethod, {
				vendorCode: player.vendorCode || vendorCode,
				gameCode: player.gameCode,
				callType: player.requestType,
			}).then((result) => ({ player, result })),
		),
	);

	const callResultByUserCode = new Map();
	for (const settled of callResults) {
		if (settled.status !== "fulfilled") continue;
		const { player, result } = settled.value;
		callResultByUserCode.set(player.userCode, result);
	}

	return {
		players,
		pendingCallCount: pendingPlayers.length,
		callResults: pendingPlayers.map((player) => ({
			player,
			call: callResultByUserCode.get(player.userCode) || null,
		})),
	};
};

/**
 * Agent bakiyesi özet: GetAgentInfo (toplam bakiye) + GetSubAgentBalances
 * (alt hesap kırılımı) tek response'ta birleştirilir.
 */
const getAgentBalanceSummary = async () => {
	const settings = await getClientAdminApiSettings();
	const agentInfoMethod = settings.controlGame.methods.agentInfo;
	const subAgentBalancesMethod = settings.controlGame.methods.subAgentBalances;

	const [agentInfoResult, subAgentBalancesResult] = await Promise.allSettled([
		betinoviAdminRequest("controlGame", agentInfoMethod, {}),
		betinoviAdminRequest("controlGame", subAgentBalancesMethod, {}),
	]);

	return {
		agentInfo:
			agentInfoResult.status === "fulfilled" ? agentInfoResult.value : null,
		subAgentBalances:
			subAgentBalancesResult.status === "fulfilled"
				? subAgentBalancesResult.value
				: null,
		errors: [
			agentInfoResult.status === "rejected" ? agentInfoResult.reason?.message : null,
			subAgentBalancesResult.status === "rejected"
				? subAgentBalancesResult.reason?.message
				: null,
		].filter(Boolean),
	};
};

module.exports = {
	DEFAULT_ADMIN_API_SETTINGS,
	getClientAdminApiSettings,
	saveClientAdminApiSettings,
	betinoviAdminRequest,
	getControlGameVendors,
	getEnrichedCurrentPlayers,
	getAgentBalanceSummary,
};
