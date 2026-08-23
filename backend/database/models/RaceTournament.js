const mongoose = require("mongoose");

// Çevrim Turnuvası (Race): belirli sağlayıcı/kategorilerdeki çevrime göre
// puan tablosu oluşturur. Süre bitince en yüksek puanlılara `prizes`
// listesine göre otomatik veya admin onaylı ödül dağıtılır.
const prizeSchema = new mongoose.Schema(
	{
		rank: { type: Number, required: true, min: 1 },
		amount: { type: Number, required: true, min: 0 },
	},
	{ _id: false }
);

const raceTournamentSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	isActive: { type: Boolean, default: true },
	startsAt: { type: Date, default: null },
	endsAt: { type: Date, default: null },
	providers: { type: [String], default: ["all"] }, // GameProvider.code listesi veya ["all"]
	gameCategory: { type: String, enum: ["all", "slots", "liveCasino", "sportsBook", "originals"], default: "all" },
	pointsPerWager: { type: Number, required: true, min: 0.0001, default: 1 }, // 1 TL çevrime kaç puan
	prizes: { type: [prizeSchema], default: [] },
	autoDistribute: { type: Boolean, default: true },
	state: { type: String, enum: ["scheduled", "running", "completed", "canceled"], default: "scheduled" },
	note: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

raceTournamentSchema.index({ isActive: 1, state: 1, createdAt: -1 });

module.exports = mongoose.models.RaceTournament || mongoose.model("RaceTournament", raceTournamentSchema);
