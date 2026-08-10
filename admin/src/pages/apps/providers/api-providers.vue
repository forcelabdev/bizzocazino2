<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import axios from "@axios";
import ability from "@/plugins/casl/ability";
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames";

const { t } = useI18n();
const { formatProviderDisplayName, loadProviderDisplayNames } =
	useProviderDisplayNames();

// Data
const apiProviders = ref([]);
const totalProviders = ref(0);
const search = ref("");
const statusFilter = ref("");
const typeFilter = ref("");
const loading = ref(false);
const syncLoading = ref(false);
const syncAllLoading = ref(false);

// Dialog
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const formLoading = ref(false);
const selectedProvider = ref(null);

// Form
const defaultForm = {
	name: "",
	code: "",
	type: "drakon",
	status: "active",
	credentials: {
		apiKey: "",
		secretKey: "",
		agentId: "",
		token: "",
	},
	endpoints: {
		base: "",
		games: "",
		providers: "",
		launch: "",
	},
	settings: {
		defaultRtp: 97,
		currency: "TRY",
	},
};

const form = ref({ ...defaultForm });
const formErrors = ref({});

// Options
const options = ref({
	page: 1,
	itemsPerPage: 10,
});

const typeOptions = computed(() => [
	{ title: "Tümü", value: "" },
	{ title: formatProviderDisplayName("drakon"), value: "drakon" },
	{ title: formatProviderDisplayName("nexus"), value: "nexus" },
	{ title: "Custom", value: "custom" },
]);

const statusOptions = [
	{ title: "Tümü", value: "" },
	{ title: "Aktif", value: "active" },
	{ title: "Pasif", value: "inactive" },
];

const typeSelectOptions = computed(() => [
	{ title: formatProviderDisplayName("drakon"), value: "drakon" },
	{ title: formatProviderDisplayName("nexus"), value: "nexus" },
	{ title: "Custom", value: "custom" },
]);

const statusSelectOptions = [
	{ title: "Aktif", value: "active" },
	{ title: "Pasif", value: "inactive" },
];

const headers = [
	{ title: "Ad", key: "name", sortable: true },
	{ title: "Kod", key: "code", sortable: true },
	{ title: "Tip", key: "type", sortable: true },
	{ title: "Durum", key: "status", sortable: true },
	{ title: "Provider Sayısı", key: "providerCount", sortable: false },
	{ title: "Oyun Sayısı", key: "gameCount", sortable: false },
	{ title: "Son Sync", key: "lastSyncAt", sortable: true },
	{ title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

// Computed
const dialogTitle = computed(() => {
	return isEditMode.value ? "API Provider Düzenle" : "Yeni API Provider";
});

const canCreateProviders = computed(
	() => ability.can("create", "providers") || ability.can("manage", "providers"),
);
const canUpdateProviders = computed(
	() => ability.can("update", "providers") || ability.can("manage", "providers"),
);
const canDeleteProviders = computed(
	() => ability.can("delete", "providers") || ability.can("manage", "providers"),
);
const canManageProviders = computed(() => ability.can("manage", "providers"));

const showDrakonFields = computed(() => form.value.type === "drakon");
const showNexusFields = computed(() => form.value.type === "nexus");

// Methods
const fetchProviders = async () => {
	loading.value = true;
	try {
		const params = {
			page: options.value.page,
			limit: options.value.itemsPerPage,
		};
		if (search.value) params.search = search.value;
		if (statusFilter.value) params.status = statusFilter.value;
		if (typeFilter.value) params.type = typeFilter.value;

		const { data } = await axios.get("/admin/providers/api-providers", {
			params,
		});
		apiProviders.value = data.data || [];
		totalProviders.value = data.total || 0;
	} catch (error) {
		console.error("Failed to fetch api providers:", error);
	} finally {
		loading.value = false;
	}
};

const openCreateDialog = () => {
	isEditMode.value = false;
	form.value = JSON.parse(JSON.stringify(defaultForm));
	formErrors.value = {};
	isDialogOpen.value = true;
};

const openEditDialog = (provider) => {
	isEditMode.value = true;
	selectedProvider.value = provider;
	form.value = {
		name: provider.name,
		code: provider.code,
		type: provider.type,
		status: provider.status,
		credentials: {
			apiKey: provider.credentials?.apiKey || "",
			secretKey: provider.credentials?.secretKey || "",
			agentId: provider.credentials?.agentId || "",
			token: provider.credentials?.token || "",
		},
		endpoints: {
			base: provider.endpoints?.base || "",
			games: provider.endpoints?.games || "",
			providers: provider.endpoints?.providers || "",
			launch: provider.endpoints?.launch || "",
		},
		settings: {
			defaultRtp: provider.settings?.defaultRtp || 97,
			currency: provider.settings?.currency || "TRY",
		},
	};
	formErrors.value = {};
	isDialogOpen.value = true;
};

const closeDialog = () => {
	isDialogOpen.value = false;
	selectedProvider.value = null;
	form.value = JSON.parse(JSON.stringify(defaultForm));
	formErrors.value = {};
};

const validateForm = () => {
	formErrors.value = {};

	if (!form.value.name?.trim()) {
		formErrors.value.name = "Ad gereklidir";
	}
	if (!form.value.code?.trim()) {
		formErrors.value.code = "Kod gereklidir";
	}
	if (!form.value.endpoints?.base?.trim()) {
		formErrors.value.baseEndpoint = "API Base URL gereklidir";
	}

	// Type-specific validation
	if (form.value.type === "drakon") {
		if (!form.value.credentials?.agentId?.trim()) {
			formErrors.value.agentId = "Agent ID gereklidir";
		}
		if (!form.value.credentials?.secretKey?.trim()) {
			formErrors.value.secretKey = "Secret Key gereklidir";
		}
	} else if (form.value.type === "nexus") {
		if (!form.value.credentials?.token?.trim()) {
			formErrors.value.token = "API Token gereklidir";
		}
	}

	return Object.keys(formErrors.value).length === 0;
};

const saveProvider = async () => {
	if (!validateForm()) return;

	formLoading.value = true;
	try {
		if (isEditMode.value) {
			await axios.put(
				`/admin/providers/api-providers/${selectedProvider.value._id}`,
				form.value
			);
		} else {
			await axios.post("/admin/providers/api-providers", form.value);
		}
		closeDialog();
		fetchProviders();
	} catch (error) {
		console.error("Failed to save provider:", error);
		if (error.response?.data?.error) {
			alert(error.response.data.error);
		}
	} finally {
		formLoading.value = false;
	}
};

const deleteProvider = async (provider) => {
	if (
		!confirm(
			`"${provider.name}" API provider'ı silmek istediğinize emin misiniz?`
		)
	) {
		return;
	}

	try {
		await axios.delete(`/admin/providers/api-providers/${provider._id}`);
		fetchProviders();
	} catch (error) {
		console.error("Failed to delete provider:", error);
		if (error.response?.data?.error) {
			alert(error.response.data.error);
		}
	}
};

const syncProvider = async (provider) => {
	syncLoading.value = provider._id;
	try {
		const { data } = await axios.post(
			`/admin/providers/api-providers/${provider._id}/sync`
		);
		alert(
			`Sync tamamlandı!\nProviders: ${
				data.result?.providers || 0
			}\nGames: ${data.result?.games || 0}`
		);
		fetchProviders();
	} catch (error) {
		console.error("Failed to sync provider:", error);
		if (error.response?.data?.error) {
			alert("Sync hatası: " + error.response.data.error);
		}
	} finally {
		syncLoading.value = false;
	}
};

const syncAllProviders = async () => {
	if (
		!confirm(
			"Tüm API provider'ları sync etmek istediğinize emin misiniz? Bu işlem uzun sürebilir."
		)
	) {
		return;
	}

	syncAllLoading.value = true;
	try {
		const { data } = await axios.post(
			"/admin/providers/api-providers/sync-all"
		);
		let message = "Sync tamamlandı!\n\n";
		data.results?.forEach((r) => {
			if (r.success) {
				message += `✅ ${r.name}: ${r.providers || 0} provider, ${
					r.games || 0
				} oyun\n`;
			} else {
				message += `❌ ${r.name}: ${r.error}\n`;
			}
		});
		alert(message);
		fetchProviders();
	} catch (error) {
		console.error("Failed to sync all providers:", error);
	} finally {
		syncAllLoading.value = false;
	}
};

const getTypeColor = (type) => {
	const colors = {
		drakon: "primary",
		nexus: "success",
		custom: "warning",
	};
	return colors[type] || "secondary";
};

const getStatusColor = (status) => {
	return status === "active" ? "success" : "error";
};

const formatDate = (date) => {
	if (!date) return "-";
	return new Date(date).toLocaleString("tr-TR");
};

const maskCredential = (value) => {
	if (!value) return "-";
	if (value.length <= 8) return "****";
	return value.substring(0, 4) + "****" + value.substring(value.length - 4);
};

// Lifecycle
onMounted(async () => {
	await loadProviderDisplayNames({ force: true });
	fetchProviders();
});
</script>

<route lang="yaml">
meta:
  action: read
  subject: providers
</route>

<template>
	<VCard>
		<VCardTitle class="pa-4 d-flex align-center justify-space-between">
			<span>API Provider Yönetimi</span>
			<div class="d-flex gap-2">
				<VBtn
					v-if="canManageProviders"
					color="warning"
					variant="tonal"
					:loading="syncAllLoading"
					@click="syncAllProviders"
				>
					<VIcon start icon="tabler-refresh" />
					Tümünü Sync Et
				</VBtn>
				<VBtn v-if="canCreateProviders" color="primary" @click="openCreateDialog">
					<VIcon start icon="tabler-plus" />
					Yeni Provider
				</VBtn>
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
						@update:model-value="fetchProviders"
					/>
				</VCol>
				<VCol cols="12" md="4">
					<VSelect
						v-model="typeFilter"
						:items="typeOptions"
						item-title="title"
						item-value="value"
						label="Tip"
						clearable
						@update:model-value="fetchProviders"
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
						@update:model-value="fetchProviders"
					/>
				</VCol>
			</VRow>
		</VCardText>

		<VDataTableServer
			v-model:page="options.page"
			v-model:items-per-page="options.itemsPerPage"
			:items="apiProviders"
			:items-length="totalProviders"
			:headers="headers"
			:loading="loading"
			class="text-no-wrap"
			@update:page="fetchProviders"
			@update:items-per-page="fetchProviders"
		>
			<template #item.name="{ item }">
				<span class="font-weight-medium">{{ formatProviderDisplayName(item.raw.type, item.raw.name) }}</span>
			</template>

			<template #item.code="{ item }">
				<code class="text-xs">{{ formatProviderDisplayName(item.raw.code, item.raw.code) }}</code>
			</template>

			<template #item.type="{ item }">
				<VChip :color="getTypeColor(item.raw.type)" size="small" label>
					{{ formatProviderDisplayName(item.raw.type) }}
				</VChip>
			</template>

			<template #item.status="{ item }">
				<VChip :color="getStatusColor(item.raw.status)" size="small">
					{{ item.raw.status === "active" ? "Aktif" : "Pasif" }}
				</VChip>
			</template>

			<template #item.providerCount="{ item }">
				<VChip color="info" size="small" variant="tonal">
					{{ item.raw.providerCount || 0 }}
				</VChip>
			</template>

			<template #item.gameCount="{ item }">
				<VChip color="success" size="small" variant="tonal">
					{{ item.raw.gameCount || 0 }}
				</VChip>
			</template>

			<template #item.lastSyncAt="{ item }">
				<span class="text-xs">{{
					formatDate(item.raw.lastSyncAt)
				}}</span>
			</template>

			<template #item.actions="{ item }">
				<div class="d-flex gap-1 justify-end">
					<VBtn
						v-if="canManageProviders"
						icon
						size="small"
						variant="text"
						color="warning"
						:loading="syncLoading === item.raw._id"
						@click="syncProvider(item.raw)"
					>
						<VIcon icon="tabler-refresh" />
						<VTooltip activator="parent">Sync</VTooltip>
					</VBtn>
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
					<VBtn
						v-if="canDeleteProviders"
						icon
						size="small"
						variant="text"
						color="error"
						@click="deleteProvider(item.raw)"
					>
						<VIcon icon="tabler-trash" />
						<VTooltip activator="parent">Sil</VTooltip>
					</VBtn>
				</div>
			</template>
		</VDataTableServer>
	</VCard>

	<!-- Create/Edit Dialog -->
	<VDialog v-model="isDialogOpen" max-width="800" persistent>
		<VCard>
			<VCardTitle class="pa-4">
				{{ dialogTitle }}
			</VCardTitle>

			<VCardText>
				<VForm @submit.prevent="saveProvider">
					<VRow>
						<!-- Basic Info -->
						<VCol cols="12">
							<h4 class="mb-3">Temel Bilgiler</h4>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model="form.name"
								label="Ad *"
								:error-messages="formErrors.name"
								:placeholder="`Örn: ${formatProviderDisplayName('drakon')} API`"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VTextField
								v-model="form.code"
								label="Kod *"
								:error-messages="formErrors.code"
								placeholder="Örn: provider-main"
								:disabled="isEditMode"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSelect
								v-model="form.type"
								:items="typeSelectOptions"
								item-title="title"
								item-value="value"
								label="Tip *"
								:disabled="isEditMode"
							/>
						</VCol>
						<VCol cols="12" md="4">
							<VSelect
								v-model="form.status"
								:items="statusSelectOptions"
								item-title="title"
								item-value="value"
								label="Durum"
							/>
						</VCol>

						<!-- Endpoints -->
						<VCol cols="12">
							<VDivider class="my-2" />
							<h4 class="mb-3 mt-4">API Endpoints</h4>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.endpoints.base"
								label="Base URL *"
								:error-messages="formErrors.baseEndpoint"
								placeholder="https://api.example.com"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.endpoints.games"
								label="Games Endpoint"
								placeholder="/api/games"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.endpoints.providers"
								label="Providers Endpoint"
								placeholder="/api/providers"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.endpoints.launch"
								label="Launch Endpoint"
								placeholder="/api/launch"
							/>
						</VCol>

						<!-- Credentials - Drakon -->
						<template v-if="showDrakonFields">
							<VCol cols="12">
								<VDivider class="my-2" />
								<h4 class="mb-3 mt-4">{{ formatProviderDisplayName("drakon") }} Credentials</h4>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model="form.credentials.agentId"
									label="Agent ID *"
									:error-messages="formErrors.agentId"
									placeholder="Agent ID"
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model="form.credentials.secretKey"
									label="Secret Key *"
									:error-messages="formErrors.secretKey"
									placeholder="Secret Key"
									type="password"
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model="form.credentials.apiKey"
									label="API Key (Opsiyonel)"
									placeholder="API Key"
								/>
							</VCol>
						</template>

						<!-- Credentials - Nexus -->
						<template v-if="showNexusFields">
							<VCol cols="12">
								<VDivider class="my-2" />
								<h4 class="mb-3 mt-4">{{ formatProviderDisplayName("nexus") }} Credentials</h4>
							</VCol>
							<VCol cols="12">
								<VTextField
									v-model="form.credentials.token"
									label="API Token *"
									:error-messages="formErrors.token"
									placeholder="Bearer token"
									type="password"
								/>
							</VCol>
						</template>

						<!-- Settings -->
						<VCol cols="12">
							<VDivider class="my-2" />
							<h4 class="mb-3 mt-4">Ayarlar</h4>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model.number="form.settings.defaultRtp"
								label="Varsayılan RTP (%)"
								type="number"
								min="1"
								max="100"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.settings.currency"
								label="Para Birimi"
								placeholder="TRY"
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
					v-if="isEditMode ? canUpdateProviders : canCreateProviders"
					color="primary"
					:loading="formLoading"
					@click="saveProvider"
				>
					{{ isEditMode ? "Güncelle" : "Oluştur" }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<style scoped>
.gap-1 {
	gap: 4px;
}
.gap-2 {
	gap: 8px;
}
</style>
