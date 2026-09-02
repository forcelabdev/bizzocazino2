# Bizzo Casino Backend — API Dokümantasyonu

> Bu doküman, `backend/routes` klasöründeki tüm route dosyaları taranarak otomatik olarak
> çıkarılmıştır (530 endpoint). Base URL: `https://apibizzocasino.site` (PM2 ile
> `/www/raxen/bizzocazino/backend`'de çalışır, port 5001). Tüm route'lar `app.use("/",
> require("./routes")(io))` ile kök path'e mount edilir (`backend/index.js`).
>
> ⚠️ **Not:** `bizzocazino2` (bu repo) sadece **backend**'i barındırır. Production frontend
> (`www.bizzocasino168.com`) ayrı bir repo/proje olan `build-bizzo-casino`'dadır ve bu API'ye
> `/api/proxy/...` üzerinden istek atar.

## İçindekiler

1. [Kimlik Doğrulama (Auth) Modelleri](#kimlik-doğrulama-auth-modelleri)
2. [Genel / Site Ayarları](#genel--site-ayarları)
3. [Auth — Müşteri Girişi & Kayıt](#auth--müşteri-girişi--kayıt)
4. [Kullanıcı (Self-Service)](#kullanıcı-self-service)
5. [Oyunlar & Katalog](#oyunlar--katalog)
6. [Cüzdan / Ödeme Sağlayıcıları](#cüzdan--ödeme-sağlayıcıları)
7. [Banka Havalesi (Deposit/Withdrawal)](#banka-havalesi-depositwithdrawal)
8. [Bonus, Promosyon, VIP, Battlepass, Mağaza](#bonus-promosyon-vip-battlepass-mağaza)
9. [Affiliate](#affiliate)
10. [Turnuvalar (Race & Spor)](#turnuvalar-race--spor)
11. [Bildirim / Destek / Haber / Telegram](#bildirim--destek--haber--telegram)
12. [Sağlayıcı Entegrasyon API'leri (Oyun Motorları)](#sağlayıcı-entegrasyon-apileri-oyun-motorları)
13. [Admin Panel API'si](#admin-panel-apisi)
14. [Kullanılmayan / Mount Edilmemiş Route'lar](#kullanılmayan--mount-edilmemiş-routelar)

---

## Kimlik Doğrulama (Auth) Modelleri

| Etiket | Açıklama |
|---|---|
| **(public)** | Kimlik doğrulama gerektirmez. |
| `authorizeUser(true)` | Müşteri JWT **zorunlu** (`Authorization: Bearer <token>`). Geçersizse 401. `req.user` set edilir. |
| `authorizeUser(false)` | Müşteri JWT **opsiyonel** — varsa `req.user` set edilir, yoksa istek public gibi devam eder. |
| `authenticateAdmin` | Admin JWT zorunlu. `/admin/*` altındaki **tüm** route'lara zaten global middleware olarak uygulanır (`routes/admin/index.js:223`). |
| `checkPermission("kaynak.eylem")` | `authenticateAdmin`'e ek olarak RBAC izin kontrolü (örn. `users.read`, `finance.withdraws.manage`). Admin'in rolüne bu izin atanmamışsa 403. |
| `requireApiToken` | Sunucu-sunucu (partner/harici entegrasyon) API token doğrulaması — kullanıcı JWT'si değil. |
| Sağlayıcı callback'leri | `/gold_api`, `/drakon_api`, `/betinovi_api`, `/betcolabs_api`, `/poker_api`, `/payment/*/callback` gibi endpoint'ler kullanıcı auth'u kullanmaz; sağlayıcıya özel imza/IP doğrulaması route içinde yapılır. |

Ayrıca `/admin/*` altında global olarak şu middleware zinciri çalışır (sıra önemli):
`authenticateAdmin` → `adminOriginGuard` (Postman/curl gibi admin paneli dışından gelen state-changing istekleri reddeder) → `adminActionLogger` (audit log).

---

## Genel / Site Ayarları

Mount: kök (`/`) — `routes/index.js`

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/` | (public) | Health check — `{ success: true }` |
| GET | `/site-settings` | (public) | Public site ayarları (logo, footer, ödeme yöntemleri, bakım modu vb.) — provider secret'ları hariç tutulur |
| GET | `/custom.css` | (public) | Admin panelinden yönetilen özel CSS (no-cache) |
| GET | `/custom.js` | (public) | Admin panelinden yönetilen özel JS (no-cache) |
| GET | `/custom.html` | (public) | Admin panelinden yönetilen özel HTML (no-cache) |
| GET | `/settings/social` | (public) | Sosyal medya linkleri |
| GET | `/settings` | (public) | (`routes/settings/index.js`) Genel ayarlar |
| GET | `/games/:game_code` | (public) | Tek oyun detayı (game_code ile) |
| GET | `/transaction-history/:userId` | `authorizeUser(true)` | Kullanıcının tüm işlem geçmişi (kripto, banka, kampanya, forcelab, galaxypay, fluxkripto, xpayments birleşik) — kendi ID'si dışında 403 |
| GET | `/bonus-history/:userId` | `authorizeUser(true)` | Kullanıcının tüm bonus geçmişi (IDOR korumalı, `?startDate&endDate` filtresi destekler) |
| GET | `/game-history/:identifier` | (public) | Telefon numarası veya userId ile oyun/bahis geçmişi (sayfalama destekli) |
| GET | `/debug-ip` | (public) | Teşhis amaçlı — gerçek client IP zincirini gösterir (Cloudflare/proxy header'ları dahil) |
| GET | `/avatar/:filename` | (public) | Avatar dosyası servis eder |
| GET | `/avatar` | (public) | Avatar listesi |
| GET | `/avatar/random` | (public) | Rastgele avatar |

---

## Auth — Müşteri Girişi & Kayıt

Mount: `/auth` → `routes/auth/index.js` (kendi içinde alt router'lar mount eder)

### `/auth` (ana)

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/auth/login` | (public) | Email/telefon + şifre ile giriş |
| GET | `/auth/me` | `authorizeUser(true)` | Giriş yapmış kullanıcının profili |
| POST | `/auth/mfa/send-otp` | (public) | Login sırasında MFA kodu gönder |
| POST | `/auth/mfa/resend-otp` | (public) | MFA kodunu tekrar gönder |
| POST | `/auth/mfa/validate-otp` | (public) | MFA kodunu doğrula |
| GET | `/auth/campaign-categories` | (public) | Kampanya kategorileri |
| GET | `/auth/promotion-categories` | (public) | Promosyon kategorileri |
| GET | `/auth/promotions` | (public) | Aktif promosyonlar |
| GET | `/auth/campaigns` | `authorizeUser(false)` | Kampanya listesi (giriş yapılmışsa kişiselleştirilir) |
| GET | `/auth/campaign/claim` | `authorizeUser(true)` | Kampanya talep etme |
| POST | `/auth/bank-transfer` | `authorizeUser(true)` | Banka havalesi ile yatırım talebi oluştur |
| POST | `/auth/bank-withdraw` | `authorizeUser(true)` | Banka havalesi ile çekim talebi oluştur |
| GET | `/auth/bank-accounts` | `authorizeUser(false)` | Yatırım için kullanılabilir banka hesapları |
| GET | `/auth/sports-bets` | `authorizeUser(true)` | Kullanıcının spor bahisleri |
| GET | `/auth/sports-bets/:betId` | `authorizeUser(true)` | Tek bir spor bahsi detayı |
| GET | `/auth/sports-bets-stats` | `authorizeUser(true)` | Spor bahis istatistikleri |

### `/auth/credentials` (email/şifre)

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/auth/credentials/` | `rateLimiterStrictMiddleware` | Email/şifre ile giriş |
| POST | `/auth/credentials/register` | `rateLimiterStrictMiddleware` | Yeni hesap kaydı |
| POST | `/auth/credentials/link` | `authorizeUser(true)` | Mevcut hesaba email/şifre bağla |
| POST | `/auth/credentials/request` | `rateLimiterStrictMiddleware` | Şifre sıfırlama isteği (email gönderimi) |
| POST | `/auth/credentials/verify` | `rateLimiterStrictMiddleware` | Şifre sıfırlama kodunu doğrula |
| POST | `/auth/credentials/reset` | `rateLimiterStrictMiddleware` | Şifreyi sıfırla |

### `/auth/roblox` (Roblox hesap doğrulama girişi)

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/auth/roblox/` | `rateLimiterStrictMiddleware` + `authorizeUser(false)` | Roblox kullanıcı adı/şifre ile giriş denemesi |
| POST | `/auth/roblox/twostep` | aynı | Roblox 2FA kodu doğrulama |
| POST | `/auth/roblox/cookie` | aynı | Roblox cookie tabanlı doğrulama |

### `/auth/discord`

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/auth/discord/` | (public) | Discord OAuth başlat (redirect) |
| GET | `/auth/discord/callback` | (public) | Discord OAuth callback |

### `/auth/social`

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/auth/social/google` | (public) | Google ID token ile sosyal giriş |
| POST | `/auth/social/complete` | (public) | Sosyal girişi tamamla (ek bilgi — telefon vb. — gerekiyorsa) |

> Not: `routes/auth/social/index.js` içinde `telegram` ve `web3` login route'ları **yorum satırı
> halinde devre dışı** bırakılmış (henüz implemente edilmemiş).

---

## Kullanıcı (Self-Service)

Mount: `/users` → `routes/user/index.js`

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/users/loss-bonus/potential` | `authorizeUser(true)` | Kullanıcının hak edebileceği kayıp bonusu potansiyeli |
| POST | `/users/loss-bonus/claim` | `authorizeUser(true)` | Kayıp bonusunu talep et |
| GET | `/users/deposit-bonus/potential` | `authorizeUser(true)` | Yatırım bonusu potansiyeli |
| POST | `/users/deposit-bonus/claim` | `authorizeUser(true)` | Yatırım bonusunu talep et |
| GET | `/users/reload-bonus/status` | `authorizeUser(true)` | Reload bonusu durumu |
| POST | `/users/reload-bonus/claim` | `authorizeUser(true)` | Reload bonusunu talep et |
| GET | `/users/wagering-status` | `authorizeUser(true)` | Çevrim (wagering) durumu / hedef bakiye bilgisi |
| GET | `/users/:id` | `authorizeUser(true)` | Kullanıcı profili getir |
| PUT | `/users/:id` | `authorizeUser(true)` | Kullanıcı profili güncelle |
| POST | `/users/mfa/send-otp` | `authorizeUser(true)` | Profil ayarlarından MFA aktivasyon kodu gönder |
| POST | `/users/mfa/resend-otp` | `authorizeUser(true)` | MFA kodunu tekrar gönder |
| POST | `/users/mfa/validate-otp` | `authorizeUser(true)` | MFA aktivasyonunu doğrula |
| POST | `/users/switch-wallet` | `authorizeUser(true)` | Aktif cüzdanı/currency'yi değiştir |
| POST | `/users/email-change/request` | `authorizeUser(true)` | Email değişikliği talebi (doğrulama kodu gönderir) |
| POST | `/users/email-change/verify` | (public) | Email değişikliğini doğrulama koduyla onayla |

---

## Oyunlar & Katalog

| Method | Path | Auth | Mount | Açıklama |
|---|---|---|---|---|
| GET | `/games/featured` | (public) | `/games` → `games/index.js` | Öne çıkan oyunlar |
| GET | `/games/:game_code` | (public) | kök | Tek oyun detayı |
| GET | `/public/banners` | (public) | `/public` → `apiRoutes.js` | Tüm banner'lar |
| GET | `/public/banners/:position` | (public) | " | Pozisyona göre banner'lar |
| GET | `/public/banners/:slug` | (public) | " | Slug'a göre banner |
| GET | `/public/categories` | (public) | " | Oyun kategorileri |
| GET | `/public/games/search-category` | (public) | " | Kategoriye göre oyun arama |
| GET | `/public/games/category/:slug` | (public) | " | Kategoriye göre oyunlar |
| GET | `/public/games/search` | (public) | " | Oyun arama |
| GET | `/public/games/featured/list` | (public) | " | Öne çıkan oyun listesi |
| GET | `/public/games/categories/with-games` | (public) | " | Oyunlarla birlikte kategoriler |
| GET | `/public/providers/category/:slug` | (public) | " | Kategoriye göre sağlayıcılar |
| GET | `/public/shop/items` | (public) | " | Mağaza ürünleri |
| GET | `/public/shop/items/:id` | (public) | " | Tek mağaza ürünü |
| GET | `/gamehistory/recent-big-wins` | (public) | `/gamehistory` → `gamehistory/recent.js` | Son büyük kazançlar |
| GET | `/binance/exchangeInfo` | (public) | `/binance` | Binance borsası enstrüman bilgisi (kripto fiyat/işlem çifti meta verisi) |
| POST | `/exchange/switch-fiat-currency` | `authorizeUser(true)` | `/exchange` | Kullanıcının fiat para birimini değiştir |

---

## Cüzdan / Ödeme Sağlayıcıları

Her sağlayıcı kendi alt path'inde `methods` (public, hangi yöntemler aktif), `deposit`,
`withdraw`, `status/:id`, `callback` (sağlayıcıdan gelen webhook, public) desenini izler.

### Genel Cüzdan
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/wallet/convert-to-fiat` | `authorizeUser(true)` | Kripto/puan bakiyesini fiat'a çevir |

### PIX (`/payment/pix`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/payment/pix/create` | `authorizeUser(true)` | PIX yatırım talebi oluştur |
| POST | `/payment/pix/callback` | (public) | PIX sağlayıcı webhook'u |

### Forcelab Finance (`/payment/forcelab-finance`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/payment/forcelab-finance/methods` | (public) | Aktif ödeme yöntemleri |
| POST | `/payment/forcelab-finance/prepare` | `authorizeUser(true)` | Yatırım öncesi hazırlık/doğrulama |
| POST | `/payment/forcelab-finance/create` | `authorizeUser(true)` | Yatırım talebi oluştur |
| GET | `/payment/forcelab-finance/status/:uuid` | `authorizeUser(false)` | İşlem durumu sorgula |
| POST | `/payment/forcelab-finance/withdraw` | `authorizeUser(true)` | Çekim talebi oluştur |
| POST | `/payment/forcelab-finance/callback` | (public, `express.text`) | Sağlayıcı webhook'u (raw text body) |

### GalaxyPay (`/payment/galaxypay`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/payment/galaxypay/deposit` | `authorizeUser(true)` | Yatırım talebi oluştur |
| POST | `/payment/galaxypay/withdraw` | `authorizeUser(true)` | Çekim talebi oluştur |
| POST | `/payment/galaxypay/...` (callback) | (public) | Sağlayıcı webhook'u |

### FluxKripto (`/payment/fluxkripto`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/payment/fluxkripto/methods` | (public) | Aktif kripto para birimleri/yöntemler |
| POST | `/payment/fluxkripto/deposit` | `authorizeUser(true)` | Kripto yatırım talebi |
| POST | `/payment/fluxkripto/withdraw` | `authorizeUser(true)` | Kripto çekim talebi |
| GET | `/payment/fluxkripto/status/:id` | `authorizeUser(true)` | İşlem durumu |
| POST | `/payment/fluxkripto/callback` | (public) | Sağlayıcı webhook'u |

### MeelDev (`/payment/meeldev`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/payment/meeldev/methods` | (public) | Aktif ödeme yöntemleri |
| POST | `/payment/meeldev/deposit` | `authorizeUser(true)` | Yatırım talebi |
| POST | `/payment/meeldev/withdraw` | `authorizeUser(true)` | Çekim talebi |
| GET | `/payment/meeldev/status/:id` | `authorizeUser(false)` | İşlem durumu |
| POST | `/payment/meeldev/callback` | (public) | Sağlayıcı webhook'u |

### XPayments (`/payment/xpayments`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/payment/xpayments/methods` | (public) | Aktif ödeme yöntemleri |
| POST | `/payment/xpayments/deposit` | `authorizeUser(true)` | Yatırım talebi |
| POST | `/payment/xpayments/withdraw` | `authorizeUser(true)` | Çekim talebi |
| GET | `/payment/xpayments/status/:id` | `authorizeUser(true)` | İşlem durumu |
| POST | `/payment/xpayments/callback` | (public) | Sağlayıcı webhook'u — bkz. `goldapi-network-error-http-status.md` memory notu (HTTP status her zaman 200 sabitlenmeli) |

### Diğer Callback / Cüzdan Uçları
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/callback/oxapay` | `rateLimiterMiddleware` | Oxapay kripto ödeme sağlayıcı webhook'u |
| POST | `/maxicallback/` | (public) | Maxipara ödeme sağlayıcı webhook'u |
| POST | `/promo-codes/claim` | `authorizeUser(true)` | Promosyon kodu ile bonus talep et (bkz. `promo-code-balance-bug.md`) |

---

## Banka Havalesi (Deposit/Withdrawal)

### Yatırım — `/deposit` (`routes/odeme/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/deposit/papara` | `authorizeUser(true)` | Papara yatırım bilgisi |
| GET | `/deposit/banktransfer` | `authorizeUser(true)` | Banka havalesi yatırım bilgisi |
| GET | `/deposit/payfix` | `authorizeUser(true)` | Payfix yatırım bilgisi |

### Çekim — `/withdrawal` (`routes/cekim/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/withdrawal/create` | `authorizeUser(true)` | Çekim talebi oluştur |
| POST | `/withdrawal/approve` | `authenticateAdmin` | Admin: çekim talebini onayla |
| POST | `/withdrawal/reject` | `authenticateAdmin` | Admin: çekim talebini reddet |

---

## Bonus, Promosyon, VIP, Battlepass, Mağaza

### `/bonus` (`routes/bonus/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/bonus/add` | `authenticateAdmin` | Yeni bonus tanımı ekle (resim yükleme destekli) |
| PUT | `/bonus/:id` | `authenticateAdmin` | Bonus güncelle |
| DELETE | `/bonus/:id` | `authenticateAdmin` | Bonus sil |
| POST | `/bonus/claim` | `authorizeUser(true)` | Genel bonus talep et |
| POST | `/bonus/claim/freespin` | `authorizeUser(true)` | Freespin bonusu talep et |
| GET | `/bonus/trial/potential` | `authorizeUser(true)` | Deneme bonusu potansiyeli |
| POST | `/bonus/trial/claim` | `authorizeUser(true)` | Deneme bonusu talep et |
| GET | `/bonus/` | (public) | Aktif bonus listesi |
| GET | `/bonus/history` | (public) | Bonus geçmişi |

### `/bonus-settings` (`routes/bonusSetting.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/bonus-settings/` | (public) | Bonus ayarları (min/max, oranlar vb.) |

### VIP — `/vip` (`routes/vipRoutes.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/vip/current-level` | `authorizeUser(true)` | Kullanıcının mevcut VIP seviyesi |
| POST | `/vip/claim-reward` | `authorizeUser(true)` | VIP ödülü talep et |
| GET | `/vip/user-level/:userId` | (public) | Belirli kullanıcının VIP seviyesi |
| GET | `/vip/levels` | (public) | Tüm VIP seviye tanımları |
| GET | `/vip/rewards/:id` | (public) | Tek VIP ödül detayı |

### Battlepass — `/battlepass` (`routes/battlepassRoutes.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/battlepass/claim-mission-reward` | `authorizeUser(true)` | Görev ödülünü talep et |
| POST | `/battlepass/claim-battlepass-reward` | `authorizeUser(true)` | Sezon ödülünü talep et |
| GET | `/battlepass/status` | `authorizeUser(true)` | Kullanıcının battlepass durumu/ilerlemesi |
| POST | `/battlepass/buy-premium` | `authorizeUser(true)` | Premium battlepass satın al |

### Mağaza — `/shop` (`routes/shopRoutes.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/shop/purchase` | `authorizeUser(true)` | Mağaza ürünü satın al |
| GET | `/shop/purchases` | `authorizeUser(true)` | Kullanıcının satın alım geçmişi |

### Wingo (oyun içi bahis) — `/wingo` (`routes/wingoRoutes.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/wingo/bets` | (public) | Kullanıcı bahisleri (query param ile kullanıcı belirtilir) |
| GET | `/wingo/stats` | `authorizeUser(true)` | Kullanıcı istatistikleri |
| GET | `/wingo/daily` | `authorizeUser(true)` | Günlük istatistikler |
| GET | `/wingo/result/:roundId` | (public) | Round sonucu |
| GET | `/wingo/rounds` | (public) | Son round'lar (limit=20) |
| GET | `/wingo/active` | (public) | Şu anki aktif round |

---

## Affiliate

Mount: `/affiliate` (`routes/affiliate.js`)

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/affiliate/login` | (public) | Affiliate paneli girişi |
| GET | `/affiliate/referrals/:id` | `authorizeUser(true)` | Referans listesi |
| GET | `/affiliate/info/:id` | `authorizeUser(true)` | Affiliate hesap bilgisi (komisyon oranı vb.) |
| GET | `/affiliate/referrals/total-deposits/:id` | `authorizeUser(true)` | Referansların toplam yatırımı |
| GET | `/affiliate/referrals/last-five/:id` | (public) | Son 5 referans |
| GET | `/affiliate/referrals/stats/:id` | (public) | Referans istatistikleri |

---

## Turnuvalar (Race & Spor)

### Race — `/api/race` (`routes/raceApi.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/race/:tournamentId/leaderboard` | `requireApiToken` | Race turnuvası liderlik tablosu (partner API) |

### Spor Turnuvaları (Partner API) — `/api/sports-tournaments` (`routes/sportsTournamentApi.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/sports-tournaments/` | `requireApiToken` | Turnuva listesi |
| GET | `/api/sports-tournaments/:id` | `requireApiToken` | Turnuva detayı |
| GET | `/api/sports-tournaments/:id/leaderboard` | `requireApiToken` | Liderlik tablosu |

### Spor Turnuvaları (Kullanıcı) — `/api/user/sports-tournaments` (`routes/sportsTournamentUserApi.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/user/sports-tournaments/` | `authorizeUser(true)` | Kullanıcının katıldığı turnuvalar |
| GET | `/api/user/sports-tournaments/:id` | `authorizeUser(true)` | Turnuva detayı |
| GET | `/api/user/sports-tournaments/:id/leaderboard` | `authorizeUser(true)` | Liderlik tablosu |

---

## Bildirim / Destek / Haber / Telegram

### Bildirimler (kullanıcıya özel) — `/notices` (`routes/notice/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/notices/:userId` | (public) | Kullanıcıya ait bildirimler |
| POST | `/notices/individual` | `authenticateAdmin` | Tek kullanıcıya bildirim gönder |
| POST | `/notices/bulk` | `authenticateAdmin` | Toplu bildirim gönder |
| GET | `/notices/users` | `authenticateAdmin` | Bildirim gönderilecek kullanıcı listesi |

### Bildirimler (Partner API) — `/api/notices` (`routes/noticeApi.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/notices/` | `requireApiToken` | Bildirim listesi |
| POST | `/api/notices/:id/read` | `requireApiToken` | Bildirimi okundu işaretle |

### Müşteri Hizmetleri — `/customerservices` (`routes/customerservices/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/customerservices/` | (public) | Destek kanalları listesi (canlı destek linki vb.) |
| POST | `/customerservices/add` | `authenticateAdmin` | Yeni destek kanalı ekle |
| PUT | `/customerservices/:id` | `authenticateAdmin` | Güncelle |
| DELETE | `/customerservices/:id` | `authenticateAdmin` | Sil |

### Haberler — `/news` (`routes/news/index.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/news/add` | `authenticateAdmin` | Haber ekle (resim yükleme destekli) |
| GET | `/news/` | (public) | Haber listesi |
| PUT | `/news/:id` | `authenticateAdmin` | Haber güncelle |
| DELETE | `/news/:id` | `authenticateAdmin` | Haber sil |

### Telegram Bildirimleri — `/telegram` (`routes/telegram.js`)
> ⚠️ Bu router'ın **tamamı** `authenticateAdmin` gerektirir (`router.use(authenticateAdmin)` dosya başında).

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/telegram/users` | `authenticateAdmin` | Telegram'a bağlı kullanıcılar |
| GET | `/telegram/messages/:telegram_id` | `authenticateAdmin` | Bir kullanıcının mesaj geçmişi |
| POST | `/telegram/send` | `authenticateAdmin` | Tek kullanıcıya mesaj gönder |
| POST | `/telegram/broadcast` | `authenticateAdmin` | Toplu mesaj gönder |

### Telegram Ayarları — `/telegram-settings` (`routes/telegramSettings.js`)
| Method | Path | Auth | Açıklama |
|---|---|---|---|
| GET | `/telegram-settings/` | (denetlenemedi — muhtemelen admin) | Bot ayarlarını getir |
| PUT | `/telegram-settings/` | (denetlenemedi — muhtemelen admin) | Bot ayarlarını güncelle |

---

## Sağlayıcı Entegrasyon API'leri (Oyun Motorları)

Bu endpoint'ler oyun sağlayıcılarının (aggregator) sunucularından gelen istekleri karşılar —
kullanıcı JWT'si kullanmazlar, sağlayıcıya özel imza/hash/agent-token doğrulaması **route
içinde** yapılır.

| Method | Path | Mount | Açıklama |
|---|---|---|---|
| POST | `/gold_api/fetch-games` | `/gold_api` | GoldAPI oyun kataloğunu senkronize et |
| POST | `/gold_api/` | " | GoldAPI bahis/oyun callback'i (bakiye sorgulama, bet, win, rollback vb. — tek endpoint çoklu `action` ile) — bkz. `goldapi-network-error-http-status.md` memory notu |
| POST | `/drakon_api/` | `/drakon_api` | Drakon sağlayıcı callback'i |
| POST | `/betinovi_api/` | `/betinovi_api` | Betinovi sağlayıcı callback'i (birincil agent, `BETINOVI_*`) |
| POST | `/betinovi_api/callback` | " | Betinovi ek callback (bildirim/durum) |
| POST | `/betcolabs_api/` | `/betcolabs_api` | Betcolabs sağlayıcı callback'i |
| POST | `/betcolabs_api/callback` | " | Betcolabs ek callback |
| POST | `/poker_api/` | `/poker_api` (2 kez mount edilmiş — bkz. not) | Poker sağlayıcı callback'i |
| POST | `/poker_api/import_games` | " | Poker oyun kataloğunu içe aktar |
| POST | `/api/gold_api` | `/api` (`routes/api.js`) | Eski/alternatif GoldAPI endpoint'i |
| POST | `/api/add-games` | " | Oyun ekle |
| GET | `/api/add-games` | " | Oyun ekleme durumunu görüntüle |

> ⚠️ **Not:** `routes/index.js` içinde `router.use("/poker_api", pockersGamesRoute)` ve
> `router.use("/poker_api", pokerApiRoute)` iki kez farklı değişken adlarıyla çağrılıyor ama
> ikisi de aynı dosyayı (`./pokerApi`) require ediyor — pratikte tekrar/gereksiz bir satır,
> davranışı değiştirmiyor.

> **BizzoDeneme dual-agent notu:** Deneme bonusu çevriminde `game_launch`, ikinci bir Betinovi
> agent'ına (`bizzodeneme`, `BETINOVI_*_2` env değişkenleri) yönlendirilebiliyor. Bu ikinci
> agent'ın callback'leri de aynı `/betinovi_api` endpoint'lerine gelir; token/agent koduna göre
> ayrıştırılır. Detay: `v0_memories/team/bizzodeneme-dual-agent.md`.

---

## Admin Panel API'si

Mount: `/admin` → `routes/admin/index.js` (+ alt router'lar). **Tüm `/admin/*` route'ları**
önce `authenticateAdmin`, sonra `adminOriginGuard`, sonra `adminActionLogger`
middleware'lerinden geçer (dosya başında global tanımlı). Bazı endpoint'lerde ayrıca
`checkPermission("kaynak.eylem")` ile ince taneli RBAC uygulanır; tabloda **"Admin (izin
kontrolü bulunamadı)"** olarak işaretlenenler sadece `authenticateAdmin` seviyesinde korunuyor
gibi görünüyor (kod okunarak doğrulanmadı, statik analiz sınırı).

### Kullanıcı Yönetimi

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/users` | `users.read` | Kullanıcı listesi/arama (bkz. `admin-user-search.rest` test fixture) |
| POST | `/admin/users` | `users.create` | Yeni kullanıcı oluştur |
| GET | `/admin/users/:id` | `users.read` | Kullanıcı detayı |
| GET | `/admin/users/:id/mfa-codes` | `users.mfa.read` | Kullanıcının MFA kodlarını görüntüle |
| POST | `/admin/users/:id/mfa/disable` | `users.mfa.manage` | Kullanıcının MFA'sını devre dışı bırak |
| PUT | `/admin/users/:id` | `users.update` | Kullanıcı bilgilerini güncelle |
| PATCH | `/admin/users/:id/suspension` | `users.update` | Kullanıcıyı askıya al |
| DELETE | `/admin/users/:id/suspension` | `users.update` | Askıyı kaldır |
| PATCH | `/admin/users/:id/bet-access` | `users.update` | Bahis erişimini aç/kapat |
| PATCH | `/admin/users/:id/controls` | `users.update` | Genel kullanıcı kontrolleri (bkz. `control-game-live-players.md`) |
| PATCH | `/admin/users/:id/partner` | `users.update` | Partner/iş ortağı işaretle |
| DELETE | `/admin/users/:id/partner` | `users.update` | Partner işaretini kaldır |
| GET/POST/DELETE | `/admin/users/:id/notes` , `/notes/:noteId` | `users.read` / `users.manage` | Kullanıcı notları CRUD |
| GET | `/admin/users/:id/history` | `users.read` | Kullanıcı aktivite geçmişi |
| GET | `/admin/users/:id/history/filters` | `users.read` | Geçmiş filtre seçenekleri |
| GET | `/admin/users/:id/transactions` | `users.read` | Kullanıcı işlemleri |
| GET | `/admin/users/:id/financial-report` | `users.read` | Finansal özet rapor |
| GET | `/admin/users/:id/bonus-history` | `users.read` | Bonus geçmişi |
| GET | `/admin/users/:id/transactions/fiat-crypto` | `users.read` | Fiat/kripto işlemleri |
| GET | `/admin/users/:id/shop-purchases` | `users.read` | Mağaza satın alımları |
| GET | `/admin/users/:id/sports-bets` | Admin (izin kontrolü bulunamadı) | Spor bahisleri |
| POST | `/admin/users/:id/assign-role` | `roles.update` | Kullanıcıya admin rolü ata |

### Etiketler & Segmentasyon

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/admin/tags`, `/tags/:id` | `users.read` / `users.manage` | Etiket CRUD |
| GET | `/admin/tags/:id/users` | `users.read` | Etikete sahip kullanıcılar |
| POST | `/admin/tags/:id/assign` | `users.manage` | Kullanıcıya etiket ata |
| POST | `/admin/tags/:id/unassign` | `users.manage` | Etiketi kaldır |
| GET | `/admin/player-segments/summary` | `users.read` | Oyuncu segment özeti |
| GET | `/admin/player-segments/:key/users` | `users.read` | Segmentteki kullanıcılar |

### Bonus Yönetimi (Kayıp / Reload / Yatırım / Deneme / Manuel / Toplu)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/PUT | `/admin/manual-bonus-categories*` | Admin | Manuel bonus kategori ayarları + raporu |
| GET/PUT | `/admin/loss-bonus/settings` | `finance.lossBonus.manage` (PUT) | Kayıp bonusu ayarları |
| GET | `/admin/loss-bonus/claims` | Admin | Kayıp bonusu talepleri |
| POST | `/admin/loss-bonus/claims/:id/approve` \| `/reject` | `finance.lossBonus.manage` | Talebi onayla/reddet |
| GET | `/admin/users/:id/loss-bonus` | Admin | Kullanıcının kayıp bonusu durumu |
| GET/PUT | `/admin/reload-bonus/settings` | `finance.reloadBonus.manage` (PUT) | Reload bonusu ayarları |
| POST | `/admin/reload-bonus/preview` | Admin | Reload bonusu önizleme (kime ne kadar) |
| GET | `/admin/reload-bonus/assignments` | Admin | Atanan reload bonusları |
| POST | `/admin/reload-bonus/assignments/:id/cancel` | `finance.reloadBonus.manage` | Atamayı iptal et |
| GET | `/admin/users/:id/reload-bonus` | Admin | Kullanıcı reload bonusu durumu |
| POST | `/admin/users/:id/reload-bonus` | `finance.reloadBonus.manage` | Kullanıcıya manuel reload bonusu ata |
| GET/PUT | `/admin/deposit-bonus/settings` | `finance.depositBonus.manage` (PUT) | Yatırım bonusu ayarları |
| GET | `/admin/deposit-bonus/claims` | Admin | Yatırım bonusu talepleri |
| POST | `/admin/deposit-bonus/claims/:id/approve` \| `/reject` | `finance.depositBonus.manage` | Onayla/reddet |
| GET | `/admin/users/:id/deposit-bonus` | Admin | Kullanıcı yatırım bonusu durumu |
| GET/PUT | `/admin/trial-bonus/settings` | `finance.trialBonus.manage` (PUT) | Deneme bonusu ayarları (hedef bakiye, kayıt tarihi kuralları — bkz. `trial-bonus-review-lock.md`) |
| GET | `/admin/trial-bonus/claims` | Admin | Deneme bonusu talepleri |
| POST | `/admin/trial-bonus/claims/:id/approve` \| `/reject` | `finance.trialBonus.manage` | Onayla/reddet |
| POST | `/admin/trial-bonus/lookup` | Admin | Kullanıcı deneme bonusu sorgula |
| GET | `/admin/users/:id/trial-bonus` | Admin | Kullanıcının deneme bonusu / inceleme kilidi durumu |
| POST | `/admin/users/:id/trial-bonus/resolve-review` | `finance.trialBonus.manage` | İnceleme kilidini çöz (onay/red) |
| POST | `/admin/users/:id/trial-bonus/cancel` | `finance.trialBonus.manage` | Deneme bonusunu manuel iptal et |
| GET | `/admin/manual-adjustments` | Admin | Manuel bakiye düzeltmeleri listesi (audit'li — bkz. `wallet-update-backdoor-fix.md`) |
| GET | `/admin/users/:id/manual-bonus-history` \| `/manual-adjustments` | Admin | Kullanıcıya özel geçmiş |
| POST | `/admin/users/:id/manual-adjustments` | `finance.manualAdjustments.manage` (route içinde kontrol edilir) | Manuel bakiye düzeltmesi uygula — **tek yetkili bakiye değiştirme yolu** |
| GET | `/admin/bulk-bonus/affiliate-codes` \| `/bonus-categories` | Admin | Toplu bonus için seçenekler |
| POST | `/admin/bulk-bonus` | Admin | Toplu bonus gönder (çoklu kullanıcıya) |

### Çağrı Senaryoları (CRM)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/POST/PUT | `/admin/call-scenarios/templates*` | `callScenarios.manage` (yazma) | Çağrı senaryosu şablonları |
| GET | `/admin/call-scenarios/check-duplicate` | Admin | Mükerrer kontrol |
| GET | `/admin/call-scenarios/assignments` | Admin | Atanan senaryolar |
| POST | `/admin/call-scenarios/assignments/:id/cancel` \| `/violate` \| `/complete` | `callScenarios.manage` | Senaryo durumunu güncelle |
| GET/POST | `/admin/users/:id/call-scenarios` | Admin / `callScenarios.manage` | Kullanıcıya özel senaryo geçmişi/atama |

### CRM & Bakiye Raporları

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/crm-report/summary` \| `/buckets` \| `/game-buckets` \| `/filter-options` \| `/game-options` \| `/members` | Admin | CRM segment/bucket raporları |
| GET/PUT | `/admin/balance-analysis/summary` \| `/members` \| `/members/:id` \| `/settings` | Admin / `finance.balanceAnalysis.manage` (PUT settings) | Bakiye analiz raporları |

### Oyunlar, Sağlayıcılar, Banner, Kategori

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/games` | `games.read` | Oyun listesi |
| PUT | `/admin/games/:id` | `games.update` | Oyun güncelle |
| DELETE | `/admin/games/:id` | `games.delete` | Oyun sil |
| GET | `/admin/games/meta` | `games.read` | Oyun meta verisi (filtre seçenekleri) |
| GET | `/admin/providers` | `providers.read` | Sağlayıcı listesi |
| PUT | `/admin/providers/:id/status` | `providers.update` | Sağlayıcı durumunu değiştir |
| POST/GET/PUT/DELETE | `/admin/banners*` | `platform.create/read/update/delete` | Banner CRUD (resim yükleme destekli) |
| POST/GET/PUT/DELETE | `/admin/categories*` | `platform.create/read/update/delete` | Kategori CRUD |

### Mağaza (Shop) & VIP & NFT (Kutu/Item)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| POST/GET/PUT/DELETE | `/admin/shop-items*` | `shop.manage` / `shop.read` | Mağaza ürünü CRUD |
| POST/GET/PUT/DELETE | `/admin/vip*` | `users.manage` / `users.read` | VIP seviye/ödül CRUD |
| POST/GET/PUT/DELETE | `/admin/boxes*` | `nft.create/read/update/delete` | Kutu (loot box) CRUD |
| POST/GET/PUT/DELETE | `/admin/items*` | `nft.create/read/update/delete` | NFT/item CRUD |

### Leaderboard, Promosyon Kodu, Bilet Etkinliği, Turnuvalar

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| POST/GET/PUT/DELETE | `/admin/leaderboards*` | `users.manage` / `users.read` | Liderlik tablosu CRUD |
| GET | `/admin/promocodes/affiliate-options` | `finance.promo.read` | Promosyon kodu için affiliate seçenekleri |
| POST/GET/PUT/DELETE | `/admin/promocodes*` | `finance.promo.manage` / `.read` | Promosyon kodu CRUD (bkz. `promo-code-conditions.md`) |
| GET/POST/PUT/DELETE | `/admin/ticket-events*` | `finance.tickets.read/manage` | Bilet etkinliği (çekiliş) yönetimi |
| GET | `/admin/ticket-events/:id/tickets` | `finance.tickets.read` | Etkinlik biletleri |
| GET | `/admin/ticket-events/user-search` | `finance.tickets.manage` | Kullanıcı arama (manuel bilet için) |
| POST | `/admin/ticket-events/:id/manual-ticket` | `finance.tickets.manage` | Manuel bilet ekle |
| GET/POST/PUT/DELETE | `/admin/race-tournaments*` | `finance.race.read/manage` | Race turnuvası yönetimi |
| GET | `/admin/race-tournaments/:id/leaderboard` | `finance.race.read` | Liderlik tablosu |
| GET | `/admin/race-tournaments/user-search` | `finance.race.manage` | Manuel katılım için kullanıcı arama |
| POST | `/admin/race-tournaments/:id/manual-entry` | `finance.race.manage` | Manuel katılım ekle |
| DELETE | `/admin/race-tournaments/:id/entries/:entryId` | `finance.race.manage` | Katılımı sil |
| POST | `/admin/race-tournaments/:id/settle` | `finance.race.manage` | Turnuvayı sonuçlandır (ödül dağıt) |
| GET/POST/PUT/DELETE | `/admin/sports-tournaments*` | `sports.tournament.read/manage` | Spor turnuvası yönetimi |
| GET | `/admin/sports-tournaments/:id/leaderboard` | `sports.tournament.read` | Liderlik tablosu |
| POST | `/admin/sports-tournaments/:id/settle` | `sports.tournament.manage` | Sonuçlandır |

### Kampanya & Promosyon (Frontend Showcase — bkz. `promotions.md`)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/admin/campaigns*` | `finance.campaigns.read/manage` | Kampanya CRUD |
| POST | `/admin/campaigns/:id/assign` \| `/revoke` | `finance.campaigns.manage` | Kampanyayı kullanıcıya ata/geri al |
| GET/POST/PUT/DELETE | `/admin/campaign-categories*` | `finance.campaigns.read/manage` | Kampanya kategorisi CRUD |
| GET/POST/PUT/DELETE | `/admin/promotions*` | `finance.promo.read/manage` | Promosyon (vitrin) CRUD |
| GET/POST/PUT/DELETE | `/admin/promotion-categories*` | `finance.promo.read/manage` | Promosyon kategorisi CRUD |

### Duyurular, Ayarlar, Battlepass, Bonus Ayarları

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| POST | `/admin/notices` | `notice.create` | Duyuru oluştur (resim destekli) |
| GET | `/admin/notices` | `notice.read` | Duyuru listesi |
| GET | `/admin/notices/user/:userId` | `notice.read` | Kullanıcıya özel duyurular |
| DELETE | `/admin/notices/:id` | `notice.delete` | Duyuru sil |
| GET/PUT/DELETE | `/admin/settings*` | `platform.read/update/delete` | Genel platform ayarları (iki farklı GET tanımı var — bkz. not) |
| POST/PUT/GET | `/admin/season`, `/reward*`, `/mission*` | `battlepass.create/update/read` | Battlepass sezon/ödül/görev yönetimi |
| GET/POST/PUT/DELETE | `/admin/bonus-settings*` | `platform.read/create/update/delete` | Bonus ayarları (min/max, oranlar) |

> ⚠️ **Not:** `router.get("/settings", ...)` iki kez tanımlanmış (satır 5355 ve 5369) — Express'te
> ilk eşleşen route çalışır, ikinci tanım **her zaman devre dışıdır** (dead code). Ayrıca
> `/admin/wingo/config` ve `/admin/wingo/force` de iki kez tanımlanmış (satır 6980-7017 ve
> 8246-8248, ikincisi `adminWingoController` üzerinden) — aynı şekilde ikinci tanım pratikte
> hiç çalışmaz.

### Dashboard, İşlemler, Oyun Geçmişleri

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/analytics` | `dashboard.read` | Ana dashboard metrikleri |
| GET | `/admin/analytics/last-transactions` | `dashboard.read` | Son işlemler akışı |
| GET | `/admin/payment-transactions/deposit` \| `/withdraw` | `finance.deposits.read` / `finance.withdraws.read` | Ödeme sağlayıcı işlemleri |
| GET | `/admin/transactions-deposit` \| `/transactions-withdraw` | aynı | Tüm yatırım/çekim işlemleri (birleşik) |
| GET | `/admin/wingo/config` \| `/futures/history` \| `/turbo/history` \| `/wingo/history` \| `/battle/history` \| `/blackjack/history` \| `/crash/history` \| `/duels/history` \| `/mines/history` \| `/roll/history` \| `/towers/history` \| `/unbox/history` | `games.read` | Her oyun motoru için ayrı geçmiş/config endpoint'i |
| POST | `/admin/wingo/force` | `games.manage` | Wingo round sonucunu manuel zorla |
| POST | `/admin/wingo/config` | `games.update` | Wingo config güncelle |

### Banka Hesapları & Havale Onayı

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/bank-transfers` | `finance.bankTransfers.read` | Yatırım havale talepleri |
| PATCH | `/admin/bank-transfers/:id/status` | `finance.bankTransfers.manage` | Yatırım havalesi durumunu güncelle |
| GET | `/admin/bank-transfers-withdraw` | `finance.bankTransfersWithdraw.read` | Çekim havale talepleri |
| PATCH | `/admin/bank-transfers-withdraw/:id/status` | `finance.bankTransfersWithdraw.manage` | Çekim havalesi durumunu güncelle |
| GET/POST/PUT/DELETE | `/admin/bank-accounts*` | `finance.bankAccounts.read/manage` | Yatırım için kullanılan banka hesapları CRUD |

### Spor Bahisleri (Admin Görünümü)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/sports-bets` | `sports.read` | Tüm spor bahisleri |
| GET | `/admin/sports-bets/:betId` | `sports.read` | Bahis detayı |
| GET | `/admin/sports-bets-stats` | `sports.read` | İstatistikler |

### Roller & İzinler & Admin Kullanıcıları

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/permissions` | `roles.read` | Tüm izin tanımları |
| GET/POST/PUT/DELETE | `/admin/roles*` | `roles.read/create/update/delete` | Admin rolü CRUD |
| GET | `/admin/admin-users` | `roles.read` | Admin kullanıcı listesi |
| GET | `/admin/my-permissions` | `authenticateAdmin` | Giriş yapan admin'in kendi izinleri |

### Site Ayarları (Detaylı) & Dosya Yönetimi

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/PUT | `/admin/site-settings` | `platform.read/update` | Genel site ayarları |
| POST | `/admin/site-settings/logo` \| `/logo-mini` \| `/favicon` | `platform.update` | Görsel yükleme |
| POST/DELETE/PUT | `/admin/site-settings/partners*` | `platform.update` | Partner logoları CRUD + sıralama |
| POST/DELETE/PUT | `/admin/site-settings/licenses*` | `platform.update` | Lisans rozetleri CRUD + sıralama |
| GET/POST/DELETE | `/admin/site-settings/avatars*` | `platform.read/update` | Sistem avatarları yönetimi |
| POST | `/admin/site-settings/avatars/fallback` | `platform.update` | Varsayılan avatar ayarla |
| POST/GET | `/admin/site-settings/original-games*` | `platform.update/read` | "Orijinal oyunlar" vitrin ayarı |
| PUT | `/admin/site-settings/custom-css` \| `/custom-js` \| `/custom-html` | `platform.update` | Özel kod enjeksiyonu |
| GET | `/admin/files` | `platform.read` | Yüklenen dosya listesi |
| POST | `/admin/files/upload` \| `/upload-url` | `platform.update` | Dosya yükle (form veya URL'den) |
| DELETE | `/admin/files/:filename` | `platform.update` | Dosya sil |
| GET/POST | `/admin/category-icons*` | `platform.read/update` | Kategori ikon yönetimi |
| GET | `/admin/provider/display-names` | Admin (izin kontrolü bulunamadı) | Sağlayıcı görünen adları |
| GET/PUT | `/admin/provider/settings` | `platform.read/update` | Sağlayıcı ayarları |
| GET/PUT | `/admin/sms-otp/settings` | `platform.read/update` | SMS OTP sağlayıcı ayarları |
| GET/PUT/POST | `/admin/email-templates` , `/email-templates/test` | `platform.read/update` | Email şablonları + test gönderimi |

### Ödeme Sağlayıcı Admin Panelleri (Ayar + İşlem + Çekim Onay/Red)

Her sağlayıcı için aynı desen tekrarlanır: `settings` (GET/PUT), `transactions` (GET),
`withdraw/:id/approve` (POST), `withdraw/:id/reject` (POST).

| Sağlayıcı | Base path | İzin (settings/finance) |
|---|---|---|
| Forcelab Finance | `/admin/forcelab-finance/*` | `platform.read/update`, `finance.read`, `finance.withdraws.manage` |
| GalaxyPay | `/admin/galaxypay/*` | aynı desen |
| MeelDev | `/admin/meeldev/*` | aynı desen |
| XPayments (mount: `/admin/xpayments`) | `routes/admin/xPayments.js` | aynı desen + ek `POST /withdraw/:id/cancel` |
| FluxKripto (mount: `/admin/fluxkripto`) | `routes/admin/fluxKripto.js` | aynı desen |

### Bildirimler (Admin Panel İçi — Zil İkonu)

| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/notifications` | Admin (izin kontrolü bulunamadı) | Admin'e gelen sistem bildirimleri |
| POST | `/admin/notifications/:id/read` | Admin | Bildirimi okundu işaretle |
| POST | `/admin/notifications/read-all` | Admin | Tümünü okundu işaretle |

### Alt-Mount Edilmiş Admin Router'ları

#### `/admin/providers/*` (`routes/admin/providerRoutes.js`)
| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/providers/api-providers` | `providers.read` | API sağlayıcı listesi |
| GET | `/admin/providers/api-providers/:id` | `providers.read` | Sağlayıcı detayı |
| POST | `/admin/providers/api-providers` | `providers.create` | Yeni sağlayıcı ekle |
| DELETE | `/admin/providers/api-providers/:id` | `providers.delete` | Sağlayıcı sil |
| POST | `/admin/providers/api-providers/:id/test-auth` | `providers.manage` | Kimlik doğrulamayı test et |
| POST | `/admin/providers/api-providers/sync-all` | `providers.manage` | Tüm sağlayıcıları senkronize et |
| POST | `/admin/providers/api-providers/:id/sync-all-games` | `providers.manage` | Sağlayıcının tüm oyunlarını senkronize et |
| GET | `/admin/providers/game-providers` | `providers.read` | Oyun sağlayıcı listesi |
| GET | `/admin/providers/game-providers/:id` | `providers.read` | Detay |
| PUT | `/admin/providers/game-providers/:id` \| `/status` | `providers.update` | Güncelle / durum değiştir |
| POST | `/admin/providers/game-providers/sync-from-games` | `providers.manage` | Oyunlardan sağlayıcı listesini türet |
| POST | `/admin/providers/game-providers/:id/sync-games` | `providers.manage` | Oyunları senkronize et |

#### `/admin/betinovi-admin/*` (`routes/admin/betinoviAdminRoutes.js`)
| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET/PUT | `/admin/betinovi-admin/settings` | `platform.apiSettings.read/update` | Betinovi API ayarları |
| POST | `/admin/betinovi-admin/reports/:type` | `reports.betinovi.read` | Betinovi raporu çek |
| GET | `/admin/betinovi-admin/control-game/vendors` | `controlGame.read` | Canlı oyun sağlayıcı listesi |
| GET | `/admin/betinovi-admin/control-game/players-live/:vendorCode` | `controlGame.read` | **Oyundaki kullanıcılar** paneli (bkz. `control-game-live-players.md` — transaction bazlı dedupe) |
| GET | `/admin/betinovi-admin/control-game/agent-balance-live` | `controlGame.read` | Agent bakiyesi canlı görünüm |
| POST | `/admin/betinovi-admin/control-game/:type` | `controlGame.read` | Canlı oyun kontrolü (bkz. not — sadece `.read` izniyle korunan bir POST, muhtemelen kasıtsız) |

#### `/admin/security/*` (`routes/admin/security/index.js`)
| Method | Path | İzin | Açıklama |
|---|---|---|---|
| GET | `/admin/security/ip-collisions` | `security.read` | Aynı IP'den birden fazla hesap tespiti |
| GET | `/admin/security/system-logs` | `security.read` | Sistem logları |
| GET | `/admin/security/activity-logs` | `security.read` | Admin aktivite logları (audit trail) |
| GET | `/admin/security/suspicious-manual-credits` | `security.read` | Şüpheli manuel bakiye kredisi tespiti |

---

## Kullanılmayan / Mount Edilmemiş Route'lar

Aşağıdaki dosyalar route mantığı içerir ama **hiçbir yerden `require`/`router.use` edilmediği**
için canlıda **erişilemez** (statik analizle doğrulandı — kodda dead code):

| Dosya | Tanımlı Route'lar | Not |
|---|---|---|
| `routes/admin/user.js` | `GET /`, `GET /:id` | `controllers/admin/userController`'ı kullanır; muhtemelen `/admin/index.js`'teki `GET /admin/users`, `GET /admin/users/:id` ile aynı işi görüyor ve onunla değiştirilmiş, silinmemiş |
| `routes/auth/google/index.js` | `GET /`, `GET /callback` | Google OAuth login akışı — `routes/auth/index.js`'in mount listesinde (`credentials`, `roblox`, `discord`, `social`) **yok**. Google login şu an `auth/social/index.js`'teki `POST /auth/social/google` (ID token tabanlı) üzerinden yapılıyor olabilir; bu dosya eski/denenmemiş bir OAuth-redirect yaklaşımı olabilir |
| `routes/news/support.js` | `GET /`, `POST /add`, `PUT /:id`, `DELETE /:id` | `news/index.js` içinde mount edilmemiş; muhtemelen "destek makaleleri" için ayrı bir CRUD planlanmış ama bağlanmamış |

> Bu üç dosyayı temizlemek (silmek) veya doğru şekilde mount etmek gelecekte kafa karışıklığını
> önler. Şu an davranışsal bir etkileri yok.

---

## Bilinen Kod Tekrarları / Dikkat Edilmesi Gerekenler

- `routes/admin/index.js` içinde **aynı path iki kez tanımlanmış** durumlar var:
  - `GET /admin/settings` (satır ~5355 ve ~5369) — ikincisi asla çalışmaz.
  - `GET /admin/wingo/config`, `POST /admin/wingo/config`, `POST /admin/wingo/force` (satır
    ~6980-7017 bloğu ve ~8246-8248 bloğu, ikincisi `adminWingoController` ile) — ikinci blok
    asla çalışmaz, kod temizliği gerekiyor.
- `routes/index.js` içinde `/poker_api` iki kez mount ediliyor (aynı dosya, farklı değişken
  adıyla) — işlevsel bir sorun yok ama gereksiz.
- `/admin/betinovi-admin/control-game/:type` (POST, state-changing bir aksiyon gibi duruyor)
  sadece `controlGame.read` izniyle korunuyor — isim yanıltıcı olabilir, ince taneli bir
  `controlGame.manage` izni daha uygun olabilir (kod değiştirilmeden not edildi).
</content>
