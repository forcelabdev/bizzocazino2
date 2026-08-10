const { getUserFromToken } = require('../../utils/auth');
const { placeTurboTrade, closeTurboTrade } = require('../../services/turboTradeService');
const TurboTrade = require('../../database/models/TurboTrade');
const { getIO } = require('../../utils/io');
const User = require('../../database/models/User');
const { generalUserGetRakeback } = require('../../utils/general/user');
const { getActiveWalletIndex } = require('../../utils/wallet');
const BalanceTransaction = require('../../database/models/BalanceTransaction');
        const Setting = require('../../database/models/Setting');

module.exports = (io) => {
  io.of('/general').on('connection', (socket) => {
    // console.log('🔗 [TURBO] Yeni bağlantı (/general):', socket.id);

    /* ---------------------- TURBO OPEN ---------------------- */
     socket.on('turbo:open', async (data, callback) => {
  console.log('📡 [BACKEND] turbo:open tetiklendi:', data);

  try {
    const { token, ...payload } = data;
    if (!token) throw new Error('Token gerekli');

    const user = await getUserFromToken(token);
    if (!user) throw new Error('Geçersiz kullanıcı');

    // ✅ Trade oluştur
    const result = await placeTurboTrade({
      userId: user._id,
      ...payload
    });

    // ✅ Kullanıcıyı güncel çek
    const freshUser = await User.findById(user._id)
      .select('wallets currency rakeback limits xp stats affiliates')
      .lean();

    const walletIndex = getActiveWalletIndex(freshUser);
    if (walletIndex === -1) throw new Error('Cüzdan bulunamadı');

    const settingsDoc = await Setting.findOne().lean();
    if (!settingsDoc) throw new Error("Settings bulunamadı!");
    const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || { level1: 7, level2: 3, level3: 1 };
    const exchangeRates = settingsDoc.exchangeRates || {};

    // ✅ Rakeback oranı
    const rakeback = generalUserGetRakeback(freshUser);

   // ✅ Rakeback hesapla
const amountRakeback =
  freshUser.limits.blockSponsor !== true
    ? parseFloat((payload.amount * rakeback.percentage).toFixed(2))
    : 0;

// ✅ XP hesapla (USD normalize)
const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
const bettorRate = exchangeRates[bettorCurrency] || 1;
const betInUSD = payload.amount / bettorRate;

const xpToAdd = freshUser.limits.blockSponsor !== true
  ? parseFloat((betInUSD * settingsDoc.general.reward.multiplier).toFixed(2))
  : 0;

if (amountRakeback > 0 || xpToAdd > 0) {
  await User.findByIdAndUpdate(
    freshUser._id,
    {
      $inc: {
        xp: xpToAdd,
        'rakeback.earned': amountRakeback,
        'rakeback.available': amountRakeback
      },
      updatedAt: new Date().getTime()
    }
  );
}


  
    // 2) Referrer zinciri
    const level1Ref = freshUser?.affiliates?.referrer || null;
    let level2Ref = null;
    let level3Ref = null;

    if (level1Ref) {
      const level1User = await User.findById(level1Ref).select('affiliates.referrer').lean();
      level2Ref = level1User?.affiliates?.referrer || null;

      if (level2Ref) {
        const level2User = await User.findById(level2Ref).select('affiliates.referrer').lean();
        level3Ref = level2User?.affiliates?.referrer || null;
      }
    }

    const affiliateDistributions = [];
    if (level1Ref) affiliateDistributions.push({ id: level1Ref, level: 1 });
    if (level2Ref) affiliateDistributions.push({ id: level2Ref, level: 2 });
    if (level3Ref) affiliateDistributions.push({ id: level3Ref, level: 3 });

    // 3) Her referrer için pay hesapla
    for (const ref of affiliateDistributions) {
      const refUser = await User.findById(ref.id).select("currency").lean();
      if (!refUser) continue;

      const refCurrency = refUser.currency?.fiatCurrency || "USD";
      const refRate = exchangeRates[refCurrency] || 1;

      const commissionInUSD = betInUSD * (affiliateLevels[`level${ref.level}`] / 100);
      const commissionFinal = commissionInUSD * refRate;

      if (commissionFinal > 0) {
        await User.findByIdAndUpdate(ref.id, {
          $inc: {
            'affiliates.earned': commissionFinal,
            'affiliates.available': commissionFinal
          },
          updatedAt: new Date().getTime()
        });

        await BalanceTransaction.create({
          amount: commissionFinal,
          type: 'affiliateCommission',
          user: ref.id,
          fromUser: user._id,
          state: 'completed'
        });
      }
    }

    // ✅ Callback
    if (typeof callback === 'function') {
      callback({ success: true, ...result });
    }

    const io = getIO();

    // ✅ sadece kendisine emit
    io.of('/general')
      .to(user._id.toString())
      .emit('user', { user: result.user });

    io.of('/general')
      .to(user._id.toString())
      .emit('turbo:trade', { trade: result.trade });

    // ✅ public feed → tüm kullanıcılara (populate edilmiş)
    const populatedTrade = await TurboTrade.findById(result.trade._id)
      .populate("user", "username avatar vipBadgeImage")
      .lean();

    io.of('/general').emit('turbo:public', { trade: populatedTrade });

  } catch (err) {
    console.error('💥 [TURBO OPEN ERROR]', err);
    if (typeof callback === 'function') {
      callback({ success: false, error: err.message });
    } else {
      socket.emit('turbo:error', { message: err.message });
    }
  }
});


    /* ---------------------- TURBO LIST ---------------------- */
    socket.on('turbo:list', async (data, callback) => {
      console.log('📡 [BACKEND] turbo:list tetiklendi:', data);

      try {
        const { token } = data;
        if (!token) throw new Error('Token gerekli');

        const user = await getUserFromToken(token);
        if (!user) throw new Error('Geçersiz kullanıcı');

        const trades = await TurboTrade.find({ user: user._id })
          .sort({ createdAt: -1 })
          .lean();

        if (typeof callback === 'function') {
          callback({ success: true, trades });
        }
      } catch (err) {
        console.error('💥 [TURBO LIST ERROR]', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        } else {
          socket.emit('turbo:error', { message: err.message });
        }
      }
    });

    /* ---------------------- TURBO PUBLIC LIST ---------------------- */
    socket.on('turbo:public:list', async (callback) => {
      try {
        const trades = await TurboTrade.find({ result: { $in: ["win", "lose"] } }) // sadece sonuçlanan trades
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("user", "username avatar vipBadgeImage") // username + avatar + vipBadge
          .lean();

        if (typeof callback === 'function') {
          callback({ success: true, trades });
        }
      } catch (err) {
        console.error('💥 [TURBO PUBLIC LIST ERROR]', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    /* ---------------------- TURBO CLOSE ---------------------- */
    socket.on('turbo:close', async (data, callback) => {
      console.log('📡 [BACKEND] turbo:close tetiklendi:', data);

      try {
        const { token, tradeId } = data;
        if (!token) throw new Error('Token gerekli');

        const user = await getUserFromToken(token);
        if (!user) throw new Error('Geçersiz kullanıcı');

        const result = await closeTurboTrade({ tradeId });

        if (typeof callback === 'function') {
          callback({ success: true, ...result });
        }

        const io = getIO();

        // ✅ sadece kendisine emit
        io.of('/general')
          .to(user._id.toString())
          .emit('user', { user: result.user });

        io.of('/general')
          .to(user._id.toString())
          .emit('turbo:trade', { trade: result.trade });

        // ✅ public feed → tüm kullanıcılara (populate edilmiş)
        const populatedTrade = await TurboTrade.findById(result.trade._id)
          .populate("user", "username avatar vipBadgeImage")
          .lean();

        io.of('/general').emit('turbo:public', { trade: populatedTrade });

      } catch (err) {
        console.error('💥 [TURBO CLOSE ERROR]', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        } else {
          socket.emit('turbo:error', { message: err.message });
        }
      }
    });
  });
};
