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

async function getProviders() {
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
		return { providersArr, providerCodes: [] };
	}

	return { providersArr, providerCodes };
}

(async () => {
	const args = process.argv.slice(2);
	const mode = args[0] || "all";

	try {
		console.log("=".repeat(50));
		console.log("Nexus Game Import Script");
		console.log("=".repeat(50));
		console.log(`Mode: ${mode}`);
		console.log(`API URL: ${BASE_URL}`);
		console.log(`Nexus URL: ${NEXUS_URL}`);
		console.log(`Rate Delay: ${RATE_DELAY_MS}ms`);
		console.log("=".repeat(50));

		if (mode === "providers") {
			// Just list providers
			const { providersArr, providerCodes } = await getProviders();
			console.log(`\n✓ Found ${providerCodes.length} providers\n`);
			console.log("Provider List:");
			providersArr.forEach((p, i) => {
				const code = p?.provider_code || p?.code || p?.providerCode;
				const name = p?.provider_name || p?.name || p?.providerName || code;
				console.log(`  ${i + 1}. ${code} (${name})`);
			});
		} else if (mode === "single") {
			// Fetch games for a single provider
			const providerCode = args[1];
			if (!providerCode) {
				console.error("Usage: node nexus.js single <providerCode>");
				console.error("Example: node nexus.js single pragmatic");
				process.exit(1);
			}
			console.log(`→ Fetching games for provider: ${providerCode}`);
			const res = await fetchGames(providerCode);
			console.log(`✓ ${providerCode}:`, res?.message || res);
		} else if (mode === "all") {
			// Fetch games for all providers
			const { providerCodes } = await getProviders();
			if (!providerCodes.length) return;

			console.log(
				`\nWill fetch games for ${providerCodes.length} providers...\n`
			);

			let successCount = 0;
			let errorCount = 0;

			for (const code of providerCodes) {
				try {
					console.log(
						`→ [${successCount + errorCount + 1}/${providerCodes.length}] Fetching games for: ${code}`
					);
					const res = await fetchGames(code);
					console.log(`  ✓ ${code}:`, res?.message || res);
					successCount++;
				} catch (e) {
					console.error(`  ✗ ${code}:`, e.message);
					errorCount++;
				}

				if (RATE_DELAY_MS > 0) {
					await sleep(RATE_DELAY_MS);
				}
			}

			console.log("\n" + "=".repeat(50));
			console.log("Import Summary:");
			console.log(`  - Total providers: ${providerCodes.length}`);
			console.log(`  - Successful: ${successCount}`);
			console.log(`  - Failed: ${errorCount}`);
			console.log("=".repeat(50));
		} else {
			console.log("Usage:");
			console.log(
				"  node nexus.js all                    - Fetch games for all providers"
			);
			console.log(
				"  node nexus.js providers              - List all available providers"
			);
			console.log(
				"  node nexus.js single <providerCode>  - Fetch games for a specific provider"
			);
		}

		console.log("\n✓ Done.");
	} catch (e) {
		console.error("\n✗ Script failed:", e.message);
		console.error(e?.response?.data);
		process.exit(1);
	}
})();
