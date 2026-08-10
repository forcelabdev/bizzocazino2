// Load database models
const User = require("../../../database/models/User");
const CryptoPrice = require("../../../database/models/CryptoPrice");
const CryptoAddress = require("../../../database/models/CryptoAddress");
const CryptoTransaction = require("../../../database/models/CryptoTransaction");
const BalanceTransaction = require("../../../database/models/BalanceTransaction");

const axios = require("axios");

// Load utils
const { socketRemoveAntiSpam } = require("../../../utils/socket");
const {
  cashierCheckSendCryptoWithdrawData,
  cashierCheckSendCryptoWithdrawUser,
  cashierCheckSendCryptoWithdrawTransactions,
  cashierCryptoGetPrices,
  cashierCryptoGenerateAddress,
} = require("../../../utils/cashier/crypto");
const { createAdminNotification } = require("../../../utils/adminNotification");

const cashierGetCryptoDataSocket = async (io, socket, user, data, callback) => {
  try {
    // Get users crypto deposit addresses and crypto prices from database
    let dataDatabase = await Promise.all([
      CryptoAddress.find({ user: user._id }).select("name address user").lean(),
      CryptoPrice.find({}).select("name price fee").lean(),
    ]);

    if (dataDatabase[0].length <= 0) {
      // Generate new crypto addresses with coinpayments api
      const addresses = await Promise.all([
        cashierCryptoGenerateAddress("btc"),
        cashierCryptoGenerateAddress("eth"),
        cashierCryptoGenerateAddress("ltc"),
        cashierCryptoGenerateAddress("usdt"),
        
        cashierCryptoGenerateAddress("usdc"),
        cashierCryptoGenerateAddress("trx"), // TRX cüzdanı oluştur
      ]);

      // Save users crypto deposit addresses in database
      await Promise.all([
        CryptoAddress.create({ name: "btc", address: addresses[0].address, user: user._id }),
        CryptoAddress.create({ name: "eth", address: addresses[1].address, user: user._id }),
        CryptoAddress.create({ name: "ltc", address: addresses[2].address, user: user._id }),
        CryptoAddress.create({ name: "usdt", address: addresses[3].address, user: user._id }),
        CryptoAddress.create({ name: "usdc", address: addresses[4].address, user: user._id }),
        CryptoAddress.create({ name: "trx", address: addresses[5].address, user: user._id }), // TRX cüzdanını kaydet
      ]);

      // Format crypto addresses
      dataDatabase[0] = {
        btc: addresses[0].address,
        eth: addresses[1].address,
        ltc: addresses[2].address,
        usdt: addresses[3].address,
        usdc: addresses[4].address,
        trx: addresses[5].address, // TRX adresini ekle
      };
    } else {
      // Format crypto addresses
      dataDatabase[0] = dataDatabase[0].reduce((acc, currency) => {
        acc[currency.name] = currency.address;
        return acc;
      }, {});
    }

    // Format crypto prices
    dataDatabase[1] = dataDatabase[1].reduce((acc, currency) => {
      acc[currency.name] = { price: currency.price, fee: currency.fee };
      return acc;
    }, {});

    callback({
      success: true,
      addresses: dataDatabase[0],
      prices: dataDatabase[1],
    });
  } catch (err) {
    console.log("user error", err);

    callback({
      success: false,
      error: { type: "error", message: err.message },
    });
  }
};

const cashierSendCryptoWithdrawSocket = async (io, socket, user, data, callback) => {
  try {
    // Normalize incoming data
    const coinType = (data.coinType || "").toLowerCase();
    const chain = (data.chain || "").toUpperCase();
    const walletType = (data.walletType || "").toLowerCase();
    const address = (data.address || "").trim();

    // Get crypto prices and pending tx
    let [priceDoc, pendingTxs] = await Promise.all([
      CryptoPrice.findOne({ name: coinType }).select("name price").lean(),
      CryptoTransaction.find({ user: user._id, state: "pending" }).select("user state").lean()
    ]);

    if (!priceDoc) throw new Error("You’ve entered an invalid withdraw currency.");

    cashierCheckSendCryptoWithdrawTransactions(pendingTxs);

    // Kullanıcının DB’den full kaydını al
    const freshUser = await User.findById(user._id).lean();
    if (!freshUser) throw new Error("User not found");

    // Kullanıcının coinType cüzdanını bul
    const walletIndex = freshUser.wallets.findIndex(
      w => (w.coinType || "").toLowerCase() === coinType
    );

    if (walletIndex === -1) throw new Error("Bu coin için cüzdan bulunamadı");

    const wallet = freshUser.wallets[walletIndex];
    if (wallet.balance < data.amount) throw new Error("Yetersiz bakiye");

    // Fiat cinsinden amount
    const amount = Math.floor(data.amount);

    // Kripto miktarını hesapla (ör: satoshi normalize)
    const amountCurrency = Math.floor(((amount) / priceDoc.price) * 1e8);

    // Kullanıcı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $inc: {
          [`wallets.${walletIndex}.balance`]: -amount,
          "stats.withdraw": amount
        },
        updatedAt: Date.now()
      },
      { new: true }
    ).select("wallets xp stats rakeback mute ban verifiedAt updatedAt").lean();

    // İşlem kaydı
    const newTx = await CryptoTransaction.create({
      amount,
      data: {
        receiver: address,
        coinType: coinType.toUpperCase(),
        chain: chain,
        walletType: walletType,
        cryptoAmount: amountCurrency
      },
      type: "withdraw",
      user: user._id,
      state: "pending"
    });

    // BalanceTransaction kaydı
    await BalanceTransaction.create({
      amount,
      type: "withdraw",
      user: user._id,
      state: "pending",
      currency: freshUser.currency?.fiatCurrency || "USD",
      coinType: coinType.toUpperCase(),
      chain: chain,
      walletType: walletType
    });

    callback({
      success: true,
      user: updatedUser,
      transaction: newTx.toObject()
    });

    createAdminNotification(
      "withdraw",
      "Yeni Çekim Talebi",
      `${freshUser.username || "Kullanıcı"} kullanıcısı ${amount} ₺ tutarında Kripto (${coinType.toUpperCase()}) çekim talebi oluşturdu.`,
      "/apps/finance/withdraw",
      { provider: "Kripto", amount, username: freshUser.username, userId: user._id, coinType }
    );

    socketRemoveAntiSpam(user._id);
  } catch (err) {
    socketRemoveAntiSpam(socket.decoded._id);
    callback({
      success: false,
      error: { type: "error", message: err.message }
    });
  }
};







const cashierCryptoCheckPrices = async () => {
  try {
    // Get crypto prices from Oxapay API
    const dataPrices = await cashierCryptoGetPrices();

    // Get bitcoin price
    const priceBtc = Math.floor(dataPrices.BTC * 1000);

    // Update crypto prices in the database
    await Promise.all([
      CryptoPrice.findOneAndUpdate(
        { name: "btc" },
        {
          price: priceBtc,
          fee: Math.floor((0.001 / 1) * priceBtc), // Example fee calculation, adjust as needed
        },
        { upsert: true }
      ),
      CryptoPrice.findOneAndUpdate(
        { name: "eth" },
        {
          price: Math.floor(priceBtc * (dataPrices.ETH / dataPrices.BTC)),
          fee: Math.floor(
            (0.01 / 1) * priceBtc * (dataPrices.ETH / dataPrices.BTC)
          ), // Example fee calculation, adjust as needed
        },
        { upsert: true }
      ),
      CryptoPrice.findOneAndUpdate(
        { name: "ltc" },
        {
          price: Math.floor(priceBtc * (dataPrices.LTC / dataPrices.BTC)),
          fee: Math.floor(
            (0.01 / 1) * priceBtc * (dataPrices.LTC / dataPrices.BTC)
          ), // Example fee calculation, adjust as needed
        },
        { upsert: true }
      ),
      CryptoPrice.findOneAndUpdate(
        { name: "usdt" },
        {
          price: Math.floor(priceBtc * (dataPrices.USDT / dataPrices.BTC)),
          fee: Math.floor(
            (0.01 / 1) * priceBtc * (dataPrices.USDT / dataPrices.BTC)
          ), // Example fee calculation, adjust as needed
        },
        { upsert: true }
      ),
      CryptoPrice.findOneAndUpdate(
        { name: "trx" },
        {
          price: Math.floor(priceBtc * (dataPrices.TRX / dataPrices.BTC)), // TRX fiyatı
          fee: Math.floor((0.01 / 1) * priceBtc * (dataPrices.TRX / dataPrices.BTC)), // TRX işlem ücreti
        },
        { upsert: true }
      ),
      CryptoPrice.findOneAndUpdate(
        { name: "usdc" },
        {
          price: Math.floor(priceBtc * (dataPrices.USDC / dataPrices.BTC)),
          fee: Math.floor(
            (0.01 / 1) * priceBtc * (dataPrices.USDC / dataPrices.BTC)
          ), // Example fee calculation, adjust as needed
        },
        { upsert: true }
      ),
    ]);

    setTimeout(() => {
      cashierCryptoCheckPrices();
    }, 1000 * 60 * 60 * 6);
  } catch (err) {
    console.error(err);
    setTimeout(() => {
      cashierCryptoCheckPrices();
    }, 1000 * 60 * 60 * 6);
  }
};

const cashierCryptoInit = (io) => {
  try {
    // Check for crypto prices
    cashierCryptoCheckPrices();
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  cashierGetCryptoDataSocket,
  cashierSendCryptoWithdrawSocket,
  cashierCryptoInit,
};
