const mongoose = require("mongoose");

/**
 * Bakiye Analizi ekranındaki "Kalan Agent Bakiyesi" ve "Kalan Bonus Bakiyesi"
 * kutucukları için tekil (singleton) ayar dokümanı.
 *
 * Mantık: belirlenen bir başlangıç tarihinden (origin) itibaren gerçekleşen
 * deposit / bonus toplamı, başlangıç tutarından (initial) düşülerek
 * "kalan bakiye" hesaplanır. Admin bu tarih ve tutarları panelden girer.
 */
const balanceAnalysisSettingSchema = new mongoose.Schema(
	{
		agentBalanceOriginAt: {
			type: Date,
			// 2026-08-04T15:20:00.000Z (UTC) → 04.08.2026 18:20 (TR)
			default: () => new Date("2026-08-04T15:20:00.000Z"),
		},
		agentBalanceInitial: {
			type: Number,
			// 1.010.000 + 1.197.200 = 2.207.200
			default: 2207200,
			min: 0,
		},
		bonusBalanceOriginAt: {
			type: Date,
			// 2026-07-30T21:00:00.000Z (UTC) → 31.07.2026 00:00 (TR)
			default: () => new Date("2026-07-30T21:00:00.000Z"),
		},
		bonusBalanceInitial: {
			type: Number,
			// 2.600.000 + 1.197.200 = 3.797.200
			default: 3797200,
			min: 0,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
	},
	{ timestamps: true },
);

module.exports = mongoose.model(
	"BalanceAnalysisSetting",
	balanceAnalysisSettingSchema,
);
