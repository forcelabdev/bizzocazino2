const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: Number, required: true }
}, { timestamps: true });

providerSchema.index({ status: 1 });
providerSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Provider', providerSchema);
