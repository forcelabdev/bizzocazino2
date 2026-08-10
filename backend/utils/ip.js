const axios = require("axios");

// RFC1918 / loopback / link-local ranges. An intermediate reverse proxy
// (nginx, a load balancer, etc.) can prepend its own internal-network IP to
// X-Forwarded-For; we skip those when picking the client IP out of a chain.
const PRIVATE_IPV4_RANGES = [
	/^10\./,
	/^127\./,
	/^169\.254\./,
	/^172\.(1[6-9]|2\d|3[0-1])\./,
	/^192\.168\./,
	/^0\.0\.0\.0$/,
];

const isPrivateIp = (ip) => {
	if (!ip) return true;
	if (ip === "::1" || /^fc|^fd/i.test(ip)) return true; // IPv6 loopback / ULA
	return PRIVATE_IPV4_RANGES.some((re) => re.test(ip));
};

const stripIpDecorations = (value = "") => {
	let ip = String(value || "").trim();

	if (ip.startsWith("::ffff:")) ip = ip.slice(7);
	if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]"));
	if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];

	return ip;
};

const normalizeIp = (value = "") => {
	const raw = String(value || "").trim();

	if (!raw || raw.toLowerCase() === "unknown") return "";

	if (raw.includes(",")) {
		// X-Forwarded-For / True-Client-IP chains list the original client
		// first, followed by every proxy hop that touched the request:
		// "client, proxy1, proxy2, ...". Prefer the left-most PUBLIC address
		// so a misconfigured internal proxy prepending its own private IP
		// doesn't get recorded instead of the real client.
		const parts = raw
			.split(",")
			.map((part) => stripIpDecorations(part.trim()))
			.filter((part) => part && part.toLowerCase() !== "unknown");

		const firstPublic = parts.find((part) => !isPrivateIp(part));

		return firstPublic || parts[0] || "";
	}

	return stripIpDecorations(raw);
};

const getHeaderValue = (headers, name) => {
	const value = headers?.[name];
	return Array.isArray(value) ? value[0] : value;
};

function getClientIp(req) {
	// Cloudflare sets CF-Connecting-IP at its edge from the real TCP
	// connection, so it's authoritative whenever the request actually came
	// through Cloudflare (regardless of how many internal hops follow) —
	// checked first and used as-is, without chain-parsing.
	const cfIp = normalizeIp(getHeaderValue(req?.headers, "cf-connecting-ip"));
	if (cfIp) return cfIp;

	const candidates = [
		getHeaderValue(req?.headers, "true-client-ip"),
		getHeaderValue(req?.headers, "x-forwarded-for"),
		getHeaderValue(req?.headers, "x-real-ip"),
		req?.ip,
		req?.connection?.remoteAddress,
		req?.socket?.remoteAddress,
	];

	for (const candidate of candidates) {
		const ip = normalizeIp(candidate);
		if (ip && !isPrivateIp(ip)) return ip;
	}

	// Nothing public found — fall back to whatever we have rather than
	// silently defaulting to loopback.
	for (const candidate of candidates) {
		const ip = normalizeIp(candidate);
		if (ip) return ip;
	}

	return "127.0.0.1";
}

async function getCountryFromIP(ip) {
	try {
		const res = await axios.get(`http://ip-api.com/json/${normalizeIp(ip)}`);
		if (res.data.status === "success") {
			return {
				code: res.data.countryCode,
				name: res.data.country,
			};
		}
	} catch (err) {
		console.error("IP lookup failed:", err.message);
	}
	return { code: "XX", name: "Unknown" };
}

module.exports = getCountryFromIP;
module.exports.getCountryFromIP = getCountryFromIP;
module.exports.getClientIp = getClientIp;
module.exports.normalizeIp = normalizeIp;
