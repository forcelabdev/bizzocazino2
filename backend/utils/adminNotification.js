const AdminNotification = require("../database/models/AdminNotification");
const { getIO } = require("./io");

const MAX_NOTIFICATIONS = 200;

/**
 * Yeni bir admin bildirimi oluşturur, veritabanına kaydeder ve
 * panelde oturum açmış tüm adminlere Socket.IO ile anlık olarak yayınlar.
 *
 * @param {"withdraw"|"new_user"|"sanction"} type
 * @param {string} title
 * @param {string} message
 * @param {string} [link]
 * @param {object} [meta]
 */
async function createAdminNotification(type, title, message, link, meta = {}) {
	try {
		const notification = await AdminNotification.create({
			type,
			title,
			message,
			link,
			meta,
		});

		try {
			const io = getIO();
			io.emit("admin:notification", {
				_id: notification._id,
				type: notification.type,
				title: notification.title,
				message: notification.message,
				link: notification.link,
				meta: notification.meta,
				createdAt: notification.createdAt,
				readBy: [],
			});
		} catch (socketErr) {
			console.error("Admin notification socket emit error:", socketErr.message);
		}

		// Eski bildirimleri sınırlı tutmak için basit temizlik
		const count = await AdminNotification.countDocuments();

		if (count > MAX_NOTIFICATIONS) {
			const excess = count - MAX_NOTIFICATIONS;
			const oldest = await AdminNotification.find()
				.sort({ createdAt: 1 })
				.limit(excess)
				.select("_id");

			await AdminNotification.deleteMany({
				_id: { $in: oldest.map((doc) => doc._id) },
			});
		}

		return notification;
	} catch (error) {
		console.error("createAdminNotification error:", error.message);

		return null;
	}
}

module.exports = { createAdminNotification };
