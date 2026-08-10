const express = require('express');
const router = express.Router();
const wingoController = require('../controllers/wingo'); // ✅ index.js otomatik algılanır

const { authorizeUser, authorizeAdmin } = require('../middleware/auth');

router.get('/bets', wingoController.getUserBets);
router.get('/stats', authorizeUser(true), wingoController.getUserStats);
router.get('/daily', authorizeUser(true), wingoController.getUserDailyStats);
router.get('/result/:roundId', wingoController.getRoundResult);


// 🌐 Public veriler
router.get('/rounds', wingoController.getRecentRounds);                      // Son round'lar (limit=20)
router.get('/active', wingoController.getActiveRound);                       // Şu anki aktif round

module.exports = router;
