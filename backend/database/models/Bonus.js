const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Bonus başlığı
    description: { type: String, required: true }, // Bonus açıklaması
    modalDescription: { type: String }, // Modal açıklaması
    bonusType: { type: String, enum: ['welcome', 'free_spins', 'cashback', 'free_bet', 'crypto_deposit'], required: true }, // Bonus türü
    percentage: { type: Number, required: true }, // Bonus miktarı yüzdelik olarak
    img: { type: String }, // Bonus resmi URL'si
    createdAt: { type: Date, default: Date.now }
});

bonusSchema.index({ bonusType: 1, createdAt: -1 });
bonusSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bonus', bonusSchema);
