const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const User = require("../../database/models/User");
const CryptoAddress = require("../../database/models/CryptoAddress");
const CryptoTransaction = require("../../database/models/CryptoTransaction");
const Report = require("../../database/models/Report");
const BonusSetting = require("../../database/models/BonusSetting");
const Setting = require("../../database/models/Setting");
const BalanceTransaction = require("../../database/models/BalanceTransaction");
const { rateLimiterMiddleware } = require("../../middleware/rateLimiter");

let callbackBlockTransactionCrypto = [];

/* ---------------------- CALLBACK: OXAPAY ---------------------- */
module.exports = (io) => {
  router.post("/oxapay", rateLimiterMiddleware, async (req, res) => {
    try {
      console.log("=== Oxapay Callback Başladı ===");

      // ✅ HMAC doğrulaması
      const hmac = crypto
        .createHmac("sha512", process.env.OXAPAY_API_KEY)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hmac !== req.headers["hmac"]) {
        return res.status(400).json({ success: false, error: "Invalid HMAC signature" });
      }

      const transactionId = req.body.trackId;
      const coinType = req.body.currency.toUpperCase(); // BTC, ETH, USDT
      const chain = (req.body.network || "ERC20").toUpperCase();
      const walletType =
        chain === "TRON" ? "trc-20" : chain === "BNB" ? "bep-20" : "erc-20";

      const cryptoAmount = parseFloat(req.body.amount);

      if (callbackBlockTransactionCrypto.includes(transactionId.toString())) {
        return res.status(400).json({ success: false, error: "Transaction already processed" });
      }
      callbackBlockTransactionCrypto.push(transactionId.toString());

      // ✅ USDT normalize
      const usdtRate = parseFloat(req.body.price);
      const depositUSD = cryptoAmount * usdtRate;

      const [addressData, existingTransaction, settingsDoc] = await Promise.all([
        CryptoAddress.findOne({ name: coinType.toLowerCase(), address: req.body.address })
          .select("address user")
          .populate({ path: "user", select: "wallets affiliates currency" })
          .lean(),
        CryptoTransaction.findOne({ "data.providerId": transactionId }).lean(),
        Setting.findOne().select("exchangeRates general.affiliate").lean()
      ]);

      if (
        req.body.type === "payment" &&
        req.body.status === "Paid" &&
        addressData &&
        !existingTransaction
      ) {
        const user = addressData.user;
        const userId = user._id;
        const exchangeRates = settingsDoc.exchangeRates;

        // ✅ Kullanıcının fiat currency’sine çevir
        const userFiat = user.currency?.fiatCurrency || "USD";
        const fiatRate = exchangeRates[userFiat] || 1;
        const amountFiat = depositUSD * fiatRate;

        // ✅ Doğru wallet’ı bul
        const walletIndex = user.wallets.findIndex(
          w =>
            w.coinType.toUpperCase() === coinType &&
            w.chain.toUpperCase() === chain &&
            w.type.toLowerCase() === walletType
        );
        if (walletIndex === -1) throw new Error("Uygun wallet bulunamadı");

        /* ---------------------- BONUS HESAPLAMA ---------------------- */
        const depositCount = await CryptoTransaction.countDocuments({
          user: userId,
          type: "deposit",
          state: "completed"
        });

        let bonusType = null;
        if (depositCount === 0) bonusType = "first_deposit";
        else if (depositCount === 1) bonusType = "second_deposit";
        else if (depositCount === 2) bonusType = "third_deposit";
        else if (depositCount === 3) bonusType = "fourth_deposit";
        else bonusType = "regular_deposit";

        let bonusAmount = 0;
        const bonusSetting = await BonusSetting.findOne({ type: bonusType, enabled: true });

        if (bonusSetting) {
          const {
            percentage = 0,
            minAmount = 0,
            maxAmount = Infinity,
            maxDepositLimit = Infinity,
            dailyLimit = Infinity
          } = bonusSetting;

          let eligible = true;
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          if (["first_deposit", "second_deposit", "third_deposit", "fourth_deposit"].includes(bonusType)) {
            if (amountFiat < minAmount) eligible = false;
          }

          if (bonusType === "regular_deposit") {
            if (amountFiat > maxDepositLimit) eligible = false;

            if (dailyLimit > 0) {
              const dailyCount = await CryptoTransaction.countDocuments({
                user: userId,
                type: "deposit",
                "data.bonusType": "regular_deposit",
                createdAt: { $gte: now }
              });
              if (dailyCount >= dailyLimit) eligible = false;
            }
          }

          if (eligible) {
            bonusAmount = Math.min((amountFiat * percentage) / 100, maxAmount);
            console.log(`✔️ Bonus uygulandı: ${bonusType} => ${bonusAmount}`);
          } else {
            console.log(`❌ Bonus uygulanamadı: ${bonusType}, koşullar sağlanmadı.`);
          }
        }

        const totalAmount = amountFiat + bonusAmount;

        /* ---------------------- USER UPDATE ---------------------- */
        const updateUser = User.findByIdAndUpdate(
          userId,
          {
            $inc: {
              [`wallets.${walletIndex}.balance`]: totalAmount,
              "stats.deposit": totalAmount,
              "limits.betToWithdraw": totalAmount
            },
            updatedAt: Date.now()
          },
          { new: true }
        ).select("wallets xp stats rakeback mute ban verifiedAt updatedAt").lean();

        /* ---------------------- TRANSACTIONS ---------------------- */
        const createTransaction = CryptoTransaction.create({
          amount: totalAmount,
          data: {
            providerId: transactionId,
            transaction: req.body.txID,
            coinType,
            chain,
            walletType,
            cryptoAmount,
            bonusAmount,
            bonusType,
            userFiat,
            normalizedUSD: depositUSD
          },
          type: "deposit",
          user: userId,
          state: "completed"
        });

        const createBalanceTx = BalanceTransaction.create({
          amount: totalAmount,
          type: "deposit",
          user: userId,
          state: "completed",
          currency: userFiat,
          coinType,
          chain,
          walletType
        });

        const updateReport = Report.findOneAndUpdate(
          { createdAt: new Date().toISOString().slice(0, 10) },
          { $inc: { "stats.total.deposit": totalAmount } },
          { upsert: true }
        );

        const promises = [updateUser, createTransaction, createBalanceTx, updateReport];

        /* ---------------------- AFFILIATE KOMİSYON ---------------------- */
        if (user.affiliates?.referrer) {
          const depositLevels = settingsDoc.general.affiliate.depositLevels;

          const referrers = [];
          if (user.affiliates.referrer) referrers.push({ id: user.affiliates.referrer, level: 1 });
          if (user.affiliates.referrerLevel2) referrers.push({ id: user.affiliates.referrerLevel2, level: 2 });
          if (user.affiliates.referrerLevel3) referrers.push({ id: user.affiliates.referrerLevel3, level: 3 });

          for (const ref of referrers) {
            const refUser = await User.findById(ref.id).select("currency affiliates").lean();
            if (!refUser) continue;

            const refCurrency = refUser.currency?.fiatCurrency || "USD";
            const depositInRefCurrency = depositUSD * (exchangeRates[refCurrency] || 1);

            const commissionRate = (depositLevels[`level${ref.level}`] || 0) / 100;
            const commission = depositInRefCurrency * commissionRate;

            if (commission > 0) {
              promises.push(
                User.findByIdAndUpdate(ref.id, {
                  $inc: {
                    "affiliates.earned": commission,
                    "affiliates.available": commission,
                    "affiliates.deposit": amountFiat
                  },
                  updatedAt: Date.now()
                })
              );

              promises.push(
                BalanceTransaction.create({
                  amount: commission,
                  type: "affiliateDepositCommission",
                  user: ref.id,
                  fromUser: userId,
                  state: "completed",
                  currency: refCurrency,
                  coinType,
                  chain,
                  walletType
                })
              );
            }
          }
        }

        await Promise.all(promises);
      } else {
        console.error("İşlem zaten işlenmiş veya geçersiz ödeme durumu.");
      }

      callbackBlockTransactionCrypto = callbackBlockTransactionCrypto.filter(
        x => x !== transactionId.toString()
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Deposit callback error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
