const express = require("express");
const router = express.Router();
const axios = require("axios");

// Binance Exchange Info (precision vs.)
router.get("/exchangeInfo", async (req, res) => {
  try {
    const response = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
    res.json(response.data);
  } catch (err) {
    console.error("❌ Binance API error:", err.message);
    res.status(500).json({ success: false, error: "Binance API request failed" });
  }
});

module.exports = router;
