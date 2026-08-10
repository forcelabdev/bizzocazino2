const mongoose = require("mongoose");
const readline = require("readline");

//{rank: {$ne:"admin"}}
// Kaynak ve hedef MongoDB bağlantı URL'leri
const SOURCE_MONGO_URL =
	process.env.SOURCE_MONGO_URL ||
	"mongodb+srv://master:9RhYgPZD1hBILa7c@cluster0.nvsg0g.mongodb.net/save?appName=betitall";
const TARGET_MONGO_URL =
	process.env.TARGET_MONGO_URL ||
	"mongodb+srv://master:9RhYgPZD1hBILa7c@cluster0.nvsg0g.mongodb.net/noelbet?appName=betitall";

const ignoredCollections = [
	"withdrawals",
	"wingogames",
	"wingobets",
	"userseeds",
	//"users",
	"userprogresses",
	"usermissionprogresses",
	"userinventories",
	"useractionlogs",
	"upgradergames",
	"unboxgames",
	"turbotrades",
	"transactions",
	"towersgames",
	"tokens",
	"tiptransactions",
	"steamtransactions",
	"sportsbets",
	"sportsbetevents",
	"rollseeds",
	"rollgames",
	"rollbets",
	"robuxtransactions",
	"robuxoffers",
	"rewards",
	"reports",
	"rain",
	"promocodes",
	"notices",
	"news",
	"missions",
	"minesgames",
	"limitedtransactions",
	"balancetransactions",
	"bankaccounts",
	"banktransfers",
	"battlesbets",
	"battlesgames",
	"blackjackbets",
	"blackjackgames",
	"bonus",
	"bonushistories",
	"boxes",
	"campaigntransactions",
	// "categories",
	"crashbets",
	"crashgames",
	"crashseeds",
	"credittransactions",
	"cryptoaddresses",
	"cryptoprices",
	"cryptotransactions",
	"customerservices",
	"deposits",

	//
	"giftcodes",
	"futuresbets",
	"echopayztransactions",
	"duelsbets",
	"duelsgames",
];

// Komut satırından giriş almak için
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Onay sorusu
function askConfirmation(question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(
				answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
			);
		});
	});
}

async function migrateDatabase() {
	let sourceConnection = null;
	let targetConnection = null;

	try {
		console.log("🔄 MongoDB Veritabanı Aktarım Scripti\n");
		console.log(`📊 Kaynak: ${SOURCE_MONGO_URL}`);
		console.log(`🎯 Hedef: ${TARGET_MONGO_URL}\n`);

		// Onay al
		const confirmed = await askConfirmation(
			"⚠️  UYARI: Bu işlem hedef veritabanındaki mevcut verileri silebilir.\n" +
				"Devam etmek istiyor musunuz? (y/n): "
		);

		if (!confirmed) {
			console.log("❌ İşlem iptal edildi.");
			rl.close();
			return;
		}

		console.log("\n🔌 Veritabanlarına bağlanılıyor...");

		// Kaynak veritabanına bağlan
		sourceConnection = mongoose.createConnection(SOURCE_MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		await sourceConnection.asPromise();
		console.log("✅ Kaynak veritabanına bağlanıldı");

		// Hedef veritabanına bağlan
		targetConnection = mongoose.createConnection(TARGET_MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		await targetConnection.asPromise();
		console.log("✅ Hedef veritabanına bağlanıldı\n");

		// Kaynak veritabanındaki tüm koleksiyonları al
		const collections = await sourceConnection.db
			.listCollections()
			.toArray();
		console.log(`📦 Toplam ${collections.length} koleksiyon bulundu\n`);

		let totalDocuments = 0;
		let totalCollections = 0;

		// Her koleksiyon için
		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name;

			// Sistem koleksiyonlarını atla
			if (collectionName.startsWith("system.")) {
				console.log(
					`⏭️  Atlanıyor: ${collectionName} (sistem koleksiyonu)`
				);
				continue;
			}

			if (ignoredCollections.includes(collectionName)) {
				console.log(
					`⏭️  Atlanıyor: ${collectionName} (büyük koleksiyon)`
				);
				continue;
			}

			try {
				console.log(`\n📋 İşleniyor: ${collectionName}`);

				// Kaynak koleksiyondan belge sayısını al
				const sourceCollection =
					sourceConnection.db.collection(collectionName);
				const totalCount = await sourceCollection.countDocuments();

				console.log(`   📄 ${totalCount} belge bulundu`);

				if (totalCount > 0) {
					// Hedef koleksiyonu temizle (varsa)
					const targetCollection =
						targetConnection.db.collection(collectionName);
					const existingCount =
						await targetCollection.countDocuments();

					if (existingCount > 0) {
						console.log(
							`   🗑️  Hedefte ${existingCount} mevcut belge siliniyor...`
						);
						await targetCollection.deleteMany({});
					}

					// Batch işleme ile belgeleri aktar
					const BATCH_SIZE = 10000;
					let processed = 0;

					console.log(
						`   💾 ${totalCount} belge aktarılıyor (batch: ${BATCH_SIZE})...`
					);

					const cursor = sourceCollection
						.find({})
						.batchSize(BATCH_SIZE);
					let batch = [];

					for await (const doc of cursor) {
						batch.push(doc);

						if (batch.length >= BATCH_SIZE) {
							await targetCollection.insertMany(batch, {
								ordered: false,
							});
							processed += batch.length;
							console.log(
								`   ⏳ ${processed}/${totalCount} aktarıldı (${Math.round(
									(processed / totalCount) * 100
								)}%)`
							);
							batch = [];
						}
					}

					// Kalan belgeleri ekle
					if (batch.length > 0) {
						await targetCollection.insertMany(batch, {
							ordered: false,
						});
						processed += batch.length;
						console.log(
							`   ⏳ ${processed}/${totalCount} aktarıldı (100%)`
						);
					}

					console.log(`   ✅ ${collectionName} başarıyla aktarıldı`);
					totalDocuments += totalCount;
					totalCollections++;
				} else {
					console.log(
						`   ⚠️  ${collectionName} koleksiyonu boş, atlanıyor`
					);
				}

				// İndeksleri kopyala
				const indexes = await sourceCollection.indexes();
				if (indexes.length > 1) {
					const indexCount = indexes.length - 1; // _id hariç
					console.log(
						`   🔗 ${indexCount} indeks kopyalanıyor...`
					);
					const targetCollection =
						targetConnection.db.collection(collectionName);

					// Hedefte önceki çalıştırmadan kalan eski indexleri temizle
					try {
						await targetCollection.dropIndexes();
					} catch (dropErr) {
						// İlk migrasyon ise index olmayabilir, sorun değil
					}

					// Atlanacak dahili/gereksiz özellikler
					const SKIP_KEYS = new Set([
						"v",
						"key",
						"ns",
						"background",
					]);

					let copiedCount = 0;
					let failedCount = 0;

					for (const index of indexes) {
						// _id indeksini atla (otomatik oluşturuluyor)
						if (index.name === "_id_") continue;

						try {
							let indexSpec = { ...index.key };

							// Text index: dahili _fts/_ftsx key'leri
							// doğrudan kullanılamaz, weights'ten yeniden oluştur
							if (indexSpec._fts === "text") {
								indexSpec = {};
								if (index.weights) {
									for (const field of Object.keys(
										index.weights
									)) {
										indexSpec[field] = "text";
									}
								}
							}

							// Tüm ilgili index seçeneklerini kopyala
							const indexOptions = {};
							for (const [optKey, optVal] of Object.entries(
								index
							)) {
								if (SKIP_KEYS.has(optKey)) continue;
								indexOptions[optKey] = optVal;
							}

							await targetCollection.createIndex(
								indexSpec,
								indexOptions
							);
							copiedCount++;
						} catch (indexError) {
							failedCount++;
							console.log(
								`   ⚠️  İndeks oluşturulamadı: ${index.name} — ${indexError.message}`
							);
						}
					}

					if (failedCount > 0) {
						console.log(
							`   🔗 İndeksler: ${copiedCount}/${indexCount} başarılı, ${failedCount} başarısız`
						);
					}
				}
			} catch (error) {
				console.error(
					`   ❌ Hata oluştu: ${collectionName}`,
					error.message
				);
			}
		}

		console.log("\n" + "=".repeat(50));
		console.log("🎉 Aktarım tamamlandı!");
		console.log(`📊 Özet:`);
		console.log(`   - Aktarılan koleksiyon: ${totalCollections}`);
		console.log(`   - Aktarılan belge: ${totalDocuments}`);
		console.log("=".repeat(50));
	} catch (error) {
		console.error("\n❌ Kritik hata:", error);
	} finally {
		// Bağlantıları kapat
		if (sourceConnection) {
			await sourceConnection.close();
			console.log("\n🔌 Kaynak bağlantı kapatıldı");
		}
		if (targetConnection) {
			await targetConnection.close();
			console.log("🔌 Hedef bağlantı kapatıldı");
		}
		rl.close();
	}
}

// Scripti çalıştır
migrateDatabase().catch(console.error);
