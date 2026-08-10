require("dotenv").config();
const axios = require("axios");

const BASE_URL = "https://apibizzocasino.site/gold_api/fetch-games";
const NEXUS_URL = process.env.NEXUS_API_ENDPOINT;
const AGENT_CODE = process.env.NEXUS_AGENT_CODE;
const AGENT_TOKEN = process.env.NEXUS_AGENT_TOKEN;
console.log("Using Nexus API Endpoint:", NEXUS_URL);
console.log("Using Nexus Agent Code:", AGENT_CODE);
console.log("Using Nexus Agent Token:", AGENT_TOKEN);

const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS || 1000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGames(providerCode) {
	try {
		const { data } = await axios.post(
			BASE_URL,
			{ provider_code: providerCode },
			{ headers: { "Content-Type": "application/json" } }
		);
		return data;
	} catch (err) {
		if (err.response) {
			const msg =
				err.response.data?.message || err.response.statusText || "";
			throw new Error(`Request failed: ${err.response.status} ${msg}`);
		}
		throw new Error(`Network error: ${err.message}`);
	}
}

(async () => {
	try {
		const { data } = await axios.post(
			NEXUS_URL,
			{
				method: "provider_list",
				agent_code: AGENT_CODE,
				agent_token: AGENT_TOKEN,
			},
			{ headers: { "Content-Type": "application/json" } }
		);

		if (data.status !== 1) {
			throw new Error(
				`Provider list failed: ${data.msg || "UNKNOWN_ERROR"}`
			);
		}

		const providersArr =
			data.providers || data.provider_list || data.data || [];
		const providerCodes = providersArr
			.map((p) => p?.provider_code || p?.code || p?.providerCode)
			.filter(Boolean);

		if (!providerCodes.length) {
			console.error("No provider codes found. Raw response:", data);
			return;
		}

		// const limit = process.env.LIMIT === 'all' ? providerCodes.length : Number(process.env.LIMIT || 5);
		// const target = providerCodes.slice(0, limit);
		console.log(
			`Will fetch games for ${providerCodes.length} providers...`
		);

		for (const code of providerCodes) {
			try {
				console.log(`→ Fetching games for provider: ${code}`);
				const res = await fetchGames(code);
				console.log(`✓ ${code}:`, res?.message || res);
			} catch (e) {
				console.error(`✗ ${code}:`, e.message);
			} finally {
				if (RATE_DELAY_MS > 0) {
					console.log(`Waiting ${RATE_DELAY_MS}ms for rate limit...`);
					await sleep(RATE_DELAY_MS);
				}
			}
		}

		console.log("Done.");
	} catch (e) {
		console.error("Provider list request error:", e.message);
		console.error(e?.response?.data);
	}
})();
