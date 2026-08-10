const FuturesBet = require('../../database/models/FuturesBet');
const User = require('../../database/models/User');
const { emitUserBalance } = require('../../utils/wallet');

// Kar/zarar hesaplama fonksiyonu
const calculateProfitLoss = (bet, currentPrice) => {
  if (bet.direction === 'LONG') {
    const priceDifference = currentPrice - bet.entryPrice;
    const profitLossPercentage = (priceDifference / bet.entryPrice) * bet.leverage;
    return bet.amount * profitLossPercentage;
  } else {
    const priceDifference = bet.entryPrice - currentPrice;
    const profitLossPercentage = (priceDifference / bet.entryPrice) * bet.leverage;
    return bet.amount * profitLossPercentage;
  }
};

// Pozisyon açma
exports.futuresOpen = async (io, socket, user, data, callback) => {
  try {
    const {
      symbol,
      amount,
      leverage,
      direction,
      stopLossPercent,
      takeProfitPercent,
      entryPrice
    } = data;

    // Wallet bul
    const wallet = user.wallets.find(w =>
      w.coinType === user.currency.coinType &&
      w.chain === user.currency.chain &&
      w.type === user.currency.type
    );

    if (!wallet) {
      throw new Error("Cüzdan bulunamadı");
    }

    if (wallet.balance < amount) {
      throw new Error("Yetersiz bakiye");
    }

    // Likidasyon fiyatı hesapla
    const liqPrice = direction === "LONG" 
      ? entryPrice * (1 - (1 / leverage)) 
      : entryPrice * (1 + (1 / leverage));

    // Pozisyon oluştur
    const bet = await FuturesBet.create({
      user: user._id,
      symbol,
      amount,
      leverage,
      direction,
      stopLossPercent,
      takeProfitPercent,
      entryPrice,
      liqPrice,
      status: 'open'
    });

    // Bakiyeyi güncelle
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { "wallets.$[elem].balance": -amount } },
      { 
        arrayFilters: [{ 
          "elem.coinType": user.currency.coinType,
          "elem.chain": user.currency.chain,
          "elem.type": user.currency.type
        }],
        new: true
      }
    ).select('wallets balance');

    // Socket ile bakiye güncellemesi bildir
    emitUserBalance(io, updatedUser);

    callback({ 
      success: true, 
      bet,
      newBalance: updatedUser.wallets.find(w =>
        w.coinType === user.currency.coinType &&
        w.chain === user.currency.chain &&
        w.type === user.currency.type
      ).balance
    });

  } catch (err) {
    callback({ success: false, error: { message: err.message } });
  }
};

// Pozisyon kapatma
exports.futuresClose = async (io, socket, user, data, callback) => {
  try {
    const { betId, currentPrice } = data;
    
    const bet = await FuturesBet.findOne({ _id: betId, user: user._id, status: 'open' });
    if (!bet) throw new Error("Açık pozisyon bulunamadı");
    
    // Kar/zarar hesapla
    const profitLoss = calculateProfitLoss(bet, currentPrice);
    
    // Bakiyeyi güncelle (pozisyon miktarı + kar/zarar)
    const totalAmount = bet.amount + profitLoss;
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { "wallets.$[elem].balance": totalAmount } },
      { 
        arrayFilters: [{ 
          "elem.coinType": user.currency.coinType,
          "elem.chain": user.currency.chain,
          "elem.type": user.currency.type
        }],
        new: true
      }
    ).select('wallets balance');

    // Socket ile bakiye güncellemesi bildir
    emitUserBalance(io, updatedUser);

    // Pozisyonu kapat
    await FuturesBet.findByIdAndUpdate(betId, { 
      status: "closed", 
      closedAt: new Date(),
      exitPrice: currentPrice,
      profitLoss: profitLoss
    });

    callback({ 
      success: true, 
      profitLoss,
      newBalance: updatedUser.wallets.find(w =>
        w.coinType === user.currency.coinType &&
        w.chain === user.currency.chain &&
        w.type === user.currency.type
      ).balance
    });

  } catch (err) {
    callback({ success: false, error: { message: err.message } });
  }
};

// Likidasyon işlemi
exports.futuresLiquidate = async (io, socket, user, data, callback) => {
  try {
    const { betId } = data;
    
    const bet = await FuturesBet.findOne({ _id: betId, user: user._id, status: 'open' });
    if (!bet) throw new Error("Açık pozisyon bulunamadı");
    
    // Likidasyonda tüm para kaybedilir, sadece pozisyon kapatılır
    await FuturesBet.findByIdAndUpdate(betId, { 
      status: "liquidated", 
      closedAt: new Date(),
      exitPrice: bet.liqPrice, // Likidasyon fiyatı
      profitLoss: -bet.amount // Tüm para kaybedildi
    });

    callback({ 
      success: true, 
      message: "Pozisyon likide oldu",
      amountLost: bet.amount
    });

  } catch (err) {
    callback({ success: false, error: { message: err.message } });
  }
};

// Stop-loss/Take-profit kontrolü (periodic olarak çalıştırılacak)
exports.checkSlTp = async (currentPrices) => {
  try {
    const openBets = await FuturesBet.find({ status: 'open' });
    
    for (const bet of openBets) {
      const currentPrice = currentPrices[bet.symbol];
      if (!currentPrice) continue;

      // Stop-loss kontrolü
      if (bet.stopLossPercent) {
        const slPrice = bet.direction === 'LONG' 
          ? bet.entryPrice * (1 - bet.stopLossPercent / 100)
          : bet.entryPrice * (1 + bet.stopLossPercent / 100);
        
        if ((bet.direction === 'LONG' && currentPrice <= slPrice) ||
            (bet.direction === 'SHORT' && currentPrice >= slPrice)) {
          await exports.autoCloseBet(bet, currentPrice, 'stop-loss');
        }
      }

      // Take-profit kontrolü
      if (bet.takeProfitPercent) {
        const tpPrice = bet.direction === 'LONG' 
          ? bet.entryPrice * (1 + bet.takeProfitPercent / 100)
          : bet.entryPrice * (1 - bet.takeProfitPercent / 100);
        
        if ((bet.direction === 'LONG' && currentPrice >= tpPrice) ||
            (bet.direction === 'SHORT' && currentPrice <= tpPrice)) {
          await exports.autoCloseBet(bet, currentPrice, 'take-profit');
        }
      }

      // Likidasyon kontrolü
      if ((bet.direction === 'LONG' && currentPrice <= bet.liqPrice) ||
          (bet.direction === 'SHORT' && currentPrice >= bet.liqPrice)) {
        await exports.autoCloseBet(bet, currentPrice, 'liquidation');
      }
    }
  } catch (err) {
    console.error('SL/TP kontrol hatası:', err);
  }
};

// Otomatik pozisyon kapatma
exports.autoCloseBet = async (bet, currentPrice, closeType) => {
  const profitLoss = calculateProfitLoss(bet, currentPrice);
  
  if (closeType === 'liquidation') {
    // Likidasyonda para eklenmez
    await FuturesBet.findByIdAndUpdate(bet._id, {
      status: "liquidated",
      closedAt: new Date(),
      exitPrice: currentPrice,
      profitLoss: -bet.amount,
      closeType: 'liquidation'
    });
  } else {
    // Kar/zararı kullanıcıya ekle
    await User.findByIdAndUpdate(
      bet.user,
      { $inc: { "wallets.$[elem].balance": bet.amount + profitLoss } },
      { 
        arrayFilters: [{ 
          "elem.coinType": bet.user.currency.coinType,
          "elem.chain": bet.user.currency.chain,
          "elem.type": bet.user.currency.type
        }]
      }
    );

    await FuturesBet.findByIdAndUpdate(bet._id, {
      status: "closed",
      closedAt: new Date(),
      exitPrice: currentPrice,
      profitLoss: profitLoss,
      closeType: closeType
    });
  }

  // Kullanıcıya bildirim gönder
  const io = require('../../server').io;
  io.to(bet.user.toString()).emit('futures:auto-close', {
    betId: bet._id,
    closeType,
    profitLoss,
    currentPrice
  });
};