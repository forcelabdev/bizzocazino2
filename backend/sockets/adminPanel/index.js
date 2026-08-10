const jwt = require("jsonwebtoken");

// Load database models
const User = require("../../database/models/User");
const { extractPermissions, hasPermission } = require("../../middleware/permission");
const {
	initControlGameRealtime,
	subscribePlayers,
	unsubscribePlayers,
	subscribeAgentBalance,
	unsubscribeAgentBalance,
	cleanupSocket,
} = require("../../services/controlGameRealtimeService");

/**
 * "/admin-panel" namespace
 *
 * Bu namespace, back-office admin panelinde (Vue admin app) oturum açmış
 * STAFF adminlere anlık bildirim (yeni çekim talebi, yeni üye, yaptırım vb.)
 * yayınlamak için kullanılır. Müşteri tarafındaki "/general" ve "/admin"
 * namespace'lerinden tamamen ayrıdır; sadece rank === "admin" olan
 * kullanıcıların bağlanmasına izin verilir.
 */
module.exports = (io) => {
	initControlGameRealtime(io);

	io.of("/admin-panel").use(async (socket, next) => {
		try {
			const token = socket.handshake.auth?.token;

			if (!token) {
				return next(new Error("Yetkilendirme gerekli."));
			}

			const decoded = jwt.verify(
				token,
				process.env.TOKEN_SECRET || process.env.JWT_SECRET,
			);

			const user = await User.findById(decoded._id || decoded.id)
				.select("_id username rank adminRole")
				.populate({
					path: "adminRole",
					populate: { path: "permissions", select: "code resource action" },
				});

			if (!user || user.rank !== "admin") {
				return next(new Error("Bu alana erişim yetkiniz yok."));
			}

			socket.adminUserId = user._id.toString();
			socket.isSuperAdmin = user.adminRole?.isSuperAdmin || false;
			socket.userPermissions = extractPermissions(user, !user.adminRole);
			next();
		} catch (err) {
			return next(new Error("Yetkilendirme hatası."));
		}
	});

	io.of("/admin-panel").on("connection", (socket) => {
		socket.join("admin-panel-room");

		const canReadControlGame = () =>
			hasPermission(
				{
					isSuperAdmin: socket.isSuperAdmin,
					userPermissions: socket.userPermissions || [],
				},
				"controlGame.read",
			);

		socket.on("control-game:subscribe-players", (payload) => {
			const vendorCode = String(payload?.vendorCode || "").trim();
			if (!vendorCode || !canReadControlGame()) return;
			subscribePlayers(socket, vendorCode);
		});

		socket.on("control-game:unsubscribe-players", (payload) => {
			const vendorCode = String(payload?.vendorCode || "").trim();
			if (!vendorCode) return;
			unsubscribePlayers(socket, vendorCode);
		});

		socket.on("control-game:subscribe-balance", () => {
			if (!canReadControlGame()) return;
			subscribeAgentBalance(socket);
		});

		socket.on("control-game:unsubscribe-balance", () => {
			unsubscribeAgentBalance(socket);
		});

		socket.on("disconnect", () => {
			cleanupSocket(socket);
		});
	});
};
