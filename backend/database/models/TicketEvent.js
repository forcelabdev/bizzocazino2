const mongoose = require("mongoose");

// Bilet Etkinliği: üyeler yatırım yaptıkça çekiliş bileti kazanır.
// wageringRequirement > 0 ise bilet, belirtilen tutarda çevrim tamamlanana kadar "pending" kalır.
const ticketEventSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	isActive: { type: Boolean, default: true },
	startsAt: { type: Date, default: null },
	expiresAt: { type: Date, default: null },
	amountPerTicket: { type: Number, required: true, min: 1 }, // kaç TL yatırıma 1 bilet
	wageringRequirement: { type: Number, default: 0, min: 0 }, // 0 = opsiyonel/kapalı, bilet direkt onaylanır
	maxTicketsPerUser: { type: Number, default: 0, min: 0 }, // 0 = limitsiz
	eligibleAffiliateCodes: { type: [String], default: [] }, // boş = herkes uygun
	note: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

ticketEventSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.models.TicketEvent || mongoose.model("TicketEvent", ticketEventSchema);
