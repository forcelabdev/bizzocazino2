const SiteSettings = require("../database/models/SiteSettings");

// Tüm site ayarlarını getir
exports.getSettings = async (req, res) => {
	try {
		let settings = await SiteSettings.findOne();

		// Eğer ayar yoksa varsayılan ayarları oluştur
		if (!settings) {
			settings = new SiteSettings();
			await settings.save();
		}

		res.status(200).json(settings);
	} catch (error) {
		console.error("Site ayarları getirilirken hata:", error);
		res.status(500).json({
			error: "Site ayarları getirilirken bir hata oluştu.",
		});
	}
};

// Site ayarlarını güncelle
exports.updateSettings = async (req, res) => {
	try {
		const updates = req.body;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			settings = new SiteSettings(updates);
		} else {
			Object.assign(settings, updates);
		}

		await settings.save();

		res.status(200).json({
			message: "Site ayarları başarıyla güncellendi.",
			settings,
		});
	} catch (error) {
		console.error("Site ayarları güncellenirken hata:", error);
		res.status(500).json({
			error: "Site ayarları güncellenirken bir hata oluştu.",
		});
	}
};

// Logo yükle
exports.uploadLogo = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "Dosya yüklenmedi." });
		}

		const logoPath = `https://apibizzocasino.site/uploads/${req.file.filename}`;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			settings = new SiteSettings();
		}

		settings.logo = logoPath;
		await settings.save();

		res.status(200).json({
			message: "Logo başarıyla yüklendi.",
			logo: logoPath,
		});
	} catch (error) {
		console.error("Logo yüklenirken hata:", error);
		res.status(500).json({
			error: "Logo yüklenirken bir hata oluştu.",
		});
	}
};

// Favicon yükle
exports.uploadFavicon = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "Dosya yüklenmedi." });
		}

		const faviconPath = `https://apibizzocasino.site/uploads/${req.file.filename}`;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			settings = new SiteSettings();
		}

		settings.favicon = faviconPath;
		await settings.save();

		res.status(200).json({
			message: "Favicon başarıyla yüklendi.",
			favicon: faviconPath,
		});
	} catch (error) {
		console.error("Favicon yüklenirken hata:", error);
		res.status(500).json({
			error: "Favicon yüklenirken bir hata oluştu.",
		});
	}
};

// Partner ekle
exports.addPartner = async (req, res) => {
	try {
		const { name, url, order } = req.body;

		if (!req.file) {
			return res.status(400).json({ error: "Logo dosyası yüklenmedi." });
		}

		const logoPath = `https://apibizzocasino.site/uploads/${req.file.filename}`;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			settings = new SiteSettings();
		}

		settings.partners.push({
			name,
			logo: logoPath,
			url: url || "",
			order: order || settings.partners.length,
		});

		await settings.save();

		res.status(200).json({
			message: "Partner başarıyla eklendi.",
			partners: settings.partners,
		});
	} catch (error) {
		console.error("Partner eklenirken hata:", error);
		res.status(500).json({
			error: "Partner eklenirken bir hata oluştu.",
		});
	}
};

// Partner sil
exports.deletePartner = async (req, res) => {
	try {
		const { id } = req.params;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			return res.status(404).json({ error: "Ayarlar bulunamadı." });
		}

		settings.partners = settings.partners.filter(
			(partner) => partner._id.toString() !== id
		);
		await settings.save();

		res.status(200).json({
			message: "Partner başarıyla silindi.",
			partners: settings.partners,
		});
	} catch (error) {
		console.error("Partner silinirken hata:", error);
		res.status(500).json({
			error: "Partner silinirken bir hata oluştu.",
		});
	}
};

// Lisans ekle
exports.addLicense = async (req, res) => {
	try {
		const { name, url } = req.body;

		if (!req.file) {
			return res.status(400).json({ error: "Logo dosyası yüklenmedi." });
		}

		const logoPath = `https://apibizzocasino.site/uploads/${req.file.filename}`;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			settings = new SiteSettings();
		}

		settings.licenses.push({
			name,
			logo: logoPath,
			url: url || "",
		});

		await settings.save();

		res.status(200).json({
			message: "Lisans başarıyla eklendi.",
			licenses: settings.licenses,
		});
	} catch (error) {
		console.error("Lisans eklenirken hata:", error);
		res.status(500).json({
			error: "Lisans eklenirken bir hata oluştu.",
		});
	}
};

// Lisans sil
exports.deleteLicense = async (req, res) => {
	try {
		const { id } = req.params;
		let settings = await SiteSettings.findOne();

		if (!settings) {
			return res.status(404).json({ error: "Ayarlar bulunamadı." });
		}

		settings.licenses = settings.licenses.filter(
			(license) => license._id.toString() !== id
		);
		await settings.save();

		res.status(200).json({
			message: "Lisans başarıyla silindi.",
			licenses: settings.licenses,
		});
	} catch (error) {
		console.error("Lisans silinirken hata:", error);
		res.status(500).json({
			error: "Lisans silinirken bir hata oluştu.",
		});
	}
};
