require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../database/index");
const User = require("../database/models/User");

(async () => {
	try {
		await connectDB();
		console.log("Starting numericId assignment...");

		const usersWithoutNumericId = await User.find({
			$or: [{numericId: {$exists: false}}, {numericId: null}],
		}).select("_id");

		console.log(`Found ${usersWithoutNumericId.length} users without numericId`);

		if (usersWithoutNumericId.length === 0) {
			console.log("All users already have numericId assigned.");
			await mongoose.disconnect();
			process.exit(0);
		}

		const lastUser = await User.findOne({numericId: {$exists: true, $ne: null}})
			.sort({numericId: -1})
			.limit(1)
			.select("numericId");

		let startingId = lastUser && lastUser.numericId ? lastUser.numericId + 1 : 1000000;
		console.log(`Starting assignment from numericId: ${startingId}`);

		let updated = 0;
		for (const user of usersWithoutNumericId) {
			await User.updateOne({_id: user._id}, {$set: {numericId: startingId}});
			startingId++;
			updated++;

			if (updated % 100 === 0) {
				console.log(`Assigned numericId to ${updated} users...`);
			}
		}

		console.log(`\nCompleted! Assigned numericId to ${updated} users.`);

		const remaining = await User.countDocuments({
			$or: [{numericId: {$exists: false}}, {numericId: null}],
		});
		console.log("Remaining users without numericId:", remaining);

		await mongoose.disconnect();
		console.log("Disconnected from database.");
		process.exit(0);
	} catch (err) {
		console.error("Error during numericId assignment:", err.message);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();
