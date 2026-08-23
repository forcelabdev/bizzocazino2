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
const onlineUsers = new Set();

io.on("connection", (socket) => {
	// console.log("🌍 Yeni ziyaretçi bağlandı:", socket.id);

	// Eğer kullanıcı login olmuşsa token'dan userId gönder
	const userId = socket.handshake.auth?.userId || socket.id;
	onlineUsers.add(userId);

	// herkese gönder
	io.emit("siteOnline", { online: onlineUsers.size });

	socket.on("disconnect", () => {
		onlineUsers.delete(userId);
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

// Set app port
const PORT = process.env.SERVER_PORT || 5000;

server.listen(PORT, () =>
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
	),
);
