const mongoose = require('mongoose');

const affiliateRaffleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, unique: true, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  expiresAt: { type: Date, required: true },
  maxParticipants: { type: Number, default: 100 }, 
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  state: { type: String, enum: ['open', 'closed', 'completed'], default: 'open' }
}, { timestamps: true });

affiliateRaffleSchema.index({ state: 1 });
affiliateRaffleSchema.index({ code: 1, state: 1 });
affiliateRaffleSchema.index({ owner: 1, state: 1 });

module.exports = mongoose.model('AffiliateRaffle', affiliateRaffleSchema);
