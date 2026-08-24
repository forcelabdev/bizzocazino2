# Bonus Geçmişi API

Kullanıcının "Bonus Geçmişi" sekmesinde (Geçmiş > Bonus Geçmişi) göstermesi
gereken, kullanıcıya ait tüm bonus/promosyon kayıtlarını döner. Bu, admin
panelindeki `/admin/users/:id/bonus-history` (admin yetkili, herhangi bir
kullanıcı için) endpoint'inden AYRIDIR — bu endpoint son kullanıcı içindir ve
yalnızca kendi bonus geçmişini görebilir.

## İstek

```
GET /bonus-history/:userId
Authorization: Bearer <JWT>
```

- `:userId`, token'daki kullanıcının `_id`'si ile **birebir aynı** olmalıdır.
  Farklı bir `userId` denenirse `403` döner (IDOR koruması).
- Opsiyonel query parametreleri (ekran görüntüsündeki "Başlangıç"/"Bitiş"
  tarih filtreleri için):
  - `startDate` — `YYYY-MM-DD` formatında, bu tarih dahil ve sonrası.
  - `endDate` — `YYYY-MM-DD` formatında, bu tarih dahil ve öncesi (günün son
    saniyesine kadar dahil edilir).

Örnek:
```
GET /bonus-history/64f1c2.../?startDate=2026-07-24&endDate=2026-08-24
```

## Başarılı cevap

```json
{
  "success": true,
  "bonuses": [
    {
      "source": "manual_adjustment",
      "bonusType": "trial_bonus",
      "title": "Deneme Bonusu",
      "bonusAmount": 1000,
      "currency": null,
      "status": "completed",
      "note": "Otomatik deneme bonusu",
      "createdAt": "2026-08-20T14:32:10.000Z"
    },
    {
      "source": "balance",
      "bonusType": "promoCodeClaim",
      "title": "Promosyon Kodu",
      "bonusAmount": 200,
      "currency": null,
      "status": "completed",
      "createdAt": "2026-08-18T09:12:00.000Z"
    },
    {
      "source": "vip",
      "bonusType": "dailyVipReward",
      "title": "Günlük VIP Ödülü",
      "bonusAmount": 50,
      "level": 3,
      "currency": null,
      "status": "completed",
      "createdAt": "2026-08-17T00:05:00.000Z"
    },
    {
      "source": "campaign",
      "bonusType": "campaign",
      "title": "3 Yatırım Yap 4. Yatırımın Bizden",
      "bonusAmount": 500,
      "currency": null,
      "status": "completed",
      "createdAt": "2026-08-10T11:00:00.000Z"
    },
    {
      "source": "crypto",
      "bonusType": "welcome",
      "title": "Hoş Geldin Bonusu",
      "bonusAmount": 300,
      "currency": "TRY",
      "status": "completed",
      "createdAt": "2026-08-05T08:00:00.000Z"
    }
  ]
}
```

Liste `createdAt`'e göre en yeniden en eskiye sıralıdır.

### Alan açıklamaları

| Alan | Açıklama |
|---|---|
| `source` | Verinin geldiği iç kaynak: `manual_adjustment` (admin tarafından atanan deneme/yatırım/kayıp/reload/manuel bonus), `balance` (promosyon kodu, rakeback, affiliate, yağmur bonusu vb.), `vip` (VIP günlük/seviye ödülü), `campaign` (kampanya bonusu), `crypto` (yatırıma bağlı hoş geldin/freespin bonusu). Sadece hata ayıklama/gruplama amaçlıdır, UI'da göstermek gerekmez. |
| `bonusType` | İç kod (örn. `trial_bonus`, `promoCodeClaim`, `dailyVipReward`). |
| `title` | Kullanıcıya gösterilecek hazır Türkçe başlık — genelde bu alanı doğrudan göstermeniz yeterli. |
| `bonusAmount` | Bonus tutarı (kullanıcının fiat para birimi cinsinden). |
| `currency` | Bazı kayıtlarda (örn. `crypto` kaynaklı) para birimi kodu; yoksa `null` — bu durumda kullanıcının varsayılan para birimini kullanın. |
| `status` | `completed` / `pending` / `cancelled` vb. |
| `level` | Sadece VIP kaynaklı kayıtlarda dolu — kazanılan VIP seviyesi. |
| `note` | Sadece `manual_adjustment` kaynağında dolu — admin notu (opsiyonel gösterim). |
| `createdAt` | ISO 8601 tarih. |

## Hata cevabı

```json
{ "success": false, "error": "Yalnızca kendi bonus geçmişinizi görüntüleyebilirsiniz." }
```

veya sunucu hatasında:
```json
{ "success": false, "error": "Server error" }
```
