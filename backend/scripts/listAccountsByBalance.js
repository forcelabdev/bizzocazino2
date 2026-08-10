require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../database/index");
const User = require("../database/models/User");
const fs = require("fs");

(async () => {
	try {
		await connectDB();
		console.log(
			"Connected to DB. Looking for users with total Rivo balance >= 10000..."
		);

		const pipeline = [
			{
				$match: {
					createdAt: {
						$gte: new Date("2025-11-30T00:00:00Z"),
						$lte: new Date("2025-12-03T23:59:59Z"),
					},
				},
			},
			{
				$unwind: {
					path: "$wallets",
					preserveNullAndEmptyArrays: false,
				},
			},
			{ $match: { "wallets.coinType": { $regex: /^Rivo$/i } } },
			{
				$group: {
					_id: "$_id",
					totalRivo: { $sum: "$wallets.balance" },
					phone: { $first: "$phone" },
				},
			},
			{ $match: { totalRivo: { $gte: 10000 } } },
			{
				$project: {
					phone: 1,
					totalRivo: 1,
				},
			},
		];

		const results = await User.aggregate(pipeline).allowDiskUse(true);

		if (!results || results.length === 0) {
			console.log("No users found with total Rivo balance >= 10000.");
			await mongoose.disconnect();
			process.exit(0);
		}

		const rows = results.map((u) => ({
			phone: u.phone || "-",
			totalRivo: u.totalRivo || 0,
		}));

		console.table(rows);
		if (process.argv.includes("--csv")) {
			const header = ["phone", "totalRivo"].join(",") + "\n";
			const csv = rows
				.map((r) => [r.phone, r.totalRivo].join(","))
				.join("\n");
			const out = header + csv + "\n";
			const outPath = "rivo_over_10000.csv";
			fs.writeFileSync(outPath, out, { encoding: "utf8" });
			console.log(`Wrote ${outPath} (${rows.length} users)`);
		}

		await mongoose.disconnect();
		console.log("Disconnected from database.");
		process.exit(0);
	} catch (err) {
		console.error(
			"Error while listing accounts:",
			err && err.message ? err.message : err
		);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();
