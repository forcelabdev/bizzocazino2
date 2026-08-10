const BonusSetting = require('../database/models/BonusSetting');
const Transaction = require('../database/models/Transaction');
const User = require('../database/models/User');

async function applyBonus(userId, amount, depositIndex = 1) {
  let bonusType = '';

  if (depositIndex === 1) bonusType = 'first_deposit';
  else if (depositIndex === 2) bonusType = 'second_deposit';
  else if (depositIndex === 3) bonusType = 'third_deposit';
  else if (depositIndex === 4) bonusType = 'fourth_deposit';
  else bonusType = 'deposit';

  const setting = await BonusSetting.findOne({ type: bonusType, enabled: true });
  if (!setting) return;

  // İlk yatırımlar için minAmount kontrolü
  if (bonusType !== 'deposit' && amount < setting.minAmount) return;

  // Genel yatırımlar için maxDepositLimit kontrolü
  if (bonusType === 'deposit' && setting.maxDepositLimit > 0 && amount > setting.maxDepositLimit) return;

  // Günlük sınır kontrolü (sadece 'deposit' için)
  if (bonusType === 'deposit' && setting.dailyLimit > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await Transaction.countDocuments({
      userId,
      type: 'bonus',
      source: 'deposit',
      createdAt: { $gte: today }
    });

    if (count >= setting.dailyLimit) return;
  }

  const bonusAmount = Math.min((amount * setting.percentage) / 100, setting.maxAmount);
  if (bonusAmount <= 0) return;

  await User.findByIdAndUpdate(userId, { $inc: { balance: bonusAmount } });

  await Transaction.create({
    userId,
    type: 'bonus',
    amount: bonusAmount,
    source: bonusType
  });
}
