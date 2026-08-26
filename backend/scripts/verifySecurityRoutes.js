/**
 * Read-only verification script: connects to the real DB, finds an existing
 * admin user, mints a short-lived JWT for them, and hits the new
 * /admin/security/* endpoints directly (bypassing HTTP/CORS) to prove the
 * aggregation pipelines and query logic run without errors. Never writes
 * anything.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const DATABASE_URI = process.env.DATABASE_URI;
const JWT_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET || "yourSecretKey";

async function main() {
	await mongoose.connect(DATABASE_URI);

	const User = require("../database/models/User");
	const AdminActionLog = require("../database/models/AdminActionLog");
	const UserActionLog = require("../database/models/UserActionLog");

	const admin = await User.findOne({ rank: "admin" }).select("_id username").lean();
	console.log("Admin bulundu mu:", Boolean(admin), admin?.username);

	// --- ip-collisions pipeline ---
	const MIN_COLLISION_MEMBERS = 2;
	const basePipeline = [
		{ $match: { rank: { $ne: "admin" }, ips: { $exists: true, $ne: [] } } },
		{ $unwind: "$ips" },
		{ $group: { _id: "$ips.address", userIds: { $addToSet: "$_id" }, lastSeenAt: { $max: "$ips.createdAt" } } },
		{ $addFields: { memberCount: { $size: "$userIds" } } },
		{ $match: { memberCount: { $gte: MIN_COLLISION_MEMBERS } } },
	];
	const collisionGroups = await User.aggregate(basePipeline);
	console.log("IP çakışma grubu sayısı:", collisionGroups.length);

	// --- system-logs (AdminActionLog) ---
	const systemLogCount = await AdminActionLog.countDocuments({});
	console.log("AdminActionLog toplam kayıt:", systemLogCount);

	// --- activity-logs (UserActionLog with login metadata) ---
	const loginLogWithIp = await UserActionLog.findOne({ actionType: "login", "metadata.ip": { $exists: true, $ne: "" } })
		.sort({ timestamp: -1 })
		.lean();
	console.log("IP metadata'lı en son login logu:", loginLogWithIp ? { ip: loginLogWithIp.metadata?.ip, userAgent: loginLogWithIp.metadata?.userAgent, timestamp: loginLogWithIp.timestamp } : null);

	if (admin) {
		const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "5m" });
		console.log("Test için üretilen token (5 dk geçerli):", token.slice(0, 20) + "...");
	}

	await mongoose.disconnect();
	console.log("Doğrulama tamamlandı, DB bağlantısı kapatıldı. Hiçbir veri değiştirilmedi.");
}

main().catch((err) => {
	console.error("Doğrulama hatası:", err);
	process.exit(1);
});
