<script setup>
import { ref, onMounted, watch } from "vue";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import {
	getIpCollisions,
	getSystemLogs,
	getActivityLogs,
} from "@/services/securityService";

const activeTab = ref("ip-collisions");

const tabs = [
	{ value: "ip-collisions", title: "İp Çakışmaları", icon: "tabler-network" },
	{ value: "system-logs", title: "Sistem Ayrıntıları", icon: "tabler-server-cog" },
	{ value: "activity-logs", title: "Log", icon: "tabler-list-details" },
];

const errorMessage = ref("");

// ─────────────────────────────────────────────────────────
// İp Çakışmaları
// ─────────────────────────────────────────────────────────
const collisions = ref([]);
const collisionsTotal = ref(0);
const collisionsLoading = ref(false);
const collisionsSearch = ref("");
const collisionsOptions = ref({ page: 1, itemsPerPage: 20 });

const collisionHeaders = [
	{ title: "IP Adresi", key: "ip" },
	{ title: "Üye Sayısı", key: "memberCount", width: 110 },
	{ title: "Üyeler", key: "members" },
	{ title: "Son Görülme", key: "lastSeenAt", width: 160 },
];

const fetchCollisions = async () => {
	collisionsLoading.value = true;
	errorMessage.value = "";
	try {
		const res = await getIpCollisions({
			page: collisionsOptions.value.page,
			limit: collisionsOptions.value.itemsPerPage,
			search: collisionsSearch.value,
		});
		collisions.value = res.data || [];
		collisionsTotal.value = res.pagination?.total || collisions.value.length;
	} catch (err) {
		errorMessage.value = err?.response?.data?.message || "IP çakışmaları alınamadı.";
	} finally {
		collisionsLoading.value = false;
	}
};

watch(
	[() => collisionsOptions.value.page, () => collisionsOptions.value.itemsPerPage],
	fetchCollisions,
);

// ─────────────────────────────────────────────────────────
// Sistem Ayrıntıları (admin denetim logu)
// ─────────────────────────────────────────────────────────
const systemLogs = ref([]);
const systemLogsTotal = ref(0);
const systemLogsLoading = ref(false);
const systemLogsOptions = ref({ page: 1, itemsPerPage: 30 });
const systemLogFilters = ref({ actor: "", method: "", resource: "", blocked: "", severity: "" });

const systemLogHeaders = [
	{ title: "Tarih", key: "createdAt", width: 160 },
	{ title: "Admin", key: "actorSnapshot" },
	{ title: "Method", key: "method", width: 90 },
	{ title: "Kaynak", key: "resource", width: 140 },
	{ title: "Durum", key: "statusCode", width: 90 },
	{ title: "IP", key: "ip", width: 130 },
	{ title: "Önem", key: "severity", width: 100 },
	{ title: "Bloklandı", key: "blocked", width: 110 },
];

const fetchSystemLogs = async () => {
	systemLogsLoading.value = true;
	errorMessage.value = "";
	try {
		const res = await getSystemLogs({
			page: systemLogsOptions.value.page,
			limit: systemLogsOptions.value.itemsPerPage,
			...systemLogFilters.value,
		});
		systemLogs.value = res.data || [];
		systemLogsTotal.value = res.pagination?.total || systemLogs.value.length;
	} catch (err) {
		errorMessage.value = err?.response?.data?.message || "Sistem logları alınamadı.";
	} finally {
		systemLogsLoading.value = false;
	}
};

watch(
	[() => systemLogsOptions.value.page, () => systemLogsOptions.value.itemsPerPage],
	fetchSystemLogs,
);

const applySystemLogFilters = () => {
	systemLogsOptions.value.page = 1;
	fetchSystemLogs();
};

// ─────────────────────────────────────────────────────────
// Log (oyuncu aktivite logu)
// ─────────────────────────────────────────────────────────
const activityLogs = ref([]);
const activityLogsTotal = ref(0);
const activityLogsLoading = ref(false);
const activityLogsOptions = ref({ page: 1, itemsPerPage: 30 });
const activityFilters = ref({ search: "", actionType: "" });

const activityActionTypes = [
	{ title: "Tümü", value: "" },
	{ title: "Giriş (login)", value: "login" },
	{ title: "Oyun Başlat", value: "game_start" },
	{ title: "Spin", value: "spin" },
	{ title: "Bahis", value: "bet" },
	{ title: "Kazanç", value: "win" },
];

const activityHeaders = [
	{ title: "Tarih", key: "timestamp", width: 160 },
	{ title: "Kullanıcı", key: "userId" },
	{ title: "Aksiyon", key: "actionType", width: 130 },
	{ title: "IP", key: "ip", width: 130 },
	{ title: "User Agent", key: "userAgent" },
];

const fetchActivityLogs = async () => {
	activityLogsLoading.value = true;
	errorMessage.value = "";
	try {
		const res = await getActivityLogs({
			page: activityLogsOptions.value.page,
			limit: activityLogsOptions.value.itemsPerPage,
			...activityFilters.value,
		});
		activityLogs.value = res.data || [];
		activityLogsTotal.value = res.pagination?.total || activityLogs.value.length;
	} catch (err) {
		errorMessage.value = err?.response?.data?.message || "Aktivite logları alınamadı.";
	} finally {
		activityLogsLoading.value = false;
	}
};

watch(
	[() => activityLogsOptions.value.page, () => activityLogsOptions.value.itemsPerPage],
	fetchActivityLogs,
);

const applyActivityFilters = () => {
	activityLogsOptions.value.page = 1;
	fetchActivityLogs();
};

const applyCollisionsSearch = () => {
	collisionsOptions.value.page = 1;
	fetchCollisions();
};

watch(activeTab, (tab) => {
	if (tab === "ip-collisions" && collisions.value.length === 0) fetchCollisions();
	if (tab === "system-logs" && systemLogs.value.length === 0) fetchSystemLogs();
	if (tab === "activity-logs" && activityLogs.value.length === 0) fetchActivityLogs();
});

onMounted(fetchCollisions);

const formatDate = (value) => (value ? new Date(value).toLocaleString("tr-TR") : "-");
</script>

<template>
	<section class="security-page">
		<div class="mb-4">
			<h1 class="text-h4 mb-1">Güvenlik Ve Risk Yönetimi</h1>
			<p class="text-medium-emphasis mb-0">
				Aynı IP&#39;yi kullanan üyeleri, panel dışından zorlanan istekleri ve admin
				işlem geçmişini buradan izleyin.
			</p>
		</div>

		<VAlert
			v-if="errorMessage"
			type="error"
			variant="tonal"
			class="mb-4"
			closable
			@click:close="errorMessage = ''"
		>
			{{ errorMessage }}
		</VAlert>

		<VCard>
			<VCardText>
				<VTabs v-model="activeTab" density="compact" class="mb-4">
					<VTab v-for="tab in tabs" :key="tab.value" :value="tab.value">
						<VIcon start :icon="tab.icon" />
						{{ tab.title }}
					</VTab>
				</VTabs>

				<!-- İp Çakışmaları -->
				<div v-if="activeTab === 'ip-collisions'">
					<VAlert type="info" variant="tonal" density="compact" class="mb-4">
						Aynı IP adresini kullanan 2 veya daha fazla farklı üye burada listelenir.
						Bu tek başına suistimal kanıtı değildir (paylaşımlı ağ olabilir) — inceleme
						amaçlı bir risk göstergesidir.
					</VAlert>
					<VRow class="mb-4" align="center">
						<VCol cols="12" md="4">
							<VTextField
								v-model="collisionsSearch"
								label="IP ara"
								density="compact"
								clearable
								prepend-inner-icon="tabler-search"
								@keyup.enter="applyCollisionsSearch"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VBtn color="primary" :loading="collisionsLoading" block @click="applyCollisionsSearch">
								Ara
							</VBtn>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:page="collisionsOptions.page"
						v-model:items-per-page="collisionsOptions.itemsPerPage"
						:headers="collisionHeaders"
						:items="collisions"
						:items-length="collisionsTotal"
						:loading="collisionsLoading"
					>
						<template #item.members="{ item }">
							<div class="d-flex flex-wrap gap-1">
								<VChip
									v-for="member in item.raw.members"
									:key="member.id"
									size="small"
									:color="member.isBanned ? 'error' : 'default'"
									variant="tonal"
								>
									{{ member.username }}
								</VChip>
							</div>
						</template>
						<template #item.lastSeenAt="{ item }">
							{{ formatDate(item.raw.lastSeenAt) }}
						</template>
						<template #item.memberCount="{ item }">
							<VChip color="warning" variant="tonal" size="small">
								{{ item.raw.memberCount }}
							</VChip>
						</template>
					</VDataTableServer>
				</div>

				<!-- Sistem Ayrıntıları -->
				<div v-if="activeTab === 'system-logs'">
					<VAlert type="info" variant="tonal" density="compact" class="mb-4">
						Admin panelinden yapılan tüm veri değiştiren (ekleme/güncelleme/silme)
						işlemler burada kayıtlıdır. "Bloklandı" olarak işaretlenenler, geçerli bir
						admin oturumuyla ama panelin dışından (Postman/fetch/script) gönderilip
						reddedilen isteklerdir. "Kritik" işaretli kayıtlar, yetki/rol/admin hesabı
						değişikliği veya manuel bakiye işlemi gibi hassas aksiyonları gösterir.
					</VAlert>
					<VRow class="mb-4" align="center">
						<VCol cols="12" md="3">
							<VTextField
								v-model="systemLogFilters.actor"
								label="Admin ara"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VSelect
								v-model="systemLogFilters.method"
								:items="['', 'POST', 'PUT', 'PATCH', 'DELETE']"
								label="Method"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VTextField
								v-model="systemLogFilters.resource"
								label="Kaynak"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VSelect
								v-model="systemLogFilters.blocked"
								:items="[{ title: 'Tümü', value: '' }, { title: 'Sadece bloklanan', value: 'true' }]"
								label="Durum"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VSelect
								v-model="systemLogFilters.severity"
								:items="[{ title: 'Tümü', value: '' }, { title: 'Sadece kritik', value: 'critical' }]"
								label="Önem"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VBtn color="primary" :loading="systemLogsLoading" block @click="applySystemLogFilters">
								Filtrele
							</VBtn>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:page="systemLogsOptions.page"
						v-model:items-per-page="systemLogsOptions.itemsPerPage"
						:headers="systemLogHeaders"
						:items="systemLogs"
						:items-length="systemLogsTotal"
						:loading="systemLogsLoading"
					>
						<template #item.createdAt="{ item }">
							{{ formatDate(item.raw.createdAt) }}
						</template>
						<template #item.actorSnapshot="{ item }">
							<div>
								<div class="font-weight-medium">{{ item.raw.actorSnapshot?.username || "-" }}</div>
								<div class="text-caption text-medium-emphasis">{{ item.raw.actorSnapshot?.email }}</div>
							</div>
						</template>
						<template #item.statusCode="{ item }">
							<VChip
								size="small"
								:color="item.raw.statusCode >= 400 ? 'error' : 'success'"
								variant="tonal"
							>
								{{ item.raw.statusCode }}
							</VChip>
						</template>
						<template #item.severity="{ item }">
							<VChip v-if="item.raw.severity === 'critical'" size="small" color="warning" variant="tonal">
								<VIcon start icon="tabler-alert-triangle" size="14" />
								Kritik
							</VChip>
							<span v-else class="text-medium-emphasis">-</span>
						</template>
						<template #item.blocked="{ item }">
							<VChip v-if="item.raw.blocked" size="small" color="error" variant="elevated">
								<VIcon start icon="tabler-shield-x" size="14" />
								Bloklandı
							</VChip>
							<span v-else class="text-medium-emphasis">-</span>
						</template>
					</VDataTableServer>
				</div>

				<!-- Log (oyuncu aktivite logu) -->
				<div v-if="activeTab === 'activity-logs'">
					<VAlert type="info" variant="tonal" density="compact" class="mb-4">
						Oyuncuların giriş/oyun aktiviteleri ve giriş anındaki IP/cihaz bilgisi burada
						görüntülenir.
					</VAlert>
					<VRow class="mb-4" align="center">
						<VCol cols="12" md="4">
							<VTextField
								v-model="activityFilters.search"
								label="Kullanıcı adı / e-posta / telefon ara"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VSelect
								v-model="activityFilters.actionType"
								:items="activityActionTypes"
								label="Aksiyon"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VBtn color="primary" :loading="activityLogsLoading" block @click="applyActivityFilters">
								Filtrele
							</VBtn>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:page="activityLogsOptions.page"
						v-model:items-per-page="activityLogsOptions.itemsPerPage"
						:headers="activityHeaders"
						:items="activityLogs"
						:items-length="activityLogsTotal"
						:loading="activityLogsLoading"
					>
						<template #item.timestamp="{ item }">
							{{ formatDate(item.raw.timestamp) }}
						</template>
						<template #item.userId="{ item }">
							{{ item.raw.userId?.username || "-" }}
						</template>
						<template #item.ip="{ item }">
							{{ item.raw.metadata?.ip || "-" }}
						</template>
						<template #item.userAgent="{ item }">
							<span class="text-caption">{{ item.raw.metadata?.userAgent || "-" }}</span>
						</template>
					</VDataTableServer>
				</div>
			</VCardText>
		</VCard>
	</section>
</template>

<route lang="yaml">
meta:
  action: read
  subject: security
</route>
