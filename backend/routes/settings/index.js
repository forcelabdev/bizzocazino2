const express = require("express");
const Setting = require("../../database/models/Setting");
const router = express.Router();

// @desc    Get public settings (Google Client ID vs.)
// @route   GET /public/settings
router.get("/", async (req, res) => {
  try {
    const settings = await Setting.findOne().select("auth.google").lean();
    res.json({
      success: true,
      googleClientId: settings?.auth?.google?.clientId || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
