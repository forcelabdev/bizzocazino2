const express = require("express");
const router = express.Router();
const { googleLogin, completeSocialLogin } = require("../../../controllers/authController");

// @desc    Google Login
// @route   POST /auth/social/google
// @access  Public
router.post("/google", googleLogin);

// @desc    Sosyal login sonrası eksik bilgileri tamamlama
// @route   POST /auth/social/complete
// @access  Public
router.post("/complete", completeSocialLogin);

// İleride buraya Telegram ve Web3 de eklenecek
// router.post("/telegram", telegramLogin);
// router.post("/web3", web3Login);

module.exports = router;
