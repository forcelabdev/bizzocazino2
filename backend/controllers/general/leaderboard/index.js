// Load database models
const User = require('../../../database/models/User');
const Leaderboard = require('../../../database/models/Leaderboard');
const BalanceTransaction = require('../../../database/models/BalanceTransaction');
const Setting = require('../../../database/models/Setting');

// Load utils
const { generalUserGetFormated } = require('../../../utils/general/user');
const { generalGetLeaderboardTimeLeft } = require('../../../utils/general/leaderboard');

// General leaderboard variables
let generalLeaderboardTimeout = null;

/* -------------------- Currency Converter -------------------- */
async function convertToUSD(amount, fromCurrency) {
  const settings = await Setting.findOne().select('exchangeRates').lean();
  if (!settings || !settings.exchangeRates) return amount;

  const rates = settings.exchangeRates;
  const fromRate = rates[fromCurrency] || 1;

  return amount / fromRate;
}

/* -------------------- Get Leaderboard Data -------------------- */
const generalGetLeaderboardDataSocket = async (io, socket, user, data, callback) => {
  try {
    // 1. Aktif leaderboard
    let leaderboard = await Leaderboard.findOne({ state: 'running' })
      .select('winners duration type state updatedAt')
      .lean();

    if (!leaderboard) {
      return callback({ success: true, leaderboard: null });
    }

    // 2. Tüm kullanıcıları çek
    let users = await User.find({})
      .select('username avatar rank xp stats leaderboard rakeback anonymous createdAt currency')
      .lean();

    // 3. USD normalize et
    const settings = await Setting.findOne().select('exchangeRates').lean();
    const rates = settings.exchangeRates || {};

    const usersWithConverted = users.map(u => {
      const fiat = u.currency?.fiatCurrency || 'USD';
      const rate = rates[fiat] || 1;
      const pointsUSD = u.leaderboard?.points ? (u.leaderboard.points / rate) : 0;
      return { ...u, leaderboard: { ...u.leaderboard, pointsUSD } };
    });

    // 4. USD puanına göre sırala
    usersWithConverted.sort((a, b) => b.leaderboard.pointsUSD - a.leaderboard.pointsUSD);

    // 5. İlk 50 kullanıcı
    const topUsers = usersWithConverted.slice(0, 50);

    // 6. Kazanan listesi
    leaderboard.winners = leaderboard.winners.map((element, index) => {
      const topUser = topUsers[index];
      const formattedUser = topUser ? generalUserGetFormated(topUser) : undefined;

      return {
        prize: element.prize,
        points: topUser ? topUser.leaderboard.pointsUSD : 0,
        user: formattedUser
          ? {
              ...formattedUser,
              leaderboard: {
                points: topUser.leaderboard?.points ?? 0
              }
            }
          : formattedUser
      };
    });

    callback({ success: true, leaderboard });
  } catch (err) {
    callback({ success: false, error: { type: 'error', message: err.message } });
  }
};

/* -------------------- Start Leaderboard -------------------- */
const generalLeaderboardStart = async (io, leaderboard) => {
  try {
    const left = generalGetLeaderboardTimeLeft(leaderboard);
    generalLeaderboardTimeout = setTimeout(() => {
      generalLeaderboardComplete(io, leaderboard);
    }, left);
  } catch (err) {
    console.error(err);
  }
};

/* -------------------- Stop Leaderboard -------------------- */
const generalLeaderboardStop = async (io, leaderboard) => {
  try {
    clearTimeout(generalLeaderboardTimeout);
  } catch (err) {
    console.error(err);
  }
};

/* -------------------- Complete Leaderboard -------------------- */
const generalLeaderboardComplete = async (io, leaderboard) => {
  try {
    clearTimeout(generalLeaderboardTimeout);

    // Aktif, yeni leaderboard ve top 10
    let dataDatabase = await Promise.all([
      Leaderboard.findById(leaderboard._id).select('winners state updatedAt').lean(),
      Leaderboard.findOne({ state: 'created' }).sort({ createdAt: 1 }).select('state updatedAt').lean(),
      User.find({}).select('leaderboard currency').lean()
    ]);

    const settings = await Setting.findOne().select('exchangeRates').lean();
    const rates = settings.exchangeRates || {};

    // Kullanıcıları USD normalize et
    const usersWithConverted = dataDatabase[2].map(u => {
      const fiat = u.currency?.fiatCurrency || 'USD';
      const rate = rates[fiat] || 1;
      const pointsUSD = u.leaderboard?.points ? (u.leaderboard.points / rate) : 0;
      return { ...u, leaderboard: { ...u.leaderboard, pointsUSD } };
    });

    // USD sıralaması
    usersWithConverted.sort((a, b) => b.leaderboard.pointsUSD - a.leaderboard.pointsUSD);
    const top10 = usersWithConverted.slice(0, 10);

    let winners = [];
    let promises = [];

    for (let i = 0; i < dataDatabase[0].winners.length; i++) {
      if (top10[i]) {
        winners.push({
          prize: dataDatabase[0].winners[i].prize,
          points: top10[i].leaderboard.pointsUSD,
          user: top10[i]._id
        });

        promises.push(
          User.findByIdAndUpdate(
            top10[i]._id,
            {
              $inc: { balance: dataDatabase[0].winners[i].prize },
              updatedAt: new Date().getTime()
            },
            { new: true }
          ).select('balance updatedAt').lean(),

          BalanceTransaction.create({
            amount: dataDatabase[0].winners[i].prize,
            type: 'leaderboardPayout',
            user: top10[i]._id,
            state: 'completed',
            currency: 'USD'
          })
        );
      } else {
        winners.push({
          prize: dataDatabase[0].winners[i].prize,
          points: 0
        });
      }
    }

    // Update leaderboard
    await Promise.all([
      Leaderboard.findByIdAndUpdate(
        leaderboard._id,
        { winners: winners, state: 'completed', updatedAt: new Date().getTime() },
        {}
      ),
      ...promises
    ]);

    // Yeni leaderboard varsa başlat
    if (dataDatabase[1] !== null) {
      dataDatabase = await Promise.all([
        Leaderboard.findByIdAndUpdate(
          dataDatabase[1]._id,
          { state: 'running', updatedAt: new Date().getTime() },
          { new: true }
        ).select('duration state updatedAt').lean(),
        User.updateMany({}, { 'leaderboard.points': 0 }, {})
      ]);

      generalLeaderboardStart(io, dataDatabase[0]);
    }
  } catch (err) {
    console.error(err);
  }
};

/* -------------------- Init Leaderboard -------------------- */
const generalLeaderboardInit = async (io) => {
  try {
    let dataDatabase = await Promise.all([
      Leaderboard.findOne({ state: 'running' }).select('duration state updatedAt').lean(),
      Leaderboard.findOne({ state: 'created' }).sort({ createdAt: 1 }).select('duration state updatedAt').lean()
    ]);

    if (dataDatabase[0] !== null) {
      const left = generalGetLeaderboardTimeLeft(dataDatabase[0]);

      if (left > 0) {
        generalLeaderboardTimeout = setTimeout(() => {
          generalLeaderboardComplete(io, dataDatabase[0]);
        }, left);
      } else {
        generalLeaderboardComplete(io, dataDatabase[0]);
      }
    } else if (dataDatabase[1] !== null) {
      dataDatabase = await Promise.all([
        Leaderboard.findByIdAndUpdate(
          dataDatabase[1]._id,
          { state: 'running', updatedAt: new Date().getTime() },
          { new: true }
        ).select('duration state updatedAt').lean(),
        User.updateMany({}, { 'leaderboard.points': 0 }, {})
      ]);

      generalLeaderboardStart(io, dataDatabase[0]);
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  generalGetLeaderboardDataSocket,
  generalLeaderboardStart,
  generalLeaderboardStop,
  generalLeaderboardInit
};
