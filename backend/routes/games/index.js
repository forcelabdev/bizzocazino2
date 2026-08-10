const express = require('express');
const router = express.Router();
const Game = require('../../database/models/Game'); // Game modelinizi burada import edin

// Featured oyunları getir
router.get('/featured', async (req, res) => {
  try {
    const featuredGames = await Game.find({ featured: 1 });
    res.status(200).json(featuredGames);
  } catch (error) {
    console.error("Error fetching featured games:", error);
    res.status(500).json({ message: 'Error fetching featured games' });
  }
});

module.exports = router;
