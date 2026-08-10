const mongoose = require('mongoose');

const filterPhraseSchema = new mongoose.Schema({
    phrase: { type: String },
    createdAt: { type: Date, default: Date.now }
});

filterPhraseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FilterPhrase',  filterPhraseSchema);
