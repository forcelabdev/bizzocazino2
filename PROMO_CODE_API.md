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
    "redeemedCode": "TEST200",
    "claimedAt": "2026-08-23T18:00:00.000Z"
  }
}
```

- `redeemedCode`: Başarılı talepte sunucu, kullanıcının `affiliates.redeemedCode` alanına talep edilen `code` değerini yazar. Bu alan kullanıcı üzerinde **kalıcıdır** — aynı kullanıcı tekrar farklı bir promosyon kodu talep etmeye çalıştığında (bu değer zaten doluysa) istek `AFFILIATE_NOT_ELIGIBLE` ile reddedilir.
- Frontend, `redeemedCode` dönen değeri (veya kullanıcı profilinde bu alanı) kontrol ederek "Promosyon Kodu" input/"Kullan" butonunu devre dışı bırakabilir ve zaten kullanılmış kodu gösterebilir (örn. "Kullandığınız kod: TEST200").
- Bu alan kullanıcı profili/oturum verisinde de (`user.affiliates.redeemedCode`) mevcuttur; sayfa yenilendiğinde tekrar `/promo-codes/claim` çağrısı yapmadan, kullanıcı verisini çekerek de aynı bilgiye ulaşılabilir.

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

Not: Kullanıcı zaten bir kod talep etmişse (`affiliates.redeemedCode` doluysa) ve farklı bir kod denerse de hata kodu `AFFILIATE_NOT_ELIGIBLE` olarak döner — mesaj metninden ayırt etmek gerekirse `message` alanına bakılmalı.

Kod talebi sunucuda tarih, aktiflik, VIP seviyesi, kullanıcının `affiliates.redeemedCode` değeri, toplam/kullanıcı limiti ve son onaylı yatırım şartıyla doğrulanır. Başarılı işlemde:
1. Ödül bakiyeye eklenir; ayarlanmışsa çevrim katı ve minimum çekim şartı uygulanır.
2. Kullanıcının `affiliates.redeemedCode` alanına talep edilen kod yazılır (bkz. yukarıdaki `redeemedCode` notu) — bu adım, aynı kullanıcının tekrar kod talep etmesini engellemek için kullanılır.
