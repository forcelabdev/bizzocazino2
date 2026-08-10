const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
    {
        team1: { type: String, required: true }, // Takım 1
        team1Logo: { type: String, required: true }, // Takım 1'in logosu (URL veya dosya yolu)
        team2: { type: String, required: true }, // Takım 2
        team2Logo: { type: String, required: true }, // Takım 2'nin logosu (URL veya dosya yolu)
        date: { type: Date, required: true }, // Maç tarihi ve saati
        score1: { type: Number, default: 0 }, // Takım 1'in skoru
        score2: { type: Number, default: 0 }, // Takım 2'nin skoru
        status: { type: String, enum: ['Upcoming', 'Live', 'Finished'], default: 'Upcoming' }, // Maç durumu
        result: { type: String }, // Maç sonucu (örneğin: "Takım A kazandı", "Berabere")
        team1Strength: { type: Number, default: 5 }, // Takım 1'in güç puanı (1-10 arası)
        team2Strength: { type: Number, default: 5 }, // Takım 2'nin güç puanı (1-10 arası)
        createdAt: { type: Date, default: Date.now }, // Oluşturulma tarihi
        updatedAt: { type: Date, default: Date.now } // Güncellenme tarihi
    },
    { timestamps: true } // Otomatik olarak `createdAt` ve `updatedAt` alanlarını ekler
);

matchSchema.index({ createdAt: -1 });
matchSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Match', matchSchema);