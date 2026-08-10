const { getUserFromToken } = require('../../utils/auth');
const { getActiveWalletIndex } = require('../../utils/wallet');
const User = require('../../database/models/User');
const AffiliateRaffle = require('../../database/models/AffiliateRaffle');
const BalanceTransaction = require('../../database/models/BalanceTransaction');

// random code generator
function generateCode(length = 8) {
  return Math.random().toString(36).substr(2, length).toUpperCase();
}

module.exports = (io) => {
  io.of('/general').on('connection', (socket) => {
    // console.log('🔗 [AFFILIATE RAFFLE] Yeni bağlantı:', socket.id);

    /* ---------------------- RAFFLE CREATE ---------------------- */
    socket.on('affraffle:create', async (data, callback) => {
      try {
        const { token, amount, expiresAt, maxParticipants } = data;
        if (!token) throw new Error('Token gerekli');

        const user = await getUserFromToken(token);
        if (!user) throw new Error('Geçersiz kullanıcı');

        // ✅ Güncel user'ı al
        const freshUser = await User.findById(user._id).select('wallets currency').lean();
        if (!freshUser) throw new Error('User not found');

        const walletIndex = getActiveWalletIndex(freshUser);
        if (walletIndex === -1) throw new Error('Aktif cüzdan bulunamadı');

        const wallet = freshUser.wallets[walletIndex];
        if (wallet.balance < amount) throw new Error('Yetersiz bakiye');

        const walletPath = `wallets.${walletIndex}.balance`;

        // ✅ random code üret
        const code = generateCode();

        // ✅ çekiliş oluştur
        const raffle = await AffiliateRaffle.create({
          owner: freshUser._id,
          code,
          amount,
          currency: freshUser.currency?.fiatCurrency || 'USD',
          expiresAt: new Date(expiresAt),
          maxParticipants: maxParticipants || 100
        });

        // ✅ bakiyeden düş
        await User.findByIdAndUpdate(freshUser._id, {
          $inc: { [walletPath]: -amount },
          updatedAt: new Date().getTime()
        });

        callback({ success: true, raffle });
      } catch (err) {
        console.error('[RAFFLE CREATE ERROR]', err);
        callback({ success: false, error: err.message });
      }
    });

    /* ---------------------- RAFFLE JOIN ---------------------- */
    socket.on('affraffle:join', async (data, callback) => {
      try {
        const { token, code } = data;
        if (!token) throw new Error('Token gerekli');

        const user = await getUserFromToken(token);
        if (!user) throw new Error('Geçersiz kullanıcı');

        const raffle = await AffiliateRaffle.findOne({ code, state: 'open' });
        if (!raffle) throw new Error('Çekiliş bulunamadı veya kapalı');

        // ✅ sadece ref'ler katılabilir
        const freshUser = await User.findById(user._id).select('affiliates.referrer').lean();
        if (!freshUser.affiliates?.referrer || freshUser.affiliates.referrer.toString() !== raffle.owner.toString()) {
          throw new Error('Bu çekilişe sadece referans olduğunuz kişiler katılabilir');
        }

        // ✅ zaten katıldı mı?
        if (raffle.participants.includes(user._id)) {
          throw new Error('Zaten katıldınız');
        }

        // ✅ max kontrol
        if (raffle.participants.length >= raffle.maxParticipants) {
          throw new Error('Maksimum katılımcı sayısına ulaşıldı');
        }

        raffle.participants.push(user._id);
        await raffle.save();

        // ✅ herkese güncel katılımcı sayısını gönder
        io.of('/general').emit('affraffle:update', {
          code: raffle.code,
          participants: raffle.participants.length,
          maxParticipants: raffle.maxParticipants
        });

        callback({ success: true, message: 'Çekilişe katıldınız' });
      } catch (err) {
        console.error('[RAFFLE JOIN ERROR]', err);
        callback({ success: false, error: err.message });
      }
    });

    /* ---------------------- RAFFLE DRAW ---------------------- */
    socket.on('affraffle:draw', async (data, callback) => {
      try {
        const { token, code } = data;
        if (!token) throw new Error('Token gerekli');

        const user = await getUserFromToken(token);
        if (!user) throw new Error('Geçersiz kullanıcı');

        const raffle = await AffiliateRaffle.findOne({ code, owner: user._id, state: 'open' }).populate('participants');
        if (!raffle) throw new Error('Çekiliş bulunamadı');

        if (raffle.expiresAt > new Date()) {
          throw new Error('Çekiliş süresi henüz bitmedi');
        }

        if (raffle.participants.length === 0) {
          raffle.state = 'closed';
          await raffle.save();
          return callback({ success: false, message: 'Katılımcı yok' });
        }

        // ✅ random winner
        const winnerIndex = Math.floor(Math.random() * raffle.participants.length);
        const winner = raffle.participants[winnerIndex];

        raffle.winner = winner._id;
        raffle.state = 'completed';
        await raffle.save();

        // ✅ kazanana ödül ekle
        const winnerUser = await User.findById(winner._id).select('wallets currency');
        const walletIndex = getActiveWalletIndex(winnerUser);
        if (walletIndex !== -1) {
          const walletPath = `wallets.${walletIndex}.balance`;
          await User.findByIdAndUpdate(winnerUser._id, {
            $inc: { [walletPath]: raffle.amount },
            updatedAt: new Date().getTime()
          });

          await BalanceTransaction.create({
            amount: raffle.amount,
            type: 'affiliateRaffleWin',
            user: winnerUser._id,
            fromUser: user._id,
            state: 'completed',
            currency: raffle.currency
          });
        }

        // ✅ herkese duyur
        io.of('/general').emit('affraffle:completed', {
          code: raffle.code,
          winner: { _id: winner._id, username: winner.username },
          amount: raffle.amount,
          currency: raffle.currency
        });

        callback({ success: true, winner: winner.username });
      } catch (err) {
        console.error('[RAFFLE DRAW ERROR]', err);
        callback({ success: false, error: err.message });
      }
    });
  });
};
