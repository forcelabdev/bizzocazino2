const BANNER_TYPES = Object.freeze(["both", "mobile", "desktop"]);

const normalizeBannerType = (value) => {
	if (value === undefined || value === null || value === "") return "both";

	const normalizedType = String(value).trim().toLowerCase();

	return BANNER_TYPES.includes(normalizedType) ? normalizedType : null;
};

const serializeBanner = (banner) => {
	const data = typeof banner?.toObject === "function" ? banner.toObject() : banner;

	return {
		...data,
		type: normalizeBannerType(data?.type) || "both",
	};
};

module.exports = {
	BANNER_TYPES,
	normalizeBannerType,
	serializeBanner,
};
