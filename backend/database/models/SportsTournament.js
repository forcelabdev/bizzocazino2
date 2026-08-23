const mongoose = require("mongoose");

// Spor Turnuvası (Manuel): belirli bir tarih aralığında, tanımlı minimum
// oran (minOdds) ve minimum bet tutarı (minBetAmount) şartını karşılayan
// spor bahislerinin (SportsBet) toplam stake'ine göre sıralama oluşturur.
// Race Tournament'tan farklı olarak puan biriktirme yerine leaderboard,
// süre boyunca doğrudan SportsBet koleksiyonundan canlı hesaplanır.
const prizeSchema = new mongoose.Schema(
	{
		rank: { type: Number, required: true, min: 1 },
		amount: { type: Number, required: true, min: 0 },
	},
	{ _id: false }
);

const sportsTournamentSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	description: { type: String, default: "" },
	isActive: { type: Boolean, default: true },
	startsAt: { type: Date, default: null },
	endsAt: { type: Date, default: null },

	// Şartlar
	minOdds: { type: Number, required: true, min: 1, default: 1.5 }, // min toplam oran (totalOdds)
	minBetAmount: { type: Number, required: true, min: 0, default: 0 }, // min bilet tutarı (amount)

	// Ödüller
	prizes: { type: [prizeSchema], default: [] },
	prizePoolDescription: { type: String, default: "" },
	autoDistribute: { type: Boolean, default: true },

	state: { type: String, enum: ["scheduled", "running", "completed", "canceled"], default: "scheduled" },

	// Sonuçlandığında hesaplanan sıralama burada saklanır (cache/arşiv amaçlı)
	leaderboard: {
		type: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
				totalStake: { type: Number, default: 0 },
				betCount: { type: Number, default: 0 },
				rank: { type: Number, default: 0 },
				prizeAmount: { type: Number, default: 0 },
				prizeAwarded: { type: Boolean, default: false },
			},
		],
		default: [],
	},

	note: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

sportsTournamentSchema.index({ isActive: 1, state: 1, createdAt: -1 });

module.exports = mongoose.models.SportsTournament || mongoose.model("SportsTournament", sportsTournamentSchema);
