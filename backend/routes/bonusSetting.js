// routes/bonusSetting.js
const express = require("express");
const router = express.Router();
const BonusSetting = require("../database/models/BonusSetting");

// Tüm bonus ayarlarını getir
router.get("/", async (req, res) => {
  try {
    const bonuses = await BonusSetting.find().lean();

    const mapped = bonuses.map((b) => ({
      id: b._id,
      type: b.type,              // first_deposit, second_deposit vs.
      percentage: b.percentage,  // %130 gibi
      minAmount: b.minAmount,
      maxAmount: b.maxAmount,
      maxDepositLimit: b.maxDepositLimit,
      dailyLimit: b.dailyLimit,
      enabled: b.enabled
    }));

    res.json({ success: true, bonuses: mapped });
  } catch (err) {
    console.error("BonusSetting fetch error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
