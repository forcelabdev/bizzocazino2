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
			default: null,
		},
		agentBalanceInitial: {
			type: Number,
			default: 0,
			min: 0,
		},
		bonusBalanceOriginAt: {
			type: Date,
			default: null,
		},
		bonusBalanceInitial: {
			type: Number,
			default: 0,
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
