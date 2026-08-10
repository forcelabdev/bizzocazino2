const mongoose = require("mongoose");

/**
 * SportsBetEvent Model - Kupon içindeki maç/market detayları
 * Her bir kuponun içerdiği maçlar ve seçimler
 */
const sportsBetEventSchema = new mongoose.Schema(
	{
		// İlişkili kupon
		bet: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "SportsBet",
			required: true,
		},

		// Kullanıcı (hızlı sorgular için)
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		// WebSpor/Betcolabs event ID'leri
		externalEventId: {
			type: String,
			required: true,
		},
		externalGameId: {
			type: String,
		},

		// Maç bilgileri
		matchTitle: {
			type: String,
			// "Galatasaray - Fenerbahçe"
		},
		homeTeam: {
			type: String,
		},
		awayTeam: {
			type: String,
		},

		// Spor/Lig bilgileri
		sportType: {
			type: String,
			// "football", "basketball", "tennis" vs.
		},
		leagueName: {
			type: String,
		},
		countryCode: {
			type: String,
		},

		// Market bilgileri
		marketType: {
			type: String,
			// "P1XP2", "OverUnder", "BTTS" vs.
		},
		marketName: {
			type: String,
			// "Maç Sonucu", "Toplam Goller", "Karşılıklı Gol" vs.
		},

		// Seçim bilgileri
		pick: {
			type: String,
			// "W1", "X", "W2", "Over", "Under", "Yes", "No" vs.
		},
		displayText: {
			type: String,
			// "Galatasaray", "Beraberlik", "2.5 Üst" vs.
		},

		// Oran
		odds: {
			type: Number,
			required: true,
			default: 1,
		},

		// Event durumu
		status: {
			type: String,
			enum: ["pending", "won", "lost", "cancelled", "void", "postponed"],
			default: "pending",
		},

		// Maç başlangıç zamanı (unix timestamp)
		startTimestamp: {
			type: Number,
		},
		startDate: {
			type: Date,
		},

		// Canlı bahis mi?
		isLive: {
			type: Boolean,
			default: false,
		},

		// Maç skoru (settle olduktan sonra)
		homeScore: {
			type: Number,
		},
		awayScore: {
			type: Number,
		},
		finalScore: {
			type: String,
			// "3-1" formatında
		},

		// Ekstra veriler
		extra: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
	}
);

// Index for bet events lookup
sportsBetEventSchema.index({ bet: 1, status: 1 });

// Index for match-based queries
sportsBetEventSchema.index({ externalEventId: 1, status: 1 });

// Index for user history
sportsBetEventSchema.index({ user: 1, createdAt: -1 });
sportsBetEventSchema.index({ startDate: 1, status: 1 });
sportsBetEventSchema.index({ bet: 1, createdAt: 1 });

module.exports = mongoose.model("SportsBetEvent", sportsBetEventSchema);
