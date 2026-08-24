const express = require("express");
const mongoose = require("mongoose");
const { checkPermission } = require("../../middleware/permission");
const {
	getClientAdminApiSettings,
	saveClientAdminApiSettings,
	betinoviAdminRequest,
	getControlGameVendors,
	getEnrichedCurrentPlayers,
	getAgentBalanceSummary,
	hasTrialControlGameAgent,
	mergeCallHistoryResponses,
} = require("../../services/betinoviAdminApiService");
const FreeSpinGrant = require("../../database/models/FreeSpinGrant");

const router = express.Router();

const REPORT_METHOD_KEYS = {
	"wager-index": "wagerIndex",
	"by-agent": "byAgent",
	"by-vendor": "byVendor",
	settlement: "settlement",
	"risk-users": "riskUsers",
};

// NOT: Betinovi ForceLab API Specification v1.0.3'te "GetUserSetting",
// "ChangeUserSetting", "GetAgentSetting", "ChangeAgentSetting" gibi bir
// metod YOK. Bunlar daha önce hatalı şekilde eklenmişti ve kaldırıldı.
// Sadece resmi manuelde belgelenen metodlar burada eşleniyor.
const CONTROL_GAME_METHOD_KEYS = {
	"vendor-games": "vendorGames",
	"online-users": "onlineUsers",
	"call-list": "callList",
	"call-result": "callHistory",
	"call-history": "callHistory",
	"apply-call": "applyCall",
	"give-call": "applyCall",
	"cancel-call": "cancelCall",
	"free-round-list": "freeRoundList",
	"apply-free-round": "applyFreeRound",
};

const CONTROL_GAME_MUTATIONS = new Set([
	"apply-call",
	"give-call",
	"cancel-call",
	"apply-free-round",
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

			// "Call Result" / "Call Geçmişi" ekranları belirli bir kullanıcıya
			// değil, vendor + tarih aralığına göre sorgulanır; bu yüzden burada
			// (varsa) hem varsayılan hem de bizzodeneme agent'ı otomatik olarak
			// sorgulanıp sonuçlar birleştirilir. Diğer tipler (call-list,
			// apply-call, cancel-call, free-round işlemleri) belirli bir
			// userCode/oturuma özgüdür; bunlar için frontend req.body.agentSource
			// ile hangi agent'a gönderileceğini açıkça belirtir (bkz. "Oyundaki
			// Kullanıcılar" panelindeki player.agentSource / call satırındaki
			// row.agentSource).
			const isVendorScopedHistoryQuery =
				type === "call-result" || type === "call-history";

			let data;
			if (isVendorScopedHistoryQuery && hasTrialControlGameAgent()) {
				const [defaultResult, trialResult] = await Promise.allSettled([
					betinoviAdminRequest("controlGame", method, req.body, {
						agentSource: "default",
					}),
					betinoviAdminRequest("controlGame", method, req.body, {
						agentSource: "trial",
					}),
				]);

				if (
					defaultResult.status === "rejected" &&
					trialResult.status === "rejected"
				) {
					throw defaultResult.reason;
				}

				data = mergeCallHistoryResponses(
					defaultResult.status === "fulfilled" ? defaultResult.value : null,
					trialResult.status === "fulfilled" ? trialResult.value : null,
				);
			} else {
				const agentSource = req.body?.agentSource === "trial" ? "trial" : "default";

				if (agentSource === "trial" && !hasTrialControlGameAgent()) {
					return res.status(400).json({
						success: false,
						message: "Deneme bonusu (bizzodeneme) agent bilgileri (.env) eksik.",
					});
				}

				data = await betinoviAdminRequest("controlGame", method, req.body, {
					agentSource,
				});
			}

			// 🎰 Freespin başarıyla uygulandıysa, Dashboard "bugün verilen
			// freespin" raporlaması için yerel bir defter kaydı oluşturulur.
			if (type === "apply-free-round") {
				try {
					const {
						userCode,
						vendorCode,
						gameCode,
						currencyCode,
						betAmount,
						spinCount,
						expireHours,
					} = req.body || {};

					if (mongoose.Types.ObjectId.isValid(userCode)) {
						const expireHoursNum = Number(expireHours) || 0;
						await FreeSpinGrant.create({
							targetUser: userCode,
							actorUser: req.adminUser?._id || req.adminUser || null,
							vendorCode,
							gameCode,
							currencyCode: currencyCode || "TRY",
							betAmount: Number(betAmount) || 0,
							spinCount: Number(spinCount) || 0,
							expireHours: expireHoursNum,
							expiresAt: new Date(Date.now() + expireHoursNum * 60 * 60 * 1000),
							providerResponse: data,
						});
					}
				} catch (grantError) {
					// Rapor kaydı başarısız olsa da freespin işlemi zaten uygulandı;
					// kullanıcıya hata döndürmeyip sadece loglanır.
					console.error("FreeSpinGrant kayıt hatası:", grantError.message);
				}
			}

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
