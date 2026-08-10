const User = require('../database/models/User');
const { launchGame } = require('../utils/api/apiHelper');

async function handleTransaction(req, res) {
    const transactionData = req.body;
    const userCode = transactionData.user_code;
    const betAmount = transactionData.slot.bet_money;
    const winAmount = transactionData.slot.win_money;

    try {
        const user = await User.findOne({ username: userCode });

        if (!user) {
            return res.json({ status: 0, msg: 'User not found' });
        }

        // Kullanıcının bakiyesini güncelle
        user.balance = user.balance - betAmount + winAmount;

        // Kullanıcının istatistiklerini güncelle
        user.stats.bet += betAmount;
        user.stats.won += winAmount;
        await user.save();

        return res.json({ status: 1, user_balance: user.balance });
    } catch (error) {
        console.error('Error handling transaction:', error);
        return res.json({ status: 0, msg: 'Transaction error' });
    }
}

module.exports = {
    handleTransaction
};
