const mongoose = require("mongoose");

// Tekil (singleton) doküman: bilet etkinliği için hangi tarihe kadar onaylı
// yatırımların tarandığını tutar (cron tabanlı senkronizasyon imleci).
const ticketSyncStateSchema = new mongoose.Schema({
	lastSyncedAt: { type: Date, default: () => new Date(0) },
});

module.exports = mongoose.models.TicketSyncState || mongoose.model("TicketSyncState", ticketSyncStateSchema);
