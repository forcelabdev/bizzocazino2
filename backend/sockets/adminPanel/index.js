const jwt = require("jsonwebtoken");

// Load database models
const User = require("../../database/models/User");

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

			const user = await User.findById(decoded._id || decoded.id).select(
				"_id username rank",
			);

			if (!user || user.rank !== "admin") {
				return next(new Error("Bu alana erişim yetkiniz yok."));
			}

			socket.adminUserId = user._id.toString();
			next();
		} catch (err) {
			return next(new Error("Yetkilendirme hatası."));
		}
	});

	io.of("/admin-panel").on("connection", (socket) => {
		socket.join("admin-panel-room");

		socket.on("disconnect", () => {
			// no-op
		});
	});
};
