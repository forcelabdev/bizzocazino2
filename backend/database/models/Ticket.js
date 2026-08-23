const mongoose = require("mongoose");

// Kazanılan her bir çekiliş bileti. Yatırımdan otomatik (source: "deposit") veya
// admin panelden manuel (source: "manual") oluşturulabilir. Manuel biletler her
// zaman anında "approved" statüsündedir; yatırımdan gelenler etkinliğin
// wageringRequirement ayarına göre "pending" başlayıp çevrim tamamlanınca onaylanır.
const ticketSchema = new mongoose.Schema({
	event: { type: mongoose.Schema.ObjectId, ref: "TicketEvent", required: true, index: true },
	user: { type: mongoose.Schema.ObjectId, ref: "User", required: true, index: true },
	source: { type: String, enum: ["deposit", "manual"], required: true },
	sourceCollection: { type: String, default: "" }, // hangi ödeme koleksiyonundan geldiği (izleme/tekrar önleme için)
	sourceTransactionId: { type: String, default: "" },
	depositAmount: { type: Number, default: 0 },
	status: { type: String, enum: ["pending", "approved", "cancelled"], default: "pending", index: true },
	wageringRequired: { type: Number, default: 0 },
	wageringProgress: { type: Number, default: 0 },
	approvedAt: { type: Date, default: null },
	grantedBy: { type: mongoose.Schema.ObjectId, ref: "User", default: null }, // manuel eklemede admin (adminUser da User koleksiyonunda tutulur)
	createdAt: { type: Date, default: Date.now },
});

ticketSchema.index({ user: 1, event: 1, createdAt: -1 });
ticketSchema.index({ event: 1, sourceCollection: 1, sourceTransactionId: 1 });

module.exports = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
