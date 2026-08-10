const crypto = require("crypto");

// Oxapay'den gelen callback verisi
const payload = JSON.stringify({
  trackId: "123456",
  currency: "BTC",
  amount: "0.001",
  address: "1A2B3C4D5E6F7G8H9I0J",
  status: "Paid",
  txID: "abcd1234",
  type: "payment"
});

// Oxapay API anahtarınız (sunucunuzda tanımlı olan anahtar)
const secretKey = "3FAS57-56DNLF-AGHMKU-UGEX1T"; // .env dosyasındaki "OXAPAY_API_KEY" ile aynı olmalı

// HMAC Hesaplama
const hmac = crypto.createHmac("sha512", secretKey).update(payload).digest("hex");

console.log("HMAC:", hmac);
