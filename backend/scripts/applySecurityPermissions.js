/**
 * Bir defalık kurulum: "Güvenlik" izin grubunu (security.read, security.manage)
 * DB'ye upsert eder ve mevcut "admin" / "viewer" rollerine ellerini
 * sürmeden (permission listelerini tamamen ezmeden) sadece security.read
 * ekler — seedRoles({overwriteExisting:true}) tüm listeyi ezeceği için
 * bilerek onun yerine bu hedefli script kullanılıyor.
 *
 * Kullanım: node scripts/applySecurityPermissions.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Permission = require("../database/models/Permission");
const AdminRole = require("../database/models/AdminRole");
const { defaultPermissions } = require("./seedPermissions");

const connectDB = async () => {
	await mongoose.connect(process.env.DATABASE_URI);
	console.log("✅ MongoDB connected");
};

const main = async () => {
	await connectDB();

	const securityPerms = defaultPermissions.filter((p) => p.group === "Güvenlik");
	for (const perm of securityPerms) {
		await Permission.findOneAndUpdate({ code: perm.code }, perm, {
			upsert: true,
			new: true,
		});
	}
	console.log(`✅ ${securityPerms.length} güvenlik izni upsert edildi.`);

	const readPerm = await Permission.findOne({ code: "security.read" }).select("_id");
	if (!readPerm) throw new Error("security.read permission bulunamadı");

	for (const roleName of ["admin", "viewer"]) {
		const role = await AdminRole.findOne({ name: roleName });
		if (!role) {
			console.log(`⚠️  Rol bulunamadı: ${roleName}`);
			continue;
		}
		const alreadyHas = role.permissions.some(
			(id) => String(id) === String(readPerm._id)
		);
		if (alreadyHas) {
			console.log(`ℹ️  ${roleName} zaten security.read'e sahip.`);
			continue;
		}
		role.permissions.push(readPerm._id);
		await role.save();
		console.log(`✅ ${roleName} rolüne security.read eklendi.`);
	}

	console.log("🎉 Tamamlandı!");
	process.exit(0);
};

main().catch((err) => {
	console.error("❌ Hata:", err);
	process.exit(1);
});
