require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../../database/index");
const Game = require("../../database/models/Game");

const OLD_DOMAINS = [
	"https://gator.drakon.casino",
	"https://gator.drakonapi.casino",
];
const NEW_DOMAIN = "https://gator.drakonapi.tech";
const BULK_SIZE = 500;

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getModifiedCount(result) {
	return (
		result?.modifiedCount ??
		result?.nModified ??
		result?.result?.nModified ??
		0
	);
}

(async () => {
	try {
		await connectDB();
		console.log(
			`Starting Drakon banner domain migration: ${OLD_DOMAINS.join(", ")} -> ${NEW_DOMAIN}`
		);

		const oldDomainPattern = OLD_DOMAINS.map(escapeRegex).join("|");
		const oldDomainRegex = new RegExp(oldDomainPattern, "i");
		const replaceRegex = new RegExp(oldDomainPattern, "gi");

		const totalMatches = await Game.countDocuments({
			banner: { $type: "string", $regex: oldDomainRegex },
		});

		console.log(
			`Found ${totalMatches} games with banner containing an old domain`
		);

		if (totalMatches === 0) {
			await mongoose.disconnect();
			console.log("Disconnected from database.");
			process.exit(0);
		}

		const cursor = Game.find({
			banner: { $type: "string", $regex: oldDomainRegex },
		})
			.select("_id banner game_code")
			.lean()
			.cursor();

		let scanned = 0;
		let updated = 0;
		let operations = [];

		for await (const game of cursor) {
			scanned++;
			const nextBanner = game.banner.replace(replaceRegex, NEW_DOMAIN);

			if (nextBanner === game.banner) {
				continue;
			}

			operations.push({
				updateOne: {
					filter: { _id: game._id },
					update: {
						$set: {
							banner: nextBanner,
							updated_at: new Date(),
						},
					},
				},
			});

			if (operations.length === BULK_SIZE) {
				const result = await Game.bulkWrite(operations, { ordered: false });
				updated += getModifiedCount(result);
				operations = [];

				console.log(
					`Scanned ${scanned}/${totalMatches} matched games. Updated ${updated} banners so far.`
				);
			}
		}

		if (operations.length > 0) {
			const result = await Game.bulkWrite(operations, { ordered: false });
			updated += getModifiedCount(result);
		}

		const remaining = await Game.countDocuments({
			banner: { $type: "string", $regex: oldDomainRegex },
		});

		console.log(`Completed. Updated ${updated} game banners.`);
		console.log("Remaining games with old domains in banner:", remaining);
		console.log(
			`Example target format: ${NEW_DOMAIN}/storage/drakon/XXXgame.png`
		);

		await mongoose.disconnect();
		console.log("Disconnected from database.");
		process.exit(0);
	} catch (err) {
		console.error(
			"Error during Drakon banner domain migration:",
			err.message || err
		);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();
