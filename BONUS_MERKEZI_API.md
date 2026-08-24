# Bonus Merkezi API Dokümanı

Bu doküman, ayrı bir sunucuda barınan **kendi frontend'iniz** (Bonus Merkezi
sayfası) için gereken tüm backend endpoint'lerini kapsar:

1. Spor Bahisleri Turnuvası
2. Bilet Etkinlikleri
3. Çevrim Turnuvası (Race)
4. Deneme Bonusu Talep Sistemi
5. Yatırım Bonusu Talep Sistemi
6. Kayıp Bonusu Talep Sistemi
7. Reload Bonusu Talep Sistemi
8. Promosyon Kodu Sistemi

Tüm sistemler **aynı site, aynı kullanıcılar** için çalışır: kullanıcı normal
login akışıyla aldığı JWT'yi bu endpoint'lere gönderir, kendi bonusunu/sırasını
görür. Bu doküman dış/partner site entegrasyonlarını (API-key korumalı,
kullanıcı adı maskelenmiş endpoint'ler) KAPSAMAZ — onlar zaten `betcolabs`,
`betinovi` gibi harici sağlayıcılar için ayrı bir mekanizmadır.

## 0. Genel Bilgiler

### Base URL

```
{SERVER_BACKEND_URL}
```

### Auth

Tüm "Zorunlu auth" işaretli endpoint'lerde, login sırasında alınan JWT şu iki
başlıktan biriyle gönderilir:

```http
Authorization: Bearer <JWT>
```

veya

```http
x-auth-token: <JWT>
```

Token eksik/geçersizse backend `401` döner:

```json
{
  "success": false,
  "error": { "type": "error", "message": "Authorization denied." }
}
```

### Hesap askıya alınmışsa

Hesap `suspended` durumundaysa, token gerektiren TÜM endpoint'ler `403` ile
aşağıdaki sabit sözleşmeyi döner. Frontend bunu merkezi bir interceptor'da
yakalamalı, token'ı temizlemeli ve kullanıcıyı bilgilendirmelidir:

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "accountStatus": "suspended",
  "message": "Hesabınız pasif durumdadır. Canlı destek ile iletişime geçin."
}
```

### Ortak "bonus kilidi" (bonusLock / reloadLock) kavramı

Deneme, Yatırım ve Kayıp bonusları **aynı kilidi** (`bonusLock`) paylaşır: biri
aktifken diğerleri talep edilemez. Reload Bonusu ise tamamen **bağımsız**
kendi kilidine (`reloadLock`) sahiptir — Reload aktifken diğer bonuslar
etkilenmez, diğer bonuslar aktifken Reload etkilenmez. Çekim (withdraw) ise
HER İKİ kilit türünden biri "çevrim bazlı" ve aktifse engellenir.

Kilit durumunu tek seferde öğrenmek için:

### GET /users/wagering-status

- Auth: Zorunlu
- Amaç: Aktif bir Yatırım/Kayıp Bonusu çevrimi (`bonusLock`) ve/veya bağımsız
  bir Reload Bonusu çevrimi (`reloadLock`) olup olmadığını, ilerlemeyi ve
  çekimin engellenip engellenmediğini döner. Bonus Merkezi ana sayfasında
  "aktif bonus / kalan çevrim" kartı için kullanılır.

```json
{
  "status": "success",
  "data": {
    "withdrawal_blocked": true,
    "bonus_lock": {
      "active": true,
      "type": "wagering",
      "source": "deposit_bonus",
      "bonusAmount": 500,
      "wageringMultiplier": 3,
      "wageringRequired": 1500,
      "wageringProgress": 420.5,
      "wageringRemaining": 1079.5,
      "wageringSince": "2026-08-20T10:00:00.000Z"
    },
    "reload_lock": { "active": false }
  }
}
```

`bonus_lock.type` değerleri:
- `"wagering"`: Çevrim bazlı kilit, hem yeni bonus talebini hem çekimi
  engeller. `wageringRemaining` sıfıra ininceye kadar aktiftir.
- `"time"`: Sadece zaman bazlı (eski/basit davranış), yalnızca yeni bonus
  talebini engeller — çekimi ENGELLEMEZ. `blockedUntil` alanı bulunur.
- `bonus_lock.active === false` ise kilit yok, ikisi de serbest.

---

## 1. Deneme Bonusu Talep Sistemi

Kullanıcı hesap başına **bir kez** talep edebilir (partial unique index ile
veritabanı seviyesinde de garanti edilir).

### GET /bonus/trial/potential

- Auth: Zorunlu

```json
{
  "success": true,
  "data": {
    "amount": 50,
    "eligible": true,
    "message": "50 TL deneme bonusu talep edebilirsiniz.",
    "autoApprove": true,
    "alreadyClaimed": false
  }
}
```

### POST /bonus/trial/claim

- Auth: Zorunlu
- Body: yok (`{}`)

```json
{
  "success": true,
  "message": "Deneme bonusu talebiniz alındı.",
  "data": {
    "claim": { "_id": "...", "amount": 50, "status": "approved" },
    "newBalance": 550
  }
}
```

`data.claim.status` otomatik onay ayarına göre `"approved"` veya `"pending"`
olabilir; `"pending"` ise admin onayı beklenir ve bakiye o an değişmez.

Hata örneği (aynı format tüm bonus sistemlerinde geçerlidir — `message` zaten
Türkçe, ek çeviri gerekmez):

```json
{ "success": false, "message": "Deneme bonusunu daha önce talep ettiniz." }
```

Olası mesajlar: `Kullanıcı bulunamadı.`, `Deneme bonusu şu anda aktif değil.`,
`Yakın zamanda alınan bir bonus nedeniyle şu anda başka bonus talep
edemezsiniz.` (bir bonus_lock aktifken), `Deneme bonusunu daha önce talep
ettiniz.`, `Deneme bonusu tutarı geçersiz.` — 400; tanımsız hatalar 500 ile
`Sunucu hatası.` döner.

---

## 2. Yatırım Bonusu Talep Sistemi

Mantık: kullanıcının **son talep tarihinden şu ana kadar** yaptığı toplam
onaylı yatırım hesaplanır. Bu süre içinde tek bir bahis/oyun kaydı bile
varsa dönem "kirlenmiş" sayılır ve talep reddedilir.

### GET /users/deposit-bonus/potential

- Auth: Zorunlu

```json
{
  "status": "success",
  "data": {
    "total_deposit": 1000,
    "has_bet_since_deposit": false,
    "bonus_rate": 20,
    "potential_bonus": 200,
    "is_eligible": true,
    "message": "200 TL yatırım bonusu talep edebilirsiniz."
  }
}
```

### POST /users/deposit-bonus/claim

- Auth: Zorunlu
- Body: yok

```json
{
  "status": "success",
  "message": "Yatırım bonusu başarıyla hesabınıza tanımlandı.",
  "data": {
    "claim_id": "...",
    "status": "approved",
    "bonus_amount": 200,
    "new_balance": 1200
  }
}
```

Hata gövdesi: `{ "status": "error", "message": "..." }`. Olası mesajlar:
`Kullanıcı bulunamadı.`, `Yatırım bonusu şu anda aktif değil.`, `Yakın
zamanda alınan bir bonus nedeniyle şu anda başka bonus talep edemezsiniz.`,
`Yatırımınızdan sonra bir oyuna/bahse katıldığınız için bu bonusu talep
edemezsiniz.`, `Talep edebileceğiniz bir yatırımınız bulunmuyor.`, `Yatırım
tutarınız minimumun altında.`, `Yatırım tutarınız maksimumun üzerinde.`,
`Talebiniz işleniyor, lütfen tekrar deneyin.` (eşzamanlı çift talep) — hepsi
`400`; tanımsız hata `500`.

---

## 3. Kayıp Bonusu Talep Sistemi

Mantık: Net Kayıp = Toplam Yatırım − Toplam Çekim − Güncel Bakiye (son talep
tarihinden şu ana kadar).

### GET /users/loss-bonus/potential

- Auth: Zorunlu

```json
{
  "status": "success",
  "data": {
    "total_deposit": 2000,
    "total_withdrawal": 300,
    "current_balance": 150,
    "net_loss": 1550,
    "bonus_rate": 10,
    "potential_bonus": 155,
    "is_eligible": true,
    "message": "155 TL kayıp bonusu talep edebilirsiniz."
  }
}
```

### POST /users/loss-bonus/claim

- Auth: Zorunlu
- Body: yok

```json
{
  "status": "success",
  "message": "Kayıp bonusu başarıyla hesabınıza tanımlandı.",
  "data": {
    "claim_id": "...",
    "status": "approved",
    "bonus_amount": 155,
    "new_balance": 305
  }
}
```

Olası hata mesajları: `Kullanıcı bulunamadı.`, `Kayıp bonusu şu anda aktif
değil.`, `Bu dönemde kaybınız olmadığı için bonus talep edemezsiniz.`, `Net
kaybınız minimum tutarın altında.`, `Talebiniz işleniyor, lütfen tekrar
deneyin.`

---

## 4. Reload Bonusu Talep Sistemi

Diğer üçünden farklıdır: kullanıcı serbestçe talep etmez, **admin** kullanıcıya
belirli bir toplam tutarı N parçaya bölerek (günlük/saatlik/dakikalık aralıkla)
atar. Kullanıcı arayüzü sadece "sırası gelen parçayı" claim eder.

### GET /users/reload-bonus/status

- Auth: Zorunlu
- Amaç: Aktif atama var mı, kaç parça kaldı, sıradaki parça ne zaman
  claim edilebilir, çevrim ilerlemesi nedir.

Aktif atama YOKSA:

```json
{ "status": "success", "data": { "hasActiveReload": false } }
```

Aktif atama VARSA:

```json
{
  "status": "success",
  "data": {
    "hasActiveReload": true,
    "assignmentId": "...",
    "totalAmount": 300,
    "amountPerPeriod": 30,
    "totalPeriods": 10,
    "claimedPeriods": 3,
    "claimedAmount": 90,
    "intervalType": "daily",
    "intervalMinutes": 1440,
    "wageringMultiplier": 2,
    "startAt": "2026-08-20T10:00:00.000Z",
    "endAt": "2026-08-30T10:00:00.000Z",
    "nextClaimAt": "2026-08-24T10:00:00.000Z",
    "canClaimNow": false,
    "wageringRequired": 180,
    "wageringProgress": 60,
    "wageringRemaining": 120
  }
}
```

`canClaimNow: true` olduğunda frontend "Claim Et" butonunu aktif etmeli;
`false` ise `nextClaimAt` tarihine geri sayım gösterilebilir.

### POST /users/reload-bonus/claim

- Auth: Zorunlu
- Body: yok

```json
{
  "status": "success",
  "message": "Reload bonusu parçası başarıyla hesabınıza tanımlandı.",
  "data": {
    "claim_id": "...",
    "period_index": 4,
    "amount": 30,
    "remaining_periods": 6,
    "next_claim_at": "2026-08-25T10:00:00.000Z",
    "new_balance": 335
  }
}
```

Olası hata mesajları: `Aktif bir Reload Bonusunuz bulunmuyor.`, `Reload
Bonusunuzun süresi doldu.`, `Reload Bonusunuzun tüm parçalarını zaten
aldınız.`, `Sıradaki parça için henüz zaman gelmedi.` (bu durumda response'a
ek olarak `next_claim_at` alanı da gelir), `Talebiniz işleniyor, lütfen
tekrar deneyin.`

---

## 5. Promosyon Kodu Sistemi

Ayrıntılı doküman: [`PROMO_CODE_API.md`](./PROMO_CODE_API.md). Özet:

### POST /promo-codes/claim

- Auth: Zorunlu

```json
// İstek
{ "code": "TEST200" }
```

```json
// Başarılı cevap
{
  "success": true,
  "data": {
    "code": "TEST200",
    "reward": 1000,
    "balance": 1445.27,
    "claimedAt": "2026-08-23T18:00:00.000Z",
    "wagering": { "required": 3000, "multiplier": 3, "minWithdraw": 100 }
  }
}
```

```json
// Hata cevabı
{
  "success": false,
  "error": { "code": "AFFILIATE_NOT_ELIGIBLE", "message": "Bu promosyon kodu affiliate grubunuza uygun değil." }
}
```

Olası `error.code` değerleri: `CODE_REQUIRED`, `CODE_NOT_FOUND`,
`CODE_INACTIVE`, `CODE_NOT_STARTED`, `CODE_EXPIRED`, `TOTAL_LIMIT_REACHED`,
`USER_LIMIT_REACHED`, `AFFILIATE_NOT_ELIGIBLE`, `VIP_LEVEL_REQUIRED`,
`DEPOSIT_REQUIRED`, `CONDITION_NOT_MET`, `USER_NOT_FOUND`, `INTERNAL_ERROR`.

---

## 6. Spor Bahisleri Turnuvası

Bu sistem için **iki farklı yüzey** var. Bonus Merkezi'nde (kendi giriş yapmış
kullanıcılarınız için) her zaman **JWT yüzeyini** kullanın.

### 6.1 JWT yüzeyi (Bonus Merkezi'nde kullanılacak olan)

Base path: `/api/user/sports-tournaments`

#### GET /api/user/sports-tournaments

- Auth: Zorunlu (JWT)
- Amaç: Aktif (isActive) turnuvaların listesi.

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Ağustos Spor Turnuvası",
      "description": "En yüksek toplam bahis tutarı kazanır.",
      "state": "running",
      "startsAt": "2026-08-01T00:00:00.000Z",
      "endsAt": "2026-08-31T23:59:59.000Z",
      "minOdds": 1.5,
      "minBetAmount": 50,
      "prizes": [
        { "rank": 1, "amount": 5000 },
        { "rank": 2, "amount": 2000 }
      ],
      "prizePoolDescription": "Toplam 10.000 TL ödül havuzu"
    }
  ]
}
```

`state` değerleri: `scheduled`, `running`, `completed`, `canceled`.

#### GET /api/user/sports-tournaments/:id

- Auth: Zorunlu (JWT)
- Amaç: Tekil turnuva detayı. Response şekli yukarıdaki liste elemanıyla
  aynıdır, `{ success, data: {...} }` içinde döner.

#### GET /api/user/sports-tournaments/:id/leaderboard?limit=100

- Auth: Zorunlu (JWT)
- Amaç: **Gerçek** kullanıcı adlarıyla sıralama + giriş yapan kullanıcının
  kendi sırası (`me`). `me`, kullanıcı ilk `limit` içine girmese de her zaman
  hesaplanır; kullanıcının turnuva kapsamında hiç uygun bahsi yoksa `null`
  döner.

```json
{
  "success": true,
  "tournament": {
    "id": "...",
    "name": "Ağustos Spor Turnuvası",
    "state": "running",
    "startsAt": "2026-08-01T00:00:00.000Z",
    "endsAt": "2026-08-31T23:59:59.000Z",
    "minOdds": 1.5,
    "minBetAmount": 50,
    "prizes": [{ "rank": 1, "amount": 5000 }],
    "prizePoolDescription": "Toplam 10.000 TL ödül havuzu"
  },
  "leaderboard": [
    {
      "rank": 1,
      "userId": "...",
      "username": "ahmet123",
      "totalStake": 12500,
      "betCount": 34,
      "prizeAmount": 5000,
      "prizeAwarded": false
    }
  ],
  "me": {
    "rank": 47,
    "totalStake": 620,
    "betCount": 3,
    "prizeAmount": 0,
    "prizeAwarded": false
  }
}
```

> Not: Turnuva `completed` duruma geçtikten sonra sıralama, sonuçlandırma
> anında alınan önbellekten (`SportsTournament.leaderboard`) gelir. Bu
> önbellekte kullanıcı adı **saklanmaz**; bu nedenle tamamlanmış bir
> turnuvada `username` alanı `"—"` görünebilir (yalnızca `userId`,
> `totalStake`, `betCount`, `prizeAmount`, `prizeAwarded` güvenilirdir).
> Devam eden (`running`) turnuvalarda kullanıcı adı her zaman doğru gelir.

### 6.2 Dış API yüzeyi (referans — Bonus Merkezi'nde KULLANMAYIN)

Base path: `/api/sports-tournaments`. `x-api-key` / `Bearer` ile
`SPORTS_TOURNAMENT_API_KEY` (tanımlı değilse `TOKEN_SECRET`) değerine karşı
doğrulanır, kullanıcı adları maskelenir (`"ahm***23"`). Bu yüzey, sitenizin
verisini çeken **harici/partner** siteler için tasarlanmıştır — kendi giriş
yapmış kullanıcılarınız için 6.1'i kullanın.

---

## 7. Çevrim Turnuvası (Race)

⚠️ **Önemli kısıtlama:** Bu sistem için şu anda sadece **API-key korumalı, dış
site amaçlı** bir endpoint mevcut; sitenizin kendi kullanıcıları için JWT
tabanlı bir "aktif turnuvaları listele" veya "kendi sıramı gör" endpoint'i
**henüz yok**. Aşağıdaki mevcut endpoint'i kullanabilirsiniz ama:

- Kullanıcı adları maskelenir (`"ahm***23"`), gerçek kullanıcı eşleştirmesi
  yapamazsınız.
- Aktif turnuva ID'lerini keşfetmenin bir API yolu yoktur — turnuva ID'sini
  admin panelinden manuel almanız veya bana ayrıca bu iş için de (Spor
  Turnuvası'na eklediğim gibi) bir JWT yüzeyi yazmamı istemeniz gerekir.

### GET /api/race/:tournamentId/leaderboard?limit=100

- Auth: API-key (`x-api-key` header veya `Authorization: Bearer`), değer
  `RACE_API_TOKEN` (tanımlı değilse `TOKEN_SECRET`) ile eşleşmeli.

```json
{
  "success": true,
  "tournament": {
    "id": "...",
    "name": "Ağustos Çevrim Turnuvası",
    "state": "running",
    "startsAt": "2026-08-01T00:00:00.000Z",
    "endsAt": "2026-08-31T23:59:59.000Z",
    "pointsPerWager": 1
  },
  "leaderboard": [
    {
      "rank": 1,
      "displayName": "ahm***23",
      "points": 15400,
      "prizeAmount": 5000,
      "prizeAwarded": false,
      "isManual": false
    }
  ]
}
```

Bonus Merkezi'nde gerçek kullanıcı adları + "kendi sıram" özelliği
istiyorsanız, Spor Turnuvası'na yaptığım gibi ayrı bir talep açmanız
gerekiyor (bkz. dosya sonundaki not).

---

## 8. Bilet Etkinlikleri (Ticket Event)

⚠️ **Şu an için kullanılabilir bir kullanıcı endpoint'i YOK.** Bu sistem
tamamen admin panelinden yönetiliyor (etkinlik oluşturma, kullanıcıların
yatırımına göre otomatik bilet üretimi, çekiliş çekme). Kod tabanında ne dış
API-key'li bir yüzey (race/sports-tournament'takine benzer) ne de kullanıcıya
özel bir JWT yüzeyi bulunuyor — bu nedenle Bonus Merkezi'ne şu an
entegre edilebilecek bir endpoint yok.

Eğer bu özelliği de Bonus Merkezi'ne eklemek istiyorsanız, ayrıca şu
endpoint'lerin JWT tabanlı olarak yazılmasını talep etmeniz gerekiyor:
- `GET /api/user/ticket-events` — aktif etkinlikler
- `GET /api/user/ticket-events/:id/my-tickets` — kullanıcının o etkinlikteki biletleri

---

## Sistemler Arası Özet Tablo

| Sistem | Method | Path | Auth |
|---|---|---|---|
| Bonus kilidi durumu | GET | `/users/wagering-status` | JWT |
| Deneme bonusu potansiyel | GET | `/bonus/trial/potential` | JWT |
| Deneme bonusu talep | POST | `/bonus/trial/claim` | JWT |
| Yatırım bonusu potansiyel | GET | `/users/deposit-bonus/potential` | JWT |
| Yatırım bonusu talep | POST | `/users/deposit-bonus/claim` | JWT |
| Kayıp bonusu potansiyel | GET | `/users/loss-bonus/potential` | JWT |
| Kayıp bonusu talep | POST | `/users/loss-bonus/claim` | JWT |
| Reload bonusu durum | GET | `/users/reload-bonus/status` | JWT |
| Reload bonusu talep | POST | `/users/reload-bonus/claim` | JWT |
| Promosyon kodu talep | POST | `/promo-codes/claim` | JWT |
| Spor turnuvası listesi | GET | `/api/user/sports-tournaments` | JWT |
| Spor turnuvası detay | GET | `/api/user/sports-tournaments/:id` | JWT |
| Spor turnuvası sıralama + kendi sıram | GET | `/api/user/sports-tournaments/:id/leaderboard` | JWT |
| Çevrim turnuvası sıralama (dış, maskeli) | GET | `/api/race/:tournamentId/leaderboard` | API-key |
| Bilet etkinlikleri | — | *(yok — bkz. bölüm 8)* | — |

**Not:** Bu doküman yazılırken, Spor Bahisleri Turnuvası için Bonus
Merkezi'ne özel yeni JWT endpoint'leri (`/api/user/sports-tournaments*`) de
backend'e eklendi. Çevrim Turnuvası ve Bilet Etkinlikleri için aynısını
isterseniz ayrıca belirtmeniz yeterli.
