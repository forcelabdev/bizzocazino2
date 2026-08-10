// Load database models
const User = require('../../../database/models/User');
const Box = require('../../../database/models/Box');
const BalanceTransaction = require('../../../database/models/BalanceTransaction');

// Load utils
const { socketRemoveAntiSpam } = require('../../../utils/socket');
const { generalCheckSendRakebackClaimUser } = require('../../../utils/general/rakeback');
const { getActiveWalletIndex } = require('../../../utils/wallet');

const generalGetRakebackDataSocket = async (io, socket, user, data, callback) => {
    try {
        const boxesDatabase = await Box.find({ type: 'reward', state: 'active' })
            .select('name amount levelMin type state');

        callback({ success: true, boxes: boxesDatabase });
    } catch (err) {
        callback({ success: false, error: { type: 'error', message: err.message } });
    }
};

const generalSendRakebackClaimSocket = async (io, socket, user, data, callback) => {
    try {
        // Kullanıcıyı güncel + wallets ile çek
        const freshUser = await User.findById(user._id)
            .select('wallets currency rakeback affiliates limits')
            .lean();

        if (!freshUser) throw new Error('User not found.');

        // Kullanıcının rakeback hakkı var mı kontrol et
        generalCheckSendRakebackClaimUser(freshUser);

        // Kullanıcının aktif cüzdanını bul
        let walletIndex = getActiveWalletIndex(freshUser);

        // Eğer currency wallet ile eşleşmiyorsa fallback kullan
        if (walletIndex === -1) {
            walletIndex = freshUser.wallets.findIndex(
                w => w.coinType === 'USDT' && w.chain === 'TRON' && w.type === 'trc-20'
            );
            if (walletIndex === -1) walletIndex = 0; // fallback: ilk wallet
        }

        const walletPath = `wallets.${walletIndex}.balance`;
        const selectedWallet = freshUser.wallets[walletIndex];
        const amount = freshUser.rakeback.available;

        if (amount <= 0) throw new Error('No rakeback available.');

        // Güncelleme + transaction kaydı
        const dataDatabase = await Promise.all([
            User.findByIdAndUpdate(
                freshUser._id,
                {
                    $inc: { [walletPath]: amount },
                    'rakeback.available': 0,
                    updatedAt: new Date().getTime()
                },
                { new: true }
            ).select('wallets xp stats rakeback mute ban verifiedAt updatedAt'),

            BalanceTransaction.create({
                amount,
                type: 'rakebackClaim',
                user: freshUser._id,
                coinType: selectedWallet.coinType,
                chain: selectedWallet.chain,
                walletIndex,
                state: 'completed'
            })
        ]);

        callback({ success: true, user: dataDatabase[0] });

        socketRemoveAntiSpam(freshUser._id);
    } catch (err) {
        socketRemoveAntiSpam(socket.decoded._id);
        callback({
            success: false,
            error: { type: 'error', message: err.message }
        });
    }
};


module.exports = {
    generalGetRakebackDataSocket,
    generalSendRakebackClaimSocket
};
