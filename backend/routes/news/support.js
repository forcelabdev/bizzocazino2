const express = require('express');
const router = express.Router();
const CustomerService = require('../../database/models/CustomerService');
const { authenticateAdmin } = require('../../middleware/permission');

// Get all customer services (public)
router.get('/', async (req, res) => {
  try {
    const services = await CustomerService.find();
    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching customer services:', error.message);
    res.status(500).json({ success: false, message: 'Error fetching customer services' });
  }
});

// Add a new customer service - ⚠️ GÜVENLİK: Sadece admin
router.post('/add', authenticateAdmin, async (req, res) => {
  const { title, link, type } = req.body;

  if (!title || !link || !type) {
    return res.status(400).json({ message: 'Title, link, and type are required' });
  }

  try {
    const newService = new CustomerService({
      title,
      link,
      type,
    });

    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    console.error('Error adding customer service:', error.message);
    res.status(500).json({ success: false, message: 'Error adding customer service' });
  }
});

// Update an existing customer service - ⚠️ GÜVENLİK: Sadece admin
router.put('/:id', authenticateAdmin, async (req, res) => {
  const { title, link, type } = req.body;

  try {
    const updatedService = await CustomerService.findByIdAndUpdate(
      req.params.id,
      { title, link, type },
      { new: true }
    );
    if (!updatedService) {
      return res.status(404).json({ message: 'Customer service not found' });
    }

    res.status(200).json(updatedService);
  } catch (error) {
    res.status(500).json({ message: 'Error updating customer service', error });
  }
});

// Delete a customer service - ⚠️ GÜVENLİK: Sadece admin
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const deletedService = await CustomerService.findByIdAndDelete(req.params.id);
    if (!deletedService) {
      return res.status(404).json({ message: 'Customer service not found' });
    }

    res.status(200).json({ message: 'Customer service deleted' });
  } catch (error) {
    console.error('Error deleting customer service:', error.message);
    res.status(500).json({ success: false, message: 'Error deleting customer service' });
  }
});

module.exports = router;
