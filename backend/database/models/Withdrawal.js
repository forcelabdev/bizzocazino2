const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    fullname: { type: String, required: true },
    method: { type: String, enum: ['papara', 'bank-transfer', 'payfix'], required: true }, // Çekim yöntemi
    amount: { type: Number, required: true },
    details: {
        account: { type: String }, // Papara veya Payfix hesap numarası
        iban: { type: String }, // Banka IBAN
        bankId: { type: Number }, // Banka ID
        identity: { type: String }, // TC Kimlik Numarası
        birthDate: { type: String } // Doğum tarihi
    },
    trx: { type: String, required: true }, // Benzersiz işlem kimliği
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // Talep durumu
    reason: { type: String }, // Reddedilme nedeni
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

withdrawalSchema.index({ user: 1 });
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ trx: 1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
