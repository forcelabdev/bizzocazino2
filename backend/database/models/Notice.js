const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    image: { type: String },
    message: {
        type: String,
        required: true,
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Kullanıcı modelinin referansı
        required: false, // Toplu bildirimler için gereksiz
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

NoticeSchema.index({ createdAt: -1 });
NoticeSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notice', NoticeSchema);
