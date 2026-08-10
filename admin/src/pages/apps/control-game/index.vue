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
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

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

// ---- Realtime: Oyundaki kullanıcılar + Call Result ----
const livePlayers = ref([]);
const livePendingCallCount = ref(0);
const liveCallResults = ref([]);
const liveUpdatedAt = ref(null);
const liveConnected = ref(false);
const liveError = ref("");

const subscribedVendor = ref("");

const subscribeToPlayers = (vendorCode) => {
	if (!vendorCode) return;
	if (subscribedVendor.value && subscribedVendor.value !== vendorCode) {
		adminPanelSocket.emit("control-game:unsubscribe-players", { vendorCode: subscribedVendor.value });
	}
	livePlayers.value = [];
	liveCallResults.value = [];
	liveUpdatedAt.value = null;
	subscribedVendor.value = vendorCode;
	adminPanelSocket.emit("control-game:subscribe-players", { vendorCode });
};

const unsubscribeFromPlayers = () => {
	if (!subscribedVendor.value) return;
	adminPanelSocket.emit("control-game:unsubscribe-players", { vendorCode: subscribedVendor.value });
	subscribedVendor.value = "";
};

const setupRealtimeListeners = () => {
	adminPanelSocket.on("connect", () => {
		liveConnected.value = true;
		liveError.value = "";
		if (subscribedVendor.value) {
			adminPanelSocket.emit("control-game:subscribe-players", { vendorCode: subscribedVendor.value });
		}
		if (activeTab.value === "agent-balance") {
			adminPanelSocket.emit("control-game:subscribe-balance");
		}
	});

	adminPanelSocket.on("disconnect", () => {
		liveConnected.value = false;
	});

	adminPanelSocket.on("connect_error", (error) => {
		liveConnected.value = false;
		liveError.value = error?.message || "Anlık bağlantı kurulamadı.";
	});

	adminPanelSocket.on("control-game:players", (payload) => {
		if (payload.vendorCode !== subscribedVendor.value) return;
		livePlayers.value = payload.players || [];
		livePendingCallCount.value = payload.pendingCallCount || 0;
		liveUpdatedAt.value = payload.updatedAt;
	});

	adminPanelSocket.on("control-game:call-results", (payload) => {
		if (payload.vendorCode !== subscribedVendor.value) return;
		liveCallResults.value = payload.callResults || [];
	});

	adminPanelSocket.on("control-game:agent-balance", (payload) => {
		agentBalance.value = payload;
	});

	adminPanelSocket.on("control-game:error", (payload) => {
		liveError.value = payload.message || "Anlık veri alınırken bir hata oluştu.";
	});
};

// ---- Agent bakiyesi (realtime) ----
const agentBalance = ref(null);
const balanceSubscribed = ref(false);

const subscribeToBalance = () => {
	if (balanceSubscribed.value) return;
	balanceSubscribed.value = true;
	adminPanelSocket.emit("control-game:subscribe-balance");
};

const unsubscribeFromBalance = () => {
	if (!balanceSubscribed.value) return;
	balanceSubscribed.value = false;
	adminPanelSocket.emit("control-game:unsubscribe-balance");
};

// ---- Call geçmişi (statik REST, GetCallHistory) ----
const historyFilters = ref({
	vendorCode: "",
	startTime: toUtcDateTimeLocal(oneHourAgo),
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
		const list = data.data?.rows || data.data?.list || data.data?.history || [];
		historyRows.value = Array.isArray(list) ? list : [];
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

// ---- Call iptal / RTP formları (mevcut mantık korunuyor) ----
const cancelCallForm = ref({
	userCode: "",
	vendorCode: "",
	gameCode: "",
	currencyCode: "TRY",
	callRtp: "",
	betAmount: "",
	callId: "",
});

const rtpForm = ref({
	scope: "user",
	userCode: "",
	vendorCode: "",
	gameCode: "",
	currencyCode: "TRY",
	category: "LowRtp",
	key: "",
	value: "",
});

const settingScopeOptions = [
	{ title: "Kullanıcı", value: "user" },
	{ title: "Agent", value: "agent" },
];

const rtpCategoryOptions = [
	{ title: "LowRtp", value: "LowRtp" },
	{ title: "HighRtp", value: "HighRtp" },
	{ title: "TargetRtp", value: "TargetRtp" },
];

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

const buildRtpPayload = () => ({
	userCode: rtpForm.value.scope === "user" ? rtpForm.value.userCode : undefined,
	vendorCode: rtpForm.value.vendorCode,
	gameCode: rtpForm.value.gameCode,
	currencyCode: rtpForm.value.currencyCode,
	category: rtpForm.value.category,
	key: rtpForm.value.key,
	value: rtpForm.value.value,
});

const fetchRtpSetting = async () => {
	const type = rtpForm.value.scope === "user" ? "user-setting" : "agent-setting";
	await submitControlAction(type, buildRtpPayload());
};

const saveRtpSetting = async () => {
	const type = rtpForm.value.scope === "user" ? "change-user-setting" : "change-agent-setting";
	await submitControlAction(type, buildRtpPayload());
};

// ---- Tablo yardımcıları ----
const labelMap = {
	userCode: "Kullanıcı Kodu",
	username: "Kullanıcı",
	vendorCode: "Vendor",
	gameCode: "Oyun Kodu",
	gameName: "Oyun",
	callType: "Call Tipi",
	requestType: "Talep Tipi",
	hasPendingCall: "Bekleyen Call",
	spinCount: "Spin",
	targetRtp: "Hedef RTP",
	rtp: "RTP",
	betAmount: "Bahis",
	winAmount: "Kazanç",
	roundCount: "Round",
	status: "Durum",
	message: "Mesaj",
	calledMoney: "Uygulanan Tutar",
	canceledMoney: "İptal Tutarı",
	callRtp: "Call RTP",
	callId: "Call ID",
	createdAt: "Tarih",
	updatedAt: "Güncelleme",
	expireAt: "Bitiş",
	note: "Not",
};

const formatHeaderTitle = (key) => {
	if (labelMap[key]) return labelMap[key];
	return String(key)
		.replace(/([A-Z])/g, " $1")
		.replace(/_/g, " ")
		.replace(/^./, (value) => value.toUpperCase());
};

const normalizeCell = (value) => {
	if (value === null || value === undefined || value === "") return "-";
	if (typeof value === "boolean") return value ? "Evet" : "Hayır";
	if (Array.isArray(value)) return value.length ? JSON.stringify(value) : "-";
	if (typeof value === "object") return JSON.stringify(value);
	return value;
};

const buildTableRows = (list) =>
	list.map((row, index) => {
		if (!row || typeof row !== "object" || Array.isArray(row)) {
			return { _rowId: index, value: normalizeCell(row) };
		}
		const normalized = { _rowId: index };
		for (const [key, value] of Object.entries(row)) {
			normalized[key] = normalizeCell(value);
		}
		return normalized;
	});

const buildHeaders = (rows) => {
	const keys = new Set();
	for (const row of rows.slice(0, 20)) {
		Object.keys(row)
			.filter((key) => key !== "_rowId")
			.forEach((key) => keys.add(key));
	}
	if (!keys.size) keys.add("value");
	return [...keys].map((key) => ({ title: formatHeaderTitle(key), key, sortable: true }));
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
	{ title: "Kontrol", key: "actions", sortable: false, align: "end" },
];

const playersTableRows = computed(() =>
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
	})),
);

const callResultTableRows = computed(() =>
	buildTableRows(
		liveCallResults.value.map((entry) => ({
			userCode: entry.player?.userCode,
			username: entry.player?.username,
			gameCode: entry.player?.gameCode,
			requestType: entry.player?.requestType,
			callId: entry.call?.callId,
			status: entry.call?.status,
			message: entry.call?.message,
		})),
	),
);
const callResultHeaders = computed(() => buildHeaders(callResultTableRows.value));

const historyTableRows = computed(() => buildTableRows(historyRows.value));
const historyHeaders = computed(() => buildHeaders(historyTableRows.value));

const tabs = [
	{ value: "online-users", title: "Oyundaki Kullanıcılar", icon: "tabler-users" },
	{ value: "call-result", title: "Call Result", icon: "tabler-target-arrow" },
	{ value: "call-history", title: "Call Geçmişi", icon: "tabler-history" },
	{ value: "agent-balance", title: "Agent Bakiyesi", icon: "tabler-wallet" },
];

watch(activeTab, (tab, previousTab) => {
	if (previousTab === "agent-balance" && tab !== "agent-balance") {
		unsubscribeFromBalance();
	}
	if (tab === "agent-balance") {
		subscribeToBalance();
	}
	if (tab === "call-history" && !historyFilters.value.vendorCode) {
		historyFilters.value.vendorCode = selectedVendor.value;
		fetchCallHistory();
	}
});

watch(selectedVendor, (vendorCode) => {
	if (activeTab.value === "online-users" || activeTab.value === "call-result") {
		subscribeToPlayers(vendorCode);
	}
});

onMounted(async () => {
	setupRealtimeListeners();
	connectAdminPanelSocket();
	await fetchVendors();
	if (selectedVendor.value) {
		subscribeToPlayers(selectedVendor.value);
	}
	// TEMP_VISUAL_TEST
	livePlayers.value = [
		{
			userCode: "699732686445e9caa08caba9",
			nickName: "ahmetmehmet",
			currencyCode: "TRY",
			vendorCode: "slot-pragmatic",
			gameCode: "vs20dicegatex",
			requestType: "action=doSpin",
			betAmount: 30,
			balance: 4732.86,
			totalDebit: 664,
			totalCredit: 277.2,
			hasPendingCall: false,
		},
	];
	// END_TEMP_VISUAL_TEST
});

onBeforeUnmount(() => {
	unsubscribeFromPlayers();
	unsubscribeFromBalance();
	adminPanelSocket.off("connect");
	adminPanelSocket.off("disconnect");
	adminPanelSocket.off("connect_error");
	adminPanelSocket.off("control-game:players");
	adminPanelSocket.off("control-game:call-results");
	adminPanelSocket.off("control-game:agent-balance");
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
				<VChip :color="liveConnected ? 'success' : 'error'" variant="tonal" size="small">
					<VIcon start :icon="liveConnected ? 'tabler-plug-connected' : 'tabler-plug-connected-x'" size="16" />
					{{ liveConnected ? 'Anlık bağlantı aktif' : 'Bağlantı yok' }}
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

				<VRow v-if="activeTab === 'online-users' || activeTab === 'call-result'" align="center">
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

				<VRow v-if="activeTab === 'agent-balance'">
					<VCol cols="12" class="d-flex align-center gap-2">
						<VChip color="info" variant="tonal">
							<VIcon start icon="tabler-refresh" size="16" />
							Bakiye her 15 saniyede bir otomatik güncellenir
						</VChip>
						<span v-if="agentBalance?.updatedAt" class="text-caption text-medium-emphasis ms-auto">
							Son güncelleme: {{ new Date(agentBalance.updatedAt).toLocaleTimeString('tr-TR') }}
						</span>
					</VCol>
				</VRow>

				<VRow v-if="activeTab !== 'agent-balance'">
					<VCol cols="12" class="d-flex flex-wrap gap-2">
						<VBtn variant="text" color="secondary" @click="showRaw = !showRaw">
							<VIcon start icon="tabler-code" />
							Ham Yanıt
						</VBtn>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<VRow v-if="canManageControlGame" class="mb-4">
			<VCol cols="12" lg="6">
				<VCard>
					<VCardTitle>Call İptal</VCardTitle>
					<VCardText>
						<VRow>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.userCode" label="Kullanıcı Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.vendorCode" label="Vendor Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.gameCode" label="Oyun Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.currencyCode" label="Para Birimi" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.callRtp" label="Call RTP" type="number" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.betAmount" label="Bahis Tutarı" type="number" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="cancelCallForm.callId" label="Call ID" type="number" density="compact" />
							</VCol>
							<VCol cols="12">
								<VBtn color="warning" :loading="actionLoading === 'cancel-call'" @click="submitControlAction('cancel-call', cancelCallForm)">
									<VIcon start icon="tabler-ban" />
									Call İptal
								</VBtn>
							</VCol>
						</VRow>
					</VCardText>
				</VCard>
			</VCol>

			<VCol cols="12" lg="6">
				<VCard>
					<VCardTitle>RTP Ayarı</VCardTitle>
					<VCardText>
						<VRow>
							<VCol cols="12" md="6">
								<VSelect v-model="rtpForm.scope" :items="settingScopeOptions" label="Kapsam" density="compact" />
							</VCol>
							<VCol v-if="rtpForm.scope === 'user'" cols="12" md="6">
								<VTextField v-model="rtpForm.userCode" label="Kullanıcı Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="rtpForm.vendorCode" label="Vendor Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="rtpForm.gameCode" label="Oyun Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="rtpForm.currencyCode" label="Para Birimi" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VSelect v-model="rtpForm.category" :items="rtpCategoryOptions" label="Kategori" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="rtpForm.key" label="Key" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="rtpForm.value" label="Değer" density="compact" />
							</VCol>
							<VCol cols="12" class="d-flex flex-wrap gap-2">
								<VBtn variant="tonal" color="secondary" :loading="['user-setting', 'agent-setting'].includes(actionLoading)" @click="fetchRtpSetting">
									<VIcon start icon="tabler-search" />
									Oku
								</VBtn>
								<VBtn color="primary" :loading="['change-user-setting', 'change-agent-setting'].includes(actionLoading)" @click="saveRtpSetting">
									<VIcon start icon="tabler-device-floppy" />
									Kaydet
								</VBtn>
							</VCol>
						</VRow>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<!-- Oyundaki Kullanıcılar -->
		<VCard v-if="activeTab === 'online-users'">
			<VCardText>
				<p v-if="!playersTableRows.length" class="text-medium-emphasis mb-0">
					Şu anda bu vendor'da aktif oyuncu bulunmuyor.
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
							{{ formatRtp(item._player) }}
						</VChip>
					</template>
					<template #item.actions="{ item }">
						<VBtn
							size="small"
							color="primary"
							variant="tonal"
							:disabled="!canManageControlGame"
							@click="openGiveCallDialog(item._player)"
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

		<!-- Call Result -->
		<VCard v-if="activeTab === 'call-result'">
			<VCardText>
				<p v-if="!callResultTableRows.length" class="text-medium-emphasis mb-0">
					Şu anda bekleyen call talebi bulunan oyuncu yok.
				</p>
				<VDataTable
					v-else
					:headers="callResultHeaders"
					:items="callResultTableRows"
					item-value="_rowId"
					class="text-no-wrap"
				/>
			</VCardText>
		</VCard>

		<!-- Call Geçmişi -->
		<VCard v-if="activeTab === 'call-history'">
			<VCardText>
				<VDataTable
					:headers="historyHeaders"
					:items="historyTableRows"
					:loading="historyLoading"
					item-value="_rowId"
					class="text-no-wrap"
				/>
			</VCardText>
		</VCard>

		<!-- Agent Bakiyesi -->
		<VRow v-if="activeTab === 'agent-balance'">
			<VCol cols="12" md="6">
				<VCard>
					<VCardTitle>Agent Bilgisi</VCardTitle>
					<VCardText>
						<VTextarea
							:model-value="JSON.stringify(agentBalance?.agentInfo || {}, null, 2)"
							rows="12"
							readonly
							style="font-family: monospace;"
						/>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" md="6">
				<VCard>
					<VCardTitle>Alt Hesap Bakiyeleri</VCardTitle>
					<VCardText>
						<VTextarea
							:model-value="JSON.stringify(agentBalance?.subAgentBalances || {}, null, 2)"
							rows="12"
							readonly
							style="font-family: monospace;"
						/>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

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
</style>

<route lang="yaml">
meta:
  action: read
  subject: controlGame
</route>
