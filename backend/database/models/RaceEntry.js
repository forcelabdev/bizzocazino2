const mongoose = require("mongoose");

// Bir turnuvadaki tek katılımcı satırı. `user` gerçek üye içindir;
// admin isterse `isManual: true` + `displayName` ile "sanal" bir katılımcı
// ekleyip `manualGrowthRate` katsayısıyla puanını periyodik olarak otomatik artırabilir.
const raceEntrySchema = new mongoose.Schema({
	tournament: { type: mongoose.Schema.Types.ObjectId, ref: "RaceTournament", required: true },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
	displayName: { type: String, default: "" }, // manuel/sanal katılımcı adı
	points: { type: Number, default: 0 },
	isManual: { type: Boolean, default: false },
	manualGrowthRate: { type: Number, default: 0 }, // dakikada eklenecek puan (yalnızca isManual)
	lastAutoIncrementAt: { type: Date, default: null },
	prizeAmount: { type: Number, default: 0 },
	prizeAwarded: { type: Boolean, default: false },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

raceEntrySchema.index({ tournament: 1, points: -1 });
raceEntrySchema.index({ tournament: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: "objectId" } } });

module.exports = mongoose.models.RaceEntry || mongoose.model("RaceEntry", raceEntrySchema);
