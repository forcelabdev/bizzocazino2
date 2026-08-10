const Game = require("../database/models/Game");
const SiteSettings = require("../database/models/SiteSettings");

const SPORTSBOOK_GAME_CODES = ["sportsbook", "sportsbook-live"];

const SPORTSBOOK_GAMES = [
	{
		game_code: "sportsbook",
		game_name: "Spor Bahisleri",
		game_type: "sports",
		banner: null,
	},
	{
		game_code: "sportsbook-live",
		game_name: "Canlı Spor Bahisleri",
		game_type: "sports",
		banner: null,
	},
];

const getProviderFields = (provider) => {
	switch (provider) {
		case "nexusggr":
			return { distribution: "nexus", provider_code: "nexus" };
		case "betcolabs":
		default:
			return { distribution: "betcolabs", provider_code: "betcolabs" };
	}
};

const ensureSportsbookGames = async () => {
	let provider = "betcolabs";
	try {
		const settings = await SiteSettings.findOne();
		provider = settings?.providerSettings?.sportsbookProvider || "betcolabs";
	} catch (e) {
		// ignore, use default
	}

	const { distribution, provider_code } = getProviderFields(provider);

	let created = 0;
	let updated = 0;

	for (const gameData of SPORTSBOOK_GAMES) {
		try {
			const result = await Game.findOneAndUpdate(
				{ game_code: gameData.game_code },
				{
					$set: {
						distribution,
						game_name: gameData.game_name,
						game_type: gameData.game_type,
						provider_code,
						banner: gameData.banner,
						updated_at: new Date(),
					},
					$setOnInsert: {
						categories: [],
						created_at: new Date(),
					},
				},
				{ upsert: true, new: true, rawResult: true }
			);

			if (result.lastErrorObject?.upserted) {
				created++;
				console.log(`  [Sportsbook] Created: ${gameData.game_code}`);
			} else if (result.lastErrorObject?.updatedExisting) {
				updated++;
			}
		} catch (err) {
			console.error(
				`  [Sportsbook] Error ensuring ${gameData.game_code}:`,
				err.message
			);
		}
	}

	if (created > 0 || updated > 0) {
		console.log(
			`[Sportsbook] Games ensured (${provider}): ${created} created, ${updated} updated`
		);
	}
};

const updateSportsbookProvider = async (provider) => {
	const { distribution, provider_code } = getProviderFields(provider);
	await Game.updateMany(
		{ game_code: { $in: SPORTSBOOK_GAME_CODES } },
		{ $set: { distribution, provider_code, updated_at: new Date() } }
	);
	console.log(`[Sportsbook] Games updated to provider: ${provider} (distribution: ${distribution})`);
};

module.exports = { ensureSportsbookGames, updateSportsbookProvider, SPORTSBOOK_GAMES };
