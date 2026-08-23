const mongoose = require("mongoose");

// 🎰 Admin panelinden verilen freespin (bedava tur) kayıtlarını tutar.
// Betinovi "ApplyFreeRound" metodu bir grant/liste döndürmez; bu koleksiyon
// admin panelinde "bugün verilen freespin" gibi raporlama için tutulan
// yerel bir defterdir (provider'daki gerçek kullanım durumundan bağımsızdır).
const freeSpinGrantSchema = new mongoose.Schema({
	targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	actorUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	vendorCode: { type: String, required: true },
	gameCode: { type: String, required: true },
	currencyCode: { type: String, default: "TRY" },
	betAmount: { type: Number, required: true },
	spinCount: { type: Number, required: true },
	expireHours: { type: Number, required: true },
	expiresAt: { type: Date, required: true },
	providerResponse: { type: Object },
	createdAt: { type: Date, default: Date.now },
});

freeSpinGrantSchema.index({ targetUser: 1, createdAt: -1 });
freeSpinGrantSchema.index({ createdAt: -1 });
freeSpinGrantSchema.index({ targetUser: 1, gameCode: 1, createdAt: 1, expiresAt: 1 });

module.exports = mongoose.model("FreeSpinGrant", freeSpinGrantSchema);
