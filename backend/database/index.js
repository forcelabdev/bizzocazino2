const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { ensureSportsbookGames } = require('../services/sportsbookGames');
const { seedPermissionsAndRoles } = require('../scripts/seedPermissions');
const { migrateUsersToRivoWallet } = require('../utils/rivoWalletMigration');

// Set mongoose mode to strict and deactive auto indexing
mongoose.set('strictQuery', true);
mongoose.set('autoIndex', false);

let modelsLoaded = false;
const AFFILIATE_REFERRER_FIELDS = [
	'affiliates.referrer',
	'affiliates.referrerLevel2',
	'affiliates.referrerLevel3',
];

const getNestedValue = (obj, path) =>
	path.split('.').reduce((current, key) => current?.[key], obj);

const loadAllModels = () => {
	if (modelsLoaded) return;

	const modelsDir = path.join(__dirname, 'models');
	const modelFiles = fs
		.readdirSync(modelsDir)
		.filter(file => file.endsWith('.js'));

	for (const file of modelFiles) {
		require(path.join(modelsDir, file));
	}

	modelsLoaded = true;
};

const syncAllIndexes = async () => {
	const shouldSyncIndexes = process.env.MONGOOSE_SYNC_INDEXES !== 'false';

	if (!shouldSyncIndexes) {
		console.log('MongoDB index sync skipped (MONGOOSE_SYNC_INDEXES=false)');
		return;
	}

	loadAllModels();
	const syncResult = await mongoose.connection.syncIndexes();
	const syncedModelCount = Object.keys(syncResult || {}).length;

	console.log(`MongoDB indexes synced for ${syncedModelCount} model(s)`);
};

const cleanupInvalidAffiliateReferrers = async () => {
	const usersCollection = mongoose.connection.collection('users');
	const stringReferrerQuery = {
		$or: AFFILIATE_REFERRER_FIELDS.map((field) => ({
			[field]: { $type: 'string' },
		})),
	};

	const cursor = usersCollection.find(stringReferrerQuery, {
		projection: AFFILIATE_REFERRER_FIELDS.reduce(
			(acc, field) => ({ ...acc, [field]: 1 }),
			{ _id: 1 }
		),
	});

	const operations = [];
	let convertedCount = 0;
	let removedCount = 0;
	let updatedUsers = 0;

	for await (const user of cursor) {
		const $set = { updatedAt: new Date() };
		const $unset = {};
		let hasChanges = false;

		for (const field of AFFILIATE_REFERRER_FIELDS) {
			const currentValue = getNestedValue(user, field);

			if (typeof currentValue !== 'string') {
				continue;
			}

			if (mongoose.isValidObjectId(currentValue)) {
				$set[field] = new mongoose.Types.ObjectId(currentValue);
				convertedCount += 1;
			} else {
				$unset[field] = '';
				removedCount += 1;
			}

			hasChanges = true;
		}

		if (!hasChanges) {
			continue;
		}

		operations.push({
			updateOne: {
				filter: { _id: user._id },
				update: {
					$set,
					...(Object.keys($unset).length ? { $unset } : {}),
				},
			},
		});
		updatedUsers += 1;

		if (operations.length >= 500) {
			await usersCollection.bulkWrite(operations, { ordered: false });
			operations.length = 0;
		}
	}

	if (operations.length) {
		await usersCollection.bulkWrite(operations, { ordered: false });
	}

	if (updatedUsers > 0) {
		console.log(
			`Affiliate referrer cleanup applied to ${updatedUsers} user(s); converted=${convertedCount}, removed=${removedCount}`
		);
	}

	return {
		updatedUsers,
		convertedCount,
		removedCount,
	};
};

const seedSystemPermissions = async () => {
	const shouldSeedPermissions = process.env.AUTO_SEED_PERMISSIONS !== 'false';

	if (!shouldSeedPermissions) {
		console.log('Permission seeding skipped (AUTO_SEED_PERMISSIONS=false)');
		return;
	}

	await seedPermissionsAndRoles();
	console.log('System permissions seeded');
};

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URI, {
			maxPoolSize: 70,
			minPoolSize: 10,

			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,

			// Stability
			family: 4,

			useNewUrlParser: true,
			useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
		await cleanupInvalidAffiliateReferrers();
		await syncAllIndexes();
		await migrateUsersToRivoWallet();
		await seedSystemPermissions();
		await ensureSportsbookGames();
    } catch(err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;
module.exports.cleanupInvalidAffiliateReferrers = cleanupInvalidAffiliateReferrers;
