const express = require("express");
const router = express.Router();
const ApiProvider = require("../../database/models/ApiProvider");
const GameProvider = require("../../database/models/GameProvider");
const Game = require("../../database/models/Game");
const ProviderService = require("../../services/ProviderService");
const { checkPermission } = require("../../middleware/permission");

/**
 * API Provider Routes
 */

// GET /admin/api-providers - Liste
router.get("/api-providers", checkPermission("providers.read"), async (req, res) => {
	try {
		const {page = 1, limit = 20, status} = req.query;
		const filter = {};
		if (status !== undefined) filter.status = Number(status);

		const total = await ApiProvider.countDocuments(filter);
		const providers = await ApiProvider.find(filter)
			.select("-credentials.agentSecret -accessToken") // Hassas bilgileri gizle
			.sort({createdAt: -1})
			.skip((page - 1) * limit)
			.limit(Number(limit));

		// Her provider için game provider sayısını ekle
		const providersWithCounts = await Promise.all(
			providers.map(async (p) => {
				const gameProviderCount = await GameProvider.countDocuments({apiProvider: p._id});
				const gameCount = await Game.countDocuments({distribution: p.code});
				return {
					...p.toObject(),
					gameProviderCount,
					gameCount,
				};
			})
		);

		res.json({
			success: true,
			data: providersWithCounts,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error("API Provider list error:", error);
		res.status(500).json({success: false, message: error.message});
	}
});

// GET /admin/api-providers/:id - Detay
router.get("/api-providers/:id", checkPermission("providers.read"), async (req, res) => {
	try {
		const provider = await ApiProvider.findById(req.params.id).select("-accessToken");
		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}
		res.json({success: true, data: provider});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/api-providers - Oluştur
router.post("/api-providers", checkPermission("providers.create"), async (req, res) => {
	try {
		const {code, name, type, apiBaseUrl, credentials, authType, callbackUrl, endpoints, settings} = req.body;

		if (!code || !name || !apiBaseUrl) {
			return res.status(400).json({
				success: false,
				message: "code, name ve apiBaseUrl zorunludur",
			});
		}

		// Code benzersiz mi kontrol et
		const existing = await ApiProvider.findOne({code: code.toLowerCase()});
		if (existing) {
			return res.status(400).json({
				success: false,
				message: "Bu kod zaten kullanılıyor",
			});
		}

		const provider = await ApiProvider.create({
			code: code.toLowerCase(),
			name,
			type: type || "aggregator",
			apiBaseUrl,
			credentials: credentials || {},
			authType: authType || "bearer",
			callbackUrl,
			endpoints: endpoints || {},
			settings: settings || {},
		});

		res.status(201).json({success: true, data: provider});
	} catch (error) {
		console.error("API Provider create error:", error);
		res.status(500).json({success: false, message: error.message});
	}
});

// PUT /admin/api-providers/:id - Güncelle
router.put(["/api-providers/:id", "/admin/api-providers/:id"], checkPermission("providers.update"), async (req, res) => {
	try {
		const updates = {...req.body};
		delete updates._id;
		delete updates.accessToken;
		delete updates.tokenExpiresAt;

		const provider = await ApiProvider.findByIdAndUpdate(req.params.id, updates, {new: true}).select("-accessToken");

		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}

		res.json({success: true, data: provider});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// DELETE /admin/api-providers/:id - Sil
router.delete("/api-providers/:id", checkPermission("providers.delete"), async (req, res) => {
	try {
		const provider = await ApiProvider.findById(req.params.id);
		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}

		// İlişkili GameProvider'ları kontrol et
		const gameProviderCount = await GameProvider.countDocuments({apiProvider: provider._id});
		if (gameProviderCount > 0) {
			return res.status(400).json({
				success: false,
				message: `Bu provider'a bağlı ${gameProviderCount} game provider var. Önce onları silin.`,
			});
		}

		await provider.deleteOne();
		res.json({success: true, message: "Provider silindi"});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/api-providers/:id/test-auth - Auth test
router.post("/api-providers/:id/test-auth", checkPermission("providers.manage"), async (req, res) => {
	try {
		const provider = await ApiProvider.findById(req.params.id);
		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}

		const result = await ProviderService.authenticate(provider);
		res.json({
			success: true,
			message: "Authentication successful",
			tokenReceived: !!result.token,
		});
	} catch (error) {
		res.status(400).json({success: false, message: error.message});
	}
});

// POST /admin/api-providers/:id/sync - Provider ve oyun senkronizasyonu
router.post(["/api-providers/:id/sync", "/api-providers/:id/sync-providers"], checkPermission("providers.manage"), async (req, res) => {
	try {
		const provider = await ApiProvider.findById(req.params.id);
		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}

		const providerResults = await ProviderService.syncGameProviders(provider);
		const gameResults = await ProviderService.syncAllGames(provider);
		res.json({
			success: true,
			message: "Sync completed",
			result: {
				providers: (providerResults.created || 0) + (providerResults.updated || 0),
				games: (gameResults.created || 0) + (gameResults.updated || 0),
				providerResults,
				gameResults,
			},
		});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/api-providers/sync-all - Tüm sağlayıcıları senkronize et
router.post("/api-providers/sync-all", checkPermission("providers.manage"), async (req, res) => {
	try {
		const providers = await ApiProvider.find().sort({ createdAt: -1 });
		const results = [];

		for (const provider of providers) {
			try {
				const providerResults = await ProviderService.syncGameProviders(provider);
				const gameResults = await ProviderService.syncAllGames(provider);

				results.push({
					success: true,
					name: provider.name,
					providers: (providerResults.created || 0) + (providerResults.updated || 0),
					games: (gameResults.created || 0) + (gameResults.updated || 0),
					providerResults,
					gameResults,
				});
			} catch (error) {
				results.push({
					success: false,
					name: provider.name,
					error: error.message,
				});
			}
		}

		res.json({
			success: true,
			message: "Sync completed",
			results,
		});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/api-providers/:id/sync-all-games - Tüm oyunları senkronize et
router.post("/api-providers/:id/sync-all-games", checkPermission("providers.manage"), async (req, res) => {
	try {
		const provider = await ApiProvider.findById(req.params.id);
		if (!provider) {
			return res.status(404).json({success: false, message: "Provider not found"});
		}

		// Bu işlem uzun sürebilir, async olarak başlat
		res.json({
			success: true,
			message: "Sync started in background",
		});

		// Background'da çalıştır
		ProviderService.syncAllGames(provider)
			.then((results) => console.log("Sync completed:", results))
			.catch((err) => console.error("Sync failed:", err));
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

/**
 * Game Provider Routes
 */

// GET /admin/game-providers - Liste
router.get("/game-providers", checkPermission("providers.read"), async (req, res) => {
	try {
		const {page = 1, limit = 20, apiProvider, status, search} = req.query;
		const filter = {};

		if (apiProvider) filter.apiProvider = apiProvider;
		if (status !== undefined && status !== "") {
			// "active" -> 1, "inactive" -> 0, veya direkt sayı
			if (status === "active") filter.status = 1;
			else if (status === "inactive") filter.status = 0;
			else filter.status = Number(status);
		}
		if (search) {
			filter.$or = [{name: {$regex: search, $options: "i"}}, {code: {$regex: search, $options: "i"}}];
		}

		const total = await GameProvider.countDocuments(filter);
		const providers = await GameProvider.find(filter)
			.populate("apiProvider", "code name")
			.sort({order: 1, name: 1})
			.skip((page - 1) * limit)
			.limit(Number(limit));

		// status'u "active"/"inactive" olarak dönüştür
		const formattedProviders = providers.map(p => {
			const obj = p.toObject();
			obj.status = obj.status === 1 ? "active" : "inactive";
			return obj;
		});

		res.json({
			success: true,
			data: formattedProviders,
			total,
			page: Number(page),
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error("Game Provider list error:", error);
		res.status(500).json({success: false, message: error.message});
	}
});

// GET /admin/game-providers/:id - Detay
router.get("/game-providers/:id", checkPermission("providers.read"), async (req, res) => {
	try {
		const provider = await GameProvider.findById(req.params.id).populate("apiProvider", "code name");
		if (!provider) {
			return res.status(404).json({success: false, message: "GameProvider not found"});
		}
		res.json({success: true, data: provider});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// PUT /admin/game-providers/:id - Güncelle
router.put("/game-providers/:id", checkPermission("providers.update"), async (req, res) => {
	try {
		let {status, featured, order, rtp, name, logo, gameTypes} = req.body;

		// Status string'i number'a çevir
		if (status === "active") status = 1;
		else if (status === "inactive") status = 0;

		const updateData = {};
		if (status !== undefined) updateData.status = status;
		if (featured !== undefined) updateData.featured = featured;
		if (order !== undefined) updateData.order = order;
		if (rtp !== undefined) updateData.rtp = rtp;
		if (name !== undefined) updateData.name = name;
		if (logo !== undefined) updateData.logo = logo;
		if (gameTypes !== undefined) updateData.gameTypes = gameTypes;

		const provider = await GameProvider.findByIdAndUpdate(req.params.id, updateData, {new: true});

		if (!provider) {
			return res.status(404).json({success: false, message: "GameProvider not found"});
		}

		// Status değiştiyse oyunları da güncelle
		if (status !== undefined) {
			await Game.updateMany({gameProvider: provider._id}, {status});
		}

		// Response'da status'u string olarak döndür
		const result = provider.toObject();
		result.status = result.status === 1 ? "active" : "inactive";

		res.json({success: true, data: result});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// PUT /admin/game-providers/:id/status - Status güncelle
router.put("/game-providers/:id/status", checkPermission("providers.update"), async (req, res) => {
	try {
		const {status} = req.body;
		if (![0, 1].includes(status)) {
			return res.status(400).json({success: false, message: "Geçersiz status"});
		}

		const provider = await GameProvider.findByIdAndUpdate(req.params.id, {status}, {new: true});

		if (!provider) {
			return res.status(404).json({success: false, message: "GameProvider not found"});
		}

		// Oyunları da güncelle
		const result = await Game.updateMany({gameProvider: provider._id}, {status});

		res.json({
			success: true,
			message: `Provider ve ${result.modifiedCount} oyun güncellendi`,
			data: provider,
		});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/game-providers/sync-from-games - Mevcut oyunlardan provider'ları oluştur
// NOT: Bu route /:id route'larından ÖNCE tanımlanmalı!
router.post("/game-providers/sync-from-games", checkPermission("providers.manage"), async (req, res) => {
	try {
		// Mevcut oyunlardan unique provider_code'ları al
		const providerCodes = await Game.distinct("provider_code");
		
		let created = 0;
		let existing = 0;
		
		for (const code of providerCodes) {
			if (!code) continue;
			
			// Bu provider zaten var mı?
			const existingProvider = await GameProvider.findOne({ code: code.toLowerCase() });
			if (existingProvider) {
				existing++;
				continue;
			}
			
			// Oyun sayısını al
			const gameCount = await Game.countDocuments({ provider_code: code });
			
			// Yeni provider oluştur (apiProvider olmadan)
			await GameProvider.create({
				code: code.toLowerCase(),
				name: code,
				status: 1,
				gameCount: gameCount,
				apiProvider: null // Sonra atanabilir
			});
			created++;
		}
		
		res.json({
			success: true,
			message: `${created} yeni provider oluşturuldu, ${existing} provider zaten mevcuttu`,
			created,
			existing,
			total: providerCodes.filter(Boolean).length
		});
	} catch (error) {
		console.error("Sync from games error:", error);
		res.status(500).json({success: false, message: error.message});
	}
});

// POST /admin/game-providers/:id/sync-games - Oyunları senkronize et
router.post("/game-providers/:id/sync-games", checkPermission("providers.manage"), async (req, res) => {
	try {
		const provider = await GameProvider.findById(req.params.id);
		if (!provider) {
			return res.status(404).json({success: false, message: "GameProvider not found"});
		}

		const results = await ProviderService.syncGames(provider);
		res.json({
			success: true,
			message: "Sync completed",
			results,
		});
	} catch (error) {
		res.status(500).json({success: false, message: error.message});
	}
});

module.exports = router;
