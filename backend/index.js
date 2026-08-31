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

server.listen(PORT, () =>
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
	),
);
