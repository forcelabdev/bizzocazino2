const crypto = require("crypto")

// İstek payload'ı (Oxapay'in gönderdiği gibi)
const payload = {
  trackId: "TEST123435256451111",
  currency: "trx",
  amount: "1000",
  price: "0.1",
  address: "TYFv74rurP2EVnQFo6K13SEeNDwFysaMTf",
  txID: "FAKE_TX_ID4",
  type: "payment",
  status: "Paid"
}

// Bu senin .env'de tanımladığın OXAPAY_API_KEY ile aynı olmalı
const apiKey = "3FAS57-56DNLF-AGHMKU-UGEX1T"

// HMAC hesaplama
const hmac = crypto
  .createHmac("sha512", apiKey)
  .update(JSON.stringify(payload))
  .digest("hex")

console.log("HMAC:", hmac)
