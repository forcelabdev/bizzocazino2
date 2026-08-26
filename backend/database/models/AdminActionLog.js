const mongoose = require("mongoose");

const actorSnapshotSchema = new mongoose.Schema(
	{
		username: { type: String, default: "" },
		email: { type: String, default: "" },
		rank: { type: String, default: "" },
	},
	{ _id: false }
);

/**
 * AdminActionLog
 *
 * Admin paneli üzerinden yapılan TÜM durum değiştiren (POST/PUT/PATCH/DELETE)
 * istekleri için genel/sistem çapında denetim kaydı. `adminActionLogger`
 * middleware'i tarafından otomatik olarak, route'un iş mantığından bağımsız
 * şekilde yazılır — bu sayede hangi endpoint çağrıldığından bağımsız olarak
 * "hangi admin, ne zaman, nereden, ne yaptı" sorusu tek yerden cevaplanabilir.
 *
 * `blocked: true` olan kayıtlar, geçerli bir admin token'ı ile ama panel
 * dışından (Postman/fetch/script) gelip `adminOriginGuard` tarafından
 * reddedilen istekleri temsil eder — bunlar iz bırakmadan sistemde
 * değişiklik yapma girişimidir ve "Sistem Ayrıntıları" ekranında ayrıca
 * filtrelenebilir olmalıdır.
 */
const adminActionLogSchema = new mongoose.Schema(
	{
		actorUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		actorSnapshot: {
			type: actorSnapshotSchema,
			default: () => ({}),
		},
		method: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
		},
		path: {
			type: String,
			required: true,
			trim: true,
		},
		resource: {
			type: String,
			default: "",
			trim: true,
			index: true,
		},
		statusCode: {
			type: Number,
			default: null,
		},
		ip: {
			type: String,
			default: "",
			trim: true,
		},
		userAgent: {
			type: String,
			default: "",
			trim: true,
		},
		origin: {
			type: String,
			default: "",
			trim: true,
		},
		requestSummary: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},
		blocked: {
			type: Boolean,
			default: false,
			index: true,
		},
		// "critical" = yetki/rol/admin hesabı değişikliği veya finansal işlem —
		// güvendiğiniz personelin yetki suistimali genelde önce buradan başlar
		// (kendine/başkasına gizlice yetki verme, yeni admin oluşturma vb.).
		severity: {
			type: String,
			enum: ["normal", "critical"],
			default: "normal",
			index: true,
		},
		blockReason: {
			type: String,
			default: "",
			trim: true,
		},
		durationMs: {
			type: Number,
			default: null,
		},
	},
	{ timestamps: true }
);

adminActionLogSchema.index({ createdAt: -1 });
adminActionLogSchema.index({ actorUser: 1, createdAt: -1 });
adminActionLogSchema.index({ resource: 1, createdAt: -1 });
adminActionLogSchema.index({ blocked: 1, createdAt: -1 });

module.exports = mongoose.model("AdminActionLog", adminActionLogSchema);
