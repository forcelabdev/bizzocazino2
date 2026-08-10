const mongoose = require('mongoose');

const DrakonProviderSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            required: true, // 1: aktif, 0: pasif
        },
        rtp: {
            type: Number, // Return to Player değeri
        },
        created_at: {
            type: Date,
            required: true,
        },
        updated_at: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true } // Otomatik olarak `createdAt` ve `updatedAt` alanları ekler
);

DrakonProviderSchema.index({ id: 1 }, { unique: true });
DrakonProviderSchema.index({ code: 1 });
DrakonProviderSchema.index({ status: 1, updated_at: -1 });

module.exports = mongoose.model('DrakonProvider', DrakonProviderSchema);
