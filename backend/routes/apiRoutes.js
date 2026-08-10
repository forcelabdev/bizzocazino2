const express = require("express");
const router = express.Router();
const controller = require("../controllers/apiController");
const Banner = require("../database/models/Banner");
const Category = require("../database/models/Category");
const Game = require("../database/models/Game");
const ShopItem = require("../database/models/ShopItem");

// Banner Routes
router.get("/banners", controller.getAllBanners);
router.get("/banners/:position", controller.getBannersByPosition);

router.get("/banners/:slug", async (req, res) => {
	const { slug } = req.params;
	try {
		const banners = await Banner.find({ position: slug }); // position === slug
		res.json(banners);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server Error" });
	}
});

router.get("/games/search-category", async (req, res) => {
	const {
		category,
		provider_code,
		keyword,
		limit = 18,
		offset = 0,
	} = req.query;

	const query = {
		status: 1,
	};

	// Kategori filtresi - hem yeni categories array hem de eski category alanını destekle
	if (category) {
		query.$or = [{ categories: category }, { category: category }];
	}

	if (keyword) {
		query.game_name = { $regex: keyword, $options: "i" }; // case-insensitive search
	}

	if (provider_code) {
		query["provider.code"] = provider_code;
	}

	try {
		const games = await Game.find(query)
			.skip(Number(offset))
			.limit(Number(limit));
		const total = await Game.countDocuments(query);

		res.json({
			success: true,
			total,
			data: games,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: "Search failed" });
	}
});

// Category Routes
router.get("/categories", controller.getAllCategories);

// Games
router.get("/games/category/:slug", controller.getGamesByCategorySlug);
router.get("/games/search", controller.searchGames);
router.get("/games/featured/list", controller.getFeaturedGames);
router.get("/games/categories/with-games", controller.getCategoriesWithGames);
router.get("/providers/category/:slug", controller.getProvidersByCategorySlug);

router.get("/shop/items", async (req, res) => {
	try {
		const items = await ShopItem.find({ isActive: true })
			.sort({ createdAt: -1 })
			.select("title description banner coinCost rewardAmount isActive createdAt")
			.lean();

		res.json({
			success: true,
			total: items.length,
			data: items,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: "Shop items could not be fetched",
		});
	}
});

router.get("/shop/items/:id", async (req, res) => {
	try {
		const item = await ShopItem.findOne({
			_id: req.params.id,
			isActive: true,
		})
			.select("title description banner coinCost rewardAmount isActive createdAt")
			.lean();

		if (!item) {
			return res.status(404).json({
				success: false,
				message: "Shop item not found",
			});
		}

		return res.json({ success: true, data: item });
	} catch (err) {
		console.error(err);
		return res.status(500).json({
			success: false,
			message: "Shop item could not be fetched",
		});
	}
});

module.exports = router;
