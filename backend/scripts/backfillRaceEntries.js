/**
 * Bir kerelik geriye dönük düzeltme scripti.
 *
 * Sorun: raceService.recordWagerForRaces() hook'u, bahis production sunucusu
 * üzerinden geçtiği için (bu sandbox'ta değil) henüz devreye girmemiş
 * kod sürümüyle çalıştı ve "test" turnuvası için hiç RaceEntry oluşmadı.
 *
 * Bu script, turnuvanın gerçekte oluşturulduğu andan (createdAt) itibaren
 * yapılmış tüm "bet" işlemlerini tarar ve turnuvanın kapsamına (providers/
 * gameCategory) uyanları RaceEntry.points'e ekler — recordWagerForRaces ile
 * aynı puanlama mantığını (wagerAmount * pointsPerWager) kullanır.
 *
 * Kullanım: node scripts/backfillRaceEntries.js <tournamentId>
 */
const mongoose = require("mongoose");
const RaceTournament = require("../database/models/RaceTournament");
const RaceEntry = require("../database/models/RaceEntry");
const Transaction = require("../database/models/Transaction");

const run = async () => {
	const tournamentId = process.argv[2];
	if (!tournamentId) {
		console.error("Kullanım: node scripts/backfillRaceEntries.js <tournamentId>");
		process.exit(1);
	}

	await mongoose.connect(process.env.DATABASE_URI);

	const tournament = await RaceTournament.findById(tournamentId).lean();
	if (!tournament) {
		console.error("Turnuva bulunamadı:", tournamentId);
		process.exit(1);
	}

	console.log(`Turnuva: "${tournament.name}" | oluşturulma: ${tournament.createdAt.toISOString()}`);
	console.log(`Kapsam: providers=${JSON.stringify(tournament.providers)} gameCategory=${tournament.gameCategory} pointsPerWager=${tournament.pointsPerWager}`);

	const matchStage = {
		txn_type: "bet",
		created_at: { $gte: tournament.createdAt },
	};
	// Kapsam "all" değilse sağlayıcıya göre filtrele (gameCategory eşlemesi
	// Transaction'da tutarlı bir alan olmadığı için sadece provider bazlı
	// daraltma yapılır; "all" kapsamlı turnuvalarda ek filtre gerekmez).
	if (!tournament.providers?.includes("all") && tournament.providers?.length) {
		matchStage.provider_code = { $in: tournament.providers };
	}

	const agg = await Transaction.aggregate([
		{ $match: matchStage },
		{ $group: { _id: "$user_code", totalWagered: { $sum: "$bet_money" }, betCount: { $sum: 1 } } },
	]);

	console.log(`${agg.length} kullanıcı için bahis bulundu.`);

	let updated = 0;
	for (const row of agg) {
		const userId = row._id;
		if (!mongoose.Types.ObjectId.isValid(userId)) continue;
		const pointsToAdd = Number(row.totalWagered || 0) * Number(tournament.pointsPerWager || 1);
		if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) continue;

		await RaceEntry.findOneAndUpdate(
			{ tournament: tournament._id, user: userId },
			{ $inc: { points: pointsToAdd }, $set: { updatedAt: new Date() }, $setOnInsert: { isManual: false } },
			{ upsert: true, new: true }
		);
		updated += 1;
		console.log(`  user ${userId}: +${pointsToAdd.toFixed(2)} puan (${row.betCount} bahis, toplam ${row.totalWagered.toFixed(2)} TL)`);
	}

	console.log(`Tamamlandı. ${updated} RaceEntry güncellendi/oluşturuldu.`);
	process.exit(0);
};

run().catch((err) => {
	console.error("Backfill hatası:", err);
	process.exit(1);
});
