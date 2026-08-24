// Puppeteer config hatası için geçici çözüm - dotenv'den ÖNCE ayarlanmalı
process.env.XDG_CONFIG_HOME = "/tmp";
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "true";
process.env.PUPPETEER_CACHE_DIR = "/tmp/puppeteer";

// 🛡️ Global crash guard — EN BAŞTA tanımlanmalı.
// Daha önce hiçbir uncaughtException/unhandledRejection handler'ı yoktu:
// kod tabanının HERHANGİ bir yerinde (100+ route/socket/cron/service dosyası)
// yakalanmamış tek bir hata (örn. eksik try/catch, .catch() unutulmuş bir
// promise) olduğunda Node.js process'i ANINDA çökertiyordu — sadece o isteği
// değil, TÜM backend'i. Bu, "bağlantı hatası" görüp 3-5 kez tekrar deneyince
// çalışması davranışının olası nedenlerinden biriydi (PM2 process'i yeniden
// başlatana kadar istekler başarısız oluyordu). Artık hata sadece loglanır,
// process ayakta kalır ve isteğe kesinti olmadan devam edilir.
// ÖNEMLİ DÜZELTME (2026-08-25): İlk versiyonda process burada KAPATILMIYORDU
// (sadece logluyorduk). Bu, ör. EADDRINUSE (port zaten kullanımda) gibi
// başlangıç/ölümcül hatalarında process'i "zombi" haline getirdi: Node
// process teknik olarak ayakta kalıyor, PM2 ekranında "online" görünüyor
// (çökmediği için restart sayacı da artmıyor), ama server.listen()
// başarısız olduğu için HİÇBİR PORTU DİNLEMİYOR ve hiçbir isteğe cevap
// veremiyor. PM2 bunu asla fark edip yeniden başlatmıyordu çünkü process
// hiç çökmüyordu. Bu yüzden site "veri gelmiyor / 502" durumuna düşmüştü.
//
// Doğru/önerilen pattern: hatayı logla, SONRA process'i kapat (exit code 1)
// — PM2 zaten bunu algılayıp otomatik yeniden başlatacak (restart sayacı
// artar, bu da bize gerçek bir sinyal verir). "Hatadan sonra sessizce
// yaşamaya devam etmek" Node.js'in resmi dokümantasyonunda da tavsiye
// edilmez çünkü uygulama durumu tutarsız kalmış olabilir.
process.on("uncaughtException", (err, origin) => {
	console.error("🔥 [uncaughtException] Yakalanmamış hata:", err);
	console.error("🔥 [uncaughtException] Origin:", origin);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error("🔥 [unhandledRejection] Yakalanmamış promise reddi:", reason);
	process.exit(1);
});

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

const allowedOrigins = [
	process.env.SERVER_FRONTEND_URL, // http://localhost:8080
	process.env.SERVER_ADMIN_URL, // http://localhost:5173
	...((process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()) ||
		[]),
];
app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
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
		origin: allowedOrigins,
		credentials: true,
	},
});
io.engine.use((req, res, next) => {
	req.headers["cf-connecting-ip"] = getClientIp(req);
	next();
});
app.set("io", io);
require("./utils/io").init(io);

//initTelegramBot(io);

// connectDB() promise'i saklanıyor — server.listen() bu tamamlanana kadar
// beklemeli (aşağıda). Önceden bu hiç await edilmiyordu: server.listen()
// hemen çalışıyor, sunucu "hazırım" deyip istek almaya başlıyordu ama
// arka planda hâlâ syncAllIndexes/migrateUsersToRivoWallet/seedSystemPermissions
// gibi ağır DB işlemleri sürüyordu. Her process restart'ında (PM2 restart,
// deploy, crash sonrası) ilk gelen istekler bu pencerede yavaş/kararsız
// yanıt alabiliyordu — "bağlantı hatası" görüp tekrar deneyince çalışması
// davranışının olası nedenlerinden biri.
const dbReadyPromise = require("./database")();
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
// Not: Set kendisi burada tutuluyor (yerel emit sayacı için), ama gerçek
// User ObjectId'leri de utils/io.js'teki merkezi sete yazılıyor — Notice
// segmentasyonu (audience: "online"/"offline") bunu okur.
const onlineUsers = new Set();
const ioUtils = require("./utils/io");

io.on("connection", (socket) => {
	// console.log("🌍 Yeni ziyaretçi bağlandı:", socket.id);

	// Eğer kullanıcı login olmuşsa token'dan userId gönder
	const userId = socket.handshake.auth?.userId || socket.id;
	onlineUsers.add(userId);
	ioUtils.addOnlineUser(userId);

	// herkese gönder
	io.emit("siteOnline", { online: onlineUsers.size });

	socket.on("disconnect", () => {
		onlineUsers.delete(userId);
		ioUtils.removeOnlineUser(userId);
		io.emit("siteOnline", { online: onlineUsers.size });
		// console.log("❌ Kullanıcı ayrıldı:", userId);
	});
});

// Mount sockets (namespace’ler burada açılıyor)
require("./sockets")(io);

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

// Set app port
const PORT = process.env.SERVER_PORT || 5000;

// DB bağlantısı + kritik başlangıç işlemleri (index sync, migration, seed)
// tamamlanmadan sunucu istek almasın. connectDB() zaten kendi içinde hata
// durumunda process.exit(1) yaptığı için burada ekstra bir catch/exit
// gerekmiyor — sadece "ne zaman hazır olduğunu" bekliyoruz.
dbReadyPromise
	.then(() => {
		server.listen(PORT, () =>
			console.log(
				`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
			),
		);
	})
	.catch((err) => {
		console.error("🔥 Sunucu başlatılamadı, DB bağlantısı kurulamadı:", err);
		process.exit(1);
	});
