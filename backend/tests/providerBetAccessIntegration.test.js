const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readBackendFile = (...segments) =>
	fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8");

test("aktif provider route'ları launch, bakiye ve yeni bet kontrollerini kullanır", () => {
	const routes = [
		["betinoviApi.js", 3],
		["betcolabsApi.js", 3],
		["goldApi.js", 3],
		["drakonApi.js", 2],
		["pokerApi.js", 2],
	];

	for (const [file, minimumBlockedChecks] of routes) {
		const source = readBackendFile("routes", file);
		const blockedChecks = source.match(/isUserBetAccessBlocked\(/g) || [];

		assert.match(source, /require\("\.\.\/utils\/userBetAccess"\)/, file);
		assert.match(source, /getProviderVisibleBalance\(/, file);
		assert.ok(
			blockedChecks.length >= minimumBlockedChecks,
			`${file} bet engelini launch ve debit akışlarında uygulamalı`,
		);
	}
});

test("bet erişimi sadece yetkili admin endpoint'inden değiştirilebilir", () => {
	const adminRoute = readBackendFile("routes", "admin", "index.js");
	const userRoute = readBackendFile("routes", "user", "index.js");

	assert.match(adminRoute, /"\/users\/:id\/bet-access"/);
	assert.match(adminRoute, /checkPermission\("users\.update"\)/);
	assert.match(adminRoute, /source: "admin-user-bet-access"/);
	assert.match(userRoute, /forbiddenFields[^;]+['"]betAccess['"]/);
});
