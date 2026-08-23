const mongoose = require("mongoose");
const RaceTournament = require("../database/models/RaceTournament");
const RaceEntry = require("../database/models/RaceEntry");
const User = require("../database/models/User");
const BalanceTransaction = require("../database/models/BalanceTransaction");

class RaceError extends Error {
	constructor(code, message, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

// GameProvider.code ve gameCategory eşleşmesi turnuvanın kapsamına uyuyor mu?
const isWagerInScope = (tournament, { providerCode, gameCategory }) => {
	const providers = tournament.providers?.length ? tournament.providers : ["all"];
	const providerOk = providers.includes("all") || (providerCode && providers.includes(providerCode));
	const categoryOk = tournament.gameCategory === "all" || tournament.gameCategory === gameCategory;
	return providerOk && categoryOk;
};

/**
 * 🏁 Merkezi çevrim (wager) hook'u — her bahis yerleşiminde/sonuçlandığında
 * userBetAccess.onBetSettled() tarafından çağrılır. Aktif ve zaman aralığında
 * olan tüm uygun turnuvalarda kullanıcının puanını artırır.
 */
const recordWagerForRaces = async ({ userId, wagerAmount, providerCode = null, gameCategory = "all" }) => {
	const amount = Number(wagerAmount);
	if (!userId || !Number.isFinite(amount) || amount <= 0) return;

	const now = new Date();
	const tournaments = await RaceTournament.find({
		isActive: true,
		state: "running",
		$or: [{ startsAt: null }, { startsAt: { $lte: now } }],
		$and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
	}).lean();

	for (const tournament of tournaments) {
		if (!isWagerInScope(tournament, { providerCode, gameCategory })) continue;
		const pointsToAdd = amount * Number(tournament.pointsPerWager || 1);
		await RaceEntry.findOneAndUpdate(
			{ tournament: tournament._id, user: userId },
			{ $inc: { points: pointsToAdd }, $set: { updatedAt: new Date() }, $setOnInsert: { isManual: false } },
			{ upsert: true, new: true }
		);
	}
};

/** ⏱️ Manuel/sanal katılımcıların otomatik katsayı artışı — her dakika cron ile çağrılır. */
const tickManualEntries = async () => {
	const now = new Date();
	const runningTournaments = await RaceTournament.find({ isActive: true, state: "running" }).select("_id").lean();
	if (!runningTournaments.length) return;

	const entries = await RaceEntry.find({
		tournament: { $in: runningTournaments.map((t) => t._id) },
		isManual: true,
		manualGrowthRate: { $gt: 0 },
	});

	for (const entry of entries) {
		const minutesElapsed = entry.lastAutoIncrementAt
			? Math.max(0, (now - entry.lastAutoIncrementAt) / 60000)
			: 1;
		if (minutesElapsed <= 0) continue;
		entry.points += entry.manualGrowthRate * minutesElapsed;
		entry.lastAutoIncrementAt = now;
		entry.updatedAt = now;
		await entry.save();
	}
};

/** 🚦 Zamanı gelen turnuvaları "running" yap, süresi bitenleri sonuçlandır — her dakika cron ile çağrılır. */
const advanceTournamentStates = async () => {
	const now = new Date();
	await RaceTournament.updateMany(
		{ isActive: true, state: "scheduled", $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
		{ $set: { state: "running", updatedAt: now } }
	);

	const dueTournaments = await RaceTournament.find({
		isActive: true,
		state: "running",
		endsAt: { $ne: null, $lte: now },
	}).lean();

	for (const tournament of dueTournaments) {
		await settleTournament(tournament._id);
	}
};

/** 🏆 Turnuvayı sonlandırır: sıralamayı hesaplar, ödülleri işaretler, autoDistribute ise bakiyeye ekler. */
const settleTournament = async (tournamentId) => {
	const session = await mongoose.startSession();
	try {
		let result;
		await session.withTransaction(async () => {
			const tournament = await RaceTournament.findById(tournamentId).session(session);
			if (!tournament) throw new RaceError("NOT_FOUND", "Turnuva bulunamadı.", 404);
			if (tournament.state === "completed") {
				result = { alreadyCompleted: true };
				return;
			}

			const rankedEntries = await RaceEntry.find({ tournament: tournament._id })
				.sort({ points: -1, createdAt: 1 })
				.session(session);

			const prizeByRank = new Map(tournament.prizes.map((p) => [p.rank, p.amount]));
			const distributed = [];

			for (let i = 0; i < rankedEntries.length; i++) {
				const entry = rankedEntries[i];
				const rank = i + 1;
				const prizeAmount = prizeByRank.get(rank) || 0;
				entry.prizeAmount = prizeAmount;

				if (prizeAmount > 0 && tournament.autoDistribute && entry.user && !entry.prizeAwarded) {
					const user = await User.findById(entry.user).session(session);
					if (user) {
						user.balance = Number(user.balance || 0) + prizeAmount;
						await user.save({ session });
						await BalanceTransaction.create(
							[{ amount: prizeAmount, type: "raceReward", user: user._id, state: "completed" }],
							{ session }
						);
						entry.prizeAwarded = true;
						distributed.push({ user: user._id, rank, prizeAmount });
					}
				}
				entry.updatedAt = new Date();
				await entry.save({ session });
			}

			tournament.state = "completed";
			tournament.updatedAt = new Date();
			await tournament.save({ session });

			result = { tournamentId: tournament._id, distributed };
		});
		return result;
	} finally {
		await session.endSession();
	}
};

/** 👤 Admin manuel katılımcı (gerçek üye veya sanal hesap) ekler/günceller. */
const upsertManualEntry = async ({ tournamentId, userId = null, displayName = "", startingPoints = 0, manualGrowthRate = 0 }) => {
	const tournament = await RaceTournament.findById(tournamentId);
	if (!tournament) throw new RaceError("NOT_FOUND", "Turnuva bulunamadı.", 404);
	if (!userId && !String(displayName || "").trim()) {
		throw new RaceError("DISPLAY_NAME_REQUIRED", "Gerçek kullanıcı seçilmediyse görünen ad zorunludur.");
	}

	const filter = userId ? { tournament: tournamentId, user: userId } : { tournament: tournamentId, displayName: String(displayName).trim(), isManual: true, user: null };
	const entry = await RaceEntry.findOneAndUpdate(
		filter,
		{
			$set: {
				isManual: true,
				displayName: String(displayName || "").trim(),
				manualGrowthRate: Math.max(0, Number(manualGrowthRate) || 0),
				updatedAt: new Date(),
			},
			$setOnInsert: {
				points: Math.max(0, Number(startingPoints) || 0),
				lastAutoIncrementAt: new Date(),
			},
		},
		{ upsert: true, new: true }
	);
	return entry;
};

const getLeaderboard = async (tournamentId, limit = 100) => {
	return RaceEntry.find({ tournament: tournamentId })
		.sort({ points: -1, createdAt: 1 })
		.limit(limit)
		.populate("user", "username name")
		.lean();
};

module.exports = {
	RaceError,
	recordWagerForRaces,
	tickManualEntries,
	advanceTournamentStates,
	settleTournament,
	upsertManualEntry,
	getLeaderboard,
};
