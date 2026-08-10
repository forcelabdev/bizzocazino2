const express = require("express");
const path = require("path");
const fs = require("fs");
const SiteSettings = require("../../database/models/SiteSettings");

const router = express.Router();

// Avatar uploads directory
const avatarUploadDir = path.join(__dirname, "..", "..", "uploads", "avatars");

// Ensure avatars directory exists
if (!fs.existsSync(avatarUploadDir)) {
	fs.mkdirSync(avatarUploadDir, { recursive: true });
}

/**
 * @desc    Get avatar by filename - returns avatar if exists, fallback otherwise
 * @route   GET /avatar/:filename
 * @access  Public
 */
router.get("/:filename", async (req, res) => {
	try {
		const { filename } = req.params;

		// Sanitize filename to prevent path traversal
		const sanitizedFilename = path.basename(filename);
		const avatarPath = path.join(avatarUploadDir, sanitizedFilename);

		// Check if the requested avatar exists
		if (fs.existsSync(avatarPath)) {
			return res.sendFile(avatarPath);
		}

		// Avatar not found, get fallback from SiteSettings
		const settings = await SiteSettings.findOne().lean();
		const fallbackPath = settings?.avatars?.fallbackAvatar;

		if (fallbackPath) {
			// Check if fallback is a full URL
			if (
				fallbackPath.startsWith("http://") ||
				fallbackPath.startsWith("https://")
			) {
				return res.redirect(fallbackPath);
			}

			// Fallback is a local path
			const fullFallbackPath = path.join(
				__dirname,
				"..",
				"..",
				fallbackPath.replace(/^\//, "")
			);

			if (fs.existsSync(fullFallbackPath)) {
				return res.sendFile(fullFallbackPath);
			}
		}

		// No fallback configured or fallback not found, try default
		const defaultAvatarPath = path.join(avatarUploadDir, "default.png");
		if (fs.existsSync(defaultAvatarPath)) {
			return res.sendFile(defaultAvatarPath);
		}

		// Nothing found, return 404
		return res.status(404).json({
			success: false,
			message: "Avatar bulunamadı",
		});
	} catch (error) {
		console.error("Avatar getirilirken hata:", error);
		return res.status(500).json({
			success: false,
			message: "Avatar getirilirken bir hata oluştu",
		});
	}
});

/**
 * @desc    Get list of available avatars
 * @route   GET /avatar
 * @access  Public
 */
router.get("/", async (req, res) => {
	try {
		// Read avatars from directory
		const files = fs
			.readdirSync(avatarUploadDir)
			.filter((file) => /\.(jpe?g|png|gif)$/i.test(file));

		const avatars = files.map((file) => ({
			filename: file,
			path: `/uploads/avatars/${file}`,
		}));

		// Get fallback from settings
		const settings = await SiteSettings.findOne().lean();
		const fallbackAvatar =
			settings?.avatars?.fallbackAvatar || "/uploads/avatars/default.png";

		return res.json({
			success: true,
			data: {
				avatars,
				fallbackAvatar,
				total: avatars.length,
			},
		});
	} catch (error) {
		console.error("Avatar listesi alınırken hata:", error);
		return res.status(500).json({
			success: false,
			message: "Avatar listesi alınırken bir hata oluştu",
		});
	}
});

/**
 * @desc    Get random avatar from available avatars
 * @route   GET /avatar/random
 * @access  Public
 */
router.get("/random", async (req, res) => {
	try {
		const files = fs
			.readdirSync(avatarUploadDir)
			.filter((file) => /\.(jpe?g|png|gif)$/i.test(file));

		if (files.length === 0) {
			// No avatars, return fallback
			const settings = await SiteSettings.findOne().lean();
			const fallbackAvatar =
				settings?.avatars?.fallbackAvatar ||
				"/uploads/avatars/default.png";

			return res.json({
				success: true,
				data: {
					avatar: fallbackAvatar,
					isRandom: false,
				},
			});
		}

		const randomFile = files[Math.floor(Math.random() * files.length)];

		return res.json({
			success: true,
			data: {
				avatar: `/uploads/avatars/${randomFile}`,
				isRandom: true,
			},
		});
	} catch (error) {
		console.error("Rastgele avatar alınırken hata:", error);
		return res.status(500).json({
			success: false,
			message: "Rastgele avatar alınırken bir hata oluştu",
		});
	}
});

module.exports = router;
