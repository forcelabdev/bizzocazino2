const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("admin user list includes the display account number source field", () => {
	const routePath = path.join(__dirname, "..", "routes", "admin", "index.js");
	const routeSource = fs.readFileSync(routePath, "utf8");

	assert.match(
		routeSource,
		/const formatAdminUserListItem[\s\S]*?numericId:\s*user\.numericId/,
	);
	assert.match(
		routeSource,
		/const projection = \{\s*numericId:\s*1,\s*username:\s*1/,
	);
});

test("admin user list protects contact, finance totals and XLSX source data with a dedicated permission", () => {
	const routePath = path.join(__dirname, "..", "routes", "admin", "index.js");
	const routeSource = fs.readFileSync(routePath, "utf8");
	const seedPath = path.join(__dirname, "..", "scripts", "seedPermissions.js");
	const seedSource = fs.readFileSync(seedPath, "utf8");

	assert.match(seedSource, /code: "users\.listDetails\.read"/);
	assert.match(
		routeSource,
		/hasPermission\(req, "users\.listDetails\.read"\)/,
	);
	assert.match(routeSource, /includeListDetails: canViewListDetails/);
	assert.match(
		routeSource,
		/canViewListDetails\s*\? await getUserApprovedFinanceTotals/,
	);
});
