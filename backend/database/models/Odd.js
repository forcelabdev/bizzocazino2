

const mongoose = require('mongoose');

const oddsSchema = new mongoose.Schema(
    {
        matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true }, // Maçın ID'si
        score: { type: String, required: true }, // Skor (örneğin: "1-0")
        probability: { type: Number, required: true }, // Gerçekleşme olasılığı (%)
        payout: { type: Number, required: true }, // Kazanç (%)
        createdAt: { type: Date, default: Date.now }, // Oluşturulma tarihi
        updatedAt: { type: Date, default: Date.now } // Güncellenme tarihi
    },
    { timestamps: true } // Otomatik olarak `createdAt` ve `updatedAt` alanlarını ekler
);

oddsSchema.index({ matchId: 1, createdAt: -1 });
oddsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Odds', oddsSchema);