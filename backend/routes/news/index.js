const express = require('express');
const multer = require('multer');
const path = require('path');
const News = require('../../database/models/News');
const { authenticateAdmin } = require('../../middleware/permission');

const router = express.Router();

// Multer ayarı (resimleri 'uploads' klasörüne yüklemek için)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// ⚠️ GÜVENLİK: Dosya tipi kontrolü
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
};

const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter 
});

// Haber ekleme - ⚠️ GÜVENLİK: Sadece admin
router.post('/add', authenticateAdmin, upload.single('img'), async (req, res) => {
    try {
        const { title, subtitle, content } = req.body;
        const img = req.file ? `/uploads/${req.file.filename}` : '';

        const newNews = new News({ title, subtitle, img, content });
        await newNews.save();
        res.status(201).json(newNews);
    } catch (error) {
        console.error('Error creating news:', error.message);
        res.status(500).json({ success: false, message: 'Error creating news' });
    }
});

// Haber listeleme (public)
router.get('/', async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.status(200).json(news);
    } catch (error) {
        console.error('Error fetching news:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching news' });
    }
});

// Haber düzenleme - ⚠️ GÜVENLİK: Sadece admin
router.put('/:id', authenticateAdmin, upload.single('img'), async (req, res) => {
    try {
        const { title, subtitle, content } = req.body;
        const img = req.file ? `/uploads/${req.file.filename}` : req.body.img;

        const updatedNews = await News.findByIdAndUpdate(req.params.id, {
            title, subtitle, img, content
        }, { new: true });

        res.status(200).json(updatedNews);
    } catch (error) {
        console.error('Error updating news:', error.message);
        res.status(500).json({ success: false, message: 'Error updating news' });
    }
});

// Haber silme - ⚠️ GÜVENLİK: Sadece admin
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'News deleted successfully' });
    } catch (error) {
        console.error('Error deleting news:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting news' });
    }
});

module.exports = router;
