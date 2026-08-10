const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../database/models/User");
const Deposit = require("../database/models/Deposit");
const CryptoTransaction = require("../database/models/CryptoTransaction");
const { authorizeUser } = require("../middleware/auth");

// Giriş yapma endpointi
router.post("/login", async (req, res) => {
	const { username, password } = req.body;

	try {
		// Kullanıcıyı username'e göre bul
		const user = await User.findOne({ username: username });

		if (!user) {
			return res.status(404).json({ message: "Kullanıcı bulunamadı." });
		}

		// Şifreyi kontrol et
		const passwordMatch = await bcrypt.compare(
			password,
			user.local.password
		);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Geçersiz şifre." });
		}

		// Kullanıcının rank değerini kontrol et
		if (user.rank !== "partner") {
			return res.status(403).json({ message: "Partner değilsiniz." });
		}

		// Giriş başarılı
		res.status(200).json({
			message: "Giriş başarılı.",
			user: {
				id: user._id, // Kullanıcı ID'si
				username: user.username,
				name: user.name,
				email: user.local.email,
				rank: user.rank,
				balance: user.balance,
			},
		});
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

// Toplam referans sayısını hesaplama endpoint'i - ⚠️ GÜVENLİK: Sadece kendi referanslarını görebilir
router.get("/referrals/:id", authorizeUser(true), async (req, res) => {
	const { id } = req.params; // Giriş yapan kullanıcının ID'si

	// Sadece kendi referanslarını görebilir
	if (req.user._id.toString() !== id) {
		return res.status(403).json({ success: false, message: "Yetkisiz erişim" });
	}

	try {
		// Referrer alanında verilen ID'ye sahip kullanıcıları say
		const referralCount = await User.countDocuments({
			"affiliates.referrer": id,
		});

		// Sonucu döndür
		res.status(200).json({
			message: "Toplam referans sayısı başarıyla hesaplandı.",
			referralCount,
		});
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

// ⚠️ GÜVENLİK: Sadece kendi affiliate bilgilerini görebilir
router.get("/info/:id", authorizeUser(true), async (req, res) => {
	const { id } = req.params;

	// Sadece kendi bilgilerini görebilir
	if (req.user._id.toString() !== id) {
		return res.status(403).json({ success: false, message: "Yetkisiz erişim" });
	}

	try {
		const user = await User.findById(id).select(
			"affiliates.earned affiliates.available"
		);
		if (!user) {
			return res.status(404).json({ message: "Kullanıcı bulunamadı." });
		}
		res.status(200).json({ affiliates: user.affiliates });
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

// Referansların toplam depozit miktarını hesaplama endpoint'i - ⚠️ GÜVENLİK
router.get("/referrals/total-deposits/:id", authorizeUser(true), async (req, res) => {
	const { id } = req.params; // Giriş yapan kullanıcının ID'si

	// Sadece kendi referanslarının depozitlerini görebilir
	if (req.user._id.toString() !== id) {
		return res.status(403).json({ success: false, message: "Yetkisiz erişim" });
	}

	try {
		// Kullanıcının referanslarını al
		const referrals = await User.find({ "affiliates.referrer": id }, "_id");
		const referralIds = referrals.map((referral) => referral._id);

		// Deposit modelinden toplam miktarı hesapla
		const depositTotal = await Deposit.aggregate([
			{ $match: { user: { $in: referralIds } } },
			{ $group: { _id: null, totalAmount: { $sum: "$amount" } } },
		]);

		// CryptoTransaction modelinden toplam miktarı hesapla
		const cryptoTotal = await CryptoTransaction.aggregate([
			{
				$match: {
					user: { $in: referralIds },
					"data.type": "deposit",
					state: "completed",
				},
			},
			{ $group: { _id: null, totalAmount: { $sum: "$amount" } } },
		]);

		// Toplam depozit miktarını hesapla
		const totalDeposits =
			(depositTotal[0]?.totalAmount || 0) +
			(cryptoTotal[0]?.totalAmount || 0);

		// Sonucu döndür
		res.status(200).json({
			message: "Toplam depozit miktarı başarıyla hesaplandı.",
			totalDeposits,
		});
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

router.get("/referrals/last-five/:id", async (req, res) => {
	const { id } = req.params; // Giriş yapan kullanıcının ID'si

	try {
		// Son 5 referansı tarihe göre sıralayarak al
		const lastFiveUsers = await User.find({ "affiliates.referrer": id })
			.sort({ createdAt: -1 }) // Tarihe göre sıralama
			.limit(5) // Sadece 5 kullanıcı
			.select("_id name username createdAt"); // Gerekli alanları seç

		res.status(200).json({
			message: "Son 5 kullanıcı başarıyla alındı.",
			users: lastFiveUsers,
		});
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

// Referans kullanıcıların verilerini döndüren endpoint
router.get("/referrals/stats/:id", async (req, res) => {
	const { id } = req.params; // Giriş yapan kullanıcının ID'si

	try {
		// Kullanıcının referans kullanıcılarını al
		const referrals = await User.find({ "affiliates.referrer": id }).select(
			"name username stats.deposit stats.withdrawal stats.bet createdAt"
		);

		res.status(200).json({
			message: "Referans kullanıcılar başarıyla alındı.",
			referrals,
		});
	} catch (error) {
		console.error("Hata:", error);
		res.status(500).json({ message: "Sunucu hatası." });
	}
});

module.exports = router;
