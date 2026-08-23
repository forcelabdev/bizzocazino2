const mongoose = require("mongoose");

const TicketEvent = require("../database/models/TicketEvent");
const Ticket = require("../database/models/Ticket");
const TicketSyncState = require("../database/models/TicketSyncState");
const User = require("../database/models/User");

const Deposit = require("../database/models/Deposit");
const BankTransfer = require("../database/models/BankTransfer");
const CryptoTransaction = require("../database/models/CryptoTransaction");
const ForcelabFinanceTransaction = require("../database/models/ForcelabFinanceTransaction");
const MeelDevTransaction = require("../database/models/MeelDevTransaction");
const GalaxyPayTransaction = require("../database/models/GalaxyPayTransaction");
const FluxKriptoTransaction = require("../database/models/FluxKriptoTransaction");
const XPaymentTransaction = require("../database/models/XPaymentTransaction");

class TicketError extends Error {
	constructor(code, message, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

/**
 * Onaylı yatırım tutarına göre aktif etkinliklerin kurallarını uygulayarak
 * kullanıcıya bilet(ler) verir. `wageringRequirement > 0` ise bilet "pending"
 * statüsünde açılır ve çevrim tamamlanınca `progressWageringForUser` tarafından
 * onaylanır. Aynı işlem (sourceCollection + sourceTransactionId) için tekrar
 * çağrılırsa bilet ikinci kez oluşturulmaz (idempotent).
 */
const grantTicketsForDeposit = async ({
	userId,
	depositAmount,
	sourceCollection,
	sourceTransactionId,
}) => {
	const amount = Number(depositAmount || 0);
	if (!userId || amount <= 0) return [];

	const user = await User.findById(userId).select("affiliates.redeemedCode").lean();
	if (!user) return [];

	const now = new Date();
	const events = await TicketEvent.find({
		isActive: true,
		$and: [
			{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
			{ $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
		],
	}).lean();

	const createdTickets = [];

	for (const event of events) {
		const affiliateCode = String(user.affiliates?.redeemedCode || "").trim();
		if (event.eligibleAffiliateCodes?.length && !event.eligibleAffiliateCodes.includes(affiliateCode)) {
			continue;
		}

		const quantity = Math.floor(amount / Number(event.amountPerTicket || 1));
		if (quantity <= 0) continue;

		// Aynı yatırım işlemi için bilet zaten verilmiş mi kontrol et (idempotency)
		const alreadyGranted = await Ticket.exists({
			event: event._id,
			sourceCollection,
			sourceTransactionId: String(sourceTransactionId),
		});
		if (alreadyGranted) continue;

		let allowedQuantity = quantity;
		if (event.maxTicketsPerUser > 0) {
			const existingCount = await Ticket.countDocuments({ event: event._id, user: userId });
			allowedQuantity = Math.min(quantity, event.maxTicketsPerUser - existingCount);
		}
		if (allowedQuantity <= 0) continue;

		const wageringRequirement = Number(event.wageringRequirement || 0);
		const docs = Array.from({ length: allowedQuantity }, () => ({
			event: event._id,
			user: userId,
			source: "deposit",
			sourceCollection,
			sourceTransactionId: String(sourceTransactionId),
			depositAmount: amount,
			status: wageringRequirement > 0 ? "pending" : "approved",
			wageringRequired: wageringRequirement,
			wageringProgress: 0,
			approvedAt: wageringRequirement > 0 ? null : now,
		}));

		const inserted = await Ticket.insertMany(docs);
		createdTickets.push(...inserted);
	}

	return createdTickets;
};

/**
 * Kullanıcının "pending" biletlerindeki çevrim ilerlemesini artırır; şart
 * tamamlanan biletleri otomatik "approved" yapar. Bahis sonuçlanan her
 * noktadan (crash/mines/roll/... controller'ları + sağlayıcı callback'leri)
 * çağrılması amaçlanır.
 */
const progressWageringForUser = async (userId, wageredAmount) => {
	const amount = Number(wageredAmount || 0);
	if (!userId || amount <= 0) return;

	const pendingTickets = await Ticket.find({ user: userId, status: "pending" });
	if (!pendingTickets.length) return;

	for (const ticket of pendingTickets) {
		ticket.wageringProgress = Number(ticket.wageringProgress || 0) + amount;
		if (ticket.wageringProgress >= ticket.wageringRequired) {
			ticket.status = "approved";
			ticket.approvedAt = new Date();
		}
		await ticket.save();
	}
};

/**
 * Admin panelden manuel bilet ekleme — her zaman anında "approved".
 */
const addManualTicket = async ({ adminId, userId, eventId, quantity }) => {
	const qty = Math.max(1, Math.floor(Number(quantity) || 1));
	const [event, user] = await Promise.all([
		TicketEvent.findById(eventId),
		User.findById(userId).select("_id"),
	]);
	if (!event) throw new TicketError("EVENT_NOT_FOUND", "Bilet etkinliği bulunamadı.", 404);
	if (!user) throw new TicketError("USER_NOT_FOUND", "Kullanıcı bulunamadı.", 404);

	if (event.maxTicketsPerUser > 0) {
		const existingCount = await Ticket.countDocuments({ event: event._id, user: userId });
		if (existingCount + qty > event.maxTicketsPerUser) {
			throw new TicketError(
				"MAX_TICKETS_EXCEEDED",
				`Bu kullanıcı için maksimum bilet sayısı (${event.maxTicketsPerUser}) aşılıyor.`,
				409
			);
		}
	}

	const now = new Date();
	const docs = Array.from({ length: qty }, () => ({
		event: event._id,
		user: userId,
		source: "manual",
		sourceCollection: "manual",
		sourceTransactionId: new mongoose.Types.ObjectId().toString(),
		depositAmount: 0,
		status: "approved",
		wageringRequired: 0,
		wageringProgress: 0,
		approvedAt: now,
		grantedBy: adminId || null,
	}));

	return Ticket.insertMany(docs);
};

const getEventTicketStats = async (eventId) => {
	const stats = await Ticket.aggregate([
		{ $match: { event: new mongoose.Types.ObjectId(eventId) } },
		{ $group: { _id: "$status", count: { $sum: 1 } } },
	]);
	const result = { total: 0, approved: 0, pending: 0, cancelled: 0 };
	for (const row of stats) {
		result[row._id] = row.count;
		result.total += row.count;
	}
	return result;
};

// ---- Deposit senkronizasyonu (cron) ----
// Ödemeler 9 farklı koleksiyonda (Deposit, BankTransfer, CryptoTransaction,
// ForcelabFinanceTransaction, MeelDev/GalaxyPay/FluxKripto/XPayments) onaylanabildiği
// için her sağlayıcının callback'ine tek tek dokunmak yerine, periyodik olarak
// yeni onaylanmış yatırımları tarayıp bilet veren merkezi bir senkronizasyon
// kullanılır. `TicketSyncState.lastSyncedAt` imleci ile hem tekrar taramanın
// hem de kayıpların önüne geçilir.
const DEPOSIT_SOURCES = [
	{ model: Deposit, collection: "deposits", statusField: "status", statusValue: "approved", typeField: null },
	{ model: BankTransfer, collection: "banktransfers", statusField: "status", statusValue: "approved", typeField: "type", typeValue: "deposit" },
	{ model: CryptoTransaction, collection: "cryptotransactions", statusField: "state", statusValue: { $in: ["completed", "success"] }, typeField: "type", typeValue: "deposit" },
	{ model: ForcelabFinanceTransaction, collection: "forcelabfinancetransactions", statusField: "status", statusValue: "approved", typeField: "providerType", typeValue: { $ne: "withdraw" } },
	{ model: MeelDevTransaction, collection: "meeldevtransactions", statusField: "status", statusValue: "approved", typeField: "type", typeValue: "deposit" },
	{ model: GalaxyPayTransaction, collection: "galaxypaytransactions", statusField: "status", statusValue: "approved", typeField: "type", typeValue: "deposit" },
	{ model: FluxKriptoTransaction, collection: "fluxkriptotransactions", statusField: "status", statusValue: "approved", typeField: "type", typeValue: "deposit" },
	{ model: XPaymentTransaction, collection: "xpaymenttransactions", statusField: "status", statusValue: "approved", typeField: "type", typeValue: "deposit" },
];

const getSyncState = async () => {
	let state = await TicketSyncState.findOne();
	if (!state) state = await TicketSyncState.create({});
	return state;
};

/**
 * Aktif bilet etkinliği yoksa hiçbir şey yapmadan çıkar (gereksiz tarama yapmaz).
 * Her sağlayıcı koleksiyonunda [lastSyncedAt, tickStartedAt] aralığında
 * güncellenmiş onaylı yatırımları bulur ve bilet üretir.
 */
const syncApprovedDeposits = async () => {
	const hasActiveEvent = await TicketEvent.exists({ isActive: true });
	if (!hasActiveEvent) return { scanned: 0, granted: 0 };

	const state = await getSyncState();
	const tickStartedAt = new Date();
	const from = state.lastSyncedAt || new Date(0);

	let granted = 0;
	let scanned = 0;

	for (const source of DEPOSIT_SOURCES) {
		const match = {
			updatedAt: { $gt: from, $lte: tickStartedAt },
			[source.statusField]: source.statusValue,
		};
		if (source.typeField) match[source.typeField] = source.typeValue;

		const docs = await source.model
			.find(match)
			.select("_id user amount")
			.lean();

		scanned += docs.length;

		for (const doc of docs) {
			const created = await grantTicketsForDeposit({
				userId: doc.user,
				depositAmount: doc.amount,
				sourceCollection: source.collection,
				sourceTransactionId: doc._id.toString(),
			});
			granted += created.length;
		}
	}

	state.lastSyncedAt = tickStartedAt;
	await state.save();

	return { scanned, granted };
};

module.exports = {
	TicketError,
	grantTicketsForDeposit,
	progressWageringForUser,
	addManualTicket,
	getEventTicketStats,
	syncApprovedDeposits,
};
