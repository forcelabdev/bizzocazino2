const express = require('express');
const router = express.Router();
const News = require('../../database/models/News');

// Yeni haber ekleme
router.post('/add', async (req, res) => {
    const { img, title, subtitle, content } = req.body;

    if (!img || !title || !content) {
        return res.status(400).json({ message: 'Image, title, and content are required' });
    }

    try {
        const newNews = new News({ img, title, subtitle, content });
        await newNews.save();
        res.status(201).json({ message: 'News added successfully', news: newNews });
    } catch (error) {
        res.status(500).json({ message: 'Error adding news', error });
    }
});

// Tüm haberleri listeleme
router.get('/', async (req, res) => {
    try {
        const newsList = await News.find().sort({ createdAt: -1 }); // En son eklenenleri önce getir
        res.status(200).json(newsList);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching news', error });
    }
});

// Haber detaylarını getirme
router.get('/:id', async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.status(200).json(news);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching news', error });
    }
});

// Haberi güncelleme
router.put('/:id', async (req, res) => {
    const { img, title, subtitle, content } = req.body;

    try {
        const updatedNews = await News.findByIdAndUpdate(
            req.params.id, 
            { img, title, subtitle, content },
            { new: true }
        );
        if (!updatedNews) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.status(200).json({ message: 'News updated successfully', news: updatedNews });
    } catch (error) {
        res.status(500).json({ message: 'Error updating news', error });
    }
});

// Haberi silme
router.delete('/:id', async (req, res) => {
    try {
        const deletedNews = await News.findByIdAndDelete(req.params.id);
        if (!deletedNews) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.status(200).json({ message: 'News deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting news', error });
    }
});

module.exports = router;
