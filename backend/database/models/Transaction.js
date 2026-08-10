const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    txn_id: { type: String, required: true, unique: true }, // back to single unique
    user_code: { type: String, required: true },
    game_type: { type: String, required: true },
    provider_code: { type: String },
    game_code: { type: String },
    bet_money: { type: Number, default: 0 },
    win_money: { type: Number },
    txn_type: { type: String, required: true }, // debit | credit | debit_credit
    round_id: { type: mongoose.Schema.Types.Mixed, required: true }, // provider round ids can be numeric or string
    balance_before: { type: Number, required: true },
    balance_after: { type: Number, required: true },
    rakeback: { type: Number, default: 0 },
    affiliate: { type: Number, default: 0 },
    extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    created_at: { type: Date, default: Date.now }
});

transactionSchema.index({ user_code: 1 });
transactionSchema.index({ created_at: -1 });
transactionSchema.index({ user_code: 1, created_at: -1 });
transactionSchema.index({ game_code: 1 });
transactionSchema.index({ provider_code: 1 });
transactionSchema.index({ round_id: 1 });
transactionSchema.index({ txn_type: 1, created_at: -1 });
transactionSchema.index({ win_money: 1, created_at: -1 });
transactionSchema.index({
    user_code: 1,
    provider_code: 1,
    txn_type: 1,
    round_id: 1,
});
transactionSchema.index({
    user_code: 1,
    provider_code: 1,
    txn_type: 1,
    "extra.gameRoundId": 1,
});
transactionSchema.index({
    user_code: 1,
    provider_code: 1,
    txn_type: 1,
    "extra.wagerId": 1,
});
transactionSchema.index({
    user_code: 1,
    provider_code: 1,
    txn_type: 1,
    "extra.pairCode": 1,
});
transactionSchema.index({ "extra.wagerId": 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
