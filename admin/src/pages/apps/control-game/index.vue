<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
import adminPanelSocket, { connectAdminPanelSocket } from "@/libs/adminPanelSocket";
import { VDataTable } from "vuetify/labs/VDataTable";

const toUtcDateTimeLocal = (date) => {
	const pad = (value) => String(value).padStart(2, "0");

	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

const now = new Date();
// Referans panelde varsayılan periyot 3 gün (72 saat) geriye gidiyor.
const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

const activeTab = ref("online-users");
const loading = ref(false);
const actionLoading = ref("");
const lastError = ref("");
const successMessage = ref("");
const showRaw = ref(false);
const rawResponse = ref(null);

const canManageControlGame = computed(() => ability.can("manage", "controlGame"));

// ---- Vendor listesi ----
const vendors = ref([]);
const vendorsLoading = ref(false);
const selectedVendor = ref("");

const vendorOptions = computed(() =>
	vendors.value.map((vendor) => ({ title: vendor.vendorName, value: vendor.vendorCode })),
);

const fetchVendors = async () => {
	vendorsLoading.value = true;
	try {
		const { data } = await axios.get("/admin/betinovi-admin/control-game/vendors");
		vendors.value = data.data?.vendors || [];
		if (!selectedVendor.value && vendors.value.length) {
			selectedVendor.value = vendors.value[0].vendorCode;
		}
	} catch (error) {
		console.error("Vendor listesi hatası:", error);
		lastError.value = error?.response?.data?.message || "Vendor listesi alınırken bir hata oluştu.";
	} finally {
		vendorsLoading.value = false;
	}
};

// ---- Deneme Bonusu rozeti/filtresi (Call Management) ----
// Sadece bilgi amaçlı: hangi oyuncunun onaylı Deneme Bonusu olduğunu ve
// tutar/tarihini gösterir. RTP/oyun sonucu hesaplaması YAPMAZ.
const trialBonusMap = ref({}); // userCode -> { amount, approvedAt }
const trialBonusOnlyFilter = ref(false);
let trialBonusLookupTimer = null;

const fetchTrialBonusBadges = async (userCodes) => {
	const uniqueIds = [...new Set(userCodes.filter(Boolean))];
	if (!uniqueIds.length) {
		trialBonusMap.value = {};
		return;
	}
	try {
		const { data } = await axios.post("/admin/trial-bonus/lookup", { userIds: uniqueIds });
		trialBonusMap.value = data.data || {};
	} catch (error) {
		console.error("Deneme bonusu rozet bilgisi alınamadı:", error);
	}
};

// ---- Realtime: Oyundaki kullanıcılar ----
const livePlayers = ref([]);
const livePendingCallCount = ref(0);
const liveUpdatedAt = ref(null);
const liveConnected = ref(false);
const liveError = ref("");
const liveUsingRestFallback = ref(false);

const subscribedVendor = ref("");

// Socket.IO (/admin-panel) bazı ortamlarda (örn. bu geliştirme sandbox'ı)
// WebSocket bağlantısını hiç kuramıyor (proxy sadece HTTP'yi yönlendiriyor).
// Bu yüzden socket bağlanamadığında/koptuğunda otomatik olarak REST polling'e
// (GET .../control-game/players-live/:vendorCode) düşüyoruz; socket bağlanınca
// tekrar realtime akışa geçilir. Böylece sayfa her koşulda çalışır.
const REST_POLL_INTERVAL_MS = 4000;
let restPollTimer = null;

const fetchPlayersLiveOnce = async (vendorCode) => {
	if (!vendorCode) return;
	try {
		const { data } = await axios.get(`/admin/betinovi-admin/control-game/players-live/${vendorCode}`);
		if (vendorCode !== subscribedVendor.value) return;
		livePlayers.value = data.data?.players || [];
		livePendingCallCount.value = data.data?.pendingCallCount || 0;
		liveUpdatedAt.value = new Date().toISOString();
		liveError.value = "";
	} catch (error) {
		console.error("Anlık oyuncu listesi (REST) hatası:", error);
		liveError.value = error?.response?.data?.message || "Anlık oyuncu listesi alınırken bir hata oluştu.";
	}
};

const stopRestPolling = () => {
	if (restPollTimer) {
		clearInterval(restPollTimer);
		restPollTimer = null;
	}
	liveUsingRestFallback.value = false;
};

const startRestPolling = () => {
	if (restPollTimer) return;
	liveUsingRestFallback.value = true;
	fetchPlayersLiveOnce(subscribedVendor.value);
	restPollTimer = setInterval(() => fetchPlayersLiveOnce(subscribedVendor.value), REST_POLL_INTERVAL_MS);
};

const subscribeToPlayers = (vendorCode) => {
	if (!vendorCode) return;
	if (subscribedVendor.value && subscribedVendor.value !== vendorCode) {
		adminPanelSocket.emit("control-game:unsubscribe-players", { vendorCode: subscribedVendor.value });
	}
	livePlayers.value = [];
	liveUpdatedAt.value = null;
	subscribedVendor.value = vendorCode;
	adminPanelSocket.emit("control-game:subscribe-players", { vendorCode });

	// Socket henüz bağlı değilse (ya da hiç bağlanamıyorsa) veriyi hemen REST
	// üzerinden çekip periyodik olarak tazelemeye başla.
	if (!liveConnected.value) {
		stopRestPolling();
		startRestPolling();
	} else {
		fetchPlayersLiveOnce(vendorCode);
	}
};

const unsubscribeFromPlayers = () => {
	stopRestPolling();
	if (!subscribedVendor.value) return;
	adminPanelSocket.emit("control-game:unsubscribe-players", { vendorCode: subscribedVendor.value });
	subscribedVendor.value = "";
};

const setupRealtimeListeners = () => {
	adminPanelSocket.on("connect", () => {
		liveConnected.value = true;
		liveError.value = "";
		// Socket bağlandı, REST polling'e artık gerek yok — realtime akış devreye girer.
		stopRestPolling();
		if (subscribedVendor.value) {
			adminPanelSocket.emit("control-game:subscribe-players", { vendorCode: subscribedVendor.value });
		}
	});

	adminPanelSocket.on("disconnect", () => {
		liveConnected.value = false;
		if (subscribedVendor.value) startRestPolling();
	});

	adminPanelSocket.on("connect_error", (error) => {
		liveConnected.value = false;
		liveError.value = error?.message || "Anlık bağlantı kurulamadı, yedek (REST) mod kullanılıyor.";
		if (subscribedVendor.value) startRestPolling();
	});

	adminPanelSocket.on("control-game:players", (payload) => {
		if (payload.vendorCode !== subscribedVendor.value) return;
		stopRestPolling();
		livePlayers.value = payload.players || [];
		livePendingCallCount.value = payload.pendingCallCount || 0;
		liveUpdatedAt.value = payload.updatedAt;
	});

	adminPanelSocket.on("control-game:error", (payload) => {
		liveError.value = payload.message || "Anlık veri alınırken bir hata oluştu.";
	});
};

// ---- Call Result & Call Geçmişi ortak yardımcılar ----
// Vendor API'sinin dönüş alan adları (userCode/user_code, callAmount/amount vb.)
// belgelenmediği için elimizdeki olası anahtarların hepsini deniyoruz.
const pickField = (row, keys, fallback = "-") => {
	for (const key of keys) {
		const value = row?.[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return fallback;
};

// GetCallHistory yanıtı data.rows / data.list / data.history / data.calls gibi
// farklı anahtarlarda gelebilir; hiçbiri tutmazsa ilk array değerini kullanırız.
const extractListFromResponse = (payload) => {
	if (!payload) return [];
	if (Array.isArray(payload)) return payload;
	const preferredKeys = ["rows", "list", "history", "calls", "callHistory", "items", "results"];
	for (const key of preferredKeys) {
		if (Array.isArray(payload[key])) return payload[key];
	}
	for (const value of Object.values(payload)) {
		if (Array.isArray(value)) return value;
	}
	return [];
};

const isWaitingStatus = (status) => /wait|bekli/i.test(String(status || ""));
const isCancelledStatus = (status) => /cancel|iptal/i.test(String(status || ""));

const statusColor = (status) => {
	if (isWaitingStatus(status)) return "warning";
	if (isCancelledStatus(status)) return "error";
	return "success";
};

const normalizeCallRow = (row, index) => {
	const userCode = pickField(row, ["userCode", "user_code"]);
	const vendorCode = pickField(row, ["vendorCode", "vendor_code"]);
	const gameCode = pickField(row, ["gameCode", "game_code"]);
	const status = pickField(row, ["status", "callStatus", "call_status", "state"]);

	return {
		_rowId: index,
		_raw: row,
		no: index + 1,
		requestDate: pickField(row, ["requestDate", "applyDate", "request_date", "apply_date", "createdAt", "created_at"]),
		processingDay: pickField(row, ["processingDay", "processDate", "processing_day", "updatedAt", "updated_at"]),
		userCode,
		nickName: pickField(row, ["nickName", "nickname", "username", "nick_name"]),
		vendorCode,
		vendorName: pickField(row, ["vendorName", "vendor_name"], vendorNameByCode.value[vendorCode] || vendorCode),
		gameCode,
		gameName: pickField(row, ["gameName", "game_name"], gameCode),
		bet: formatNumber(pickField(row, ["betAmount", "bet", "bet_amount"], null)),
		callType: pickField(row, ["callType", "requestType", "call_type"]),
		callAmount: formatNumber(pickField(row, ["callAmount", "amount", "call_amount"], null)),
		callAmountRate: pickField(row, ["callAmountRate", "callRate", "rate", "call_amount_rate", "callRtp"]),
		status,
		callId: pickField(row, ["callId", "call_id"], ""),
		callRtp: pickField(row, ["callRtp", "callAmountRate", "rate"], ""),
		currencyCode: pickField(row, ["currencyCode", "currency_code"], "TRY"),
		// Backend (mergeCallHistoryResponses) her satıra hangi agent'tan geldiğini
		// ekler: "default" (bizzocasinoyeni) | "trial" (bizzodeneme). Call İptal
		// isteğinde doğru agent'a yönlendirmek için geri gönderilir.
		agentSource: pickField(row, ["agentSource"], "default"),
	};
};

// ---- Call Result (Bekleyen / tamamlanan callar, iptal kontrolü burada) ----
const callResultRows = ref([]);
const callResultLoading = ref(false);
const cancelingRowId = ref(null);

const fetchCallResults = async () => {
	const vendorCode = selectedVendor.value;
	if (!vendorCode) return;

	callResultLoading.value = true;
	lastError.value = "";
	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/call-result", {
			vendorCode,
			startTime: toUtcDateTimeLocal(threeDaysAgo),
			endTime: toUtcDateTimeLocal(now),
			offset: 0,
			limit: 100,
		});
		rawResponse.value = data.data || null;
		const list = extractListFromResponse(data.data);
		callResultRows.value = list.map((row, index) => normalizeCallRow(row, index));
	} catch (error) {
		console.error("Call result hatası:", error);
		lastError.value = error?.response?.data?.message || "Call sonuçları alınırken bir hata oluştu.";
		callResultRows.value = [];
	} finally {
		callResultLoading.value = false;
	}
};

const cancelCallRow = async (row) => {
	if (!canManageControlGame.value) return;

	cancelingRowId.value = row._rowId;
	lastError.value = "";
	try {
		await axios.post("/admin/betinovi-admin/control-game/cancel-call", {
			userCode: row.userCode,
			vendorCode: row.vendorCode,
			gameCode: row.gameCode,
			currencyCode: row.currencyCode,
			callRtp: row.callRtp,
			betAmount: pickField(row._raw, ["betAmount", "bet", "bet_amount"], undefined),
			callId: row.callId,
			agentSource: row.agentSource,
		});
		successMessage.value = `Call iptal edildi: ${row.userCode}`;
		await fetchCallResults();
	} catch (error) {
		console.error("Call iptal hatası:", error);
		lastError.value = error?.response?.data?.message || "Call iptal edilirken bir hata oluştu.";
	} finally {
		cancelingRowId.value = null;
	}
};

// ---- Call geçmişi (statik REST, GetCallHistory) ----
const historyFilters = ref({
	vendorCode: "",
	startTime: toUtcDateTimeLocal(threeDaysAgo),
	endTime: toUtcDateTimeLocal(now),
	offset: 0,
	limit: 100,
});

const historyRows = ref([]);
const historyLoading = ref(false);

const fetchCallHistory = async () => {
	historyLoading.value = true;
	lastError.value = "";
	try {
		const { data } = await axios.post(
			"/admin/betinovi-admin/control-game/call-history",
			{
				vendorCode: historyFilters.value.vendorCode || selectedVendor.value,
				startTime: historyFilters.value.startTime,
				endTime: historyFilters.value.endTime,
				offset: historyFilters.value.offset,
				limit: historyFilters.value.limit,
			},
		);
		rawResponse.value = data.data || null;
		const list = extractListFromResponse(data.data);
		historyRows.value = list.map((row, index) => normalizeCallRow(row, index));
	} catch (error) {
		console.error("Call geçmişi hatası:", error);
		lastError.value = error?.response?.data?.message || "Call geçmişi alınırken bir hata oluştu.";
		historyRows.value = [];
	} finally {
		historyLoading.value = false;
	}
};

// ---- Call ver (satır bazlı, RTP listesi otomatik gelir) ----
const giveCallDialog = ref({
	open: false,
	player: null,
	loading: false,
	applying: false,
	error: "",
	options: [],
	selectedRtp: null,
	result: null,
});

const vendorNameByCode = computed(() =>
	vendors.value.reduce((acc, vendor) => {
		acc[vendor.vendorCode] = vendor.vendorName;
		return acc;
	}, {}),
);

const computeRealRtp = (player) => {
	const debit = Number(player?.totalDebit) || 0;
	const credit = Number(player?.totalCredit) || 0;
	if (!debit) return null;
	return (credit / debit) * 100;
};

const formatRtp = (player) => {
	const rtp = computeRealRtp(player);
	return rtp === null ? "-" : `${rtp.toFixed(4)}%`;
};

const formatNumber = (value) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return "-";
	return number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Seçili RTP çarpanı × bahis tutarı = kullanıcıya gönderilecek tutar.
// RTP seçilirken bu tutarın büyük şekilde görünmesi, hangi çarpanın
// seçildiğinde ne kadar gönderileceğini net göstermek için.
const selectedCallAmount = computed(() => {
	const bet = Number(giveCallDialog.value.player?.betAmount);
	const rtp = Number(giveCallDialog.value.selectedRtp);
	if (!Number.isFinite(bet) || !Number.isFinite(rtp)) return null;
	return bet * rtp;
});

const closeGiveCallDialog = () => {
	giveCallDialog.value.open = false;
	giveCallDialog.value.player = null;
	giveCallDialog.value.options = [];
	giveCallDialog.value.selectedRtp = null;
	giveCallDialog.value.error = "";
	giveCallDialog.value.result = null;
};

const openGiveCallDialog = async (player) => {
	if (!canManageControlGame.value) return;

	giveCallDialog.value.open = true;
	giveCallDialog.value.player = player;
	giveCallDialog.value.loading = true;
	giveCallDialog.value.error = "";
	giveCallDialog.value.options = [];
	giveCallDialog.value.selectedRtp = null;
	giveCallDialog.value.result = null;

	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/call-list", {
			vendorCode: player.vendorCode,
			gameCode: player.gameCode,
			callType: player.requestType,
			agentSource: player.agentSource,
		});
		giveCallDialog.value.options = Array.isArray(data.data?.calls) ? data.data.calls : [];
	} catch (error) {
		console.error("Call listesi hatası:", error);
		giveCallDialog.value.error = error?.response?.data?.message || "RTP listesi alınırken bir hata oluştu.";
	} finally {
		giveCallDialog.value.loading = false;
	}
};

const applySelectedCall = async () => {
	const player = giveCallDialog.value.player;
	if (!player || giveCallDialog.value.selectedRtp === null) return;

	giveCallDialog.value.applying = true;
	giveCallDialog.value.error = "";
	try {
		const { data } = await axios.post("/admin/betinovi-admin/control-game/apply-call", {
			userCode: player.userCode,
			vendorCode: player.vendorCode,
			gameCode: player.gameCode,
			currencyCode: player.currencyCode || "TRY",
			callType: player.requestType,
			callRtp: giveCallDialog.value.selectedRtp,
			betAmount: player.betAmount,
			agentSource: player.agentSource,
		});
		giveCallDialog.value.result = data.data || null;
		successMessage.value = `Call uygulandı: ${player.userCode} için ${giveCallDialog.value.selectedRtp}x RTP.`;
		closeGiveCallDialog();
	} catch (error) {
		console.error("Call uygulama hatası:", error);
		giveCallDialog.value.error = error?.response?.data?.message || "Call uygulanırken bir hata oluştu.";
	} finally {
		giveCallDialog.value.applying = false;
	}
};

const submitControlAction = async (type, payload) => {
	if (!canManageControlGame.value) return;

	actionLoading.value = type;
	lastError.value = "";
	successMessage.value = "";
	try {
		const { data } = await axios.post(`/admin/betinovi-admin/control-game/${type}`, payload);
		rawResponse.value = data.data || null;
		successMessage.value = "ControlGame işlemi gönderildi.";
	} catch (error) {
		console.error("ControlGame aksiyon hatası:", error);
		lastError.value = error?.response?.data?.message || "ControlGame işlemi sırasında bir hata oluştu.";
		rawResponse.value = error?.response?.data?.data || null;
	} finally {
		actionLoading.value = "";
	}
};

// Referans tasarımdaki sabit kolonlu oyuncu tablosu (No, Kullanıcı Kodu, Nick Name,
// Vendor, Oyun, Bakiye, Bahis, Tip, Toplam Bahis, Toplam Kazanım, Gerçek RTP, Kontrol).
const playersHeaders = [
	{ title: "No", key: "no", sortable: false, width: 56 },
	{ title: "Kullanıcı Kodu", key: "userCode" },
	{ title: "Nick Name", key: "nickName" },
	{ title: "Vendor", key: "vendorName" },
	{ title: "Oyun", key: "gameCode" },
	{ title: "Bakiye", key: "balance" },
	{ title: "Bahis", key: "betAmount" },
	{ title: "Tip", key: "requestType" },
	{ title: "Toplam Bahis", key: "totalDebit" },
	{ title: "Toplam Kazanım", key: "totalCredit" },
	{ title: "Gerçek RTP", key: "realRtp", sortable: false },
	{ title: "Deneme Bonusu", key: "trialBonus", sortable: false },
	{ title: "Agent", key: "agentSource", sortable: false },
	{ title: "Kontrol", key: "actions", sortable: false, align: "end" },
];

const playersTableRowsAll = computed(() =>
	livePlayers.value.map((player, index) => ({
	_rowId: index,
	_player: player,
	no: index + 1,
	userCode: player.userCode,
	nickName: player.nickName || "-",
	vendorName: vendorNameByCode.value[player.vendorCode] || player.vendorCode,
	gameCode: player.gameCode,
	balance: formatNumber(player.balance),
	betAmount: formatNumber(player.betAmount),
	requestType: player.requestType || "-",
	totalDebit: formatNumber(player.totalDebit),
	totalCredit: formatNumber(player.totalCredit),
	_trialBonus: trialBonusMap.value[player.userCode] || null,
	agentSource: player.agentSource || "default",
	})),
	);

// "Sadece Deneme Bonusu Alanlar" filtresi açıksa listeyi daraltır.
// ÖNEMLİ: tablodaki "Deneme Bonusu (bizzodeneme)" rozeti `agentSource === "trial"`
// alanına bakarak gösteriliyor (kullanıcının ŞU AN aktif/sonlanmamış deneme
// bonusu kilidiyle bizzodeneme agent'ında olup olmadığı). `_trialBonus`
// (trialBonusMap) ise TAMAMEN AYRI ve bağımsız bir veri kaynağı — geçmişte
// onaylanmış claim kayıtlarını gösterir, aktif/güncel durumla senkron
// değildir. Filtre eskiden `_trialBonus`'a bakıyordu, bu yüzden rozette
// "Deneme Bonusu (bizzodeneme)" görünen ama _trialBonus'ta karşılığı
// olmayan (veya tersi) satırlar filtrelenmiyordu. Artık rozetle AYNI alana
// (`agentSource`) bakıyor, böylece filtre açıkken "Normal" rozetli satırlar
// asla görünmüyor.
const playersTableRows = computed(() =>
	trialBonusOnlyFilter.value
	? playersTableRowsAll.value.filter((row) => row.agentSource === "trial")
	: playersTableRowsAll.value,
	);

// Referans tasarımdaki Call Result kolonları: Apply Date, User Code, Nick Name,
// Vendor Code, Game Code, Bet, Call Type, Call Amount, Call Amount Rate, Status, Control.
const callResultHeaders = [
	{ title: "No", key: "no", sortable: false, width: 56 },
	{ title: "Talep Tarihi", key: "requestDate" },
	{ title: "Kullanıcı Kodu", key: "userCode" },
	{ title: "Nick Name", key: "nickName" },
	{ title: "Vendor Kodu", key: "vendorCode" },
	{ title: "Oyun Kodu", key: "gameCode" },
	{ title: "Bahis", key: "bet" },
	{ title: "Call Tipi", key: "callType" },
	{ title: "Call Tutarı", key: "callAmount" },
	{ title: "Call Oranı", key: "callAmountRate" },
	{ title: "Durum", key: "status" },
	{ title: "Agent", key: "agentSource", sortable: false },
	{ title: "Kontrol", key: "actions", sortable: false, align: "end" },
];

// Referans tasarımdaki Call History kolonları: Request Date, Processing Day, User Code,
// Nick Name, Vendor Name, Game Name, Bet, Call Amount, Status.
const historyHeaders = [
	{ title: "No", key: "no", sortable: false, width: 56 },
	{ title: "Talep Tarihi", key: "requestDate" },
	{ title: "İşlem Tarihi", key: "processingDay" },
	{ title: "Kullanıcı Kodu", key: "userCode" },
	{ title: "Nick Name", key: "nickName" },
	{ title: "Vendor", key: "vendorName" },
	{ title: "Oyun", key: "gameName" },
	{ title: "Bahis", key: "bet" },
	{ title: "Call Tutarı", key: "callAmount" },
	{ title: "Durum", key: "status" },
	{ title: "Agent", key: "agentSource", sortable: false },
];

const tabs = [
	{ value: "online-users", title: "Oyundaki Kullanıcılar", icon: "tabler-users" },
	{ value: "call-result", title: "Call Result", icon: "tabler-target-arrow" },
	{ value: "call-history", title: "Call Geçmişi", icon: "tabler-history" },
];

watch(activeTab, (tab) => {
	if (tab === "call-result") {
		fetchCallResults();
	}
	if (tab === "call-history" && !historyFilters.value.vendorCode) {
		historyFilters.value.vendorCode = selectedVendor.value;
		fetchCallHistory();
	}
});

watch(selectedVendor, (vendorCode) => {
	if (activeTab.value === "online-users") {
		subscribeToPlayers(vendorCode);
	}
	if (activeTab.value === "call-result") {
		fetchCallResults();
	}
});

// Oyundaki kullanıcılar listesi değiştikçe (realtime/REST) hangilerinin
// onaylı Deneme Bonusu olduğunu 500ms debounce ile arka planda sorgula.
watch(livePlayers, (players) => {
	clearTimeout(trialBonusLookupTimer);
	trialBonusLookupTimer = setTimeout(() => {
		fetchTrialBonusBadges(players.map((p) => p.userCode));
	}, 500);
});

onMounted(async () => {
	setupRealtimeListeners();
	connectAdminPanelSocket();
	await fetchVendors();
	if (selectedVendor.value) {
		subscribeToPlayers(selectedVendor.value);
	}
});

onBeforeUnmount(() => {
	unsubscribeFromPlayers();
	adminPanelSocket.off("connect");
	adminPanelSocket.off("disconnect");
	adminPanelSocket.off("connect_error");
	adminPanelSocket.off("control-game:players");
	adminPanelSocket.off("control-game:error");
});
</script>

<template>
	<section class="control-game-page">
		<div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
			<div>
				<h1 class="text-h4 mb-1">Slot Call & RTP Yönetimi</h1>
				<p class="text-medium-emphasis mb-0">
					Forcelab ControlGame işlemlerini Türkçe admin ekranından yönetin.
				</p>
			</div>
			<div class="d-flex align-center gap-3">
				<VChip :color="liveConnected ? 'success' : (liveUsingRestFallback ? 'warning' : 'error')" variant="tonal" size="small">
					<VIcon
						start
						:icon="liveConnected ? 'tabler-plug-connected' : (liveUsingRestFallback ? 'tabler-refresh' : 'tabler-plug-connected-x')"
						size="16"
					/>
					{{ liveConnected ? 'Anlık bağlantı aktif' : (liveUsingRestFallback ? 'Yedek mod (4sn yenileme)' : 'Bağlantı yok') }}
				</VChip>
				<VChip :color="canManageControlGame ? 'success' : 'warning'" variant="tonal">
					<VIcon start :icon="canManageControlGame ? 'tabler-shield-check' : 'tabler-lock'" />
					{{ canManageControlGame ? 'Call yetkisi açık' : 'Salt okunur' }}
				</VChip>
			</div>
		</div>

		<VAlert v-if="lastError" type="error" variant="tonal" class="mb-4" closable @click:close="lastError = ''">
			{{ lastError }}
		</VAlert>
		<VAlert v-if="liveError" type="warning" variant="tonal" class="mb-4" closable @click:close="liveError = ''">
			{{ liveError }}
		</VAlert>
		<VAlert v-if="successMessage" type="success" variant="tonal" class="mb-4" closable @click:close="successMessage = ''">
			{{ successMessage }}
		</VAlert>

		<VCard class="mb-4">
			<VCardText>
				<VTabs v-model="activeTab" density="compact" class="mb-4">
					<VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">
						<VIcon start :icon="tab.icon" />
						{{ tab.title }}
					</VTab>
				</VTabs>

				<VRow v-if="activeTab === 'online-users'" align="center">
					<VCol cols="12" md="4">
						<VSelect
							v-model="selectedVendor"
							:items="vendorOptions"
							:loading="vendorsLoading"
							label="Vendor"
							density="compact"
						/>
					</VCol>
					<VCol cols="12" md="8" class="d-flex align-center gap-2">
						<VChip color="primary" variant="tonal">
							{{ livePlayers.length }} oyuncu online
						</VChip>
						<VChip color="warning" variant="tonal">
							{{ livePendingCallCount }} bekleyen call
						</VChip>
						<span v-if="liveUpdatedAt" class="text-caption text-medium-emphasis ms-auto">
							Son güncelleme: {{ new Date(liveUpdatedAt).toLocaleTimeString('tr-TR') }}
						</span>
					</VCol>
				</VRow>

				<VRow v-if="activeTab === 'call-result'" align="center">
					<VCol cols="12" md="4">
						<VSelect
							v-model="selectedVendor"
							:items="vendorOptions"
							:loading="vendorsLoading"
							label="Vendor"
							density="compact"
						/>
					</VCol>
					<VCol cols="12" md="2" class="d-flex align-center">
						<VBtn color="primary" :loading="callResultLoading" block @click="fetchCallResults">
							<VIcon start icon="tabler-eye" size="16" />
							Göster
						</VBtn>
					</VCol>
				</VRow>

				<VRow v-if="activeTab === 'call-history'">
					<VCol cols="12" md="3">
						<VTextField v-model="historyFilters.vendorCode" label="Vendor Kodu" density="compact" clearable />
					</VCol>
					<VCol cols="12" md="3">
						<VTextField v-model="historyFilters.startTime" type="datetime-local" label="Başlangıç Zamanı (UTC)" density="compact" />
					</VCol>
					<VCol cols="12" md="3">
						<VTextField v-model="historyFilters.endTime" type="datetime-local" label="Bitiş Zamanı (UTC)" density="compact" />
					</VCol>
					<VCol cols="12" md="1">
						<VTextField v-model.number="historyFilters.offset" type="number" label="Offset" density="compact" :min="0" />
					</VCol>
					<VCol cols="12" md="1">
						<VTextField v-model.number="historyFilters.limit" type="number" label="Limit" density="compact" :min="1" />
					</VCol>
					<VCol cols="12" md="1" class="d-flex align-center">
						<VBtn color="primary" :loading="historyLoading" @click="fetchCallHistory" icon="tabler-search" />
					</VCol>
				</VRow>

				<VRow>
					<VCol cols="12" class="d-flex flex-wrap gap-2">
						<VBtn variant="text" color="secondary" @click="showRaw = !showRaw">
							<VIcon start icon="tabler-code" />
							Ham Yanıt
						</VBtn>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<!-- Oyundaki Kullanıcılar -->
		<VCard v-if="activeTab === 'online-users'">
			<VCardText>
				<div class="d-flex align-center justify-end mb-4">
					<VSwitch
						v-model="trialBonusOnlyFilter"
						label="Sadece Deneme Bonusu Alanlar"
						color="primary"
						density="compact"
						hide-details
					/>
				</div>
				<p v-if="!playersTableRowsAll.length" class="text-medium-emphasis mb-0">
					Şu anda bu vendor'da aktif oyuncu bulunmuyor.
				</p>
				<p v-else-if="!playersTableRows.length" class="text-medium-emphasis mb-0">
					Deneme Bonusu almış aktif oyuncu bulunmuyor.
				</p>
				<VDataTable
					v-else
					:headers="playersHeaders"
					:items="playersTableRows"
					:loading="vendorsLoading"
					item-value="_rowId"
					class="text-no-wrap"
				>
					<template #item.realRtp="{ item }">
						<VChip size="small" variant="outlined" color="primary">
							{{ formatRtp((item.raw || item)._player) }}
						</VChip>
					</template>
					<template #item.trialBonus="{ item }">
						<VTooltip v-if="(item.raw || item)._trialBonus" location="top">
							<template #activator="{ props: tooltipProps }">
								<VChip v-bind="tooltipProps" size="small" color="success" variant="tonal">
									<VIcon start icon="tabler-gift" size="14" />
									{{ formatNumber((item.raw || item)._trialBonus.amount) }} TL
								</VChip>
							</template>
							<span>{{ new Date((item.raw || item)._trialBonus.claimedAt).toLocaleString('tr-TR') }} tarihinde onaylandı</span>
						</VTooltip>
						<span v-else class="text-medium-emphasis">-</span>
					</template>
					<template #item.agentSource="{ item }">
						<VChip
							size="small"
							variant="tonal"
							:color="(item.raw || item).agentSource === 'trial' ? 'warning' : 'default'"
						>
							{{ (item.raw || item).agentSource === 'trial' ? 'Deneme Bonusu (bizzodeneme)' : 'Normal' }}
						</VChip>
					</template>
					<template #item.actions="{ item }">
						<VBtn
							size="small"
							color="primary"
							variant="tonal"
							:disabled="!canManageControlGame"
							@click="openGiveCallDialog((item.raw || item)._player)"
						>
							<VIcon start icon="tabler-target-arrow" size="16" />
							Call Ver
						</VBtn>
					</template>
				</VDataTable>
			</VCardText>
		</VCard>

		<!-- Call Ver modalı: RTP değerleri backend'den (GetCallList) otomatik gelir, tek tek elle girilmez -->
		<VDialog v-model="giveCallDialog.open" max-width="880" scrollable>
			<VCard>
				<VCardItem>
					<VCardTitle>Call Ver</VCardTitle>
					<VCardSubtitle>{{ giveCallDialog.player?.userCode }}</VCardSubtitle>
					<template #append>
						<VBtn icon variant="text" size="small" @click="closeGiveCallDialog">
							<VIcon icon="tabler-x" />
						</VBtn>
					</template>
				</VCardItem>

				<VCardText>
					<VRow class="mb-2">
						<VCol cols="12" sm="4">
							<div class="text-caption text-medium-emphasis">Oyun</div>
							<div class="font-weight-medium">{{ giveCallDialog.player?.gameCode || '-' }}</div>
						</VCol>
						<VCol cols="12" sm="4">
							<div class="text-caption text-medium-emphasis">Bahis</div>
							<div class="font-weight-medium">{{ formatNumber(giveCallDialog.player?.betAmount) }}</div>
						</VCol>
						<VCol cols="12" sm="4">
							<div class="text-caption text-medium-emphasis">Gerçek RTP</div>
							<VChip size="small" variant="outlined" color="primary">
								{{ formatRtp(giveCallDialog.player) }}
							</VChip>
						</VCol>
					</VRow>

					<VAlert v-if="giveCallDialog.error" type="error" variant="tonal" density="compact" class="mb-3">
						{{ giveCallDialog.error }}
					</VAlert>

					<!-- Gönderilecek tutar: Bahis × Seçili RTP, RTP seçilirken büyük şekilde
						gösterilir ki hangi çarpanın seçildiğinde ne kadar gönderileceği net olsun. -->
					<VCard
						class="mb-4 pa-4 text-center send-amount-card"
						:variant="selectedCallAmount !== null ? 'flat' : 'tonal'"
						:color="selectedCallAmount !== null ? 'primary' : undefined"
					>
						<div class="text-caption" :class="selectedCallAmount !== null ? 'text-white opacity-90' : 'text-medium-emphasis'">
							Gönderilecek Tutar
							<template v-if="giveCallDialog.selectedRtp !== null">
								({{ formatNumber(giveCallDialog.player?.betAmount) }} × {{ giveCallDialog.selectedRtp }}x)
							</template>
						</div>
						<div
							class="send-amount-value font-weight-bold"
							:class="selectedCallAmount !== null ? 'text-white' : 'text-medium-emphasis'"
						>
							{{ selectedCallAmount !== null ? `${formatNumber(selectedCallAmount)} TL` : "RTP seçilmedi" }}
						</div>
					</VCard>

					<div class="text-subtitle-2 mb-2">RTP Seçin</div>

					<div v-if="giveCallDialog.loading" class="d-flex justify-center py-10">
						<VProgressCircular indeterminate color="primary" />
					</div>
					<p v-else-if="!giveCallDialog.options.length" class="text-medium-emphasis">
						Bu el için uygulanabilir RTP değeri bulunamadı.
					</p>
					<div v-else class="rtp-option-grid">
						<VBtn
							v-for="option in giveCallDialog.options"
							:key="option"
							size="small"
							:color="giveCallDialog.selectedRtp === option ? 'primary' : undefined"
							:variant="giveCallDialog.selectedRtp === option ? 'flat' : 'outlined'"
							@click="giveCallDialog.selectedRtp = option"
						>
							{{ option }}x
						</VBtn>
					</div>
				</VCardText>

				<VDivider />

				<VCardActions>
					<VSpacer />
					<VBtn variant="tonal" @click="closeGiveCallDialog">Kapat</VBtn>
					<VBtn
						color="primary"
						:disabled="giveCallDialog.selectedRtp === null"
						:loading="giveCallDialog.applying"
						@click="applySelectedCall"
					>
						<VIcon start icon="tabler-send" />
						Uygula
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Call Result: Bekleyen/tamamlanan callar, iptal kontrolü satır bazlı -->
		<VCard v-if="activeTab === 'call-result'">
			<VCardText>
				<p v-if="!callResultRows.length" class="text-medium-emphasis mb-0">
					Seçili vendor ve tarih aralığında call bulunamadı.
				</p>
				<VDataTable
					v-else
					:headers="callResultHeaders"
					:items="callResultRows"
					:loading="callResultLoading"
					item-value="_rowId"
					class="text-no-wrap"
				>
					<template #item.status="{ item }">
						<VChip size="small" :color="statusColor((item.raw || item).status)" variant="tonal">
							{{ (item.raw || item).status }}
						</VChip>
					</template>
					<template #item.agentSource="{ item }">
						<VChip
							size="small"
							variant="tonal"
							:color="(item.raw || item).agentSource === 'trial' ? 'warning' : 'default'"
						>
							{{ (item.raw || item).agentSource === 'trial' ? 'Deneme Bonusu' : 'Normal' }}
						</VChip>
					</template>
					<template #item.actions="{ item }">
						<VBtn
							v-if="isWaitingStatus((item.raw || item).status)"
							size="small"
							color="error"
							variant="tonal"
							:disabled="!canManageControlGame"
							:loading="cancelingRowId === (item.raw || item)._rowId"
							@click="cancelCallRow(item.raw || item)"
						>
							<VIcon start icon="tabler-ban" size="16" />
							Call İptal
						</VBtn>
						<span v-else class="text-medium-emphasis">-</span>
					</template>
				</VDataTable>
			</VCardText>
		</VCard>

		<!-- Call Geçmişi -->
		<VCard v-if="activeTab === 'call-history'">
			<VCardText>
				<VDataTable
					:headers="historyHeaders"
					:items="historyRows"
					:loading="historyLoading"
					item-value="_rowId"
					class="text-no-wrap"
				>
					<template #item.status="{ item }">
						<VChip size="small" :color="statusColor((item.raw || item).status)" variant="tonal">
							{{ (item.raw || item).status }}
						</VChip>
					</template>
					<template #item.agentSource="{ item }">
						<VChip
							size="small"
							variant="tonal"
							:color="(item.raw || item).agentSource === 'trial' ? 'warning' : 'default'"
						>
							{{ (item.raw || item).agentSource === 'trial' ? 'Deneme Bonusu' : 'Normal' }}
						</VChip>
					</template>
				</VDataTable>
			</VCardText>
		</VCard>

		<VCard v-if="showRaw" class="mt-4">
			<VCardText>
				<VTextarea
					:model-value="JSON.stringify(rawResponse, null, 2)"
					label="Ham API Yanıtı"
					rows="12"
					readonly
					style="font-family: monospace;"
				/>
			</VCardText>
		</VCard>
	</section>
</template>

<style scoped>
.rtp-option-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
	gap: 8px;
	max-height: 420px;
	overflow-y: auto;
	padding-right: 4px;
}

.send-amount-card {
	transition: background-color 0.15s ease;
}

.send-amount-value {
	font-size: 2.5rem;
	line-height: 1.2;
	letter-spacing: -0.02em;
}
</style>

<route lang="yaml">
meta:
  action: read
  subject: controlGame
</route>
