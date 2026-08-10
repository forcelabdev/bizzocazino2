const User = require("../database/models/User");
const {
	hasOnlyRivoWallet,
	normalizeWalletState,
} = require("./rivoWallet");

const BATCH_SIZE = 250;

const buildMigrationQuery = () => ({
	$or: [
		{ "wallets.1": { $exists: true } },
		{ "wallets.0.coinType": { $ne: "Rivo" } },
		{ "wallets.0.chain": { $ne: "TRON" } },
		{ "wallets.0.type": { $ne: "trc-20" } },
		{ "currency.coinType": { $ne: "Rivo" } },
		{ "currency.chain": { $ne: "TRON" } },
		{ "currency.type": { $ne: "trc-20" } },
	],
});

async function migrateUsersToRivoWallet() {
	const pendingUpdates = [];
	let migratedCount = 0;

	const flushUpdates = async () => {
		if (pendingUpdates.length === 0) return;
		await User.bulkWrite(pendingUpdates, { ordered: false });
		pendingUpdates.length = 0;
	};

	const cursor = User.find(buildMigrationQuery())
		.select("wallets currency")
		.lean()
		.cursor();

	for await (const user of cursor) {
		if (hasOnlyRivoWallet(user)) continue;

		const normalizedState = normalizeWalletState(user);
		pendingUpdates.push({
			updateOne: {
				filter: { _id: user._id },
				update: {
					$set: {
						wallets: normalizedState.wallets,
						currency: normalizedState.currency,
					},
				},
			},
		});
		migratedCount += 1;

		if (pendingUpdates.length >= BATCH_SIZE) {
			await flushUpdates();
		}
	}

	await flushUpdates();

	if (migratedCount > 0) {
		console.log(
			`Rivo wallet migration completed for ${migratedCount} user(s)`
		);
		return;
	}

	console.log("Rivo wallet migration skipped; all users are already normalized");
}

module.exports = {
	migrateUsersToRivoWallet,
};