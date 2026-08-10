/**
 * Bakım scripti: SiteSettings.apiSettings.betinoviReports / .controlGame
 * içindeki eski/ölü hesaba ait (agentCode, baseUrl, agentToken) alanlarını temizler.
 *
 * Neden: betinoviAdminApiService.js -> resolveRuntimeConfig() bu alanlar
 * DB'de DOLU ise env değişkenlerine (BETINOVI_API_ENDPOINT, BETINOVI_AGENT_CODE,
 * BETINOVI_AGENT_TOKEN) asla düşmüyor. DB'de eski/geçersiz bir hesabın bilgileri
 * kayıtlı olduğundan gerçek çalışan hesap hiç kullanılamıyordu.
 *
 * Bu script idempotent'tir: zaten boşsa hiçbir şey yapmaz, tekrar çalıştırmak güvenlidir.
 *
 * Kullanım:
 *   node --env-file-if-exists=/vercel/share/.env.project backend/scripts/fixBetinoviAdminApiSettings.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const SiteSettings = require("../database/models/SiteSettings");

async function run() {
	const uri = process.env.DATABASE_URI;
	if (!uri) {
		console.error("[fix] DATABASE_URI tanımlı değil, çıkılıyor.");
		process.exit(1);
	}

	await mongoose.connect(uri);
	console.log("[fix] MongoDB bağlantısı kuruldu.");

	const settings = await SiteSettings.findOne();
	if (!settings) {
		console.log("[fix] SiteSettings dokümanı bulunamadı, yapılacak bir şey yok.");
		await mongoose.disconnect();
		return;
	}

	let changed = false;

	const sections = ["betinoviReports", "controlGame"];
	for (const key of sections) {
		const section = settings.apiSettings?.[key];
		if (!section) continue;

		const before = {
			baseUrl: section.baseUrl,
			agentCode: section.agentCode,
			agentToken: section.agentToken,
		};

		if (section.baseUrl) {
			section.baseUrl = "";
			changed = true;
		}
		if (section.agentCode) {
			section.agentCode = "";
			changed = true;
		}
		if (section.agentToken) {
			section.agentToken = "";
			changed = true;
		}

		if (before.baseUrl || before.agentCode || before.agentToken) {
			console.log(
				`[fix] apiSettings.${key} temizlendi -> önceki agentCode: "${before.agentCode}", baseUrl: "${before.baseUrl}"`
			);
		} else {
			console.log(`[fix] apiSettings.${key} zaten boş, dokunulmadı.`);
		}
	}

	if (changed) {
		settings.markModified("apiSettings");
		await settings.save();
		console.log("[fix] Değişiklikler kaydedildi. Artık env değişkenleri (BETINOVI_*) kullanılacak.");
	} else {
		console.log("[fix] Herhangi bir değişiklik yapılmadı (zaten temizdi).");
	}

	await mongoose.disconnect();
}

run()
	.then(() => {
		console.log("[fix] Tamamlandı.");
		process.exit(0);
	})
	.catch((err) => {
		console.error("[fix] Hata:", err);
		process.exit(1);
	});
