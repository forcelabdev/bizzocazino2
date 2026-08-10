const axios = require("axios");

const BASE_URL = "https://apibizzocasino.site/gold_api/";
const NEXUS_URL = "https://api.nexusggr.eu";
const AGENT_CODE = "Prowawe";
const AGENT_TOKEN = "3eae9c5a9954a4b6795ae554e259b975";
const RATE_DELAY_MS = Number(process.env.RATE_DELAY_MS || 1000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBalance() {
	try {
		const { data } = await axios.post(
			BASE_URL,
			{
				method: "user_balance",
				agent_code: "Prowawe",
				agent_secret: "d24d2d1e422ca2886c6031f982311bdf",
				user_code: "6910469c0c9128ca019e26e5",
				user_token: "6910469c0c9128ca019e26e5",
				game_code: "vs20olympgate",
			},
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
	console.log(await fetchBalance());
})();
