const mongoose = require("mongoose");

const FuturesBetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ değiştirildi
    symbol: { type: String, required: true },
    amount: { type: Number, required: true },
    leverage: { type: Number, required: true },
    entryPrice: { type: Number, required: true },
    direction: { type: String, enum: ["LONG", "SHORT"], required: true },
    stopLossPercent: { type: Number, default: null },
    takeProfitPercent: { type: Number, default: null },
    liqPrice: { type: Number }, 
    fiatCurrency: { type: String, default: "USDT" },
    wallet: { type: String, default: "default" },
    status: {
      type: String,
      enum: ["open", "closed", "liquidated"],
      default: "open",
    },
    exitPrice: { type: Number, default: null },
    pnl: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FuturesBetSchema.index({ user: 1 });
FuturesBetSchema.index({ status: 1 });
FuturesBetSchema.index({ symbol: 1, status: 1 });
FuturesBetSchema.index({ user: 1, status: 1 });
FuturesBetSchema.index({ createdAt: -1 });

module.exports = mongoose.model("FuturesBet", FuturesBetSchema);
