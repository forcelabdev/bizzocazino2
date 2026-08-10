require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../database/index");
const User = require("../database/models/User");

(async () => {
	try {
		await connectDB();
		console.log(
			"Starting avatar domain replacement: Bizzocazino235.com -> https://arcanebet366.com"
		);

		const domainRegex = /Bizzocazino235\.com/;

		const users = await User.find({
			$or: [
				{ avatar: { $type: "string", $regex: domainRegex } },
				{ "avatar.url": { $type: "string", $regex: domainRegex } },
			],
		}).select("_id avatar");

		console.log(
			`Found ${users.length} users with avatar containing Bizzocazino235.com`
		);

		let updated = 0;
		for (const u of users) {
			let newAvatar = u.avatar;

			try {
				if (!newAvatar) continue;

				if (typeof newAvatar === "string") {
					if (newAvatar.includes("Bizzocazino235.com")) {
						newAvatar = newAvatar.replace(
							/Bizzocazino235\.com/g,
							"https://arcanebet366.com"
						);
					} else {
						continue;
					}
				} else if (
					typeof newAvatar === "object" &&
					newAvatar !== null
				) {
					// If avatar is an object and has a url field
					if (
						typeof newAvatar.url === "string" &&
						newAvatar.url.includes("Bizzocazino235.com")
					) {
						newAvatar = {
							...newAvatar,
							url: newAvatar.url.replace(
								/Bizzocazino235\.com/g,
								"https://arcanebet366.com"
							),
						};
					} else {
						// no change needed
						continue;
					}
				} else {
					continue;
				}

				await User.updateOne(
					{ _id: u._id },
					{ $set: { avatar: newAvatar } }
				);
				updated++;

				if (updated % 100 === 0) {
					console.log(`Updated ${updated} users...`);
				}
			} catch (innerErr) {
				console.error(
					`Failed to update user ${u._id}:`,
					innerErr.message || innerErr
				);
			}
		}

		console.log(`\nCompleted. Updated ${updated} users.`);

		const remaining = await User.countDocuments({
			$or: [
				{ avatar: { $type: "string", $regex: domainRegex } },
				{ "avatar.url": { $type: "string", $regex: domainRegex } },
			],
		});
		console.log("Remaining users with old domain in avatar:", remaining);

		await mongoose.disconnect();
		console.log("Disconnected from database.");
		process.exit(0);
	} catch (err) {
		console.error(
			"Error during avatar domain replacement:",
			err.message || err
		);
		await mongoose.disconnect().catch(() => {});
		process.exit(1);
	}
})();
