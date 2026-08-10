const crypto = require("crypto");
const { getClientIp } = require("./ip");

/**
 * EchoPayz API için HMAC-SHA256 imza oluşturur
 * @param {string} method - HTTP method (POST, GET, vb.)
 * @param {string} path - API path (/api/v1/deposits)
 * @param {number} timestamp - Unix timestamp (saniye)
 * @param {string} nonce - 32 karakterlik benzersiz hex string
 * @param {string} jsonBody - JSON formatında payload
 * @param {string} apiSecret - API Secret key
 * @returns {string} HMAC-SHA256 imza
 */
function createSignature(method, path, timestamp, nonce, jsonBody, apiSecret) {
	const signaturePayload = `${method}|${path}|${timestamp}|${nonce}|${jsonBody}`;
	return crypto.createHmac("sha256", apiSecret).update(signaturePayload).digest("hex");
}

/**
 * Benzersiz nonce oluşturur (32 karakterlik hex string)
 * @returns {string} 32 karakterlik hex string
 */
function generateNonce() {
	return crypto.randomBytes(16).toString("hex");
}

/**
 * Benzersiz reference ID oluşturur
 * @param {string} userId - Kullanıcı ID
 * @param {string} methodCode - Ödeme metodu kodu
 * @returns {string} Benzersiz reference ID
 */
function generateReferenceId(userId, methodCode = "echopayz") {
	return `TRX-${Date.now()}-${userId}-${methodCode}`;
}

/**
 * Callback imzasını doğrular
 * EchoPayz imza formatı: HMAC-SHA256(timestamp|nonce|raw_json, api_secret)
 * @param {string} receivedSignature - Gelen X-Signature header
 * @param {string} timestamp - X-Timestamp header
 * @param {string} nonce - X-Nonce header
 * @param {string} rawBody - Ham request body
 * @param {string} apiSecret - API Secret key
 * @returns {boolean} İmza geçerli mi?
 */
function verifyCallbackSignature(receivedSignature, timestamp, nonce, rawBody, apiSecret) {
	if (!receivedSignature || !timestamp || !nonce || !rawBody || !apiSecret) {
		return false;
	}
	// EchoPayz formatı: timestamp|nonce|raw_json
	const signatureData = `${timestamp}|${nonce}|${rawBody}`;
	const expectedSignature = crypto.createHmac("sha256", apiSecret).update(signatureData).digest("hex");
	
	try {
		return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature));
	} catch (e) {
		// Buffer uzunlukları farklıysa timingSafeEqual hata verir
		return false;
	}
}

/**
 * Payload'u alfabetik sıraya göre sıralar
 * @param {object} payload - Sıralanacak payload
 * @returns {object} Alfabetik sıralı payload
 */
function sortPayloadAlphabetically(payload) {
	const sorted = {};
	Object.keys(payload).sort().forEach((key) => {
		if (typeof payload[key] === "object" && payload[key] !== null && !Array.isArray(payload[key])) {
			sorted[key] = sortPayloadAlphabetically(payload[key]);
		} else {
			sorted[key] = payload[key];
		}
	});
	return sorted;
}

/**
 * EchoPayz status değerini internal statuse çevirir
 * @param {string} echopayzStatus - EchoPayz'dan gelen status
 * @returns {string} Internal status
 */
function mapEchoPayzStatus(echopayzStatus) {
	const statusMap = {
		approved: "approved",
		rejected: "rejected",
		cancelled: "cancelled",
		expired: "expired",
		pending: "pending",
	};
	return statusMap[echopayzStatus?.toLowerCase()] || "pending";
}

module.exports = {
	createSignature,
	generateNonce,
	generateReferenceId,
	verifyCallbackSignature,
	sortPayloadAlphabetically,
	getClientIp,
	mapEchoPayzStatus,
};
