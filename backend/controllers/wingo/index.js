const WingoGame = require('../../database/models/WingoGame');
const WingoBet = require('../../database/models/WingoBet');
const User = require('../../database/models/User');
const mongoose = require('mongoose');

const { generalUserGetRakeback } = require('../../utils/general/user');
const { getActiveWalletIndex } = require('../../utils/wallet');

// Toplam kazanma/kaybetme hesapla
const calculateWinLossStats = async (userId) => {
  const bets = await WingoBet.find({ user: userId });

  let totalBetAmount = 0;
  let totalPayout = 0;

  bets.forEach(bet => {
    totalBetAmount += bet.amount;
    totalPayout += bet.payout || 0;
  });

  return {
    totalBetAmount,
    totalPayout,
    profitOrLoss: totalPayout - totalBetAmount
  };
};

// Chart için günlük bazlı kazanç/kayıp
const getDailyStats = async (userId) => {
  const pipeline = [
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalBet: { $sum: "$amount" },
        totalPayout: { $sum: "$payout" }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await WingoBet.aggregate(pipeline);

  return results.map(r => ({
    date: r._id,
    totalBet: r.totalBet,
    totalPayout: r.totalPayout,
    profitOrLoss: r.totalPayout - r.totalBet
  }));
};

module.exports = {
  // ✅ Kullanıcı bahis gönderdiğinde rakeback işle
  async placeBet(req, res) {
    try {
      const userId = req.user._id;
      const { amount, roundId, choice } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Geçersiz miktar.' });
      }

      // Kullanıcıyı çek
      const freshUser = await User.findById(userId).select('wallets currency rakeback xp limits').lean();
      if (!freshUser) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

      // Aktif cüzdan bul
      const walletIndex = getActiveWalletIndex(freshUser);
      if (walletIndex === -1) return res.status(400).json({ success: false, message: 'Cüzdan bulunamadı' });

      if (freshUser.wallets[walletIndex].balance < amount) {
        return res.status(400).json({ success: false, message: 'Yetersiz bakiye' });
      }

      // ✅ Kullanıcı rakeback oranı
      const rakeback = generalUserGetRakeback(freshUser);

      // ✅ Rakeback tutarını hesapla
      const amountRakeback = freshUser.limits.blockSponsor !== true
        ? parseFloat((amount * rakeback.percentage).toFixed(2))
        : 0;

      // Bahsi kaydet
      const bet = await WingoBet.create({
        user: userId,
        roundId,
        choice,
        amount,
        wallet: freshUser.wallets[walletIndex]._id
      });

      // Kullanıcı güncelle (bakiye düş, rakeback ekle)
      await User.findOneAndUpdate(
        { _id: userId, [`wallets.${walletIndex}.balance`]: { $gte: amount } },
        {
          $inc: {
            [`wallets.${walletIndex}.balance`]: -amount,
            xp: Math.floor(amount), // XP hesaplama burada farklı olabilir
            'stats.bet': amount,
            'rakeback.earned': amountRakeback,
            'rakeback.available': amountRakeback
          },
          updatedAt: new Date().getTime()
        }
      );

      res.json({ success: true, bet, rakeback: amountRakeback });
    } catch (err) {
      console.error('[WINGO PLACE BET]', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Kullanıcının tüm bahis geçmişi (limit opsiyonel)
  async getUserBets(req, res) {
    try {
      const userId = req.query.userId;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Geçerli bir userId girin.' });
      }

      const limit = parseInt(req.query.limit) || 50;

      const bets = await WingoBet.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      const formatted = bets.map(bet => ({
        ...bet.toObject(),
        roundId: bet.roundId
      }));

      res.json({ success: true, bets: formatted });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getRoundResult(req, res) {
    const { roundId } = req.params;

    try {
      const game = await WingoGame.findOne({ roundId });

      if (!game || game.numberResult === null || game.colorResult === null) {
        return res.status(404).json({ success: false, message: 'Round sonucu bulunamadı' });
      }

      const bets = await WingoBet.find({ roundId }).populate('user');

      const formattedBets = bets
        .filter(bet => bet.user)
        .map(bet => ({
          userId: bet.user._id.toString(),
          amount: bet.amount,
          payout: bet.payout || 0,
          wallet: bet.wallet
        }));

      res.json({
        success: true,
        result: {
          roundId: game.roundId,
          number: game.numberResult,
          color: game.colorResult,
          bets: formattedBets
        }
      });
    } catch (err) {
      console.error('[GET ROUND RESULT]', err);
      res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
  },

  async getUserStats(req, res) {
    try {
      const userId = req.user._id;
      const stats = await calculateWinLossStats(userId);
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getUserDailyStats(req, res) {
    try {
      const userId = req.user._id;
      const data = await getDailyStats(userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getRecentRounds(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const rounds = await WingoGame.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json({ success: true, rounds });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getActiveRound(req, res) {
    try {
      const active = await WingoGame.findOne({ status: 'waiting' }).sort({ createdAt: -1 });
      res.json({ success: true, round: active });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
