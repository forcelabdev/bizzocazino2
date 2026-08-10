const express = require("express");
const { checkPermission } = require("../../middleware/permission");
const {
	getClientAdminApiSettings,
	saveClientAdminApiSettings,
	betinoviAdminRequest,
	getControlGameVendors,
	getEnrichedCurrentPlayers,
	getAgentBalanceSummary,
} = require("../../services/betinoviAdminApiService");

const router = express.Router();

const REPORT_METHOD_KEYS = {
	"wager-index": "wagerIndex",
	"by-agent": "byAgent",
	"by-vendor": "byVendor",
	settlement: "settlement",
	"risk-users": "riskUsers",
};

const CONTROL_GAME_METHOD_KEYS = {
	"online-users": "onlineUsers",
	"call-list": "callList",
	"call-result": "callHistory",
	"call-history": "callHistory",
	"apply-call": "applyCall",
	"give-call": "applyCall",
	"cancel-call": "cancelCall",
	"user-setting": "getUserSetting",
	"change-user-setting": "changeUserSetting",
	"agent-setting": "getAgentSetting",
	"change-agent-setting": "changeAgentSetting",
};

const CONTROL_GAME_MUTATIONS = new Set([
	"apply-call",
	"give-call",
	"cancel-call",
	"change-user-setting",
	"change-agent-setting",
]);

const getManageCandidates = (resource) => {
	const parts = String(resource || "")
		.split(".")
		.filter(Boolean);
	const candidates = [];

	for (let index = parts.length; index >= 1; index -= 1) {
		candidates.push(`${parts.slice(0, index).join(".")}.manage`);
	}

	return [...new Set(candidates)];
};

const hasPermissionCode = (req, permission) => {
	const permissions = req.userPermissions || [];
	if (req.isSuperAdmin || permissions.includes("*")) return true;
	if (permissions.includes(permission)) return true;

	const parts = String(permission || "")
		.split(".")
		.filter(Boolean);
	parts.pop();
	const resource = parts.join(".");

	return getManageCandidates(resource).some((candidate) =>
		permissions.includes(candidate),
	);
};

const sendAdminApiError = (res, error, fallbackMessage) => {
	const statusCode = error.statusCode || error.response?.status || 500;

	res.status(statusCode).json({
		success: false,
		message: error.message || fallbackMessage,
		data: error.response?.data,
	});
};

router.get(
	"/settings",
	checkPermission("platform.apiSettings.read"),
	async (req, res) => {
		try {
			const settings = await getClientAdminApiSettings();
			res.status(200).json({ success: true, data: settings });
		} catch (error) {
			console.error("Betinovi admin API ayarları getirilirken hata:", error.message);
			sendAdminApiError(
				res,
				error,
				"Betinovi admin API ayarları getirilirken bir hata oluştu.",
			);
		}
	},
);

router.put(
	"/settings",
	checkPermission("platform.apiSettings.update"),
	async (req, res) => {
		try {
			const settings = await saveClientAdminApiSettings(req.body || {});
			res.status(200).json({
				success: true,
				message: "Betinovi admin API ayarları güncellendi.",
				data: settings,
			});
		} catch (error) {
			console.error("Betinovi admin API ayarları kaydedilirken hata:", error.message);
			sendAdminApiError(
				res,
				error,
				"Betinovi admin API ayarları kaydedilirken bir hata oluştu.",
			);
		}
	},
);

router.post(
	"/reports/:type",
	checkPermission("reports.betinovi.read"),
	async (req, res) => {
		try {
			const methodKey = REPORT_METHOD_KEYS[req.params.type];
			if (!methodKey) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz rapor tipi.",
				});
			}

			const settings = await getClientAdminApiSettings();
			const method = settings.betinoviReports.methods[methodKey];
			const data = await betinoviAdminRequest(
				"betinoviReports",
				method,
				req.body,
			);

			res.status(200).json({
				success: true,
				data,
				meta: { type: req.params.type, method },
			});
		} catch (error) {
			console.error("Betinovi rapor isteği hatası:", error.message);
			sendAdminApiError(
				res,
				error,
				"Betinovi raporu alınırken bir hata oluştu.",
			);
		}
	},
);

router.get(
	"/control-game/vendors",
	checkPermission("controlGame.read"),
	async (req, res) => {
		try {
			const vendors = await getControlGameVendors();
			res.status(200).json({ success: true, data: { vendors } });
		} catch (error) {
			console.error("ControlGame vendor listesi hatası:", error.message);
			sendAdminApiError(
				res,
				error,
				"Vendor listesi alınırken bir hata oluştu.",
			);
		}
	},
);

router.get(
	"/control-game/players-live/:vendorCode",
	checkPermission("controlGame.read"),
	async (req, res) => {
		try {
			const data = await getEnrichedCurrentPlayers(req.params.vendorCode);
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error("ControlGame anlık oyuncu listesi hatası:", error.message);
			sendAdminApiError(
				res,
				error,
				"Anlık oyuncu listesi alınırken bir hata oluştu.",
			);
		}
	},
);

router.get(
	"/control-game/agent-balance-live",
	checkPermission("controlGame.read"),
	async (req, res) => {
		try {
			const data = await getAgentBalanceSummary();
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error("ControlGame agent bakiye hatası:", error.message);
			sendAdminApiError(
				res,
				error,
				"Agent bakiyesi alınırken bir hata oluştu.",
			);
		}
	},
);

router.post(
	"/control-game/:type",
	checkPermission("controlGame.read"),
	async (req, res) => {
		try {
			const type = req.params.type;
			const methodKey = CONTROL_GAME_METHOD_KEYS[type];
			if (!methodKey) {
				return res.status(400).json({
					success: false,
					message: "Geçersiz ControlGame işlemi.",
				});
			}

			if (
				CONTROL_GAME_MUTATIONS.has(type) &&
				!hasPermissionCode(req, "controlGame.manage")
			) {
				return res.status(403).json({
					success: false,
					message: "Bu ControlGame işlemi için yetkiniz yok.",
					requiredPermissions: ["controlGame.manage"],
				});
			}

			const settings = await getClientAdminApiSettings();
			const method = settings.controlGame.methods[methodKey];
			const data = await betinoviAdminRequest(
				"controlGame",
				method,
				req.body,
			);

			res.status(200).json({
				success: true,
				data,
				meta: { type, method },
			});
		} catch (error) {
			console.error("ControlGame isteği hatası:", error.message);
			sendAdminApiError(
				res,
				error,
				"ControlGame işlemi yapılırken bir hata oluştu.",
			);
		}
	},
);

module.exports = router;
