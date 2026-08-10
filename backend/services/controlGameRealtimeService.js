const {
	getEnrichedCurrentPlayers,
	getAgentBalanceSummary,
} = require("./betinoviAdminApiService");

/**
 * ControlGame (Slot Call & RTP) paneli için paylaşımlı (ref-counted) sunucu
 * taraflı polling servisi.
 *
 * Neden paylaşımlı: Aynı vendor'u N admin aynı anda izlese bile vendor API'sine
 * yalnızca TEK istek gider (setInterval/setTimeout vendor başına bir kere kurulur,
 * sonuç tüm dinleyen socket'lere Socket.IO room'u üzerinden broadcast edilir).
 * Kimse dinlemiyorsa (refCount === 0) poller tamamen durur, kaynak sızıntısı olmaz.
 */

const PLAYERS_POLL_INTERVAL_MS = 3000;
const BALANCE_POLL_INTERVAL_MS = 15000;
const MAX_BACKOFF_MS = 30000;

const NAMESPACE = "/admin-panel";

let ioRef = null;

// vendorCode -> { refCount, timeoutId, consecutiveErrors, stopped }
const playerPollers = new Map();

// Global tek balance poller state
const balancePoller = { refCount: 0, timeoutId: null, consecutiveErrors: 0, stopped: true };

const playersRoom = (vendorCode) => `control-game:players:${vendorCode}`;
const BALANCE_ROOM = "control-game:agent-balance-room";

const getNamespace = () => {
	if (!ioRef) {
		throw new Error("controlGameRealtimeService henüz initControlGameRealtime(io) ile başlatılmadı.");
	}
	return ioRef.of(NAMESPACE);
};

const backoffDelay = (baseMs, consecutiveErrors) => {
	if (consecutiveErrors <= 0) return baseMs;
	const delay = baseMs * 2 ** Math.min(consecutiveErrors, 5);
	return Math.min(delay, MAX_BACKOFF_MS);
};

// ---- Players (vendor başına ref-counted) ----

const schedulePlayersTick = (vendorCode) => {
	const state = playerPollers.get(vendorCode);
	if (!state || state.stopped) return;

	const delay = backoffDelay(PLAYERS_POLL_INTERVAL_MS, state.consecutiveErrors);
	state.timeoutId = setTimeout(() => runPlayersTick(vendorCode), delay);
};

const runPlayersTick = async (vendorCode) => {
	const state = playerPollers.get(vendorCode);
	if (!state || state.stopped) return;

	try {
		const { players, pendingCallCount, callResults } = await getEnrichedCurrentPlayers(vendorCode);

		getNamespace().to(playersRoom(vendorCode)).emit("control-game:players", {
			vendorCode,
			players,
			pendingCallCount,
			updatedAt: new Date().toISOString(),
		});
		getNamespace().to(playersRoom(vendorCode)).emit("control-game:call-results", {
			vendorCode,
			callResults,
			updatedAt: new Date().toISOString(),
		});

		state.consecutiveErrors = 0;
	} catch (error) {
		state.consecutiveErrors += 1;
		getNamespace().to(playersRoom(vendorCode)).emit("control-game:error", {
			scope: "players",
			vendorCode,
			message: error.message || "Oyuncu verisi alınırken bir hata oluştu.",
		});
	}

	schedulePlayersTick(vendorCode);
};

const subscribePlayers = (socket, vendorCode) => {
	if (!vendorCode) return;

	socket.join(playersRoom(vendorCode));

	let state = playerPollers.get(vendorCode);
	if (!state) {
		state = { refCount: 0, timeoutId: null, consecutiveErrors: 0, stopped: true };
		playerPollers.set(vendorCode, state);
	}

	state.refCount += 1;

	if (state.stopped) {
		state.stopped = false;
		state.consecutiveErrors = 0;
		runPlayersTick(vendorCode);
	}

	// Track subscription on the socket so we can clean up on disconnect.
	socket.data = socket.data || {};
	socket.data.subscribedVendors = socket.data.subscribedVendors || new Set();
	socket.data.subscribedVendors.add(vendorCode);
};

const unsubscribePlayers = (socket, vendorCode) => {
	if (!vendorCode) return;

	socket.leave(playersRoom(vendorCode));
	socket.data?.subscribedVendors?.delete(vendorCode);

	const state = playerPollers.get(vendorCode);
	if (!state) return;

	state.refCount = Math.max(0, state.refCount - 1);

	if (state.refCount === 0) {
		state.stopped = true;
		if (state.timeoutId) clearTimeout(state.timeoutId);
		playerPollers.delete(vendorCode);
	}
};

// ---- Agent balance (global, tek poller) ----

const scheduleBalanceTick = () => {
	if (balancePoller.stopped) return;

	const delay = backoffDelay(BALANCE_POLL_INTERVAL_MS, balancePoller.consecutiveErrors);
	balancePoller.timeoutId = setTimeout(runBalanceTick, delay);
};

const runBalanceTick = async () => {
	if (balancePoller.stopped) return;

	try {
		const summary = await getAgentBalanceSummary();
		getNamespace().to(BALANCE_ROOM).emit("control-game:agent-balance", {
			...summary,
			updatedAt: new Date().toISOString(),
		});
		balancePoller.consecutiveErrors = 0;
	} catch (error) {
		balancePoller.consecutiveErrors += 1;
		getNamespace().to(BALANCE_ROOM).emit("control-game:error", {
			scope: "agent-balance",
			message: error.message || "Agent bakiyesi alınırken bir hata oluştu.",
		});
	}

	scheduleBalanceTick();
};

const subscribeAgentBalance = (socket) => {
	socket.join(BALANCE_ROOM);
	balancePoller.refCount += 1;

	socket.data = socket.data || {};
	socket.data.subscribedBalance = true;

	if (balancePoller.stopped) {
		balancePoller.stopped = false;
		balancePoller.consecutiveErrors = 0;
		runBalanceTick();
	}
};

const unsubscribeAgentBalance = (socket) => {
	socket.leave(BALANCE_ROOM);
	socket.data && (socket.data.subscribedBalance = false);

	balancePoller.refCount = Math.max(0, balancePoller.refCount - 1);

	if (balancePoller.refCount === 0) {
		balancePoller.stopped = true;
		if (balancePoller.timeoutId) clearTimeout(balancePoller.timeoutId);
	}
};

// Bağlantı kesilince tüm subscribe'ları temizle (ref-count sızıntısı olmasın).
const cleanupSocket = (socket) => {
	const vendors = socket.data?.subscribedVendors;
	if (vendors) {
		for (const vendorCode of [...vendors]) {
			unsubscribePlayers(socket, vendorCode);
		}
	}

	if (socket.data?.subscribedBalance) {
		unsubscribeAgentBalance(socket);
	}
};

const initControlGameRealtime = (io) => {
	ioRef = io;
};

module.exports = {
	initControlGameRealtime,
	subscribePlayers,
	unsubscribePlayers,
	subscribeAgentBalance,
	unsubscribeAgentBalance,
	cleanupSocket,
};
