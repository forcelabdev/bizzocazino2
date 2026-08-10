// routes/battlepassRoutes.js (son hali)
const express = require('express');
const router = express.Router();
const {
  claimMissionReward,
  claimBattlepassReward,
  getBattlepassStatus,
  buyPremiumPass
} = require('../controllers/battlepassController');
const { authorizeUser } = require('../middleware/auth');

router.post('/claim-mission-reward', authorizeUser(true), claimMissionReward);
router.post('/claim-battlepass-reward', authorizeUser(true), claimBattlepassReward);
router.get('/status', authorizeUser(true), getBattlepassStatus);
router.post('/buy-premium', authorizeUser(true), buyPremiumPass);

module.exports = router;
