// models/BannerModel.js
const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    imageUrl: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: false,
    },
    position: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['both', 'mobile', 'desktop'],
      default: 'both',
    },
    title: {
      type: String,
      required: false, // Banner başlığı
    },
    subtitle: {
      type: String,
      required: false, // Banner alt başlığı
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

BannerSchema.index({ position: 1, type: 1, createdAt: -1 });
BannerSchema.index({ createdAt: -1 });
  

const Banner = mongoose.model('Banner', BannerSchema);

module.exports = Banner;
