const SENSITIVE_KEY_PATTERN =
	/password|token|secret|otp|iban|cvv|cvc|pin\b|authorization/i;

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;

/**
 * Recursively redacts sensitive fields (passwords, tokens, secrets, OTPs,
 * bank details, etc.) from a request body before it gets persisted in an
 * audit log. Also truncates large strings/arrays so a single log document
 * can't balloon in size (e.g. base64 file uploads).
 */
function redactSensitiveData(value, depth = 0) {
	if (depth > 4) return "[max depth]";

	if (value === null || value === undefined) return value;

	if (Array.isArray(value)) {
		return value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => redactSensitiveData(item, depth + 1));
	}

	if (typeof value === "string") {
		return value.length > MAX_STRING_LENGTH
			? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
			: value;
	}

	if (typeof value === "object") {
		const result = {};
		for (const [key, val] of Object.entries(value)) {
			if (SENSITIVE_KEY_PATTERN.test(key)) {
				result[key] = "***";
			} else {
				result[key] = redactSensitiveData(val, depth + 1);
			}
		}
		return result;
	}

	return value;
}

module.exports = { redactSensitiveData };
