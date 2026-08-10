const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Banner = require("../database/models/Banner");

// Multer ayarları (Görsellerin nereye kaydedileceğini belirler)
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true }); // Klasör yoksa oluştur
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir); // Dosyaların kaydedileceği dizin
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname)); // Dosya adını zaman damgasıyla oluştur
	},
});

const upload = multer({ storage });

// 1. Yeni Banner Ekle
router.post("/add", upload.array("images", 10), async (req, res) => {
	try {
		const { title, description, subtitle, order } = req.body;
		const imagePaths = req.files.map(
			(file) => `https://apibizzocasino.site/uploads/${file.filename}`
		);

		const newBanner = new Banner({
			images: imagePaths,
			title,
			description,
			subtitle,
			order,
		});

		await newBanner.save();
		res.status(201).json({
			message: "Banner başarıyla eklendi.",
			banner: newBanner,
		});
	} catch (error) {
		res.status(500).json({ error: "Banner eklenirken bir hata oluştu." });
	}
});

// 2. Tüm Banner'ları Getir
router.get("/", async (req, res) => {
	try {
		const banners = await Banner.find().sort({ order: 1 });
		res.status(200).json(banners);
	} catch (error) {
		res.status(500).json({
			error: "Banner'lar getirilirken bir hata oluştu.",
		});
	}
});

// 3. Tekil Banner Güncelle
router.put("/update/:id", upload.array("images", 10), async (req, res) => {
	try {
		const { id } = req.params;
		const { title, description, subtitle, order } = req.body;

		let updatedFields = { title, description, subtitle, order };

		if (req.files.length > 0) {
			const imagePaths = req.files.map(
				(file) => `/uploads/${file.filename}`
			);
			updatedFields.images = imagePaths;
		}

		const updatedBanner = await Banner.findByIdAndUpdate(
			id,
			updatedFields,
			{ new: true }
		);

		if (!updatedBanner) {
			return res.status(404).json({ error: "Banner bulunamadı." });
		}

		res.status(200).json({
			message: "Banner başarıyla güncellendi.",
			banner: updatedBanner,
		});
	} catch (error) {
		res.status(500).json({
			error: "Banner güncellenirken bir hata oluştu.",
		});
	}
});

// 4. Banner Sil
router.delete("/delete/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const deletedBanner = await Banner.findByIdAndDelete(id);

		if (!deletedBanner) {
			return res.status(404).json({ error: "Banner bulunamadı." });
		}

		// İlgili görselleri dosya sisteminden sil
		deletedBanner.images.forEach((imagePath) => {
			const filePath = path.join(__dirname, "..", "public", imagePath);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath); // Dosyayı sil
			}
		});

		res.status(200).json({ message: "Banner başarıyla silindi." });
	} catch (error) {
		res.status(500).json({ error: "Banner silinirken bir hata oluştu." });
	}
});

module.exports = router;
