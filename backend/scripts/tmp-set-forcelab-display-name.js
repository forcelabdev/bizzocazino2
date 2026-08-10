// One-off data update: set the "betinovi" provider display name to "Forcelab".
// This does NOT change any backend logic - it only writes a display-name override
// into the existing SiteSettings.providerSettings.providerDisplayNames field, which
// is the same field the admin panel already lets an admin edit via Site Settings > Provider.
const { MongoClient } = require("mongodb");

const run = async () => {
	const uri = process.env.DATABASE_URI;
	if (!uri) {
		console.error("DATABASE_URI is not set.");
		process.exit(1);
	}

	const client = new MongoClient(uri);
	await client.connect();
	const db = client.db();

	const result = await db.collection("sitesettings").updateOne(
		{},
		{ $set: { "providerSettings.providerDisplayNames.betinovi": "Forcelab" } },
		{ upsert: true },
	);

	console.log("[v0] Update result:", JSON.stringify(result));

	await client.close();
};

run().catch((err) => {
	console.error("[v0] Script error:", err);
	process.exit(1);
});
