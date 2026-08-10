const test = require("node:test");
const assert = require("node:assert/strict");

const Banner = require("../database/models/Banner");
const {
	BANNER_TYPES,
	normalizeBannerType,
	serializeBanner,
} = require("../utils/banner");

test("banner type sozlesmesi yalniz both, mobile ve desktop degerlerini kabul eder", () => {
	assert.deepEqual(BANNER_TYPES, ["both", "mobile", "desktop"]);
	assert.equal(normalizeBannerType(" mobile "), "mobile");
	assert.equal(normalizeBannerType("DESKTOP"), "desktop");
	assert.equal(normalizeBannerType("tablet"), null);
});

test("bos veya eski banner type degeri both olarak normalize edilir", () => {
	assert.equal(normalizeBannerType(), "both");
	assert.deepEqual(serializeBanner({ _id: "banner-1", position: "HomeTop" }), {
		_id: "banner-1",
		position: "HomeTop",
		type: "both",
	});
});

test("banner response gecerli cihaz tipini korur", () => {
	assert.equal(serializeBanner({ type: "mobile" }).type, "mobile");
	assert.equal(serializeBanner({ type: "invalid" }).type, "both");
});

test("banner modeli type alanini both varsayilani ve enum ile korur", () => {
	const banner = new Banner({ imageUrl: "/banner.webp", position: "HomeTop" });
	const invalidBanner = new Banner({
		imageUrl: "/banner.webp",
		position: "HomeTop",
		type: "tablet",
	});

	assert.equal(banner.type, "both");
	assert.ok(invalidBanner.validateSync()?.errors.type);
});
