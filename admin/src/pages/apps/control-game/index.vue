<script setup>
import { computed, ref } from "vue";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
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
const rows = ref([]);
const rawResponse = ref(null);
const apiMeta = ref(null);
const lastError = ref("");
const successMessage = ref("");
const showRaw = ref(false);

const filters = ref({
	startTime: toUtcDateTimeLocal(oneHourAgo),
	endTime: toUtcDateTimeLocal(now),
	offset: 0,
	limit: 100,
	vendorCode: "",
	gameCode: "",
	callType: "0",
});

const callForm = ref({
	userCode: "",
	vendorCode: "",
	gameCode: "",
	currencyCode: "TRY",
	callType: "0",
	callRtp: "",
	betAmount: "",
});

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

const tabs = [
	{ value: "online-users", title: "Oyundaki kullanıcılar", icon: "tabler-users" },
	{ value: "call-list", title: "Call listesi", icon: "tabler-target-arrow" },
	{ value: "call-history", title: "Call geçmişi", icon: "tabler-history" },
];

const callTypeOptions = [
	{ title: "Base Spin", value: "0" },
	{ title: "Free Spin", value: "1" },
];

const settingScopeOptions = [
	{ title: "Kullanıcı", value: "user" },
	{ title: "Agent", value: "agent" },
];

const rtpCategoryOptions = [
	{ title: "LowRtp", value: "LowRtp" },
	{ title: "HighRtp", value: "HighRtp" },
	{ title: "TargetRtp", value: "TargetRtp" },
];

const labelMap = {
	agentCode: "Temsilci",
	userCode: "Kullanıcı Kodu",
	username: "Kullanıcı",
	vendorCode: "Vendor",
	gameCode: "Oyun Kodu",
	gameName: "Oyun",
	callType: "Call Tipi",
	spinCount: "Spin",
	targetRtp: "Hedef RTP",
	rtp: "RTP",
	betAmount: "Bahis",
	winAmount: "Kazanç",
	roundCount: "Round",
	status: "Durum",
	message: "Mesaj",
	playerInfos: "Oyuncular",
	calledMoney: "Uygulanan Tutar",
	canceledMoney: "İptal Tutarı",
	callRtp: "Call RTP",
	callId: "Call ID",
	createdAt: "Tarih",
	updatedAt: "Güncelleme",
	expireAt: "Bitiş",
	note: "Not",
};

const canManageControlGame = computed(
	() => ability.can("manage", "controlGame"),
);

const activeTabTitle = computed(
	() => tabs.find((tab) => tab.value === activeTab.value)?.title || "ControlGame",
);

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

const findRows = (value, depth = 0) => {
	if (depth > 4 || value === null || value === undefined) return [];
	if (Array.isArray(value)) return value;
	if (typeof value !== "object") return [];

	const priorityKeys = [
		"rows",
		"items",
		"data",
		"list",
		"playerInfos",
		"users",
		"results",
		"history",
		"calls",
		"rounds",
		"result",
	];

	for (const key of priorityKeys) {
		const nestedRows = findRows(value[key], depth + 1);
		if (nestedRows.length) return nestedRows;
	}

	return [];
};

const tableRows = computed(() =>
	rows.value.map((row, index) => {
		if (!row || typeof row !== "object" || Array.isArray(row)) {
			return { _rowId: index, value: normalizeCell(row) };
		}

		const normalized = { _rowId: index };
		for (const [key, value] of Object.entries(row)) {
			normalized[key] = normalizeCell(value);
		}
		return normalized;
	}),
);

const headers = computed(() => {
	const keys = new Set();
	for (const row of tableRows.value.slice(0, 20)) {
		Object.keys(row)
			.filter((key) => key !== "_rowId")
			.forEach((key) => keys.add(key));
	}

	if (!keys.size) keys.add("value");

	return [...keys].map((key) => ({
		title: formatHeaderTitle(key),
		key,
		sortable: true,
	}));
});

const buildFilterPayload = () => {
	if (activeTab.value === "online-users") {
		return { vendorCode: filters.value.vendorCode };
	}

	if (activeTab.value === "call-list") {
		return {
			vendorCode: filters.value.vendorCode,
			gameCode: filters.value.gameCode,
			callType: filters.value.callType,
		};
	}

	return {
		vendorCode: filters.value.vendorCode,
		startTime: filters.value.startTime,
		endTime: filters.value.endTime,
		offset: filters.value.offset,
		limit: filters.value.limit,
	};
};

const fetchControlGameData = async () => {
	loading.value = true;
	lastError.value = "";
	successMessage.value = "";
	try {
		const { data } = await axios.post(
			`/admin/betinovi-admin/control-game/${activeTab.value}`,
			buildFilterPayload(),
		);
		rawResponse.value = data.data || null;
		apiMeta.value = data.meta || null;
		rows.value = findRows(data.data).map((row) => row || {});
	} catch (error) {
		console.error("ControlGame veri hatası:", error);
		lastError.value =
			error?.response?.data?.message || "ControlGame verisi alınırken bir hata oluştu.";
		rows.value = [];
		rawResponse.value = error?.response?.data?.data || null;
	} finally {
		loading.value = false;
	}
};

const submitControlAction = async (type, payload) => {
	if (!canManageControlGame.value) return;

	actionLoading.value = type;
	lastError.value = "";
	successMessage.value = "";
	try {
		const { data } = await axios.post(
			`/admin/betinovi-admin/control-game/${type}`,
			payload,
		);
		rawResponse.value = data.data || null;
		apiMeta.value = data.meta || null;
		successMessage.value = "ControlGame işlemi gönderildi.";
	} catch (error) {
		console.error("ControlGame aksiyon hatası:", error);
		lastError.value =
			error?.response?.data?.message || "ControlGame işlemi sırasında bir hata oluştu.";
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
</script>

<template>
	<section class="control-game-page">
		<div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
			<div>
				<h1 class="text-h4 mb-1">Slot Call & RTP Yönetimi</h1>
				<p class="text-medium-emphasis mb-0">
					Betinovi ControlGame işlemlerini Türkçe admin ekranından yönetin.
				</p>
			</div>
			<VChip :color="canManageControlGame ? 'success' : 'warning'" variant="tonal">
				<VIcon start :icon="canManageControlGame ? 'tabler-shield-check' : 'tabler-lock'" />
				{{ canManageControlGame ? 'Call yetkisi açık' : 'Salt okunur' }}
			</VChip>
		</div>

		<VAlert v-if="lastError" type="error" variant="tonal" class="mb-4">
			{{ lastError }}
		</VAlert>
		<VAlert v-if="successMessage" type="success" variant="tonal" class="mb-4">
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

				<VRow>
					<VCol cols="12" md="3">
						<VTextField v-model="filters.vendorCode" label="Vendor Kodu" density="compact" clearable />
					</VCol>
					<VCol v-if="activeTab === 'call-list'" cols="12" md="3">
						<VTextField v-model="filters.gameCode" label="Oyun Kodu" density="compact" clearable />
					</VCol>
					<VCol v-if="activeTab === 'call-list'" cols="12" md="3">
						<VSelect v-model="filters.callType" :items="callTypeOptions" label="Call Tipi" density="compact" />
					</VCol>
					<VCol v-if="activeTab === 'call-history'" cols="12" md="3">
						<VTextField v-model="filters.startTime" type="datetime-local" label="Başlangıç Zamanı (UTC)" density="compact" />
					</VCol>
					<VCol v-if="activeTab === 'call-history'" cols="12" md="3">
						<VTextField v-model="filters.endTime" type="datetime-local" label="Bitiş Zamanı (UTC)" density="compact" />
					</VCol>
					<VCol v-if="activeTab === 'call-history'" cols="12" md="3">
						<VTextField v-model.number="filters.offset" type="number" label="Offset" density="compact" :min="0" />
					</VCol>
					<VCol v-if="activeTab === 'call-history'" cols="12" md="3">
						<VTextField v-model.number="filters.limit" type="number" label="Limit" density="compact" :min="1" />
					</VCol>
					<VCol cols="12" class="d-flex flex-wrap gap-2">
						<VBtn color="primary" :loading="loading" @click="fetchControlGameData">
							<VIcon start icon="tabler-search" />
							{{ activeTabTitle }} Getir
						</VBtn>
						<VBtn variant="text" color="secondary" @click="showRaw = !showRaw">
							<VIcon start icon="tabler-code" />
							Ham Yanıt
						</VBtn>
						<VChip color="primary" variant="tonal" class="ms-auto">
							{{ apiMeta?.method || "Method bekleniyor" }}
						</VChip>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<VRow v-if="canManageControlGame" class="mb-4">
			<VCol cols="12" lg="4">
				<VCard>
					<VCardTitle>Call Uygula</VCardTitle>
					<VCardText>
						<VRow>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.userCode" label="Kullanıcı Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.vendorCode" label="Vendor Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.gameCode" label="Oyun Kodu" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.currencyCode" label="Para Birimi" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VSelect v-model="callForm.callType" :items="callTypeOptions" label="Call Tipi" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.callRtp" label="Call RTP" type="number" density="compact" />
							</VCol>
							<VCol cols="12" md="6">
								<VTextField v-model="callForm.betAmount" label="Bahis Tutarı" type="number" density="compact" />
							</VCol>
							<VCol cols="12">
								<VBtn color="primary" :loading="actionLoading === 'apply-call'" @click="submitControlAction('apply-call', callForm)">
									<VIcon start icon="tabler-send" />
									Call Uygula
								</VBtn>
							</VCol>
						</VRow>
					</VCardText>
				</VCard>
			</VCol>

			<VCol cols="12" lg="4">
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

			<VCol cols="12" lg="4">
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

		<VCard>
			<VCardText>
				<VDataTable
					:headers="headers"
					:items="tableRows"
					:loading="loading"
					item-value="_rowId"
					class="text-no-wrap"
				/>
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

<route lang="yaml">
meta:
  action: read
  subject: controlGame
</route>
