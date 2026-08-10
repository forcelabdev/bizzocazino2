require("dotenv").config();
const axios = require("axios");

const BETINOVI_API_URL = "https://apibizzocasino.site/betinovi_api";

const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS || 1500);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getVendors() {
	try {
		console.log("→ Fetching vendors from Betinovi...");
		const { data } = await axios.post(BETINOVI_API_URL, {
			method: "GetVendors",
		});

		if (data.status === 1 && data.vendors) {
			console.log(`✓ Found ${data.vendors.length} vendors`);
			return data.vendors;
		} else {
			throw new Error(data.msg || "Failed to fetch vendors");
		}
	} catch (err) {
		console.error(
			"✗ Failed to fetch vendors:",
			err.response?.data || err.message
		);
		throw err;
	}
}

async function fetchGamesForVendor(vendorCode) {
	try {
		const { data } = await axios.post(BETINOVI_API_URL, {
			method: "fetch_games",
			vendorCode,
		});

		if (data.status === 1) {
			return data;
		} else {
			throw new Error(data.msg || "Failed to fetch games");
		}
	} catch (err) {
		console.error(
			`✗ Failed to fetch games for ${vendorCode}:`,
			err.response?.data || err.message
		);
		throw err;
	}
}

async function fetchAllGames() {
	try {
		console.log(
			"→ Fetching all games from all vendors (this may take a while)..."
		);
		const { data } = await axios.post(BETINOVI_API_URL, {
			method: "fetch_all_games",
		});

		if (data.status === 1) {
			console.log(`✓ ${data.message}`);
			if (data.errors && data.errors.length > 0) {
				console.log("⚠ Some errors occurred:");
				data.errors.forEach((e) =>
					console.log(`  - ${e.vendor}: ${e.error}`)
				);
			}
			return data;
		} else {
			throw new Error(data.msg || "Failed to fetch all games");
		}
	} catch (err) {
		console.error(
			"✗ Failed to fetch all games:",
			err.response?.data || err.message
		);
		throw err;
	}
}

async function getAgentInfo() {
	try {
		console.log("→ Fetching agent info...");
		const { data } = await axios.post(BETINOVI_API_URL, {
			method: "GetAgentInfo",
		});

		if (data.status === 0) {
			console.log("✓ Agent balance:", JSON.stringify(data.balance));
			return data;
		} else {
			throw new Error(data.msg || "Failed to fetch agent info");
		}
	} catch (err) {
		console.error(
			"✗ Failed to fetch agent info:",
			err.response?.data || err.message
		);
		throw err;
	}
}

(async () => {
	const args = process.argv.slice(2);
	const mode = args[0] || "all"; // all, vendors, single, info

	try {
		console.log("=".repeat(50));
		console.log("Betinovi Game Import Script");
		console.log("=".repeat(50));
		console.log(`Mode: ${mode}`);
		console.log(`API URL: ${BETINOVI_API_URL}`);
		console.log(`Rate Delay: ${RATE_DELAY_MS}ms`);
		console.log("=".repeat(50));

		if (mode === "info") {
			// Just get agent info
			await getAgentInfo();
		} else if (mode === "vendors") {
			// Just list vendors
			const vendors = await getVendors();
			console.log("\nVendor List:");
			vendors.forEach((v, i) => {
				const gameType =
					v.gameType === 1
						? "Slot"
						: v.gameType === 2
						? "Live"
						: "Other";
				console.log(
					`  ${i + 1}. ${v.vendorCode} (${
						v.vendorName
					}) - ${gameType}`
				);
			});
		} else if (mode === "single") {
			// Fetch games for a single vendor
			const vendorCode = args[1];
			if (!vendorCode) {
				console.error("Usage: node betinovi.js single <vendorCode>");
				console.error(
					"Example: node betinovi.js single slot-pragmatic"
				);
				process.exit(1);
			}
			console.log(`→ Fetching games for vendor: ${vendorCode}`);
			const result = await fetchGamesForVendor(vendorCode);
			console.log(`✓ ${result.message || "Games imported successfully"}`);
		} else if (mode === "all") {
			// Fetch all games from all vendors
			await fetchAllGames();
		} else if (mode === "sequential") {
			// Fetch vendors then import each one sequentially (more control)
			const vendors = await getVendors();
			console.log(
				`\nWill import games from ${vendors.length} vendors sequentially...`
			);

			let totalGames = 0;
			let successCount = 0;
			let errorCount = 0;

			for (const vendor of vendors) {
				try {
					console.log(
						`\n→ [${successCount + errorCount + 1}/${
							vendors.length
						}] Fetching games for: ${vendor.vendorCode} (${
							vendor.vendorName
						})`
					);
					const result = await fetchGamesForVendor(vendor.vendorCode);
					console.log(`  ✓ ${result.message || "Success"}`);
					successCount++;
				} catch (e) {
					console.error(`  ✗ Failed: ${e.message}`);
					errorCount++;
				}

				// Rate limiting
				if (RATE_DELAY_MS > 0) {
					await sleep(RATE_DELAY_MS);
				}
			}

			console.log("\n" + "=".repeat(50));
			console.log("Import Summary:");
			console.log(`  - Total vendors: ${vendors.length}`);
			console.log(`  - Successful: ${successCount}`);
			console.log(`  - Failed: ${errorCount}`);
			console.log("=".repeat(50));
		} else {
			console.log("Usage:");
			console.log(
				"  node betinovi.js all         - Fetch all games from all vendors (single request)"
			);
			console.log(
				"  node betinovi.js sequential  - Fetch all games vendor by vendor"
			);
			console.log(
				"  node betinovi.js vendors     - List all available vendors"
			);
			console.log(
				"  node betinovi.js single <vendorCode> - Fetch games for specific vendor"
			);
			console.log(
				"  node betinovi.js info        - Get agent info and balance"
			);
		}

		console.log("\n✓ Done.");
	} catch (e) {
		console.error("\n✗ Script failed:", e.message);
		process.exit(1);
	}
})();
