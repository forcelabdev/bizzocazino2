<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames";

const { t } = useI18n();
const { formatProviderDisplayName, loadProviderDisplayNames } =
	useProviderDisplayNames();

// Data
const gameProviders = ref([]);
const apiProviders = ref([]);
const totalProviders = ref(0);
const search = ref("");
const statusFilter = ref("");
const apiProviderFilter = ref("");
const loading = ref(false);

// Dialog
const isDialogOpen = ref(false);
const formLoading = ref(false);
const selectedProvider = ref(null);

// Form
const form = ref({
	name: "",
	status: "active",
	rtp: 97,
	order: 0,
});

// Options
const options = ref({
	page: 1,
	itemsPerPage: 10,
});

const statusOptions = [
	{ title: "Tümü", value: "" },
	{ title: "Aktif", value: "active" },
	{ title: "Pasif", value: "inactive" },
];

const statusSelectOptions = [
	{ title: "Aktif", value: "active" },
	{ title: "Pasif", value: "inactive" },
];

const headers = [
	{ title: "Logo", key: "logo", sortable: false, width: "60px" },
	{ title: "Ad", key: "name", sortable: true },
	{ title: "Kod", key: "code", sortable: true },
	{ title: "API Provider", key: "apiProvider", sortable: true },
	{ title: "RTP", key: "rtp", sortable: true },
	{ title: "Oyun Sayısı", key: "gameCount", sortable: true },
	{ title: "Durum", key: "status", sortable: true },
	{ title: "Sıra", key: "order", sortable: true },
	{ title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

// Computed
const apiProviderOptions = computed(() => {
	return [
		{ title: "Tümü", value: "" },
		...apiProviders.value.map((p) => ({
			title: `${p.name} (${formatProviderDisplayName(p.type)})`,
			value: p._id,
		})),
	];
});

const canUpdateProviders = computed(
	() => ability.can("update", "providers") || ability.can("manage", "providers"),
);
const canManageProviders = computed(() => ability.can("manage", "providers"));

// Methods
const fetchApiProviders = async () => {
	try {
		const { data } = await axios.get("/admin/providers/api-providers", {
			params: { limit: 100 },
		});
		apiProviders.value = data.data || [];
	} catch (error) {
		console.error("Failed to fetch api providers:", error);
	}
};

const fetchGameProviders = async () => {
	loading.value = true;
	try {
		const params = {
			page: options.value.page,
			limit: options.value.itemsPerPage,
		};
		if (search.value) params.search = search.value;
		if (statusFilter.value) params.status = statusFilter.value;
		if (apiProviderFilter.value)
			params.apiProvider = apiProviderFilter.value;

		const { data } = await axios.get("/admin/providers/game-providers", {
			params,
		});
		gameProviders.value = data.data || [];
		totalProviders.value = data.total || 0;
	} catch (error) {
		console.error("Failed to fetch game providers:", error);
	} finally {
		loading.value = false;
	}
};

const openEditDialog = (provider) => {
	selectedProvider.value = provider;
	form.value = {
		name: provider.name || "",
		status: provider.status,
		rtp: provider.rtp || 97,
		order: provider.order || 0,
	};
	isDialogOpen.value = true;
};

const closeDialog = () => {
	isDialogOpen.value = false;
	selectedProvider.value = null;
};

const saveProvider = async () => {
	formLoading.value = true;
	try {
		await axios.put(
			`/admin/providers/game-providers/${selectedProvider.value._id}`,
			form.value
		);
		closeDialog();
		fetchGameProviders();
	} catch (error) {
		console.error("Failed to update provider:", error);
		if (error.response?.data?.error) {
			alert(error.response.data.error);
		}
	} finally {
		formLoading.value = false;
	}
};

const toggleStatus = async (provider) => {
	try {
		const newStatus = provider.status === "active" ? "inactive" : "active";
		await axios.put(`/admin/providers/game-providers/${provider._id}`, {
			status: newStatus,
		});
		fetchGameProviders();
	} catch (error) {
		console.error("Failed to toggle status:", error);
	}
};

const getStatusColor = (status) => {
	return status === "active" ? "success" : "error";
};

const getApiProviderName = (apiProvider) => {
	if (!apiProvider) return "-";
	if (typeof apiProvider === "object") {
		return `${apiProvider.name} (${formatProviderDisplayName(apiProvider.type)})`;
	}
	const found = apiProviders.value.find((p) => p._id === apiProvider);
	return found
		? `${found.name} (${formatProviderDisplayName(found.type)})`
		: "-";
};

const getApiProviderColor = (apiProvider) => {
	if (!apiProvider) return "secondary";
	const type = typeof apiProvider === "object" ? apiProvider.type : null;
	if (!type) return "secondary";
	const colors = {
		drakon: "primary",
		nexus: "success",
		custom: "warning",
	};
	return colors[type] || "secondary";
};

// Sync from games
const syncLoading = ref(false);
const syncFromGames = async () => {
	syncLoading.value = true;
	try {
		const { data } = await axios.post("/admin/providers/game-providers/sync-from-games");
		alert(data.message);
		fetchGameProviders();
	} catch (error) {
		console.error("Sync failed:", error);
		alert(error.response?.data?.message || "Sync failed");
	} finally {
		syncLoading.value = false;
	}
};

// Lifecycle
onMounted(async () => {
	await loadProviderDisplayNames({ force: true });
	await fetchApiProviders();
	await fetchGameProviders();
});

watch([search, statusFilter, apiProviderFilter], fetchGameProviders);
</script>

<route lang="yaml">
meta:
  action: read
  subject: providers
</route>

<template>
	<VCard>
		<VCardTitle class="pa-4 d-flex align-center justify-space-between">
			<span>Oyun Sağlayıcıları (Game Providers)</span>
			<div class="d-flex align-center gap-2">
				<VBtn
					v-if="canManageProviders"
					color="warning"
					variant="tonal"
					:loading="syncLoading"
					@click="syncFromGames"
				>
					<VIcon icon="tabler-refresh" class="me-1" />
					Oyunlardan Senkronize Et
				</VBtn>
				<VChip color="info" variant="tonal">
					Toplam: {{ totalProviders }}
				</VChip>
			</div>
		</VCardTitle>

		<VCardText>
			<VRow>
				<VCol cols="12" md="4">
					<VTextField
						v-model="search"
						label="Ara..."
						prepend-inner-icon="tabler-search"
						clearable
						@update:model-value="fetchGameProviders"
					/>
				</VCol>
				<VCol cols="12" md="4">
					<VSelect
						v-model="apiProviderFilter"
						:items="apiProviderOptions"
						item-title="title"
						item-value="value"
						label="API Provider"
						clearable
						@update:model-value="fetchGameProviders"
					/>
				</VCol>
				<VCol cols="12" md="4">
					<VSelect
						v-model="statusFilter"
						:items="statusOptions"
						item-title="title"
						item-value="value"
						label="Durum"
						clearable
						@update:model-value="fetchGameProviders"
					/>
				</VCol>
			</VRow>
		</VCardText>

		<VDataTableServer
			v-model:page="options.page"
			v-model:items-per-page="options.itemsPerPage"
			:items="gameProviders"
			:items-length="totalProviders"
			:headers="headers"
			:loading="loading"
			class="text-no-wrap"
			@update:page="fetchGameProviders"
			@update:items-per-page="fetchGameProviders"
		>
			<template #item.logo="{ item }">
				<VAvatar size="40" rounded="lg" variant="tonal" color="primary">
					<VImg v-if="item.raw.logo" :src="item.raw.logo" />
					<span v-else class="text-xs">{{
						item.raw.name?.substring(0, 2).toUpperCase()
					}}</span>
				</VAvatar>
			</template>

			<template #item.name="{ item }">
				<span class="font-weight-medium">{{ item.raw.name }}</span>
			</template>

			<template #item.code="{ item }">
				<code class="text-xs">{{ item.raw.code }}</code>
			</template>

			<template #item.apiProvider="{ item }">
				<VChip
					:color="getApiProviderColor(item.raw.apiProvider)"
					size="small"
					label
				>
					{{ getApiProviderName(item.raw.apiProvider) }}
				</VChip>
			</template>

			<template #item.rtp="{ item }">
				<span>{{ item.raw.rtp || 0 }}%</span>
			</template>

			<template #item.gameCount="{ item }">
				<VChip color="success" size="small" variant="tonal">
					{{ item.raw.gameCount || 0 }}
				</VChip>
			</template>

			<template #item.status="{ item }">
				<VSwitch
					density="compact"
					:model-value="item.raw.status === 'active'"
					color="success"
					:disabled="!canUpdateProviders"
					@update:model-value="() => toggleStatus(item.raw)"
				/>
			</template>

			<template #item.order="{ item }">
				<span>{{ item.raw.order || 0 }}</span>
			</template>

			<template #item.actions="{ item }">
				<VBtn
					v-if="canUpdateProviders"
					icon
					size="small"
					variant="text"
					color="primary"
					@click="openEditDialog(item.raw)"
				>
					<VIcon icon="tabler-edit" />
					<VTooltip activator="parent">Düzenle</VTooltip>
				</VBtn>
			</template>
		</VDataTableServer>
	</VCard>

	<!-- Edit Dialog -->
	<VDialog v-model="isDialogOpen" max-width="500" persistent>
		<VCard>
			<VCardTitle class="pa-4">
				Provider Düzenle: {{ selectedProvider?.name }}
			</VCardTitle>

			<VCardText>
				<VForm @submit.prevent="saveProvider">
					<VRow>
						<VCol cols="12">
							<VTextField
								v-model="form.name"
								label="Ad"
								placeholder="Provider adı"
							/>
						</VCol>
						<VCol cols="12">
							<VSelect
								v-model="form.status"
								:items="statusSelectOptions"
								item-title="title"
								item-value="value"
								label="Durum"
							/>
						</VCol>
						<VCol cols="12">
							<VTextField
								v-model.number="form.rtp"
								label="RTP (%)"
								type="number"
								min="1"
								max="100"
							/>
						</VCol>
						<VCol cols="12">
							<VTextField
								v-model.number="form.order"
								label="Sıralama"
								type="number"
								min="0"
							/>
						</VCol>
					</VRow>
				</VForm>
			</VCardText>

			<VCardActions class="pa-4">
				<VSpacer />
				<VBtn color="secondary" variant="tonal" @click="closeDialog">
					İptal
				</VBtn>
				<VBtn
					v-if="canUpdateProviders"
					color="primary"
					:loading="formLoading"
					@click="saveProvider"
				>
					Güncelle
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>
