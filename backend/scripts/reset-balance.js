require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../database/index");
const User = require("../database/models/User");

(async () => {
	try {
		await connectDB();
		console.log("Starting Rivo wallet balance reset...");

		const result = await User.updateMany({}, {$set: {"wallets.$[r].balance": 0}}, {arrayFilters: [{"r.coinType": "Rivo"}]});

		console.log("Update result:", {
			acknowledged: result.acknowledged,
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
		});

		const remaining = await User.countDocuments({
			wallets: {$elemMatch: {coinType: "Rivo", balance: {$ne: 0}}},
		});
		console.log("Remaining users with non-zero Rivo balance:", remaining);

		await mongoose.disconnect();
		console.log("Completed and disconnected.");
		process.exit(0);
	} catch (err) {
		console.error("Error during Rivo balance reset:", err.message);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();
