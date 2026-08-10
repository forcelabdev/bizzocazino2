const express = require('express');
const router = express.Router();
const { handleTransaction } = require('../controllers/transactionController');
const { addGamesToDatabase } = require('../controllers/gameController');
const User = require('../database/models/User');

// API'den gelen callback'leri işleyen route
router.post('/gold_api', async (req, res) => {
    const { method, user_code } = req.body;

    switch (method) {
        case 'user_balance':
            try {
                const user = await User.findOne({ username: user_code });

                if (!user) {
                    return res.json({ status: 0, msg: 'User not found', user_balance: 0 });
                }

                res.json({ status: 1, msg: 'SUCCESS', user_balance: user.balance });
            } catch (error) {
                console.error('Error fetching user balance:', error);
                res.json({ status: 0, msg: 'Error fetching user balance', user_balance: 0 });
            }
            break;

        case 'transaction':
            await handleTransaction(req, res);
            break;

        default:
            res.json({ status: 0, msg: 'Invalid method' });
    }
});

// Belirli bir sağlayıcıya ait oyunları veritabanına eklemek için rota (POST)
router.post('/add-games', async (req, res) => {
    const { providerCode } = req.body;

    try {
        await addGamesToDatabase(providerCode);
        res.json({ status: 1, msg: 'Games added/updated successfully' });
    } catch (error) {
        console.error('Error adding games to database:', error);
        res.json({ status: 0, msg: 'Error adding games to database' });
    }
});

// Belirli bir sağlayıcıya ait oyunları veritabanına eklemek için rota (GET)
router.get('/add-games', async (req, res) => {
    const providerCode = req.query.providerCode;

    try {
        await addGamesToDatabase(providerCode);
        res.json({ status: 1, msg: 'Games added/updated successfully' });
    } catch (error) {
        console.error('Error adding games to database:', error);
        res.json({ status: 0, msg: 'Error adding games to database' });
    }
});

module.exports = router;
