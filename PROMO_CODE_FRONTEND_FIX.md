# Promosyon Kodu — Frontend Düzeltme Talimatı

Backend tarafı düzeltildi ve doğrulandı (CORS, bakiye güncelleme, hata
formatı). Kalan 2 sorun frontend kodunda ve bu dosyada anlatılıyor.

## Endpoint

```
POST https://apibizzocasino.site/promo-codes/claim
Headers:
  Authorization: Bearer <JWT>
  Content-Type: application/json
Body:
  { "code": "TEST200" }
```

## Başarılı yanıt (HTTP 200)

```json
{
  "success": true,
  "code": "TEST200",
  "reward": 1000,
  "balance": 2000.0,
  "claimedAt": "2026-08-24T20:00:00.000Z"
}
```

`balance` alanı kullanıcının güncel toplam bakiyesidir — istersen ekranda
anlık göstermek için kullanabilirsin, ama bakiye zaten socket `user`
event'i ile de anlık güncellenir (ayrıca bir fetch/refresh gerekmez).

## Hatalı yanıt (HTTP 400)

```json
{
  "success": false,
  "error": {
    "code": "USER_LIMIT_REACHED",
    "message": "Bu promosyon kodunu kullanma hakkınız doldu."
  }
}
```

### Olası `error.code` değerleri ve önerilen kullanıcı mesajları

| code                     | Anlamı                                            | Önerilen mesaj                                              |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| `CODE_NOT_FOUND`         | Kod yok / yanlış yazıldı                           | "Girdiğiniz promosyon kodu bulunamadı."                       |
| `CODE_INACTIVE`          | Kod pasif (admin panelinde kapalı)                 | "Bu promosyon kodu şu anda aktif değil."                      |
| `CODE_EXPIRED`           | Başlangıç/bitiş tarihi dışında                     | "Bu promosyon kodunun süresi doldu."                          |
| `USER_LIMIT_REACHED`     | Kullanıcı başı kullanım limiti doldu               | "Bu kodu daha önce kullandınız."                              |
| `GLOBAL_LIMIT_REACHED`   | Toplam kullanım limiti doldu                       | "Bu promosyon kodunun kullanım hakkı doldu."                  |
| `MIN_VIP_LEVEL`          | Minimum VIP seviyesi karşılanmıyor                 | "Bu kod için gereken VIP seviyesine sahip değilsiniz."         |
| `MIN_DEPOSIT_NOT_MET`    | Minimum onaylı yatırım şartı karşılanmıyor          | "Bu kodu kullanmak için minimum yatırım şartını karşılamıyorsunuz." |
| `SEGMENT_NOT_MATCHED`    | Segment/koşul motoruna uymuyor                     | "Bu promosyon kodu hesabınız için geçerli değil."              |
| `AFFILIATE_NOT_ALLOWED`  | Affiliate kısıtlaması                              | "Bu promosyon kodu hesabınız için geçerli değil."              |

(Kod adları örnektir — gerçek listeyi backend'den `error.code` alanını
loglayarak teyit edin; önemli olan **her durumda `error.message`'ı
kullanıcıya göstermek**, hard-coded "Bağlantı hatası" değil.)

## Sorun 1 — "Bağlantı hatası, lütfen internet bağlantınızı kontrol edin" (KRİTİK)

**Neden:** Frontend, promo kodu isteği başarısız olduğunda (400/401/403 vb.)
gelen yapılı `error.message` alanını okumadan, genel/sabit bir "Bağlantı
hatası" toast'ı gösteriyor. Backend CORS ve hata yanıtları doğrulandı — sorun
sadece frontend'in hata cevabını nasıl işlediğinde.

**Yapılması gereken:**
1. İstek `catch` bloğunda, önce **gerçek network hatası** (fetch reddi, timeout,
   `TypeError: Failed to fetch`) ile **HTTP yanıtı olan hata** (400/401/403/500,
   response body'si var) ayırt edilmeli.
2. HTTP yanıtı varsa `response.json()` ile body okunmalı ve
   `data.error.message` (veya `data.message`) kullanıcıya gösterilmeli.
3. "Bağlantı hatası" mesajı SADECE gerçek network/timeout hatalarında
   gösterilmeli.

Örnek (fetch ile):

```ts
try {
  const res = await fetch("/promo-codes/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    // Backend'in gönderdiği gerçek hata mesajını göster
    toast.error(data?.error?.message || data?.message || "Bir hata oluştu.");
    return;
  }

  toast.success(`${data.reward} TL bakiyenize eklendi.`);
} catch (err) {
  // Buraya SADECE fetch gerçekten atamadığında (network/timeout) düşülür
  toast.error("Bağlantı hatası, lütfen internet bağlantınızı kontrol edin.");
}
```

Axios kullanılıyorsa aynı mantık `error.response?.data` üzerinden uygulanmalı
(axios hatalı HTTP kodlarında `catch`'e düşer, ama `error.response` varsa bu
bir network hatası değildir).

## Sorun 2 — Bonus Geçmişi tablosunda tutar ₺0.00 görünüyor

**Endpoint:** `GET /bonus-history/:userId`

**Yanıt formatı** (`BONUS_HISTORY_API.md`'ye bakınız):

```json
{
  "success": true,
  "bonuses": [
    {
      "bonusType": "promo_code",
      "title": "Promosyon Kodu",
      "bonusAmount": 1000,
      "claimedAt": "2026-08-24T20:00:00.000Z",
      "status": "completed"
    }
  ]
}
```

**Neden:** Tablo tutarı her satırda `₺0.00` gösteriyor. Backend'in
gönderdiği alan adı **`bonusAmount`**'tır — eğer frontend `amount`,
`reward` veya `value` gibi başka bir alan adı okuyorsa sonuç `undefined`
olur ve ekranda `0` görünür.

**Yapılması gereken:** Tabloyu render eden bileşende tutar hücresi
`row.bonusAmount` alanını okumalı (başka bir alan adı değil).

## Sorun 3 (bilgi amaçlı) — Ara sıra "502" hatası

Test ettiğimizde backend `/bonus/trial/claim` ve `/promo-codes/claim`
normal çalışıyor (401/400 gibi beklenen kodlar dönüyor, 502 değil). 502
gördüğünüzde bu backend kodundan değil, üretim sunucusunun o anki geçici
bir kesintisinden (deploy/restart, kaynak limiti) kaynaklanıyor olabilir.
Frontend'de 502/503 gibi 5xx durumları için "Sunucu şu anda yanıt
vermiyor, lütfen birazdan tekrar deneyin" gibi ayrı bir mesaj gösterip
kısa bir bekleme sonrası otomatik yeniden deneme (retry) eklemeniz iyi
bir pratik olur.
