const express = require("express");
const axios = require("axios");
const router = express.Router();

const Game = require("../database/models/Game");

// ==========================
// 🔐 CONFIG
// ==========================
const API_BASE_URL = "https://pokersgamessistemas.com/api/v1";
const AGENT_CODE = "rivotest";
const AGENT_TOKEN = "GGRPYp9lLfaoWxnvcNkEhF8XjHUUDjwP";
const AGENT_SECRET = "K9Qo6cuI0QkogFSJs7RsJK4qCrnz65Ug";

let accessToken = null;

// ==========================
// 🔧 AUTH FUNCTIONS
// ==========================
const generateAuthHeader = () => {
  const encoded = Buffer.from(`${AGENT_TOKEN}:${AGENT_SECRET}`).toString("base64");
  return `Bearer ${encoded}`;
};

const authenticate = async () => {
  console.log("🔑 Authenticating with PokersGames API...");
  const res = await axios.post(`${API_BASE_URL}/auth/authentication`, {}, {
    headers: { Authorization: generateAuthHeader() },
  });
  if (res.data?.access_token) {
    accessToken = res.data.access_token;
    console.log("✅ Authentication success");
    return accessToken;
  }
  throw new Error("Authentication failed: no access_token");
};

const ensureToken = async () => {
  if (!accessToken) await authenticate();
  return accessToken;
};

// ==========================
// 🎮 IMPORT GAMES ENDPOINT
// ==========================
router.post("/import_games", async (req, res) => {
  const { provider } = req.body;

  // Eğer provider verilmezse tüm sağlayıcılardan çek
  const providers = provider
    ? [provider]
    : [
        "PGSOFT",
        "CQ9",
        "PRAGMATICPLAY",
        "EVOPLAY",
        "EZUGI",
        "PRAGMATICLIVE",
        "SPRIBE",
        "JDB",
        "WAZDAN",
      ];

  try {
    const token = await ensureToken();
    let totalImported = 0;
    let totalSkipped = 0;

    for (const prov of providers) {
      console.log(`\n🎯 Importing games for provider: ${prov}`);
      let page = 1;
      let imported = 0;
      let skipped = 0;

      while (true) {
        console.log(`➡️ Fetching page ${page} for ${prov}...`);
        const response = await axios.get(`${API_BASE_URL}/games/list`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, provider: prov },
          timeout: 20000,
          validateStatus: () => true,
        });

        if (!response.data?.status) {
          console.warn(`⚠️ Provider ${prov} page ${page} returned no status or false.`);
          break;
        }

        // oyunlar data.games veya games altında olabilir
        const games = response.data.games || response.data.data || [];
        if (!games.length) {
          console.log(`ℹ️ No more games on page ${page}.`);
          break;
        }

        for (const g of games) {
          const game_code = g.uuid || g.game_code || g.code || g.id;
          const game_name = g.name || g.title || "Unknown Game";
          const banner = g.image || g.icon || g.thumb || null;
          const type = g.type || "slot";
          const providerCode = prov;

          if (!game_code) continue;

          const existing = await Game.findOne({ game_code });
          if (existing) {
            skipped++;
            continue;
          }

          await Game.create({
            game_id: String(game_code),
            game_code: String(game_code),
            game_name: game_name,
            game_type: type,
            provider: providerCode,
            provider_code: providerCode,
            banner,
            cover: banner,
            status: 1,
            technology: "HTML5",
            only_demo: 0,
            distribution: "pokersgames",
            is_mobile: 1,
            has_lobby: 0,
            has_tables: 0,
            featured: 0,
            views: 0,
          });

          imported++;
        }

        console.log(`✅ Imported: ${imported}, Skipped: ${skipped}`);
        totalImported += imported;
        totalSkipped += skipped;

        if (games.length < 50) break; // Sayfa bitti
        page++;
      }
    }

    console.log(`\n🎉 Import completed: ${totalImported} imported, ${totalSkipped} skipped`);
    return res.status(200).json({
      status: 1,
      msg: "Import completed successfully",
      imported: totalImported,
      skipped: totalSkipped,
    });
  } catch (err) {
    console.error("❌ Import Error:", err.response?.data || err.message);
    return res.status(500).json({
      status: 0,
      msg: "IMPORT_FAILED",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
