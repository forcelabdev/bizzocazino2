const express = require('express');
const router = express.Router();
const Notice = require('../../database/models/Notice'); // Notice modelinizi doğru bir şekilde içe aktarın
const User = require('../../database/models/User'); // User modelinizi doğru bir şekilde içe aktarın
const { authenticateAdmin } = require('../../middleware/permission');


// Kullanıcıya özel ve genel bildirimleri getirme
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // console.log('Fetching notifications for userId:', userId);

        const notifications = await Notice.find({
            $or: [
                { recipientId: userId },  // Kullanıcıya özel bildirimler
                { recipientId: null }     // Genel bildirimler
            ]
        }).sort({ createdAt: -1 });

        // console.log('Found notifications:', notifications);

        if (!notifications || notifications.length === 0) {
            return res.status(200).json([]);  // Bildirim yoksa boş dizi döndür
        }

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error.stack || error.message || error);
        res.status(500).json({ message: 'Error fetching notifications', error: error.stack || error.message || error });
    }
});

    // Bireysel bildirim gönderme - ⚠️ GÜVENLİK: Sadece admin
    router.post('/individual', authenticateAdmin, async (req, res) => {
        const { title, message, recipientId } = req.body; // recipientId burada alınacak

        if (!title || !message || !recipientId) {
            return res.status(400).json({ message: 'Title, message, and recipientId are required' });
        }

        try {
            const notice = new Notice({ title, message, recipientId });
            await notice.save();

            res.status(201).json(notice);
        } catch (error) {
            console.error('Error creating notice:', error);
            res.status(500).json({ success: false, message: 'Error creating notice' });
        }
    });

    // Toplu bildirim gönderme - ⚠️ GÜVENLİK: Sadece admin
    router.post('/bulk', authenticateAdmin, async (req, res) => {
        const { title, message } = req.body; // sadece title ve message burada alınacak

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        try {
            // Tüm kullanıcıları al
            const users = await User.find({}, '_id');
            const recipientIds = users.map(user => user._id); // Kullanıcı ID'lerini al

            // Tüm kullanıcılara bildirim gönder
            const notices = await Promise.all(recipientIds.map(async (recipientId) => {
                const notice = new Notice({ title, message, recipientId });
                return await notice.save();
            }));

            res.status(201).json(notices);
        } catch (error) {
            console.error('Error creating bulk notices:', error);
            res.status(500).json({ message: 'Error creating bulk notices', error });
        }
    });


    // Tüm kullanıcıları çekme - ⚠️ GÜVENLİK: Sadece admin erişebilir, hassas veriler gizli
    router.get('/users', authenticateAdmin, async (req, res) => {
        try {
            const users = await User.find({}, '_id username local.email'); // Sadece gerekli alanlar
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Error fetching users', error });
        }
    });

    module.exports = router;
