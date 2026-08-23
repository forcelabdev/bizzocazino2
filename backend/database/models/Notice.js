const mongoose = require('mongoose');

// 🎯 Segment/koşul motoru: PromoCode.conditions ile AYNI şema (bkz.
// backend/utils/promoConditionEngine.js). Notice.audience.type === "segment"
// olduğunda bu koşulların TÜMÜ (AND) karşılanan kullanıcılar hedeflenir.
const ConditionSchema = new mongoose.Schema(
    {
        metric: {
            type: String,
            enum: ["deposit", "withdraw", "membershipAgeDays", "depositSinceDate"],
            required: true,
        },
        operator: {
            type: String,
            enum: ["gte", "lte", "eq", "gt", "lt"],
            required: true,
        },
        value: { type: Number, required: true },
        dateFrom: { type: Date, default: null },
        dateTo: { type: Date, default: null },
    },
    { _id: false },
);

// 🎯 Ayrı bir alt şema olarak tanımlanmalı: Mongoose, iç içe bir objede
// doğrudan "type" adında bir alan görürse (audience: { type: {...}, ... })
// bunu üst alanın TİP bildirimi olarak yorumlar ve şemayı bozar. Bu yüzden
// "audienceType" iç alan adı yerine ayrı bir alt şema kullanıyoruz.
const AudienceSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["all", "online", "offline", "segment"],
            default: "all",
        },
        conditions: { type: [ConditionSchema], default: [] },
    },
    { _id: false },
);

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
    // 🎯 Hedef kitle: Tümü / Online / Offline / Segment koşulları.
    // recipientId doluysa (tekil hedefleme) audience yok sayılır.
    audience: { type: AudienceSchema, default: () => ({ type: "all", conditions: [] }) },
    // Gönderim anında hesaplanıp SAKLANAN hedef kullanıcı listesi (audience
    // "online"/"offline"/"segment" için). Boş = "all" (herkes) demektir.
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Kullanıcı bazında okundu takibi (public API üzerinden işaretlenir).
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

NoticeSchema.index({ createdAt: -1 });
NoticeSchema.index({ recipientId: 1, createdAt: -1 });
NoticeSchema.index({ recipients: 1, createdAt: -1 });

module.exports = mongoose.models.Notice || mongoose.model('Notice', NoticeSchema);
