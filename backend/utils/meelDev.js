const crypto = require("crypto");

/**
 * MeelDev API yardımcı fonksiyonları
 * Base URL: https://gateway.meeldev.com
 * Auth: X-API-KEY + X-API-SECRET headers
 * Optional HMAC-SHA256: X-Timestamp + X-Signature
 */

/**
 * MeelDev API istekleri için gerekli header'ları oluşturur
 */
const createMeelDevHeaders = (apiKey, apiSecret, cbSecretKey) => {
	const headers = {
		"X-API-KEY": apiKey,
		"X-API-SECRET": apiSecret,
		"Content-Type": "application/json; charset=utf-8",
	};

	// Private hesaplarda HMAC-SHA256 imza gerekli
	if (cbSecretKey) {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const signature = crypto
			.createHmac("sha256", cbSecretKey)
			.update(timestamp)
			.digest("hex");

		headers["X-Timestamp"] = timestamp;
		headers["X-Signature"] = signature;
	}

	return headers;
};

/**
 * Benzersiz transaction ID üretir
 * Format: MD-<userId>-<timestamp>-<random>
 */
const generateMeelDevTransactionId = (userId, type = "TX") => {
	const prefix = type === "withdraw" ? "WD" : "DP";
	const ts = Date.now();
	const rand = crypto.randomBytes(4).toString("hex");
	return `${prefix}-${userId}-${ts}-${rand}`;
};

/**
 * MeelDev callback hash doğrulaması
 * Deposit: sha256(process_no + transaction_id + status + api_secret_key + cb_secret_key + price(2dec) + customer_parent)
 * Withdraw: sha256(process_no + transaction_id + status + api_secret_key + cb_secret_key + price(2dec) + user_id)
 */
const verifyMeelDevCallbackHash = ({
	processNo,
	transactionId,
	status,
	apiSecretKey,
	cbSecretKey,
	price,
	identifier, // customer_parent (deposit) veya user_id (withdraw)
	receivedHash,
}) => {
	if (!processNo || !transactionId || !apiSecretKey || !cbSecretKey || !receivedHash) {
		return false;
	}

	// price'ı 2 decimal'e normalize et
	const normalizedPrice = Number(price).toFixed(2);
	const statusStr = String(status);

	const rawString =
		processNo +
		transactionId +
		statusStr +
		apiSecretKey +
		cbSecretKey +
		normalizedPrice +
		identifier;

	const expectedHash = crypto.createHash("sha256").update(rawString).digest("hex");

	// Timing-safe comparison
	const receivedBuf = Buffer.from(String(receivedHash).toLowerCase(), "utf8");
	const expectedBuf = Buffer.from(expectedHash.toLowerCase(), "utf8");

	if (receivedBuf.length !== expectedBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(receivedBuf, expectedBuf);
};

/**
 * MeelDev status kodlarını internal status'e map eder
 * 0 = new/in_progress -> processing
 * 2 = rejected -> rejected
 * 3 = paid/completed -> approved
 */
const mapMeelDevStatus = (statusCode) => {
	const code = Number(statusCode);
	switch (code) {
		case 0:
		case 1:
		case 4:
			return "processing";
		case 3:
			return "approved";
		case 2:
			return "rejected";
		default:
			return "pending";
	}
};

module.exports = {
	createMeelDevHeaders,
	generateMeelDevTransactionId,
	verifyMeelDevCallbackHash,
	mapMeelDevStatus,
};
