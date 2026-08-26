const AdminActionLog = require("../database/models/AdminActionLog");
const { getClientIp } = require("../utils/ip");
const { redactSensitiveData } = require("../utils/redact");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const deriveResource = (req) => {
	// e.g. "/admin/users/123" -> "users" (skip the /admin prefix + id segment)
	const segments = req.path.split("/").filter(Boolean);
	return segments[0] || "";
};

/**
 * Records every state-changing (POST/PUT/PATCH/DELETE) admin panel request
 * that actually reached a route handler — i.e. it passed authentication and
 * the origin guard. This is the "who did what, from where, when" trail for
 * the "Sistem Ayrıntıları" screen: it's independent of any single route's
 * own business logic, so no admin mutation can bypass it without also
 * bypassing authentication itself.
 *
 * Must run AFTER `authenticateAdmin` and `adminOriginGuard`.
 */
const adminActionLogger = (req, res, next) => {
	if (!MUTATING_METHODS.has(req.method)) {
		return next();
	}

	const startedAt = Date.now();
	const isMultipart = (req.headers["content-type"] || "").includes(
		"multipart/form-data"
	);

	res.on("finish", () => {
		AdminActionLog.create({
			actorUser: req.adminUser?._id || null,
			actorSnapshot: {
				username: req.adminUser?.username || "",
				email: req.adminUser?.local?.email || "",
				rank: req.adminUser?.rank || "",
			},
			method: req.method,
			path: req.originalUrl,
			resource: deriveResource(req),
			statusCode: res.statusCode,
			ip: getClientIp(req),
			userAgent: req.headers["user-agent"] || "",
			origin: req.headers.origin || "",
			requestSummary: isMultipart
				? "[multipart/form-data body omitted]"
				: redactSensitiveData(req.body),
			blocked: false,
			durationMs: Date.now() - startedAt,
		}).catch((err) => {
			console.error("adminActionLogger log yazma hatası:", err.message);
		});
	});

	next();
};

module.exports = { adminActionLogger };
