# Promosyon Kodu Talep Etme API'si

Bu doküman, harici (dış) bir frontend'in kullanıcının girdiği promosyon
kodunu backend'e gönderip bonus/ödülü hesaba işletmesi için kullanılan REST
endpoint'ini açıklar.

> **Not:** Site içi (Socket.IO bağlı) ana frontend, aynı işlemi
> `sockets/general/promo` üzerinden `sendPromoClaim` event'i ile yapar. Bu
> REST endpoint, o akışın YERİNE GEÇMEZ — sadece düz HTTP ile entegre olması
> gereken harici istemciler için eklenmiştir. Her iki akış da aynı
> `PromoCode` koleksiyonunu kullanır, dolayısıyla bir kod hangi yoldan
> kullanılırsa kullanılsın limitler (toplam/kullanıcı bazlı) doğru şekilde
> senkron kalır.

## Endpoint

```
POST https://apibizzocasino.site/promo-codes/claim
```

## Auth

Kullanıcı giriş yapmış olmalı. JWT token'ı `Authorization` header'ında
gönderilir:

```
Authorization: Bearer <JWT>
```

(Alternatif olarak `x-auth-token: <JWT>` header'ı da desteklenir.)

## İstek gövdesi (body)

```json
{
  "code": "TEST200"
}
```

- `code` (string, zorunlu): Kullanıcının girdiği promosyon kodu. Büyük/küçük
  harf duyarsızdır — sunucu tarafında otomatik olarak büyük harfe çevrilip
  öyle aranır (promosyon kodları veritabanında büyük harf olarak saklanır).

## Başarılı cevap

```json
{
  "success": true,
  "data": {
    "code": "TEST200",
    "reward": 1000,
    "balance": 1445.27,
    "claimedAt": "2026-08-24T18:00:00.000Z"
  }
}
```

- `reward`: Talep sonucu hesaba eklenen tutar.
- `balance`: Ödül eklendikten SONRAKİ güncel bakiye.
- `claimedAt`: Talebin işlendiği zaman.

Not: Promosyon kodu talebi, kullanıcının kayıt olurken kullandığı referans/
affiliate kodundan (`affiliates.redeemedCode`) TAMAMEN AYRI bir mekanizmadır.
`affiliates.redeemedCode` sadece kayıt sırasında hangi affiliate/partner
linkiyle geldiğini tutar ve bu cevapta dönmez; promosyon kodu talebiyle
üzerine yazılmaz.

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

Olası hata kodları:

| Kod | Anlamı |
|---|---|
| `CODE_REQUIRED` | `code` alanı boş/eksik gönderildi |
| `CODE_NOT_FOUND` | Bu kodda bir promosyon kaydı yok |
| `CODE_INACTIVE` | Kod admin panelinde pasif duruma alınmış |
| `CODE_NOT_STARTED` | Kodun başlangıç tarihi henüz gelmedi |
| `CODE_EXPIRED` | Kodun süresi dolmuş |
| `TOTAL_LIMIT_REACHED` | Kod için tanımlı toplam kullanım hakkı (`redeemptionsMax`) tükenmiş |
| `USER_LIMIT_REACHED` | Bu kullanıcı, kod için tanımlı kişi başı limiti (`perUserLimit`, varsayılan 1) zaten doldurmuş |
| `VIP_LEVEL_REQUIRED` | Kullanıcının seviyesi kodun gerektirdiği minimum seviyenin (`levelMin`) altında |
| `AFFILIATE_NOT_ELIGIBLE` | Kod belirli affiliate/partner gruplarına özel (`affiliateCodes`) ve kullanıcı bu gruplarda değil |
| `DEPOSIT_REQUIRED` | Kullanıcının son onaylı yatırımı, kodun gerektirdiği minimum tutarın (`minLastDeposit`) altında |
| `CONDITIONS_NOT_MET` | Admin panelinde tanımlanan segment koşulları (yatırım/çekim/üyelik yaşı vb.) karşılanmadı |
| `USER_NOT_FOUND` | Token'daki kullanıcı bulunamadı |
| `ALREADY_PROCESSING` | Aynı kullanıcı için aynı kod zaten işleniyor (çift tıklama koruması) |
| `INTERNAL_ERROR` | Sunucu tarafında beklenmeyen hata |

## Doğrulama sırası (backend `services/promoCodeService.js`)

1. Kod var mı, aktif mi, başlama/bitiş tarihi uygun mu
2. Toplam kullanım limiti (`redeemptionsMax`) dolmuş mu
3. Bu kullanıcı kişi başı limiti (`perUserLimit`) doldurmuş mu
4. Kullanıcının seviyesi (`levelMin`) yeterli mi
5. Kod belirli affiliate gruplarına özelse (`affiliateCodes`), kullanıcı uygun mu
6. Kullanıcının son onaylı yatırımı (`minLastDeposit`) yeterli mi
7. Admin panelinde tanımlı ek segment koşulları (`conditions`: deposit/withdraw/membershipAgeDays/depositSinceDate) karşılanıyor mu

Tüm adımlar geçerse: ödül bakiyeye eklenir; kod `applyWageringLock: true` ise
ödülün `wageringMultiplier` katı kadar çevrim şartı (`limits.betToWithdraw`)
uygulanır; `minWithdraw` tanımlıysa kullanıcının minimum çekim limiti buna
göre güncellenir.
