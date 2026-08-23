# Promosyon Kodu Talep API

## Endpoint

`POST /promo-codes/claim`

Kullanıcı kimliği payload'dan alınmaz. Giriş tokenı aşağıdaki başlıklardan biriyle gönderilir:

```http
Authorization: Bearer <JWT>
```

veya:

```http
x-auth-token: <JWT>
```

## İstek

```json
{
  "code": "TEST200"
}
```

### Axios örneği

```js
const response = await axios.post(
  `${API_BASE_URL}/promo-codes/claim`,
  { code: promoCode.trim() },
  { headers: { Authorization: `Bearer ${accessToken}` } },
)
```

### cURL örneği

```bash
curl -X POST "$API_BASE_URL/promo-codes/claim" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST200"}'
```

## Başarılı cevap

```json
{
  "success": true,
  "data": {
    "code": "TEST200",
    "reward": 1000,
    "balance": 1445.27,
    "claimedAt": "2026-08-23T18:00:00.000Z"
  }
}
```

## Hata cevabı

```json
{
  "success": false,
  "error": {
    "code": "AFFILIATE_NOT_ELIGIBLE",
    "message": "Bu promosyon kodu affiliate grubunuza uygun değil."
  }
}
```

Olası hata kodları: `CODE_REQUIRED`, `CODE_NOT_FOUND`, `CODE_INACTIVE`, `CODE_NOT_STARTED`, `CODE_EXPIRED`, `TOTAL_LIMIT_REACHED`, `USER_LIMIT_REACHED`, `AFFILIATE_NOT_ELIGIBLE`, `VIP_LEVEL_REQUIRED`, `DEPOSIT_REQUIRED`, `USER_NOT_FOUND`, `INTERNAL_ERROR`.

Kod talebi sunucuda tarih, aktiflik, VIP seviyesi, kullanıcının `affiliates.redeemedCode` değeri, toplam/kullanıcı limiti ve son onaylı yatırım şartıyla doğrulanır. Başarılı işlemde ödül bakiyeye eklenir; ayarlanmışsa çevrim katı ve minimum çekim şartı uygulanır.
