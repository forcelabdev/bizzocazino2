const axios = require("axios");

const normalizeIp = (value = "") => {
	let ip = String(value || "").trim();

	if (!ip || ip.toLowerCase() === "unknown") return "";

	if (ip.includes(",")) {
		ip = ip
			.split(",")
			.map((part) => part.trim())
			.find((part) => part && part.toLowerCase() !== "unknown") || "";
	}

	if (ip.startsWith("::ffff:")) ip = ip.slice(7);
	if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]"));
	if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];

	return ip;
};

const getHeaderValue = (headers, name) => {
	const value = headers?.[name];
	return Array.isArray(value) ? value[0] : value;
};

function getClientIp(req) {
	const candidates = [
		getHeaderValue(req?.headers, "cf-connecting-ip"),
		getHeaderValue(req?.headers, "true-client-ip"),
		getHeaderValue(req?.headers, "x-forwarded-for"),
		getHeaderValue(req?.headers, "x-real-ip"),
		req?.ip,
		req?.connection?.remoteAddress,
		req?.socket?.remoteAddress,
	];

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
