// Load database models
const User = require('../../../database/models/User');
const BalanceTransaction = require('../../../database/models/BalanceTransaction');
const Setting = require('../../../database/models/Setting');

// Load utils
const { socketRemoveAntiSpam } = require('../../../utils/socket');
const { generalUserGetFormated } = require('../../../utils/general/user');
const {
  generalCheckSendAffiliateCodeData,
  generalCheckSendAffiliateCodeCode,
  generalCheckSendAffiliateClaimCodeData,
  generalCheckSendAffiliateClaimCodeUser,
  generalCheckSendAffiliateClaimCodeCode,
  generalCheckSendAffiliateClaimEarningsUser
} = require('../../../utils/general/affiliate');

const { getActiveWalletIndex } = require('../../../utils/wallet');

/* -------------------- Para Birimi Dönüştürücü -------------------- */
async function convertAmount(amount, fromCurrency, toCurrency) {
  const settings = await Setting.findOne().select('exchangeRates').lean();
  if (!settings || !settings.exchangeRates) return amount;

  const rates = settings.exchangeRates;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  // Önce USD’ye çevir → sonra hedef para birimine
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/* -------------------- AFFILIATE DATA -------------------- */
const generalGetAffiliateDataSocket = async (io, socket, user, data, callback) => {
  try {
    const levels = ['referrer', 'referrerLevel2', 'referrerLevel3'];
    const results = {};

    for (const level of levels) {
      const referredUsers = await User.find({ [`affiliates.${level}`]: user._id })
        .sort({ 'affiliates.generated': -1 })
        .select('username avatar rank xp affiliates.generated affiliates.referrer currency anonymous createdAt stats.deposit stats.withdraw stats.bet')
        .lean();

      const userIds = referredUsers.map(u => u._id);
      const transactions = await BalanceTransaction.aggregate([
        { $match: { user: user._id, type: 'affiliateCommission', fromUser: { $in: userIds } } },
        { $group: { _id: '$fromUser', total: { $sum: '$amount' } } }
      ]);

      const earningsMap = {};
      for (const tx of transactions) {
        earningsMap[tx._id.toString()] = tx.total;
      }

      results[level] = referredUsers.map(u => ({
        user: generalUserGetFormated(u),
        affiliates: {
          ...u.affiliates,
          generated: earningsMap[u._id.toString()] || 0
        }
      }));
    }

    callback({
      success: true,
      data: user.affiliates,
      referred: results.referrer,
      referredLevel2: results.referrerLevel2,
      referredLevel3: results.referrerLevel3
    });

  } catch (err) {
    callback({ success: false, error: { type: 'error', message: err.message } });
  }
};

/* -------------------- AFFILIATE CODE -------------------- */
const generalSendAffiliateCodeSocket = async (io, socket, user, data, callback) => {
  try {
    generalCheckSendAffiliateCodeData(data);

    const code = data.code.toLowerCase();
    const dataDatabase = await User.findOne({ 'affiliates.code': code }).select('affiliates.code').lean();

    if (dataDatabase) {
      throw new Error('Affiliate code is already in use.');
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 'affiliates.code': code },
      { new: true }
    ).select('affiliates').lean();

    if (!updatedUser) throw new Error('Failed to update affiliate code.');

    callback({ success: true, data: updatedUser.affiliates });
    socketRemoveAntiSpam(user._id);
  } catch (err) {
    socketRemoveAntiSpam(socket.decoded._id);
    callback({ success: false, error: { type: 'error', message: err.message } });
  }
};

/* -------------------- AFFILIATE CLAIM CODE -------------------- */
const generalSendAffiliateClaimCodeSocket = async (io, socket, user, data, callback) => {
  try {
    generalCheckSendAffiliateClaimCodeData(data);

    const userIp = socket.handshake.headers['cf-connecting-ip'] || socket.conn.remoteAddress;
    const code = data.code.toLowerCase();

    const [claimedFromSameIP, level1User] = await Promise.all([
      User.findOne({ 'affiliates.referredAddress': userIp }).select('affiliates').lean(),
      User.findOne({ 'affiliates.code': code }).select('_id affiliates currency').lean()
    ]);

    generalCheckSendAffiliateClaimCodeUser(user, claimedFromSameIP);
    generalCheckSendAffiliateClaimCodeCode(user, level1User);

    const level2User = level1User.affiliates.referrer
      ? await User.findById(level1User.affiliates.referrer).select('_id affiliates currency').lean()
      : null;

    const level3User = level2User?.affiliates?.referrer
      ? await User.findById(level2User.affiliates.referrer).select('_id currency').lean()
      : null;

    const updateFields = {
      $inc: { balance: 0 },
      'affiliates.referrer': level1User._id,
      'affiliates.referredAddress': userIp,
      'affiliates.referredAt': new Date(),
      updatedAt: new Date()
    };

    if (level2User) updateFields['affiliates.referrerLevel2'] = level2User._id;
    if (level3User) updateFields['affiliates.referrerLevel3'] = level3User._id;

    const updatedUser = await User.findByIdAndUpdate(user._id, updateFields, { new: true })
      .select('wallets xp stats rakeback affiliates mute ban verifiedAt updatedAt').lean();

    // ✅ İlk ödül: 100 USD → referrer’ın fiatCurrency’sine göre çevir
    const rewardBase = 100;
    const refCurrency = level1User.currency?.fiatCurrency || 'USD';
    const rewardConverted = await convertAmount(rewardBase, 'USD', refCurrency);

    await BalanceTransaction.create({
      amount: rewardConverted,
      type: 'affiliateCodeClaim',
      user: user._id,
      fromUser: level1User._id,
      state: 'completed',
      currency: refCurrency
    });

    callback({ success: true, user: updatedUser });
    socketRemoveAntiSpam(user._id);

  } catch (err) {
    socketRemoveAntiSpam(socket.decoded._id);
    callback({ success: false, error: { type: 'error', message: err.message } });
  }
};

/* -------------------- AFFILIATE CLAIM EARNINGS -------------------- */
const generalSendAffiliateClaimEarningsSocket = async (io, socket, user, data, callback) => {
  try {
    generalCheckSendAffiliateClaimEarningsUser(user);

    // ✅ User'ı wallets + currency ile yeniden çek
    const freshUser = await User.findById(user._id)
      .select('wallets currency affiliates')
      .lean();

    if (!freshUser) throw new Error('User not found');

    const walletIndex = getActiveWalletIndex(freshUser);
    if (walletIndex === -1) throw new Error('Aktif cüzdan bulunamadı');

    const walletPath = `wallets.${walletIndex}.balance`;
    const fiatCurrency = freshUser.currency?.fiatCurrency || 'USD';
    const claimAmount = freshUser.affiliates.available;

    if (claimAmount <= 0) {
      throw new Error('Çekilebilir komisyon bulunamadı.');
    }

    const dataDatabase = await Promise.all([
      User.findByIdAndUpdate(freshUser._id, {
        $inc: { [walletPath]: claimAmount },
        'affiliates.available': 0,
        updatedAt: new Date().getTime()
      }, { new: true }).select('wallets xp stats rakeback affiliates mute ban verifiedAt updatedAt'),

      BalanceTransaction.create({
        amount: claimAmount,
        type: 'affiliateEarningClaim',
        user: freshUser._id,
        state: 'completed',
        currency: fiatCurrency
      })
    ]);

    callback({ success: true, user: dataDatabase[0] });
    socketRemoveAntiSpam(freshUser._id);
  } catch (err) {
    socketRemoveAntiSpam(socket.decoded._id);
    callback({ success: false, error: { type: 'error', message: err.message } });
  }
};


module.exports = {
  generalGetAffiliateDataSocket,
  generalSendAffiliateCodeSocket,
  generalSendAffiliateClaimCodeSocket,
  generalSendAffiliateClaimEarningsSocket
};
