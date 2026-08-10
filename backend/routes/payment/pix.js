const express = require("express");
const router = express.Router();
const axios = require("axios");
const User = require("../../database/models/User");
const CreditTransaction = require("../../database/models/CreditTransaction");
const { updateUserBalance, emitUserBalance } = require("../../utils/wallet");
const { authorizeUser } = require("../../middleware/auth");

const PRADA_API = "https://api.pradapay.com/v1/gateway/";
// ⚠️ GÜVENLİK: API key environment variable'dan alınmalı
const PRADA_API_KEY = process.env.PRADA_API_KEY;
const POSTBACK_URL = "https://arcanebet366.com/api/payment/pix/callback";

// Başlangıçta API key kontrolü
if (!PRADA_API_KEY) {
	console.warn('⚠️ UYARI: PRADA_API_KEY environment variable tanımlı değil!');
}

// ✅ Pix Ödemesi Oluşturma - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.post("/create", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al (IDOR koruması)
		const userId = req.user._id;
		const { amount } = req.body;

		if (!amount) {
			return res.status(400).json({ error: "amount gerekli" });
		}

		// ⚠️ GÜVENLİK: API key kontrolü
		if (!PRADA_API_KEY) {
			return res.status(500).json({ error: "Pix API yapılandırması eksik" });
		}

		const user = await User.findById(userId);
		if (!user)
			return res.status(404).json({ error: "Kullanıcı bulunamadı" });

		// 🔹 Sadece zorunlu alanlar
		const client = {
			name: user.name || "Usuário",
			document: user.identity?.idNumber || "000.000.000-00",
			email: user.local?.email || "noemail@https://arcanebet366.com",
			userPhone: user.phone || "(00) 00000-0000",
		};

		const requestNumber = `${userId}_${Date.now()}`;

		const payload = {
			requestNumber,
			amount: parseFloat(amount),
			"api-key": PRADA_API_KEY,
			postback: POSTBACK_URL,
			client,
		};

		// 🔹 PradaPay API'ye istek
		const response = await axios.post(PRADA_API, payload, {
			headers: {
				"api-key": PRADA_API_KEY,
				"Content-Type": "application/json",
			},
		});

		const data = response.data;

		if (!data || data.status !== "success") {
			return res
				.status(400)
				.json({ error: "Pix oluşturulamadı", response: data });
		}

		// ✅ Transaction kaydet
		const transaction = await CreditTransaction.create({
			user: user._id,
			amount: amount,
			type: "deposit",
			state: "pending",
			data: {
				providerId: data.idTransaction,
				providerUrl: data.paymentCodeBase64 || "",
				currency: "BRL",
				amountCurrency: amount,
				paymentMethod: "pix",
				paymentCode: data.paymentCode || "",
				paymentCodeBase64: data.paymentCodeBase64 || "",
				idTransaction: data.idTransaction,
				postbackUrl: POSTBACK_URL,
			},
			rawResponse: data,
		});

		res.json({
			success: true,
			message: "Pix ödemesi oluşturuldu",
			transactionId: transaction._id,
			pixCode: data.paymentCode,
			pixQR: data.paymentCodeBase64,
			providerId: data.idTransaction,
		});
	} catch (err) {
		console.error(
			"Pix oluşturma hatası:",
			err.response?.data || err.message
		);
		res.status(500).json({
			error: "Pix oluşturma başarısız",
			details: err.response?.data || err.message,
		});
	}
});

// ✅ Pix Callback (Webhook - aynı kaldı)
router.post("/callback", async (req, res) => {
	try {
		const { idtransaction, status } = req.body;

		if (!idtransaction) {
			return res.status(400).json({ error: "idtransaction gerekli" });
		}

		const transaction = await CreditTransaction.findOne({
			"data.idTransaction": idtransaction,
		}).populate("user");

		if (!transaction) {
			return res.status(404).json({ error: "İşlem bulunamadı" });
		}

		console.log("📥 PradaPay callback geldi:", req.body);

		// Ödeme başarılıysa
		if (status === "PAID_OUT" && transaction.state === "pending") {
			const user = transaction.user;

			// Aktif cüzdan
			const activeWallet = user.wallets.find(
				(w) =>
					w.coinType === user.currency.coinType &&
					w.chain === user.currency.chain &&
					w.type === user.currency.type
			);

			if (!activeWallet) {
				return res
					.status(400)
					.json({ error: "Aktif cüzdan bulunamadı" });
			}

			// ✅ Bakiye ekle
			await updateUserBalance(user, transaction.amount, {
				emitSocket: true,
			});
			user.stats.deposit += transaction.amount;
			await user.save();

			// ✅ Transaction güncelle
			transaction.state = "success";
			transaction.webhookVerified = true;
			transaction.processedAt = new Date();
			await transaction.save();

			console.log(
				`✅ Kullanıcı ${
					user.username || user._id
				} bakiyesi güncellendi +${transaction.amount}`
			);

			return res.json({
				success: true,
				message: "Bakiye eklendi ve işlem tamamlandı",
			});
		} else {
			// Diğer durumlar
			transaction.state = status?.toLowerCase() || "failed";
			await transaction.save();

			return res.json({
				success: true,
				message: "Durum güncellendi",
				status,
			});
		}
	} catch (err) {
		console.error("Callback hatası:", err);
		res.status(500).json({
			error: "Callback işlenemedi",
			details: err.message,
		});
	}
});

module.exports = router;
