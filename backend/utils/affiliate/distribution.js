const User = require('../../database/models/User');
const BalanceTransaction = require('../../database/models/BalanceTransaction');
const Setting = require('../../database/models/Setting');

/**
 * Settings modelinden affiliate oranlarını al
 */
async function getAffiliateSettings() {
  const settings = await Setting.findOne().select('general.affiliate').lean();
  if (!settings || !settings.general || !settings.general.affiliate) {
    throw new Error('Affiliate ayarları bulunamadı');
  }
  return settings.general.affiliate;
}

/**
 * Oyunlardan gelen affiliate kazancı dağıtır
 * @param {ObjectId} userId - bahis yapan userId
 * @param {Number} amount - bahis miktarı (kendi fiatında)
 */
async function distributeGameAffiliate(userId, amount) {
  const settings = await getAffiliateSettings();
  const { gameLevels } = settings;

  const user = await User.findById(userId).select('affiliates').lean();
  if (!user || !user.affiliates) return;

  const refs = [
    { id: user.affiliates.referrer, level: 1, percent: gameLevels.level1 },
    { id: user.affiliates.referrerLevel2, level: 2, percent: gameLevels.level2 },
    { id: user.affiliates.referrerLevel3, level: 3, percent: gameLevels.level3 }
  ];

  await Promise.all(
    refs
      .filter(r => r.id && r.percent > 0)
      .map(async r => {
        const commission = Math.floor(amount * (r.percent / 100));
        if (commission <= 0) return;

        await User.findByIdAndUpdate(r.id, {
          $inc: {
            'affiliates.earned': commission,
            'affiliates.available': commission,
            'affiliates.generated': commission
          },
          updatedAt: new Date()
        });

        await BalanceTransaction.create({
          user: r.id,
          fromUser: userId,
          amount: commission,
          type: 'affiliateCommission',
          state: 'completed'
        });
      })
  );
}

/**
 * Deposit üzerinden affiliate kazancı dağıtır
 * @param {ObjectId} userId - deposit yapan userId
 * @param {Number} amount - deposit miktarı (kendi fiatında)
 */
async function distributeDepositAffiliate(userId, amount) {
  const settings = await getAffiliateSettings();
  const { depositLevels } = settings;

  const user = await User.findById(userId).select('affiliates').lean();
  if (!user || !user.affiliates) return;

  const refs = [
    { id: user.affiliates.referrer, level: 1, percent: depositLevels.level1 },
    { id: user.affiliates.referrerLevel2, level: 2, percent: depositLevels.level2 },
    { id: user.affiliates.referrerLevel3, level: 3, percent: depositLevels.level3 }
  ];

  await Promise.all(
    refs
      .filter(r => r.id && r.percent > 0)
      .map(async r => {
        const commission = Math.floor(amount * (r.percent / 100));
        if (commission <= 0) return;

        await User.findByIdAndUpdate(r.id, {
          $inc: {
            'affiliates.earned': commission,
            'affiliates.available': commission,
            'affiliates.generated': commission
          },
          updatedAt: new Date()
        });

        await BalanceTransaction.create({
          user: r.id,
          fromUser: userId,
          amount: commission,
          type: 'affiliateDeposit',
          state: 'completed'
        });
      })
  );
}

module.exports = {
  distributeGameAffiliate,
  distributeDepositAffiliate
};
