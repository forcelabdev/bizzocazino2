// Puppeteer config hatası için geçici çözüm - dotenv'den ÖNCE ayarlanmalı
process.env.XDG_CONFIG_HOME = "/tmp";
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
process.env.PUPPETEER_CACHE_DIR = "/tmp/puppeteer";

require("dotenv").config();

const path = require("path");
const express = require("express");
const http = require("http");
const hpp = require("hpp");
const cors = require("cors");
const socket = require("socket.io");
const apiRoutes = require("./routes/api");
const cron = require("node-cron");
const { getClientIp } = require("./utils/ip");
// const { initTelegramBot } = require("./utils/telegramBot");

const app = express();
const server = http.createServer(app);

// KÖK NEDEN DÜZELTMESİ ("bağlantı hatası" / trial-bonus ve diğer isteklerde
// CORS engeli): Eski kod SADECE process.env.ALLOWED_ORIGINS'i okuyordu; ancak
// harici frontend origin'i (bizzocasino168.com) ALLOWED_ORIGINS_2/_4 gibi
// numaralı değişkenlerde tanımlıydı ve hiç okunmuyordu. Ayrıca eşleştirme tam
// string (===) ile yapıldığı için "https://site.com" ile "https://site.com/"
// (sonda slash) veya "www." önekli/öneksiz varyantlar birbirine uymuyor,
// tarayıcı preflight'ta Access-Control-Allow-Origin alamayınca isteği bloke
// edip axios'ta "bağlantı hatası" gösteriyordu.
//
// Çözüm: TÜM ALLOWED_ORIGINS* değişkenlerini birleştir, origin'leri normalize
// et (küçük harf + sondaki "/" kaldır) ve normalize edilmiş haliyle karşılaştır.
// Bilinen production domainleri — KOD İÇİ GÜVENLİ VARSAYILAN.
// .env düzenlemesi (maskeleme/sed) tekrar tekrar güvenilmez olduğu için, canlı
// frontend domainlerini burada sabit olarak da tutuyoruz. Frontend hangi varyanttan
// (www'lu/www'suz) istek atarsa atsın CORS geçer. Bu liste .env'deki
// ALLOWED_ORIGINS* değerlerine EK'tir, onların yerini almaz.
const DEFAULT_PROD_ORIGINS = [
	"https://bizzocasino168.com",
	"https://www.bizzocasino168.com",
	"https://bizzocasino.com",
	"https://www.bizzocasino.com",
];

// Çoklu-marka kurulum: SERVER_FRONTEND_URL, SERVER_FRONTEND_URL_2/_3/_4,
// SERVER_ADMIN_URL, SERVER_ADMIN_URL_2/... ve ALLOWED_ORIGINS, ALLOWED_ORIGINS_2,
// ALLOWED_ORIGINS_2_2, _3, _4, _5, _6 ... gibi TÜM numaralı varyantları topla.
// Tek tek isim yazmak yerine kalıba göre eşleştiriyoruz ki yeni bir marka/domain
// eklendiğinde kod değişikliği gerekmesin.
const collectEnvOrigins = (regex) =>
	Object.keys(process.env)
		.filter((k) => regex.test(k))
		.flatMap((k) => (process.env[k] || "").split(","));

const rawAllowedOrigins = [
	...DEFAULT_PROD_ORIGINS,
	// SERVER_FRONTEND_URL, SERVER_FRONTEND_URL_2, _3, _4 ...
	...collectEnvOrigins(/^SERVER_FRONTEND_URL(_\d+)*$/),
	// SERVER_ADMIN_URL, SERVER_ADMIN_URL_2, _3, _4 ...
	...collectEnvOrigins(/^SERVER_ADMIN_URL(_\d+)*$/),
	// ALLOWED_ORIGINS, ALLOWED_ORIGINS_2, ALLOWED_ORIGINS_2_2, _3, _4, _5, _6 ...
	...collectEnvOrigins(/^ALLOWED_ORIGINS(_\d+)*$/),
];

const normalizeOrigin = (o) =>
	(o || "").toString().trim().toLowerCase().replace(/\/+$/, "");

// Hem ham (Socket.IO gibi bazı yerler ham liste bekler) hem de hızlı arama için
// normalize edilmiş bir Set tutuyoruz.
const allowedOrigins = [...new Set(rawAllowedOrigins.map((o) => (o || "").trim()).filter(Boolean))];
const allowedOriginSet = new Set(
	allowedOrigins.map(normalizeOrigin).filter(Boolean)
);
console.log("[CORS] İzinli origin'ler yüklendi:", [...allowedOriginSet]);

// ÖNEMLİ: Bazı proxy zincirleri (Cloudflare + nginx) "Origin" başlığını iki kez
// ekleyip Express'te tek bir string olarak VİRGÜLLE birleştirebiliyor:
//   "https://www.bizzocasino168.com, https://www.bizzocasino.com"
// Bu yüzden gelen origin'i parçalara ayırıp HERHANGİ BİR parçası izinliyse kabul
// ediyor ve geri yansıtılacak olarak o TEK (normalize edilmemiş, orijinal) parçayı
// döndürüyoruz. Ham birleşik string'i yansıtmak geçersiz bir
// Access-Control-Allow-Origin üretir ve tarayıcı isteği reddeder.
const resolveAllowedOrigin = (origin) => {
	if (!origin) return true; // server-to-server (Nexus callback vb.) — origin yok
	const parts = origin.split(",").map((p) => p.trim()).filter(Boolean);
	for (const part of parts) {
		if (allowedOriginSet.has(normalizeOrigin(part))) {
			return part; // eşleşen tekil origin'i geri yansıt
		}
	}
	return null; // hiçbir parça izinli değil
};

app.use(
	cors({
		origin: function (origin, callback) {
			const matched = resolveAllowedOrigin(origin);
			if (matched) {
				callback(null, matched);
			} else {
				console.warn("[CORS] Reddedilen origin:", origin);
				callback(null, false);
			}
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		optionsSuccessStatus: 200,
	}),
);

const io = socket(server, {
	cors: {
		// HTTP tarafıyla aynı esnek mantık: birleşik/normalize origin toleransı
		// ve eşleşen tekil origin'in geri yansıtılması.
		origin: function (origin, callback) {
			const matched = resolveAllowedOrigin(origin);
			if (matched === true) return callback(null, true);
			if (matched) return callback(null, matched);
			console.warn("[CORS][socket] Reddedilen origin:", origin);
			return callback(null, false);
		},
		credentials: true,
	},
});
io.engine.use((req, res, next) => {
	req.headers["cf-connecting-ip"] = getClientIp(req);
	next();
});

// pm2 CLUSTER MODE'A GEÇİŞ NEDENİYLE EKLENDİ: Varsayılan Socket.IO adapter'ı
// sadece TEK bir process içindeki socket'lere emit/broadcast yapabilir. Cluster
// mode'da (birden fazla worker) io.emit(...) çağrısı yalnızca isteği alan
// worker'a bağlı kullanıcılara ulaşır, diğer worker'lara bağlı kullanıcılar
// (canlı bahis/oyun güncellemeleri, admin bildirimleri, online sayaç vb.)
// hiçbir şey almaz. Redis adapter tüm worker'lar arasında pub/sub ile
// event'leri paylaştırarak bunu çözer.
const { createAdapter } = require("@socket.io/redis-adapter");
const { createRedisClients } = require("./utils/redisClient");
const { pubClient: socketPubClient, subClient: socketSubClient } = createRedisClients();
io.adapter(createAdapter(socketPubClient, socketSubClient));

app.set("io", io);
require("./utils/io").init(io);

//initTelegramBot(io);

require("./database")();
require("./utils/setting").settingInitDatabase();

// Initialize avatar helper (preload fallback cache)
require("./utils/avatar").initAvatarHelper();

const parseTrustProxy = (value) => {
	if (value === undefined || value === "") return 2;
	if (value === "true") return true;
	if (value === "false") return false;
	const numericValue = Number(value);
	return Number.isNaN(numericValue) ? value : numericValue;
};

// Cloudflare + nginx means Express needs to trust two proxy hops by default.
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// Set other middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(hpp());

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount routes
app.use("/", require("./routes")(io));
app.use("/public", express.static(path.join(__dirname, "public")));

// 🌍 Site genelinde aktif kullanıcı takibi
// pm2 CLUSTER MODE'A GEÇİŞ NEDENİYLE DEĞİŞTİ: Eskiden burada yerel bir Set
// (onlineUsers) tutulup sayaç ondan hesaplanıyordu. Cluster mode'da her worker
// kendi Set'ini tutacağı için sayaç worker'a göre farklı (yanlış) görünürdü.
// Artık tek doğruluk kaynağı utils/io.js'teki paylaşılan Redis Set'i —
// sayaç da (getOnlineCount) oradan, TÜM worker'ları kapsayacak şekilde okunuyor.
const ioUtils = require("./utils/io");

io.on("connection", (socket) => {
	// console.log("🌍 Yeni ziyaretçi bağlandı:", socket.id);

	// Eğer kullanıcı login olmuşsa token'dan userId gönder
	const userId = socket.handshake.auth?.userId || socket.id;

	// KÖK NEDEN DÜZELTMESİ (pm2 sonsuz restart döngüsü — "NOAUTH Authentication
	// required" / Redis bağlantı sorunları): Bu async IIFE'lerin hiç .catch()'i
	// yoktu. ioUtils.addOnlineUser/getOnlineCount içeride Redis kullanıyor;
	// Redis auth hatası veya bağlantı kopması gibi bir sebeple reject olduğunda
	// bu bir "unhandledRejection" olarak process'i ÇÖKERTİYORDU (Node 15+
	// varsayılan davranışı). pm2 process'i sürekli yeniden başlatıyor, her
	// başlatmada yeni Redis client'lar oluşup MaxListenersExceededWarning
	// birikiyordu. Artık hata sadece loglanıyor, process ayakta kalıyor —
	// online sayaç geçici olarak güncellenmese de site/soket bağlantıları kesilmiyor.
	(async () => {
		await ioUtils.addOnlineUser(userId);
		const online = await ioUtils.getOnlineCount();
		// Redis adapter sayesinde bu emit TÜM worker'lara bağlı istemcilere ulaşır.
		io.emit("siteOnline", { online });
	})().catch((err) => {
		console.error("[Online Sayaç] addOnlineUser/getOnlineCount hatası:", err?.message || err);
	});

	socket.on("disconnect", () => {
		(async () => {
			await ioUtils.removeOnlineUser(userId);
			const online = await ioUtils.getOnlineCount();
			io.emit("siteOnline", { online });
			// console.log("❌ Kullanıcı ayrıldı:", userId);
		})().catch((err) => {
			console.error("[Online Sayaç] removeOnlineUser/getOnlineCount hatası:", err?.message || err);
		});
	});
});

// Mount sockets (namespace’ler burada açılıyor)
require("./sockets")(io);

// pm2 CLUSTER MODE'A GEÇİŞ NEDENİYLE EKLENDİ: cron.schedule çağrıları normalde
// her worker'da AYRI AYRI kayıt olur — 2 worker varsa her cron job 2 KERE
// (N worker'da N kere) tetiklenir (örn. deneme bonusu/bilet/turnuva işlemleri
// mükerrer çalışır, döviz kuru mükerrer güncellenir). pm2 cluster mode'da her
// worker'a NODE_APP_INSTANCE="0","1",... atanır; SADECE "0" (veya cluster
// dışında/dev modunda hiç atanmamışsa) instance'ın cron çalıştırmasına izin
// veriyoruz ki job'lar tam olarak BİR KERE tetiklensin.
const isPrimaryInstance =
	process.env.NODE_APP_INSTANCE === undefined ||
	process.env.NODE_APP_INSTANCE === "0";

if (isPrimaryInstance) {
	// ✅ Döviz güncelleyici cron job
	const { updateExchangeRates } = require("./utils/exchangeUpdater");

	// Sunucu açıldığında bir defa çalıştır
	updateExchangeRates();

	// Her gün saat 03:00'te çalıştır
	cron.schedule("0 3 * * *", () => {
		updateExchangeRates();
	});

	// 🎟️ Bilet Etkinliği: onaylanmış yatırımları tarayıp bilet üretir (her dakika)
	const { syncApprovedDeposits } = require("./services/ticketService");
	cron.schedule("* * * * *", () => {
		syncApprovedDeposits().catch((err) =>
			console.error("❌ Ticket sync hatası:", err.message)
		);
	});

	// 🏁 Çevrim Turnuvası (Race): durum geçişleri + manuel katılımcı otomatik artışı (her dakika)
	const raceService = require("./services/raceService");
	cron.schedule("* * * * *", () => {
		raceService.advanceTournamentStates().catch((err) =>
			console.error("❌ Race durum güncelleme hatası:", err.message)
		);
		raceService.tickManualEntries().catch((err) =>
			console.error("❌ Race manuel katılımcı artış hatası:", err.message)
		);
	});

	// ⚽ Spor Turnuvası (manuel): durum geçişleri + süresi bitenlerin sonuçlandırılması (her dakika)
	const sportsTournamentService = require("./services/sportsTournamentService");
	cron.schedule("* * * * *", () => {
		sportsTournamentService.advanceTournamentStates().catch((err) =>
			console.error("❌ Spor Turnuvası durum güncelleme hatası:", err.message)
		);
	});
}

// Set app port
const PORT = process.env.SERVER_PORT || 5000;

server.listen(PORT, () => {
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT} (instance ${process.env.NODE_APP_INSTANCE ?? "standalone"})`,
	);
	// pm2 "wait_ready" ile zero-downtime "reload" için: process hazır olduğunda
	// pm2'ye bildir. pm2 bu sinyali alana kadar eski worker'ı canlı tutar, böylece
	// deploy sırasında nginx'e gelen istekler ASLA "Connection refused" almaz.
	if (typeof process.send === "function") {
		process.send("ready");
	}
});

// pm2 CLUSTER MODE + "pm2 reload" İÇİN GRACEFUL SHUTDOWN: pm2 reload sırasında
// eski worker'a SIGINT gönderir. Bunu yakalamadan process anında öldürülürse
// o an işlenmekte olan istekler (deposit/bonus-claim/login vb.) yarıda kesilip
// istemciye "Bağlantı hatası" olarak yansır. Burada: (1) server.close() ile
// YENİ bağlantı kabul etmeyi durdur, (2) devam eden istekler bitene kadar bekle,
// (3) belirli bir süre (kill_timeout ile uyumlu) içinde tamamlanmazsa zorla çık.
const gracefulShutdown = (signal) => {
	console.log(`[Shutdown] ${signal} alındı, açık bağlantılar tamamlanıyor...`);
	server.close(() => {
		console.log("[Shutdown] HTTP server kapatıldı, process sonlandırılıyor.");
		process.exit(0);
	});

	// Uzun süren/askıda kalan bağlantılar için güvenlik zaman aşımı.
	setTimeout(() => {
		console.error("[Shutdown] Zaman aşımına ulaşıldı, zorla kapatılıyor.");
		process.exit(1);
	}, 10000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// GÜVENLİK AĞI: Yukarıdaki .catch() eklemeleriyle bilinen Redis/online-sayaç
// hatalarını yakaladık, ama başka bir yerde benzer bir catch'siz promise
// unutulursa yine "unhandledRejection" ile process çökebilir. Bunu SESSİZCE
// yutup process'i "zombi" halde ayakta tutmak DAHA KÖTÜ bir durumdur (pm2
// "online" gösterir ama process bozuk kalabilir) — bu yüzden burada sadece
// stack trace'i AÇIKÇA loglayıp process'in normal (varsayılan) davranışıyla
// sonlanmasına izin veriyoruz. Amaç: bir sonraki çökmede bu tail komutuyla
// gerçek hatayı hemen görebilmek, "boş" log ile zaman kaybetmemek.
process.on("unhandledRejection", (reason) => {
	console.error("[FATAL] unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
	console.error("[FATAL] uncaughtException:", err);
	// Node için önerilen davranış: uncaughtException sonrası process güvenilmez
	// durumda kalır, temiz bir şekilde çıkıp pm2'nin yeniden başlatmasına izin ver.
	process.exit(1);
});
