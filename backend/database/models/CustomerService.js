const mongoose = require('mongoose');

const customerServiceSchema = new mongoose.Schema({
    platform: { type: String, required: true }, // Platform (Telegram, WhatsApp, vb.)
    title: { type: String, required: true }, // Müşteri hizmetleri başlığı
    link: { type: String, required: true }, // Bağlantı adresi
    workingHours: { type: String, required: true }, // Çalışma saatleri (Örn: "09:00 - 18:00")
});

customerServiceSchema.index({ type: 1 });

module.exports = mongoose.model('CustomerService', customerServiceSchema);
