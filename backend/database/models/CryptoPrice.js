const mongoose = require('mongoose');

const cryptoPriceSchema = new mongoose.Schema({
    name: { type: String },
    price: { type: Number },
    fee: { type: Number },
});

cryptoPriceSchema.index({ type: 1 });

module.exports = mongoose.model('CryptoPrice',  cryptoPriceSchema);
