const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildAdminUserSearch,
	buildExactDigitSearchPattern,
	isTrueQueryValue,
	resolveAdminUserSearch,
} = require("../utils/adminUserSearch");

test("admin user search tam metin ve formatli rakam eslesmelerini kurar", () => {
	const usernameSearch = buildAdminUserSearch("  Kayaak04  ");
	const phonePattern = new RegExp(buildExactDigitSearchPattern("905551112233"));

	assert.equal(usernameSearch.trimmedSearch, "Kayaak04");
	assert.equal(usernameSearch.exactQuery.$or[0]["local.email"].test("KAYAak04"), true);
	assert.equal(usernameSearch.exactQuery.$or[1].username.test("Kayaak040"), false);
	assert.equal(phonePattern.test("+90 (555) 111 22 33"), true);
	assert.equal(phonePattern.test("+90 (555) 111 22 334"), false);
});

test("alfanumerik arama numeric id veya telefon kesin eslesmesine donusmez", () => {
	const search = buildAdminUserSearch("Kayaak04");
	const exactFields = search.exactQuery.$or.flatMap(match => Object.keys(match));

	assert.equal(exactFields.includes("numericId"), false);
	assert.equal(exactFields.includes("phone"), false);
	assert.equal(exactFields.includes("identity.idNumber"), false);
});

test("smart arama kesin eslesme varsa benzer sonuclari varsayilan olarak gizler", () => {
	assert.deepEqual(resolveAdminUserSearch({
		searchMode: "smart",
		hasSearch: true,
		includeSimilar: false,
		exactCount: 1,
		partialCount: 4,
	}), {
		useExactQuery: true,
		searchMeta: {
			resolvedMode: "exact",
			exactMatchCount: 1,
			similarMatchCount: 3,
		},
	});
});

test("smart arama benzerler acildiginda tum sonuclari ve sayilari dondurur", () => {
	assert.deepEqual(resolveAdminUserSearch({
		searchMode: "smart",
		hasSearch: true,
		includeSimilar: true,
		exactCount: 2,
		partialCount: 5,
	}), {
		useExactQuery: false,
		searchMeta: {
			resolvedMode: "all",
			exactMatchCount: 2,
			similarMatchCount: 3,
		},
	});
});

test("smart arama kesin sonuc yoksa benzer aramaya geri doner", () => {
	const resolution = resolveAdminUserSearch({
		searchMode: "smart",
		hasSearch: true,
		includeSimilar: false,
		exactCount: 0,
		partialCount: 6,
	});

	assert.equal(resolution.useExactQuery, false);
	assert.equal(resolution.searchMeta.resolvedMode, "partial");
	assert.equal(resolution.searchMeta.similarMatchCount, 6);
});

test("smart modu istenmeyen cagri geriye uyumlu kalir", () => {
	assert.deepEqual(resolveAdminUserSearch({
		searchMode: undefined,
		hasSearch: true,
		includeSimilar: false,
		exactCount: 1,
		partialCount: 3,
	}), { useExactQuery: false, searchMeta: null });
	assert.equal(isTrueQueryValue("true"), true);
	assert.equal(isTrueQueryValue("1"), true);
	assert.equal(isTrueQueryValue("false"), false);
});
