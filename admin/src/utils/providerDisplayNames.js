export const DEFAULT_PROVIDER_DISPLAY_NAMES = {
	drakon: "Drakon",
	nexus: "Nexus",
	nexusggr: "Nexus GGR",
	betinovi: "Forcelab",
	betcolabs: "Betcolabs",
};

export const normalizeProviderCode = (code) => String(code || "").trim().toLowerCase();

export const normalizeProviderDisplayNames = (value = {}) => {
	const names = { ...DEFAULT_PROVIDER_DISPLAY_NAMES };

	Object.entries(value || {}).forEach(([rawCode, rawName]) => {
		const code = normalizeProviderCode(rawCode);
		const name = String(rawName || "").trim();

		if (code && name) names[code] = name;
	});

	return names;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const applyProviderDisplayNames = (value = "", displayNames = {}) => {
	const names = normalizeProviderDisplayNames(displayNames);
	let displayValue = String(value || "");

	Object.entries(DEFAULT_PROVIDER_DISPLAY_NAMES).forEach(([code, defaultName]) => {
		const displayName = names[code];
		if (!displayName || displayName === defaultName) return;

		[defaultName, code].forEach((token) => {
			displayValue = displayValue.replace(
				new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi"),
				displayName,
			);
		});
	});

	return displayValue;
};

export const getProviderDisplayName = (code, displayNames = {}, fallback = "") => {
	const rawCode = String(code || "").trim();
	if (!rawCode) return fallback || "—";

	const normalizedCode = normalizeProviderCode(rawCode);
	const names = normalizeProviderDisplayNames(displayNames);

	if (names[normalizedCode]) {
		return fallback ? applyProviderDisplayNames(fallback, names) : names[normalizedCode];
	}
	if (fallback) return applyProviderDisplayNames(fallback, names);

	return applyProviderDisplayNames(rawCode, names);
};

export const toProviderDisplayItems = (codes = [], displayNames = {}) => (
	codes
		.filter(Boolean)
		.map((code) => ({
			title: getProviderDisplayName(code, displayNames),
			value: code,
		}))
);
