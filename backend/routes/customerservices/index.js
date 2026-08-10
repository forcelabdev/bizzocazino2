const express = require('express');
const router = express.Router();
const CustomerService = require('../../database/models/CustomerService');
const { authenticateAdmin } = require('../../middleware/permission');

// Müşteri hizmetlerini listeleme (public)
router.get('/', async (req, res) => {
    try {
        const services = await CustomerService.find();
        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching customer services:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching customer services' });
    }
});

// Yeni müşteri hizmeti ekleme - ⚠️ GÜVENLİK: Sadece admin
router.post('/add', authenticateAdmin, async (req, res) => {
    try {
        const { platform, title, link, workingHours } = req.body;

        if (!platform || !title || !link || !workingHours) {
            return res.status(400).json({ message: 'Platform, title, link, and working hours are required' });
        }

        const newService = new CustomerService({ platform, title, link, workingHours });
        await newService.save();
        res.status(201).json(newService);
    } catch (error) {
        console.error('Error adding customer service:', error.message);
        res.status(500).json({ success: false, message: 'Error adding customer service' });
    }
});

// Müşteri hizmeti düzenleme - ⚠️ GÜVENLİK: Sadece admin
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { platform, title, link, workingHours } = req.body;

        const updatedService = await CustomerService.findByIdAndUpdate(
            req.params.id,
            { platform, title, link, workingHours },
            { new: true }
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'Customer service not found' });
        }

        res.status(200).json(updatedService);
    } catch (error) {
        console.error('Error updating customer service:', error.message);
        res.status(500).json({ success: false, message: 'Error updating customer service' });
    }
});

// Müşteri hizmetini silme - ⚠️ GÜVENLİK: Sadece admin
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const service = await CustomerService.findByIdAndDelete(req.params.id);

        if (!service) {
            return res.status(404).json({ message: 'Customer service not found' });
        }

        res.status(200).json({ message: 'Customer service deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer service:', error.message);
        res.status(500).json({ success: false, message: 'Error deleting customer service' });
    }
});

module.exports = router;
