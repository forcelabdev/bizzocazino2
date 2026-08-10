require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../database");

const cleanupInvalidAffiliateReferrers =
	connectDB.cleanupInvalidAffiliateReferrers;

const connectOptions = {
	maxPoolSize: 10,
	minPoolSize: 1,
	serverSelectionTimeoutMS: 5000,
	socketTimeoutMS: 45000,
	family: 4,
	useNewUrlParser: true,
	useUnifiedTopology: true,
};

(async () => {
	try {
		if (!process.env.DATABASE_URI) {
			throw new Error("DATABASE_URI tanımlı değil.");
		}

		await mongoose.connect(process.env.DATABASE_URI, connectOptions);
		console.log(`MongoDB Connected: ${mongoose.connection.host}`);

		const result = await cleanupInvalidAffiliateReferrers();

		console.log("Affiliate referrer cleanup result:", result);
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error("Cleanup failed:", error.message || error);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();