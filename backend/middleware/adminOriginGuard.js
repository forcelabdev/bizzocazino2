const AdminActionLog = require("../database/models/AdminActionLog");
const { getClientIp } = require("../utils/ip");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getAllowedOrigins = () => {
	return [
		process.env.SERVER_FRONTEND_URL,
		process.env.SERVER_ADMIN_URL,
		...((process.env.ALLOWED_ORIGINS || "")
			.split(",")
			.map((o) => o.trim())
			.filter(Boolean)),
	].filter(Boolean);
};

/**
 * Extracts an origin-like value to compare against the allowlist. Prefers
 * the `Origin` header (sent by fetch/XHR for cross-origin requests) and
 * falls back to the origin portion of `Referer` (some browsers/clients omit
 * `Origin` on same-site navigations but still send `Referer`).
 */
const resolveRequestOrigin = (req) => {
	const origin = req.headers.origin;
	if (origin) return origin;

	const referer = req.headers.referer || req.headers.referrer;
	if (referer) {
		try {
			return new URL(referer).origin;
		} catch {
			return "";
		}
	}

	return "";
};

/**
 * Blocks state-changing admin requests (POST/PUT/PATCH/DELETE) that don't
 * carry an Origin/Referer matching the admin panel's own allowed origins.
 *
 * A valid admin JWT proves *who* is calling, but not *where from* — a bearer
 * token copied out of the browser's dev tools can be replayed from Postman,
 * curl, or a script. Those tools don't send a browser Origin/Referer header
 * for the admin panel's own domain, so this middleware treats a missing or
 * mismatched origin on a mutation as an out-of-panel request and rejects it,
 * while still recording who attempted it (token identity), from where (IP),
 * and with what client (User-Agent) — so it shows up as a security event
 * even though it never touched application data.
 *
 * Must run AFTER `authenticateAdmin` (needs `req.adminUser`).
 */
const adminOriginGuard = async (req, res, next) => {
	if (!MUTATING_METHODS.has(req.method)) {
		return next();
	}

	const allowedOrigins = getAllowedOrigins();
	const requestOrigin = resolveRequestOrigin(req);
	const isAllowed = Boolean(requestOrigin) && allowedOrigins.includes(requestOrigin);

	if (isAllowed) {
		return next();
	}

	// Fire-and-forget audit write — a logging failure must never be the
	// reason a legitimate block response fails to reach the caller.
	AdminActionLog.create({
		actorUser: req.adminUser?._id || null,
		actorSnapshot: {
			username: req.adminUser?.username || "",
			email: req.adminUser?.local?.email || "",
			rank: req.adminUser?.rank || "",
		},
		method: req.method,
		path: req.originalUrl,
		resource: (req.baseUrl + req.path).split("/").filter(Boolean).slice(0, 2).join("/"),
		statusCode: 403,
		ip: getClientIp(req),
		userAgent: req.headers["user-agent"] || "",
		origin: requestOrigin || "(none)",
		blocked: true,
		blockReason: "origin_mismatch_or_missing",
		severity: "critical",
	}).catch((err) => {
		console.error("adminOriginGuard log yazma hatası:", err.message);
	});

	return res.status(403).json({
		success: false,
		message:
			"Bu işlem sadece Backoffice paneli üzerinden yapılabilir. Doğrudan API isteği reddedildi ve kayıt altına alındı.",
	});
};

module.exports = { adminOriginGuard };
