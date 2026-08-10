/**
 * MongoDB Index Oluşturma Script'i
 * Performans için gerekli index'leri oluşturur
 *
 * Kullanım: node scripts/create-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Modelleri yükle
require("../database/models/CryptoTransaction");
require("../database/models/BankTransfer");
require("../database/models/User");
require("../database/models/Transaction");

async function createIndexes() {
	try {
		console.log("🔌 MongoDB'ye bağlanılıyor...");
		await mongoose.connect(process.env.DATABASE_URI);
		console.log("✅ MongoDB bağlantısı başarılı");

		const CryptoTransaction = mongoose.model("CryptoTransaction");
		const BankTransfer = mongoose.model("BankTransfer");
		const User = mongoose.model("User");
		const Transaction = mongoose.model("Transaction");

		console.log("\n📊 Index'ler oluşturuluyor...\n");

		// CryptoTransaction index'leri
		console.log("CryptoTransaction index'leri:");
		await CryptoTransaction.collection.createIndex({ createdAt: -1 });
		console.log("  ✅ createdAt: -1");
		await CryptoTransaction.collection.createIndex({ state: 1, type: 1 });
		console.log("  ✅ state: 1, type: 1");
		await CryptoTransaction.collection.createIndex({
			state: 1,
			createdAt: -1,
		});
		console.log("  ✅ state: 1, createdAt: -1");

		// BankTransfer index'leri
		console.log("\nBankTransfer index'leri:");
		await BankTransfer.collection.createIndex({ createdAt: -1 });
		console.log("  ✅ createdAt: -1");
		await BankTransfer.collection.createIndex({ status: 1, type: 1 });
		console.log("  ✅ status: 1, type: 1");
		await BankTransfer.collection.createIndex({ status: 1, createdAt: -1 });
		console.log("  ✅ status: 1, createdAt: -1");

		// User index'leri (stats için)
		console.log("\nUser index'leri:");
		await User.collection.createIndex({ createdAt: -1 });
		console.log("  ✅ createdAt: -1");
		await User.collection.createIndex({ "stats.bet": 1 });
		console.log("  ✅ stats.bet: 1");

		// Transaction index'leri (provider callback/idempotency)
		console.log("\nTransaction index'leri:");
		await Transaction.collection.createIndex({ txn_id: 1 }, { unique: true });
		console.log("  ✅ txn_id: 1 unique");
		await Transaction.collection.createIndex({
			user_code: 1,
			provider_code: 1,
			txn_type: 1,
			round_id: 1,
		});
		console.log("  ✅ user/provider/type/round");
		await Transaction.collection.createIndex({
			user_code: 1,
			provider_code: 1,
			txn_type: 1,
			"extra.gameRoundId": 1,
		});
		console.log("  ✅ user/provider/type/extra.gameRoundId");
		await Transaction.collection.createIndex({
			user_code: 1,
			provider_code: 1,
			txn_type: 1,
			"extra.wagerId": 1,
		});
		console.log("  ✅ user/provider/type/extra.wagerId");
		await Transaction.collection.createIndex({
			user_code: 1,
			provider_code: 1,
			txn_type: 1,
			"extra.pairCode": 1,
		});
		console.log("  ✅ user/provider/type/extra.pairCode");
		await Transaction.collection.createIndex({ "extra.wagerId": 1 });
		console.log("  ✅ extra.wagerId: 1");

		console.log("\n🎉 Tüm index'ler başarıyla oluşturuldu!");

		// Mevcut index'leri listele
		console.log("\n📋 Mevcut Index'ler:\n");

		const cryptoIndexes = await CryptoTransaction.collection.indexes();
		console.log(
			"CryptoTransaction:",
			cryptoIndexes.map((i) => i.name)
		);

		const bankIndexes = await BankTransfer.collection.indexes();
		console.log(
			"BankTransfer:",
			bankIndexes.map((i) => i.name)
		);

		const userIndexes = await User.collection.indexes();
		console.log(
			"User:",
			userIndexes.map((i) => i.name)
		);

		const transactionIndexes = await Transaction.collection.indexes();
		console.log(
			"Transaction:",
			transactionIndexes.map((i) => i.name)
		);
	} catch (err) {
		console.error("❌ Hata:", err.message);
	} finally {
		await mongoose.disconnect();
		console.log("\n🔌 MongoDB bağlantısı kapatıldı");
		process.exit(0);
	}
}

createIndexes();
