const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("credentials registration imports the JWT helper it calls", () => {
	const routePath = path.join(
		__dirname,
		"..",
		"routes",
		"auth",
		"credentials",
		"index.js",
	);
	const routeSource = fs.readFileSync(routePath, "utf8");

	assert.match(routeSource, /const\s*{\s*authGenerateJwtToken\s*}\s*=\s*require\("\.\.\/\.\.\/\.\.\/utils\/auth"\)/);
	assert.match(routeSource, /authGenerateJwtToken\(newUser\._id\)/);
});

test("GET /auth/me exposes numericId as a display-safe accountNumber", () => {
	const routePath = path.join(__dirname, "..", "routes", "auth", "index.js");
	const routeSource = fs.readFileSync(routePath, "utf8");

	assert.match(
		routeSource,
		/username numericId avatar rank balance[^"\n]*mute ban betAccess/,
	);
	assert.match(
		routeSource,
		/String\(userWithAvatar\.numericId\)/,
	);
	assert.match(
		routeSource,
		/user:\s*{\s*\.\.\.userWithAvatar, accountNumber\s*}/,
	);
});
