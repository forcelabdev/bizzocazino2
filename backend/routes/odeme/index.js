const express = require("express");
const router = express.Router();
const User = require("../../database/models/User");
const Deposit = require("../../database/models/Deposit");
const crypto = require("crypto");
const { authorizeUser } = require("../../middleware/auth");

// ⚠️ GÜVENLİK: API Bilgileri environment variable'dan alınmalı
const MERCHANT_SID = process.env.MAKSIPARA_MERCHANT_SID;
const MERCHANT_KEY = process.env.MAKSIPARA_MERCHANT_KEY;

// Başlangıçta API key kontrolü
if (!MERCHANT_SID || !MERCHANT_KEY) {
	console.warn('⚠️ UYARI: MAKSIPARA_MERCHANT_SID veya MAKSIPARA_MERCHANT_KEY environment variable\'ları tanımlı değil!');
}

// Ortak fonksiyon: İşlem oluştur ve yönlendir
const createDepositTransaction = async (userId, method, returnUrl) => {
	const user = await User.findById(userId);

	if (!user) {
		throw new Error("Kullanıcı bulunamadı.");
	}

	// İşlem kimliği oluştur
	const transactionId = crypto.randomUUID();

	// İşlemi veritabanına kaydet
	await Deposit.create({
		user: user._id,
		username: user.username,
		name: user.name,
		transactionId: transactionId,
		method: method,
		status: "pending",
		amount: 0, // Başlangıç değeri
		createdAt: new Date(),
	});

	// Maksipara yönlendirme URL'si oluştur
	const redirectUrl = `https://pay.maksipara1.com/Methods/${method}/?sid=${MERCHANT_SID}&username=${
		user.username
	}&userID=${user._id}&fullname=${
		user.name
	}&trx=${transactionId}&return_url=${encodeURIComponent(returnUrl)}`;

	return redirectUrl;
};

// **Papara Yönlendirme** - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.get("/papara", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al (IDOR koruması)
		const userId = req.user._id;

		const redirectUrl = await createDepositTransaction(
			userId,
			"Papara",
			"https://arcanebet366.com/odeme/sonuc"
		);

		res.status(200).json({
			message: "Papara ödemesi için yönlendirme yapılıyor.",
			redirectUrl: redirectUrl,
		});
	} catch (err) {
		console.error('Error creating Papara deposit:', err.message);
		res.status(500).json({ error: err.message || "Sunucu hatası." });
	}
});

// **Banka Havalesi Yönlendirme** - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.get("/banktransfer", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al
		const userId = req.user._id;

		const redirectUrl = await createDepositTransaction(
			userId,
			"BankTransfer",
			"https://arcanebet366.com/odeme/sonuc"
		);

		res.status(200).json({
			message: "Banka Havalesi ödemesi için yönlendirme yapılıyor.",
			redirectUrl: redirectUrl,
		});
	} catch (err) {
		console.error('Error creating BankTransfer deposit:', err.message);
		res.status(500).json({ error: err.message || "Sunucu hatası." });
	}
});

// **Payfix Yönlendirme** - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.get("/payfix", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al
		const userId = req.user._id;

		const redirectUrl = await createDepositTransaction(
			userId,
			"Payfix",
			"https://arcanebet366.com/odeme/sonuc"
		);

		res.status(200).json({
			message: "Payfix ödemesi için yönlendirme yapılıyor.",
			redirectUrl: redirectUrl,
		});
	} catch (err) {
		console.error('Error creating Payfix deposit:', err.message);
		res.status(500).json({ error: err.message || "Sunucu hatası." });
	}
});

module.exports = router;
