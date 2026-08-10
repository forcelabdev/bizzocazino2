require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("../../database/index");
const Game = require("../../database/models/Game");

const DRAKON_BASE_URL = process.env.DRAKON_API_URL;
const AGENT_TOKEN = process.env.DRAKON_AGENT_TOKEN;
const AGENT_SECRET_KEY = process.env.DRAKON_AGENT_SECRET;

async function authenticate() {
	console.log("→ Authenticating with Drakon...");
	const token = Buffer.from(`${AGENT_TOKEN}:${AGENT_SECRET_KEY}`).toString("base64");

	const { data } = await axios.post(
		`${DRAKON_BASE_URL}/auth/authentication`,
		{},
		{ headers: { Authorization: `Bearer ${token}` } }
	);

	if (!data?.access_token) {
		throw new Error("Authentication failed: No access_token received");
	}

	console.log("✓ Authentication successful");
	return data.access_token;
}

async function fetchAllGames(accessToken) {
	console.log("→ Fetching all games from Drakon...");
	const { data } = await axios.get(`${DRAKON_BASE_URL}/games/all`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!data?.status) {
		throw new Error(`Failed to fetch games: ${JSON.stringify(data)}`);
	}

	const games = data.games || data.result || [];
	console.log(`✓ Fetched ${games.length} games from Drakon API`);
	return games;
}

async function saveGamesToDB(games) {
	console.log(`→ Saving ${games.length} games to database...`);

	let processed = 0;
	let failed = 0;

	for (const game of games) {
		try {
			if (!game.game_id || !game.game_code) {
				console.log(`  ⚠ Skipping game without game_id/game_code:`, game.game_name || "unknown");
				failed++;
				continue;
			}

			const providerCode =
				typeof game.provider_code === "string"
					? game.provider_code
					: typeof game.provider === "object" && game.provider?.code
						? game.provider.code
						: typeof game.provider === "string"
							? game.provider
							: null;

			await Game.updateOne(
				{ game_code: game.game_code },
				{
					provider_code: providerCode,
					game_code: game.game_code,
					game_name: game.game_name || game.game_code,
					game_id: game.game_id,
					banner: game.banner || null,
					cover: game.cover || game.image || game.banner || "/img/games/default.png",
					status: game.status ?? 1,
					distribution: "drakon",
					game_type: game.game_type || "slot",
					provider_id: game.provider_id || 0,
					technology: game.technology || "html5",
					is_mobile: game.is_mobile || 1,
					rtp: game.rtp || 0,
				},
				{ upsert: true }
			);

			processed++;
		} catch (err) {
			failed++;
			console.error(`  ✗ Error saving ${game.game_code}:`, err.message);
		}
	}

	return { processed, failed };
}

(async () => {
	try {
		console.log("🔄 Drakon Game Import Script\n");

		if (!DRAKON_BASE_URL || !AGENT_TOKEN || !AGENT_SECRET_KEY) {
			throw new Error(
				"Missing env vars: DRAKON_API_URL, DRAKON_AGENT_TOKEN, DRAKON_AGENT_SECRET"
			);
		}

		await connectDB();

		const accessToken = await authenticate();
		const games = await fetchAllGames(accessToken);

		if (!games.length) {
			console.log("⚠ No games returned from Drakon API");
			process.exit(0);
		}

		const { processed, failed } = await saveGamesToDB(games);

		console.log("\n" + "=".repeat(50));
		console.log("✓ Drakon game import completed!");
		console.log(`  Processed: ${processed}`);
		console.log(`  Failed:    ${failed}`);
		console.log(`  Total:     ${games.length}`);
		console.log("=".repeat(50));

		process.exit(0);
	} catch (e) {
		console.error("\n✗ Import failed:", e.message);
		process.exit(1);
	}
})();
