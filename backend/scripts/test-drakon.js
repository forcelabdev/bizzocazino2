const axios = require("axios");

const DRAKON_API_URL = "https://apibizzocasino.site/drakon_api";

async function authenticate() {
	try {
		console.log("→ Authenticating with Drakon...");
		const { data } = await axios.post(DRAKON_API_URL, {
			method: "authenticate",
		});
		console.log(
			"✓ Authentication successful:",
			data.access_token ? "Token received" : data
		);
		return data;
	} catch (err) {
		console.error(
			"✗ Authentication failed:",
			err.response?.data || err.message
		);
		throw err;
	}
}

async function fetchAllGames() {
	try {
		console.log("→ Fetching all games from Drakon...");
		const { data } = await axios.post(DRAKON_API_URL, {
			method: "fetch_all_games",
		});
		console.log(`✓ Fetched ${data.games?.length || 0} games`);
		return data;
	} catch (err) {
		console.error(
			"✗ Failed to fetch games:",
			err.response?.data || err.message
		);
		throw err;
	}
}

(async () => {
	try {
		await authenticate();
		await fetchAllGames();
	} catch (e) {
		console.error("\n✗ Test suite failed:", e.message);
	}
})();
