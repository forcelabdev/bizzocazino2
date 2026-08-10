const express = require("express");
const router = express.Router();
const Withdrawal = require("../database/models/Withdrawal");
const User = require("../database/models/User");
const Deposit = require("../database/models/Deposit");
const { updateUserBalance } = require("../utils/wallet");

// Maksipara API Bilgileri
const MERCHANT_SID = 1421;
const MERCHANT_KEY =
	"iFzXc3s555G2S8K7D8W64BL9jy173x7Jt6l4CubA9akmgM9hH01ZPRQ3ew0E_TdrU4qN";

// Genel Callback İşleme
router.post("/", async (req, res) => {
	try {
		const { sid, key, service } = req.body;

		// Kimlik doğrulama
		if (sid != MERCHANT_SID || key != MERCHANT_KEY) {
			return res
				.status(403)
				.json({ code: 999, message: "Geçersiz kimlik doğrulama!" });
		}

		switch (service) {
			case "info":
				return await handleInfo(req.body, res);
			case "deposit":
				return await handleDeposit(req.body, res);
			case "withdraw":
				return await handleWithdraw(req.body, res);
			default:
				return res
					.status(400)
					.json({ code: 999, message: "Geçersiz servis adı!" });
		}
	} catch (err) {
		console.error("Genel hata:", err.message);
		return res.status(500).json({ code: 999, message: "Sunucu hatası." });
	}
});

// **Info Servisi**
const handleInfo = async (data, res) => {
	try {
		const { user_id, trx } = data;

		// Kullanıcı kontrolü
		const user = await User.findById(user_id);
		if (!user) {
			return res
				.status(400)
				.json({ code: 999, message: "Kullanıcı bulunamadı!" });
		}

		// İşlem kontrolü
		const transaction = await Deposit.findOne({
			transactionId: trx,
			user: user_id,
		});
		if (!transaction) {
			return res
				.status(400)
				.json({ code: 999, message: "TRX doğrulanamadı!" });
		}

		return res.status(200).json({
			code: 200,
			message: "Müşteri yatırım gerçekleştirebilir!",
		});
	} catch (err) {
		console.error("Info işlemi hatası:", err.message);
		return res.status(500).json({ code: 999, message: "Sunucu hatası." });
	}
};

// **Deposit Servisi**
const handleDeposit = async (data, res) => {
	try {
		const {
			sid,
			key,
			user_id,
			username,
			amount,
			currency,
			transaction_id,
			status,
			trx,
			method,
		} = data;

		console.log("Gelen veri:", data); // Gelen veriyi logla

		// Kimlik doğrulama (tekrar kontrol)
		if (sid != MERCHANT_SID || key != MERCHANT_KEY) {
			console.error("Geçersiz kimlik doğrulama!");
			return res
				.status(403)
				.json({ code: 999, message: "Geçersiz kimlik doğrulama!" });
		}

		// Sadece başarılı işlemler için devam et
		if (status !== "S") {
			console.error("İşlem başarısız!");
			return res
				.status(400)
				.json({ code: 999, message: "İşlem başarısız!" });
		}

		// Kullanıcı kontrolü
		const user = await User.findById(user_id);
		if (!user) {
			console.error("Kullanıcı bulunamadı!");
			return res
				.status(404)
				.json({ code: 999, message: "Kullanıcı bulunamadı!" });
		}

		// Bonus hesaplama
		const bonus = parseFloat(amount) * 0.2;
		const totalAmount = parseFloat(amount) + bonus;

		// İşlem kaydını bul veya yeni bir kayıt oluştur
		let deposit = await Deposit.findOne({ transactionId: transaction_id });
		if (!deposit) {
			console.log("Yeni işlem kaydı oluşturuluyor...");
			deposit = new Deposit({
				user_id: user_id,
				username: username,
				name: user.name, // Kullanıcının adını kullanıyoruz
				method: method,
				amount: parseFloat(amount),
				bonus: bonus, // Bonusu kaydediyoruz
				totalAmount: totalAmount, // Toplam miktarı kaydediyoruz
				currency: currency,
				transactionId: transaction_id,
				status: "approved", // İşlem başarılı olduğu için 'approved' olarak işaretliyoruz
				trx: trx,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} else {
			console.log("Mevcut işlem kaydı güncelleniyor...");
			// İşlem zaten varsa, miktarı, bonusu ve durumu güncelle
			deposit.amount = parseFloat(amount);
			deposit.bonus = bonus;
			deposit.totalAmount = totalAmount;
			deposit.status = "approved";
			deposit.updatedAt = new Date();
		}

		await deposit.save();
		console.log("İşlem kaydı başarıyla kaydedildi:", deposit);

		// Kullanıcı bakiyesini güncelle (yatırılan miktar + bonus)
		await updateUserBalance(user, totalAmount, { emitSocket: true });
		console.log("Kullanıcı bakiyesi güncellendi:", user._id);

		// Başarılı yanıt döndür
		return res.status(200).json({
			code: 200,
			message: "Müşteri hesabına bakiye ve bonus eklendi!",
		});
	} catch (err) {
		console.error("Deposit işlemi sırasında hata:", err.message);
		console.error("Hata detayı:", err.stack); // Hata stack trace'ini logla
		return res.status(500).json({ code: 999, message: "Sunucu hatası." });
	}
};

// **Withdraw Servisi**
const handleWithdraw = async (data, res) => {
	const { user_id, trx, status, amount } = data;

	try {
		const withdrawal = await Withdrawal.findOne({ trx });
		if (!withdrawal) {
			return res
				.status(400)
				.json({ code: 999, message: "Çekim talebi bulunamadı!" });
		}

		if (status === "C") {
			// Çekim tamamlandı
			withdrawal.status = "approved";
			await withdrawal.save();

			return res
				.status(200)
				.json({ code: 200, message: "Çekim başarıyla tamamlandı." });
		} else if (status === "R") {
			// Çekim reddedildi, bakiye iade
			const user = await User.findById(user_id);
			if (user) {
				await updateUserBalance(user, parseFloat(amount), {
					emitSocket: true,
				});
			}

			withdrawal.status = "rejected";
			await withdrawal.save();

			return res.status(200).json({
				code: 200,
				message: "Çekim reddedildi, bakiye geri yüklendi.",
			});
		} else {
			return res
				.status(400)
				.json({ code: 999, message: "Bilinmeyen işlem durumu!" });
		}
	} catch (err) {
		console.error("Withdraw işlemi hatası:", err.message);
		return res.status(500).json({ code: 999, message: "Sunucu hatası." });
	}
};

module.exports = router;
