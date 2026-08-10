const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  img: { type: String, required: true },
  games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Games' }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

CategorySchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

CategorySchema.index({ created_at: -1 });

module.exports = mongoose.model('Category', CategorySchema);
