# Diğer Frontend Projesine Verilecek Prompt

Bunu, ayrı sunucudaki (frontend) projenizin AI asistanına (veya geliştiricisine)
olduğu gibi yapıştırabilirsiniz. `BONUS_MERKEZI_API.md` dosyasını da o projeye
ekleyip referans verin.

---

Elimde çalışan bir backend var ve buna göre bir "Bonus Merkezi" sayfası
oluşturmanı istiyorum. Sitenin ana giriş sistemiyle aynı kullanıcılar
kullanılıyor; kullanıcı zaten login olduğunda aldığı JWT'yi bu sayfada da
kullanacağız (ayrı bir login akışı YOK).

Ekli `BONUS_MERKEZI_API.md` dosyasındaki tüm endpoint'leri, orada belirtilen
istek/cevap şekillerine harfiyen uyarak entegre et. Backend base URL'i env
değişkeni olarak `NEXT_PUBLIC_API_BASE_URL` / `VITE_API_BASE_URL` (projenin
kullandığı framework'e göre) üzerinden okunacak, hardcode etme.

## Sayfa Yapısı

Tek bir "Bonus Merkezi" sayfasında şu sekmeler/kartlar olsun:

1. **Genel Durum Kartı** — sayfa açılınca `GET /users/wagering-status`
   çağrılır. Aktif bir çevrim kilidi (`bonus_lock.active === true &&
   bonus_lock.type === "wagering"`) varsa üstte sabit bir uyarı banner'ı
   göster: "Devam eden bonus çevriminiz var: X TL / Y TL tamamlandı,
   çekim ve yeni bonus talebi bu tamamlanana kadar kısıtlı." İlerleme çubuğu
   `wageringProgress / wageringRequired` oranıyla dolsun. `reload_lock` için
   de aynı mantıkla ayrı, bağımsız bir ikinci banner göster (biri diğerini
   engellemez).

2. **Deneme Bonusu** kartı:
   - `GET /bonus/trial/potential` ile durumu çek, `eligible` false ise
     buton disabled + `message` metnini göster.
   - "Talep Et" butonuna basınca `POST /bonus/trial/claim`; başarılıysa
     toast + bakiyeyi güncelle (`data.newBalance`), tekrar potential'ı
     yenile (artık `alreadyClaimed: true` dönecek, kartı "talep edildi"
     durumuna çevir).

3. **Yatırım Bonusu** kartı: aynı desen, `GET/POST /users/deposit-bonus/...`.
   `potential_bonus`, `bonus_rate`, `total_deposit` bilgilerini göster.

4. **Kayıp Bonusu** kartı: aynı desen, `GET/POST /users/loss-bonus/...`.
   `net_loss`, `bonus_rate`, `potential_bonus` bilgilerini göster.

5. **Reload Bonusu** kartı — DİĞERLERİNDEN FARKLI: kullanıcı serbestçe talep
   oluşturamaz, admin tarafından atanır. Sayfa açılışında
   `GET /users/reload-bonus/status` çağır:
   - `hasActiveReload: false` ise "Şu anda size atanmış bir Reload Bonusu
     yok" mesajı göster, buton gösterme.
   - `hasActiveReload: true` ise: toplam/claim edilen parça sayısı
     (`claimedPeriods / totalPeriods`), bir sonraki parça tutarı
     (`amountPerPeriod`), `canClaimNow` true ise "Claim Et" butonu aktif
     (`POST /users/reload-bonus/claim`), false ise `nextClaimAt`'e kadar geri
     sayım (canlı saat) göster. Ayrıca çevrim ilerlemesini
     (`wageringProgress / wageringRequired`) ayrı bir progress bar ile göster.

6. **Promosyon Kodu** kartı: basit bir input + "Kullan" butonu.
   `POST /promo-codes/claim` ile `{ code }` gönder. Hata durumunda
   `error.code`'a göre kullanıcı dostu mesaj eşle (örn. `CODE_EXPIRED` ->
   "Bu kodun süresi dolmuş", `USER_LIMIT_REACHED` -> "Bu kodu kullanım
   limitinize ulaştınız" gibi) — API'nin döndüğü `error.message` de zaten
   Türkçe, direkt de gösterebilirsin.

7. **Spor Bahisleri Turnuvası** sekmesi:
   - `GET /api/user/sports-tournaments` ile aktif turnuva listesini kartlar
     halinde göster (isim, ödül havuzu açıklaması, min oran/min bahis
     şartı, kalan süre `endsAt`'ten hesaplanır).
   - Bir turnuvaya tıklanınca `GET /api/user/sports-tournaments/:id/leaderboard`
     ile TAM sıralama tablosunu (sırasız, gerçek kullanıcı adlarıyla) göster.
     Response'daki `me` alanı null değilse, tablonun üstünde/altında sabit bir
     "Senin Sıran: #47 — 620 TL" satırı göster (tablo scroll'undan bağımsız,
     sticky). `me === null` ise "Henüz sıralamaya girecek bir bahsiniz yok"
     göster.

8. **Çevrim Turnuvası (Race)** sekmesi — ⚠️ backend'de şu an sadece dış
   siteler için maskeli bir endpoint var (`GET /api/race/:tournamentId/leaderboard`,
   API-key ile). Bunu KULLANMA; bunun yerine bu sekmeyi "Yakında" placeholder
   olarak bırak, ben backend'e Spor Turnuvası'ndakiyle aynı mantıkta bir
   `/api/user/race-tournaments*` JWT yüzeyi eklettikten sonra gerçek entegre
   ederiz.

9. **Bilet Etkinlikleri** sekmesi — backend'de şu an kullanıcıya açık HİÇBİR
   endpoint yok (sadece admin panelinden yönetiliyor). Bu sekmeyi de "Yakında"
   placeholder olarak bırak.

## Genel kurallar

- Tüm istekler `Authorization: Bearer <token>` header'ıyla gitsin (token,
  sitenin ana login akışından gelen ve zaten local storage/cookie'de saklı
  olan JWT).
- `401` dönen her istekte kullanıcıyı login'e yönlendir.
- `403` + `code === "ACCOUNT_SUSPENDED"` dönen her istekte oturumu temizle ve
  "hesabınız pasif" ekranını göster (bu davranış merkezi bir HTTP
  interceptor'da olmalı, her kart kendi kendine handle etmesin).
- Para tutarlarını `toLocaleString("tr-TR")` ile formatla, `TRY` sembolü ekle.
- Her claim başarılı olduğunda global bakiye state'ini (varsa
  header'daki bakiye göstergesi) `newBalance` / `new_balance` ile güncelle.
