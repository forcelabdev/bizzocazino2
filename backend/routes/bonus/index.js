const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Bonus = require("../../database/models/Bonus");
const BonusHistory = require("../../database/models/BonusHistory");
const CryptoTransaction = require("../../database/models/CryptoTransaction");
const User = require("../../database/models/User");
const { updateUserBalance } = require("../../utils/wallet");
const { authenticateAdmin } = require("../../middleware/permission");
const { authorizeUser } = require("../../middleware/auth");
const trialBonusService = require("../../services/trialBonusService");

const TRIAL_BONUS_ERROR_MESSAGES = {
	USER_NOT_FOUND: "Kullanıcı bulunamadı.",
	TRIAL_BONUS_DISABLED: "Deneme bonusu şu anda aktif değil.",
	OTHER_BONUS_BLOCKED:
		"Yakın zamanda alınan bir bonus nedeniyle şu anda başka bonus talep edilemez.",
	ALREADY_CLAIMED: "Deneme bonusunu daha önce talep ettiniz.",
	TRIAL_BONUS_AMOUNT_INVALID: "Deneme bonusu tutarı geçersiz.",
	REGISTERED_BEFORE_CUTOFF:
		"Bu tarihten önce kayıt olan üyeler deneme bonusu talep edemez.",
	HAS_APPROVED_DEPOSIT:
		"Daha önce yatırım yapmış üyeler deneme bonusu talep edemez.",
	HAS_TRIAL_BONUS_HISTORY:
		"Deneme bonusunu daha önce kullandığınız için tekrar talep edemezsiniz.",
};

// Multer yapılandırması (resim yüklemek için)
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/"); // Yüklemeler için klasör
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname)); // Benzersiz dosya adı
	},
});

// ⚠️ GÜVENLİK: Dosya tipi kontrolü
const fileFilter = (req, file, cb) => {
	const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
	}
};

const upload = multer({ 
	storage, 
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter 
});

// Yeni bonus ekleme - ⚠️ GÜVENLİK: Sadece admin
router.post("/add", authenticateAdmin, upload.single("img"), async (req, res) => {
	try {
		const { title, description, modalDescription, bonusType, percentage } =
			req.body;
		const img = req.file
			? `/uploads/${req.file.filename}`
			: null;

		const newBonus = new Bonus({
			title,
			description,
			modalDescription,
			bonusType,
			percentage, // Bonus miktarı yüzde olarak ayarlanır
			img, // Resim URL'si
		});

		await newBonus.save();
		res.status(201).json(newBonus);
	} catch (error) {
		console.error('Error creating bonus:', error.message);
		res.status(500).json({ success: false, message: "Error creating bonus" });
	}
});

// Bonus düzenleme - ⚠️ GÜVENLİK: Sadece admin
router.put("/:id", authenticateAdmin, upload.single("img"), async (req, res) => {
	try {
		const { title, description, modalDescription, bonusType, percentage } =
			req.body;
		const img = req.file ? `/uploads/${req.file.filename}` : null;

		const updatedBonus = await Bonus.findByIdAndUpdate(
			req.params.id,
			{
				title,
				description,
				modalDescription,
				bonusType,
				percentage,
				...(img && { img }),
			},
			{ new: true }
		);

		res.status(200).json(updatedBonus);
	} catch (error) {
		console.error('Error updating bonus:', error.message);
		res.status(500).json({ success: false, message: "Error updating bonus" });
	}
});

// Bonus silme - ⚠️ GÜVENLİK: Sadece admin
router.delete("/:id", authenticateAdmin, async (req, res) => {
	try {
		await Bonus.findByIdAndDelete(req.params.id);
		res.status(200).json({ message: "Bonus deleted successfully" });
	} catch (error) {
		console.error('Error deleting bonus:', error.message);
		res.status(500).json({ success: false, message: "Error deleting bonus" });
	}
});

// Bonus alma (claim) - Welcome bonus kontrolü - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.post("/claim", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al, body'den değil
		const userId = req.user._id;
		const { bonusId } = req.body;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const bonus = await Bonus.findById(bonusId);
		if (!bonus) return res.status(404).json({ message: "Bonus not found" });

		// Eğer hoş geldin bonusu ise, kullanıcının ilk kez para yatırıp yatırmadığını kontrol et
		if (
			bonus.bonusType === "welcome" ||
			bonus.bonusType === "casino_welcome" ||
			bonus.bonusType === "sports_welcome" ||
			bonus.bonusType === "live_casino_welcome"
		) {
			const previousDeposits = await CryptoTransaction.find({
				user: userId,
				type: "deposit",
				state: "completed",
			});

			if (previousDeposits.length === 0) {
				const depositAmount = previousDeposits[0].amount;
				const bonusAmount = (depositAmount * bonus.percentage) / 100; // Yüzdeye göre bonus hesaplama

				// Bonus geçmişine kaydet ve kullanıcıya bonusu ekle
				await BonusHistory.create({
					user: userId,
					bonus: bonusId,
					bonusAmount: bonusAmount,
					depositAmount: depositAmount,
					claimedAt: new Date(),
				});

				return res
					.status(200)
					.json({ message: "Welcome bonus granted", bonusAmount });
			} else {
				return res.status(403).json({
					message: "User is not eligible for welcome bonus",
				});
			}
		}

		// Diğer bonuslar için
		const bonusHistory = new BonusHistory({
			user: userId,
			bonus: bonusId,
			claimedAt: new Date(),
		});

		await bonusHistory.save();
		res.status(200).json({
			message: "Bonus claimed successfully",
			bonusHistory,
		});
	} catch (error) {
		console.error('Error claiming bonus:', error.message);
		res.status(500).json({ success: false, message: "Error claiming bonus" });
	}
});

// Freespin bonusu alma (claim) - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.post("/claim/freespin", authorizeUser(true), async (req, res) => {
	try {
		// ⚠️ GÜVENLİK: userId'yi token'dan al (IDOR koruması)
		const userId = req.user._id;
		const { bonusId } = req.body;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		const bonus = await Bonus.findById(bonusId);
		if (!bonus) return res.status(404).json({ message: "Bonus not found" });

		// Eğer bonus türü "freespin" değilse reddet
		if (bonus.bonusType !== "freespin") {
			return res
				.status(403)
				.json({ message: "This is not a freespin bonus" });
		}

		// Kullanıcının bonus geçmişinde 24 saat içinde freespin bonusu alıp almadığını kontrol et
		const last24Hours = new Date();
		last24Hours.setHours(last24Hours.getHours() - 24);

		const hasClaimedFreespinToday = await BonusHistory.findOne({
			user: userId,
			bonus: bonusId,
			claimedAt: { $gte: last24Hours },
		});

		if (hasClaimedFreespinToday) {
			return res.status(403).json({
				message: "User has already claimed freespin bonus today",
			});
		}

		// Kullanıcının son 24 saat içinde yatırdığı parayı bul
		const last24HoursDeposit = await CryptoTransaction.findOne({
			user: userId,
			type: "deposit",
			state: "completed",
			createdAt: { $gte: last24Hours },
		}).sort({ createdAt: -1 });

		if (!last24HoursDeposit) {
			return res.status(403).json({
				message: "User has not deposited in the last 24 hours",
			});
		}

		// Deposit miktarının %30'u kadar bonus hesapla
		const depositAmount = last24HoursDeposit.amount;
		const bonusAmount = (depositAmount * bonus.percentage) / 100;

		// Kullanıcının wallet'a bonusu ekle
		await updateUserBalance(user, bonusAmount, { emitSocket: true });

		// Bonus geçmişine kaydet
		const bonusHistory = new BonusHistory({
			user: userId,
			bonus: bonusId,
			bonusAmount: bonusAmount,
			depositAmount: depositAmount,
			claimedAt: new Date(),
		});

		await bonusHistory.save();

		res.status(200).json({
			message: "Freespin bonus granted",
			bonusAmount,
		});
	} catch (error) {
		res.status(500).json({
			message: "Error claiming freespin bonus",
			error,
		});
	}
});

// Deneme Bonusu potansiyeli (talep edilebilir mi?) - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı
router.get("/trial/potential", authorizeUser(true), async (req, res) => {
	try {
		const potential = await trialBonusService.getPotential(req.user._id);
		res.status(200).json({ success: true, data: potential });
	} catch (error) {
		const message =
			TRIAL_BONUS_ERROR_MESSAGES[error.message] || error.message || "Sunucu hatası.";
		const status = TRIAL_BONUS_ERROR_MESSAGES[error.message] ? 400 : 500;
		if (status === 500) console.error("Trial bonus potential error:", error);
		res.status(status).json({ success: false, message });
	}
});

// Deneme Bonusu talebi - ⚠️ GÜVENLİK: Kullanıcı giriş yapmalı, userId token'dan alınır
router.post("/trial/claim", authorizeUser(true), async (req, res) => {
	try {
		const result = await trialBonusService.claim(req.user._id);
		res.status(200).json({
			success: true,
			message: "Deneme bonusu talebiniz alındı.",
			data: { claim: result.claim, newBalance: result.newBalance },
		});
	} catch (error) {
		// `error.code` set edilmişse (bilinen bir uygunluk/reddedilme sebebi)
		// onu, yoksa geriye dönük uyumluluk için `error.message`'ı anahtar olarak kullan.
		const key = error.code || error.message;
		const message = TRIAL_BONUS_ERROR_MESSAGES[key] || error.message || "Sunucu hatası.";
		const status = TRIAL_BONUS_ERROR_MESSAGES[key] ? 400 : 500;
		if (status === 500) console.error("Trial bonus claim error:", error);
		res.status(status).json({ success: false, message });
	}
});

router.get("/", async (req, res) => {
	try {
		const bonuses = await Bonus.find();
		res.status(200).json(bonuses);
	} catch (error) {
		res.status(500).json({ message: "Error fetching bonuses", error });
	}
});

// Bonus geçmişi görüntüleme
router.get("/history", async (req, res) => {
	try {
		const history = await BonusHistory.find()
			.populate("user bonus")
			.sort({ claimedAt: -1 });
		res.status(200).json(history);
	} catch (error) {
		res.status(500).json({
			message: "Error fetching bonus history",
			error,
		});
	}
});

module.exports = router;
