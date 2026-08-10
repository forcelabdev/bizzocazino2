const mongoose = require('mongoose');

const AdminNotificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['withdraw', 'new_user', 'sanction'],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    link: {
        type: String,
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    readBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

AdminNotificationSchema.index({ createdAt: -1 });
AdminNotificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNotification', AdminNotificationSchema);
