const mongoose = require("mongoose");

/**
 * SportsBet Model - Spor bahis kuponları
 * WebSpor/Betcolabs entegrasyonu için kupon kayıtları
 */
const sportsBetSchema = new mongoose.Schema(
	{
		// Kullanıcı bilgileri
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		userNumericId: {
			type: Number,
			required: true,
		},

		// Provider bilgileri
		provider: {
			type: String,
			enum: ["betcolabs", "webspor", "nexusggr"],
			default: "betcolabs",
		},

		// WebSpor/Betcolabs tarafındaki ID'ler
		externalBetId: {
			type: String,
		},
		externalCouponId: {
			type: String,
			required: true,
		},

		// Bahis detayları
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		totalOdds: {
			type: Number,
			required: true,
			default: 1,
		},
		potentialWin: {
			type: Number,
			required: true,
			default: 0,
		},
		actualWin: {
			type: Number,
			default: 0,
		},

		// Kupon durumu
		status: {
			type: String,
			enum: ["pending", "won", "lost", "cancelled", "cashout"],
			default: "pending",
		},

		// Bakiye bilgileri
		balanceBefore: {
			type: Number,
			required: true,
		},
		balanceAfter: {
			type: Number,
			required: true,
		},

		// Kazanç/kayıp işlendikten sonraki bakiye
		settlementBalanceBefore: {
			type: Number,
		},
		settlementBalanceAfter: {
			type: Number,
		},

		// Komisyon bilgileri
		rakeback: {
			type: Number,
			default: 0,
		},
		affiliateCommission: {
			type: Number,
			default: 0,
		},

		// Kupon tipi
		betType: {
			type: String,
			enum: ["single", "multiple", "system"],
			default: "single",
		},

		// Maç sayısı
		eventCount: {
			type: Number,
			default: 1,
		},

		// Canlı bahis mi?
		isLive: {
			type: Boolean,
			default: false,
		},

		// IP adresi
		ipAddress: {
			type: String,
		},

		// Settlement tarihi
		settledAt: {
			type: Date,
		},

		// WebSpor'dan gelen timestamp
		externalTimestamp: {
			type: String,
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

// Compound index for duplicate check
sportsBetSchema.index(
	{ provider: 1, externalCouponId: 1 },
	{ unique: true }
);

// Index for user history queries
sportsBetSchema.index({ user: 1, createdAt: -1 });
sportsBetSchema.index({ user: 1, status: 1, createdAt: -1 });

sportsBetSchema.index({ user: 1 });
sportsBetSchema.index({ status: 1 });

module.exports = mongoose.model("SportsBet", sportsBetSchema);
