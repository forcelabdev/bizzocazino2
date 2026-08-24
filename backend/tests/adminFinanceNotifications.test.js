const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.join(__dirname, "..", "..");
const readRepositoryFile = (filePath) =>
	fs.readFileSync(path.join(repositoryRoot, filePath), "utf8");

test("admin bildirim modeli yatırım ve çekim tiplerini kabul eder", () => {
	const AdminNotification = require("../database/models/AdminNotification");
	const enumValues = AdminNotification.schema.path("type").enumValues;

	assert.ok(enumValues.includes("deposit"));
	assert.ok(enumValues.includes("withdraw"));
});

test("admin istemcisi finans bildirimlerini socket ve polling ile takip eder", () => {
	const source = readRepositoryFile(
		"admin/src/composables/useAdminNotifications.js",
	);

	assert.match(
		source,
		/FINANCE_NOTIFICATION_TYPES\s*=\s*new Set\(\['deposit', 'withdraw'\]\)/,
	);
	assert.match(source, /setInterval\(fetchNotifications,\s*NOTIFICATION_POLL_INTERVAL_MS\)/);
	assert.doesNotMatch(source, /transports:\s*\[\s*['"]websocket['"]\s*\]/);
	assert.match(source, /testNotificationSound/);
});

test("admin toast composable bildirim dinleyicisinin kullandığı push API'sini sunar", () => {
	const source = readRepositoryFile("admin/src/composables/useNotify.js");

	assert.match(source, /return\s*{[\s\S]*notifications,[\s\S]*push,/);
});

test("notification.wav gerçek ve sesli bir PCM dosyasıdır", () => {
	const audioPath = path.join(
		repositoryRoot,
		"admin/public/sounds/notification.wav",
	);
	const audio = fs.readFileSync(audioPath);
	const dataChunk = audio.indexOf(Buffer.from("data"));

	assert.equal(audio.subarray(0, 4).toString(), "RIFF");
	assert.ok(dataChunk >= 0, "WAV data chunk bulunamadı");

	let peak = 0;
	for (let offset = dataChunk + 8; offset + 1 < audio.length; offset += 2) {
		peak = Math.max(peak, Math.abs(audio.readInt16LE(offset)));
	}

	assert.ok(peak > 1000, "WAV dosyası sessiz görünüyor");
});
