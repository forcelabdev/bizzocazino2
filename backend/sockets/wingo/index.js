        const WingoGame = require('../../database/models/WingoGame');
        const WingoBet = require('../../database/models/WingoBet');
        const User = require('../../database/models/User');
        const { generalUserGetRakeback } = require('../../utils/general/user');
        const { getActiveWalletIndex } = require('../../utils/wallet');
        const BalanceTransaction = require('../../database/models/BalanceTransaction');
        const Setting = require('../../database/models/Setting');
        const userSockets = new Map();
        const {
        startNewRound,
        placeBet,
        completeRound
        } = require('../../services/wingoService');
        const { getUserFromToken } = require('../../utils/auth'); // JWT'den kullanıcıyı çeken yardımcı

        let currentGame = null;
        let intervalId = null;

        let betPool = {};        // toplam bahis miktarları: { red: 100, '3': 50, ... }
        let betUserCount = {};   // her kutuya kaç farklı kişi oynamış: { red: Set(...) }
        let connectedUsers = new Set();

        /**
         * Wingo için Socket.IO kurulumu
         */
        function setupWingoSocket(io) {
        io.on('connection', async (socket) => {

            

          

        connectedUsers.add(socket.id);
        io.emit('wingo:players:online', connectedUsers.size);

        socket.on('disconnect', () => {
            connectedUsers.delete(socket.id);
            io.emit('wingo:players:online', connectedUsers.size);
        });
        
            // Yeni bağlanan kullanıcıya aktif round bilgisi gönder
           if (currentGame) {
  socket.emit('wingo:round:start', {
    roundId: currentGame.roundId,
    endsAt: currentGame.endAt
  });

   const lastGames = await WingoGame.find({ numberResult: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('numberResult');
  const history = lastGames.map(g => g.numberResult);
  socket.emit('wingo:history:response', history);

  // 🔽 EKLE
  const activeBets = await WingoBet.find({ roundId: currentGame.roundId });
 socket.emit('wingo:bet:sync', {
  roundId: currentGame.roundId,
  bets: activeBets.map(bet => ({
    userId: bet.user.toString(),
    choice: bet.choice,
    amount: bet.amount,
    wallet: bet.wallet // 👈 EKLENDİ
  }))
});
  
  // Mevcut pool bilgisi
  const totalBets = Object.entries(betPool).map(([choice, amount]) => ({
    choice,
    amount,
    users: betUserCount[choice]?.size || 0
  }));
  socket.emit('wingo:bet:pool:update', {
    roundId: currentGame.roundId,
    bets: totalBets
  });

  socket.on('wingo:my-bets:request', async ({ token }) => {
  try {
    const user = await getUserFromToken(token);
    if (!user) return socket.emit('wingo:my-bets:error', { message: 'Kullanıcı bulunamadı' });

    const myBets = await WingoBet.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const formatted = myBets.map(bet => {
      const profit = bet.isWin
  ? parseFloat((bet.payout - bet.amount).toFixed(2))
  : parseFloat((-bet.amount).toFixed(2));

      return {
        roundId: bet.roundId,
        betType: bet.betType,
        selection: bet.choice,
        amount: bet.amount,
        profit
      };
    });

    socket.emit('wingo:my-bets:response', { bets: formatted });
  } catch (err) {
    console.error('[MY BETS ERROR]', err);
    socket.emit('wingo:my-bets:error', { message: 'Bahisler alınamadı.' });
  }
});


            socket.emit('wingo:players:online', connectedUsers.size);
            }

            
            /**
             * Bahis alma
             * `bets`: [
             *   { roundId, betType: 'color'|'number', choice: 'red'|'7'|'violet', amount, wallet }
             * ]
             */

            socket.on('wingo:history:request', async () => {
        try {
            const lastGames = await WingoGame.find({ numberResult: { $ne: null } })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('numberResult');

            const history = lastGames.map((game) => game.numberResult);
            socket.emit('wingo:history:response', history);
        } catch (err) {
            socket.emit('wingo:history:error', { message: 'Geçmiş verisi alınamadı.' });
        }
        });

        socket.on('authenticate', async ({ token }) => {
  try {
    const user = await getUserFromToken(token);
    userSockets.set(user._id.toString(), socket.id);
  } catch (err) {
    console.warn('[AUTH] Kullanıcı doğrulanamadı');
  }
});

       socket.on('wingo:bet', async ({ token, bets }) => {
  try {
    const user = await getUserFromToken(token);

    // Kullanıcıyı güncel çek (wallets, rakeback, limits, currency, affiliates)
    const freshUser = await User.findById(user._id)
      .select('wallets currency rakeback limits xp stats affiliates')
      .lean();
    if (!freshUser) throw new Error("User not found");

    const walletIndex = getActiveWalletIndex(freshUser);
    if (walletIndex === -1) throw new Error('Cüzdan bulunamadı');

    const settingsDoc = await Setting.findOne().lean();
    const affiliateLevels = settingsDoc.general?.affiliate?.gameLevels || { level1: 7, level2: 3, level3: 1 };
    const exchangeRates = settingsDoc.exchangeRates || {};
    const rakeback = generalUserGetRakeback(freshUser);

    for (const bet of bets) {
      if (bet.roundId !== currentGame.roundId) {
        console.warn('[BET] Uyuşmayan round ID:', {
          gelen: bet.roundId,
          beklenen: currentGame.roundId
        });
      }

      const safeBet = {
        ...bet,
        roundId: currentGame.roundId
      };

      // ✅ Bahsi veritabanına kaydet
      await placeBet(user, safeBet);

     // ✅ Rakeback hesapla
const amountRakeback =
  freshUser.limits.blockSponsor !== true
    ? parseFloat((bet.amount * rakeback.percentage).toFixed(2))
    : 0;

// ✅ XP hesapla (USD normalize)
const bettorCurrency = freshUser.currency?.fiatCurrency || "USD";
const bettorRate = exchangeRates[bettorCurrency] || 1;
const betInUSD = bet.amount / bettorRate;

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

      // ✅ Kullanıcının bakiyesini frontend’e gönder
      socket.emit('wingo:balance:update', {
        wallets: freshUser.wallets
      });

      // ✅ Havuz verilerini güncelle
      const key = bet.choice;
      const amount = bet.amount;

      if (!betPool[key]) betPool[key] = 0;
      betPool[key] += amount;

      if (!betUserCount[key]) betUserCount[key] = new Set();
      betUserCount[key].add(user._id.toString());
    }

    // Kullanıcıya bahis başarı mesajı
    socket.emit('wingo:bet:success');

    io.emit('wingo:bet:new', {
      userId: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      bets: bets.map(b => ({
        choice: b.choice,
        amount: b.amount,
        wallet: b.wallet
      }))
    });

    // Havuz bilgisini herkese yayınla
    const totalBets = Object.entries(betPool).map(([choice, amount]) => ({
      choice,
      amount,
      users: betUserCount[choice]?.size || 0
    }));

    socket.broadcast.emit('wingo:bet:pool:update', {
      roundId: currentGame.roundId,
      bets: totalBets
    });

    socket.emit('wingo:bet:pool:update', {
      roundId: currentGame.roundId,
      bets: totalBets
    });

  } catch (err) {
    console.error('[WINGO BET ERROR]', err);
    socket.emit('wingo:bet:error', { message: err.message });
  }
});

        });

        // Oyun döngüsünü başlat
        startWingoLoop(io);
        }

        /**
         * Round başlatma, süre bitince sonucu belirleme
         */
        async function startWingoLoop(io) {
  // ❗ Bu döngü kendi kendini tekrar çağırır (recursive). Beklenmeyen bir
  // hata (örn. geçici DB hatası, roundId çakışması) burada yakalanmazsa
  // yakalanmamış bir promise reddi olarak tüm backend process'ini çökertir.
  // Bu yüzden tüm gövde try/catch ile korunuyor ve hata durumunda döngü
  // process'i çökertmeden kısa bir gecikmeyle yeniden başlatılıyor.
  try {
    currentGame = await startNewRound();

    io.emit('wingo:round:start', {
      roundId: currentGame.roundId,
      endsAt: currentGame.endAt
    });

    betPool = {};
    betUserCount = {};

    const duration = currentGame.endAt.getTime() - Date.now();

    intervalId = setTimeout(async () => {
      try {
        await runWingoRoundCompletion(io);
      } catch (err) {
        console.error('[WINGO LOOP ERROR] Round tamamlanamadı:', err);
        setTimeout(() => startWingoLoop(io), 3000);
      }
    }, duration);
  } catch (err) {
    console.error('[WINGO LOOP ERROR] Round başlatılamadı:', err);
    setTimeout(() => startWingoLoop(io), 3000);
  }
}

async function runWingoRoundCompletion(io) {
  const result = await completeRound(currentGame, io, userSockets);

  // ✅ Kazananların bakiyesi güncellendi (zaten var)

  // ✅ Tüm kullanıcılara kendi bahis sonuçlarını gönder
  const allBets = await WingoBet.find({ roundId: currentGame.roundId }).populate('user');

  const userBetsMap = {};

  for (const bet of allBets) {
    const uid = bet.user._id.toString();
    if (!userBetsMap[uid]) userBetsMap[uid] = [];

    const profit = bet.isWin
  ? parseFloat((bet.payout - bet.amount).toFixed(2))
  : parseFloat((-bet.amount).toFixed(2));


    userBetsMap[uid].push({
      betType: bet.betType,
      selection: bet.choice,
      amount: bet.amount,
      profit,
      roundId: bet.roundId,
      wallet: bet.wallet
    });
  }

  for (const [userId, bets] of Object.entries(userBetsMap)) {
    const socketId = userSockets.get(userId);
   
    if (socketId) {
      io.to(socketId).emit('wingo:bet:result', { bets });
    }
  }

  io.emit('wingo:round:result', {
    roundId: currentGame.roundId,
    result: {
      number: result.numberResult,
      color: result.colorResult
    }
  });

  io.emit('wingo:round:complete', { roundId: currentGame.roundId });


  startWingoLoop(io);
}, duration);

}

        module.exports = setupWingoSocket;
