const mongoose = require("mongoose");
const SportsTournament = require("../database/models/SportsTournament");
const SportsBet = require("../database/models/SportsBet");
const User = require("../database/models/User");
const BalanceTransaction = require("../database/models/BalanceTransaction");

class SportsTournamentError extends Error {
	constructor(code, message, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

/**
 * 🏆 Turnuva kapsamındaki (tarih aralığı + minOdds + minBetAmount şartını
 * karşılayan, "cancelled" hariç) bahislerin kullanıcı bazlı toplam stake'ine
 * göre sıralama hesaplar. Canlı hesaplanır — ayrı bir "entry" tablosu yok.
 */
const computeLeaderboard = async (tournament, limit = 100) => {
	const dateFilter = {};

	if (tournament.startsAt) dateFilter.$gte = tournament.startsAt;
	if (tournament.endsAt) dateFilter.$lte = tournament.endsAt;

	const match = {
		totalOdds: { $gte: Number(tournament.minOdds) || 1 },
		amount: { $gte: Number(tournament.minBetAmount) || 0 },
		status: { $ne: "cancelled" },
	};

	if (dateFilter.$gte || dateFilter.$lte) match.createdAt = dateFilter;

	const rows = await SportsBet.aggregate([
		{ $match: match },
		{
			$group: {
				_id: "$user",
				totalStake: { $sum: "$amount" },
				betCount: { $sum: 1 },
			},
		},
		{ $sort: { totalStake: -1 } },
		{ $limit: limit },
		{
			$lookup: {
				from: "users",
				localField: "_id",
				foreignField: "_id",
				as: "user",
			},
		},
		{ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
	]);

	return rows.map((row, index) => ({
		rank: index + 1,
		user: row.user ? { _id: row.user._id, username: row.user.username, name: row.user.name } : null,
		totalStake: row.totalStake || 0,
		betCount: row.betCount || 0,
	}));
};

const getLeaderboard = async (tournamentId, limit = 100) => {
	const tournament = await SportsTournament.findById(tournamentId).lean();
	if (!tournament) throw new SportsTournamentError("NOT_FOUND", "Turnuva bulunamadı.", 404);

	// Tamamlanmış turnuvalarda önbelleğe alınmış sıralama gösterilir (bahisler
	// silinse/güncellense de sonuç sabit kalsın).
	if (tournament.state === "completed" && tournament.leaderboard?.length) {
		return tournament.leaderboard
			.slice()
			.sort((a, b) => a.rank - b.rank)
			.slice(0, limit)
			.map((entry) => ({
				rank: entry.rank,
				user: entry.user ? { _id: entry.user } : null,
				totalStake: entry.totalStake,
				betCount: entry.betCount,
				prizeAmount: entry.prizeAmount,
				prizeAwarded: entry.prizeAwarded,
			}));
	}

	return computeLeaderboard(tournament, limit);
};

/** 🚦 Zamanı gelen turnuvaları "running" yap, süresi bitenleri sonuçlandır — cron ile çağrılır. */
const advanceTournamentStates = async () => {
	const now = new Date();

	await SportsTournament.updateMany(
		{ isActive: true, state: "scheduled", $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
		{ $set: { state: "running", updatedAt: now } }
	);

	const dueTournaments = await SportsTournament.find({
		isActive: true,
		state: "running",
		endsAt: { $ne: null, $lte: now },
	}).lean();

	for (const tournament of dueTournaments) {
		await settleTournament(tournament._id);
	}
};

/** 🏁 Turnuvayı sonlandırır: sıralamayı hesaplar, ödülleri işaretler, autoDistribute ise bakiyeye ekler. */
const settleTournament = async (tournamentId) => {
	const session = await mongoose.startSession();

	try {
		let result;

		await session.withTransaction(async () => {
			const tournament = await SportsTournament.findById(tournamentId).session(session);
			if (!tournament) throw new SportsTournamentError("NOT_FOUND", "Turnuva bulunamadı.", 404);
			if (tournament.state === "completed") {
				result = { alreadyCompleted: true };
				return;
			}

			const ranked = await computeLeaderboard(tournament, 500);
			const prizeByRank = new Map(tournament.prizes.map((p) => [p.rank, p.amount]));
			const distributed = [];

			const leaderboardEntries = [];

			for (const entry of ranked) {
				const prizeAmount = prizeByRank.get(entry.rank) || 0;
				let prizeAwarded = false;

				if (prizeAmount > 0 && tournament.autoDistribute && entry.user?._id) {
					const user = await User.findById(entry.user._id).session(session);
					if (user) {
						user.balance = Number(user.balance || 0) + prizeAmount;
						await user.save({ session });
						await BalanceTransaction.create(
							[{ amount: prizeAmount, type: "sportsTournamentReward", user: user._id, state: "completed" }],
							{ session }
						);
						prizeAwarded = true;
						distributed.push({ user: user._id, rank: entry.rank, prizeAmount });
					}
				}

				leaderboardEntries.push({
					user: entry.user?._id || null,
					totalStake: entry.totalStake,
					betCount: entry.betCount,
					rank: entry.rank,
					prizeAmount,
					prizeAwarded,
				});
			}

			tournament.leaderboard = leaderboardEntries;
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

module.exports = {
	SportsTournamentError,
	getLeaderboard,
	computeLeaderboard,
	advanceTournamentStates,
	settleTournament,
};
