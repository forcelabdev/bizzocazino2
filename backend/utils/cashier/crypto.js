const validator = require("validator");
const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");

const cashierCheckSendCryptoWithdrawData = (data) => {
  if (data === undefined || data === null) {
    throw new Error("Something went wrong. Please try again in a few seconds.");
  } else if (
    data.currency === undefined ||
    typeof data.currency !== "string" ||
    ["btc", "eth", "ltc", "usdt"].includes(data.currency) !== true
  ) {
    throw new Error("You’ve entered an invalid withdraw currency.");
  } else if (
    data.amount === undefined ||
    isNaN(data.amount) === true ||
    Math.floor(data.amount) <= 0
  ) {
    throw new Error("You’ve entered an invalid withdraw amount.");
  } else if (
    data.address === undefined ||
    typeof data.address !== "string" ||
    (data.currency === "btc" &&
      validator.isBtcAddress(data.address) !== true) ||
    (data.currency === "eth" &&
      validator.isEthereumAddress(data.address) !== true) ||
    (data.currency === "ltc" &&
      /^([LM3]{1}[a-km-zA-HJ-NP-Z1-9]{26,33}||ltc1[a-z0-9]{39,59})$/.test(
        data.address
      ) !== true) ||
    (data.currency === "usdt" &&
      data.network === "trc20" &&
      /^T[a-zA-Z0-9]{33}$/.test(data.address) !== true)
  ) {
    throw new Error(
      `You’ve entered an invalid ${data.currency} withdraw address.`
    );
  }
};


const cashierCheckSendCryptoWithdrawUser = (data, user) => {
  if (user.balance < Math.floor(data.amount)) {
    throw new Error("You don’t have enough balance for this action.");
  } else if (user.limits.betToWithdraw >= 10) {
    throw new Error(
      `You need to wager ${parseFloat(
        Math.floor(user.limits.betToWithdraw / 10) / 100
      )
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} more before you can withdraw.`
    );
  } else if (user.limits.blockSponsor === true) {
    throw new Error(
      "You aren`t allowed to withdraw at the moment. Please contact the support for more information."
    );
  }
};

const cashierCheckSendCryptoWithdrawTransactions = (transactionsDatabase) => {
  if (transactionsDatabase.length >= 5) {
    throw new Error(
      "You aren`t allowed to have more then 5 pending crypto withdraws."
    );
  }
};



const cashierCryptoGetPrices = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // const response = await axios.get('https://api.oxapay.com/price', {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.OXAPAY_API_KEY}`
      //   }
      // });

      let response = await axios.get("https://api.oxapay.com/api/prices", {
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(response.data);

      if (response.status === 200 && response.data.result === 100) {
        resolve(response.data.data);
      } else {
        reject(new Error(response.data.message || "Failed to fetch prices"));
      }
    } catch (err) {
      reject(err);
    }
  });
};

const cashierCryptoGenerateAddress = (currency) => {
  return new Promise(async (resolve, reject) => {
    try {
      const body = {
        merchant: process.env.OXAPAY_API_KEY,
        currency: currency,
        callbackUrl: `${process.env.SERVER_BACKEND_URL}/callback/oxapay`,
        description: "Static address for deposits",
        orderId: `${currency}-static-address-${Date.now()}`, // Benzersiz bir orderId oluştur
      };

      const response = await axios.post(
        "https://api.oxapay.com/merchants/request/staticaddress",
        body,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 && response.data.result === 100) {
        resolve(response.data); // Adres bilgisi response'da yer alıyor
      } else {
        reject(new Error(response.data.message || "Failed to generate address"));
      }
    } catch (err) {
      reject(err);
    }
  });
};


module.exports = {
  cashierCheckSendCryptoWithdrawData,
  cashierCheckSendCryptoWithdrawUser,
  cashierCheckSendCryptoWithdrawTransactions,
  cashierCryptoGetPrices,
  cashierCryptoGenerateAddress,
};
