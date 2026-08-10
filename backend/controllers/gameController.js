// controllers/gameController.js
const Provider = require('../database/models/Providers');
const Game = require('../database/models/Game');

// Tüm sağlayıcıları listeleme
exports.index = async (req, res) => {
  try {
    const providers = await Provider.find({ status: 1 }).populate('games').sort({ name: -1 });
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: 'Providers could not be retrieved' });
  }
};

// Öne çıkan oyunları listeleme
exports.featured = async (req, res) => {
  try {
    const featuredGames = await Game.find({ is_featured: 1, status: 1 }).populate('provider');
    res.json({ featured_games: featuredGames });
  } catch (error) {
    res.status(500).json({ error: 'Featured games could not be retrieved' });
  }
};
