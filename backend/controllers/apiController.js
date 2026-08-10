const Banner = require("../database/models/Banner");
const Category = require("../database/models/Category");
const Game = require("../database/models/Game");
const GameProvider = require("../database/models/GameProvider");
const { serializeBanner } = require("../utils/banner");

// ===== BANNER =====
exports.getAllBanners = async (req, res) => {
	try {
		const banners = await Banner.find().sort({
			position: 1,
			createdAt: -1,
		});
		res.json(banners.map(serializeBanner));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.getBannersByPosition = async (req, res) => {
	try {
		const { position } = req.params;
		const banners = await Banner.find({ position }).sort({ createdAt: -1 });
		res.json(banners.map(serializeBanner));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// ===== CATEGORY =====
exports.getAllCategories = async (req, res) => {
	try {
		const categories = await Category.find().sort({ created_at: -1 });
		res.json(categories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// ===== GAME BY CATEGORY SLUG =====
exports.getGamesByCategorySlug = async (req, res) => {
	try {
		const { slug } = req.params;
		const limit = parseInt(req.query.limit) || 18;
		const offset = parseInt(req.query.offset) || 0;
		const providerCode = req.query.provider_code;

		// Hem yeni categories array hem de eski category alanını destekle
		const query = {
			$or: [{ categories: slug }, { category: slug }],
		};
		if (providerCode) {
			query.provider_code = providerCode;
		}

		const [games, total] = await Promise.all([
			Game.find(query)
				.select(
					"game_name game_code banner background views featured provider_code provider categories category"
				)
				.sort({ featured: -1, views: -1 })
				.skip(offset)
				.limit(limit)
				.populate("provider", "name"),

			Game.countDocuments(query),
		]);

		res.json({ success: true, data: games, total });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
};

// ===== SEARCH GAME =====
exports.searchGames = async (req, res) => {
	try {
		const { query } = req.query;

		if (!query || query.trim().length < 2) {
			return res.status(200).json([]); // boşsa hata vermiyoruz, boş liste dönüyoruz
		}

		const games = await Game.find({
			game_name: { $regex: query, $options: "i" },
		})
			.select(
				"game_name game_code banner background views featured provider_code provider"
			)
			.sort({ featured: -1, views: -1 })
			.limit(30) // performans için sınır koyuyoruz
			.populate("provider", "name"); // eğer provider ilişkili modelse

		res.json(games);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.getFeaturedGames = async (req, res) => {
	try {
		const limit = parseInt(req.query.limit) || 15;

		const games = await Game.find({ featured: true })
			.select(
				"game_name game_code banner background views featured provider_code provider"
			)
			.sort({ views: -1 })
			.limit(limit)
			.populate("provider", "name");

		res.json(games);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.getCategoriesWithGames = async (req, res) => {
	try {
		const categories = await Category.find().sort({ created_at: -1 });

		const categoriesWithGames = await Promise.all(
			categories.map(async (cat) => {
				// Hem yeni categories array hem de eski category alanını destekle
				const categoryQuery = {
					$or: [{ categories: cat.slug }, { category: cat.slug }],
				};

				const [games, totalCount] = await Promise.all([
					Game.find(categoryQuery)
						.select(
							"game_name game_code banner background views featured provider_code provider categories category"
						)
						.sort({ featured: -1, views: -1 })
						.limit(20)
						.populate("provider", "name"),
					Game.countDocuments(categoryQuery),
				]);

				return {
					...cat.toObject(),
					total_games: totalCount,
					games,
				};
			})
		);

		res.json({ data: categoriesWithGames });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

exports.getProvidersByCategorySlug = async (req, res) => {
	try {
		const { slug } = req.params;

		// Hem yeni categories array hem de eski category alanını destekle
		const providers = await Game.aggregate([
			{
				$match: {
					$or: [{ categories: slug }, { category: slug }],
				},
			},
			{
				$group: {
					_id: "$provider_code",
					count: { $sum: 1 },
				},
			},
			{
				$project: {
					provider_code: "$_id",
					count: 1,
					_id: 0,
				},
			},
			{ $sort: { count: -1 } },
		]);

		// GameProvider'dan name bilgisini al
		const providerCodes = providers.map(p => p.provider_code).filter(Boolean);
		const gameProviders = await GameProvider.find(
			{ code: { $in: providerCodes } },
			{ code: 1, name: 1 }
		);
		
		// name map oluştur
		const nameMap = {};
		gameProviders.forEach(gp => {
			nameMap[gp.code] = gp.name || gp.code;
		});

		// Provider'lara name ekle
		const providersWithName = providers.map(p => ({
			...p,
			name: nameMap[p.provider_code] || p.provider_code
		}));

		res.json({ success: true, data: providersWithName });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
