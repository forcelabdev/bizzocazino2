<script setup>
import { paginationMeta } from "@/@fake-db/utils";
import { useEchoPayzStore } from "@/pages/apps/finance/echopayz/useEchoPayzStore";
import { avatarText } from "@core/utils/formatters";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";

const { t } = useI18n();
const echoPayzStore = useEchoPayzStore();

const searchQuery = ref("");
const statusFilter = ref(null);
const transactions = ref([]);
const totalTransactions = ref(0);
const selectedRows = ref([]);
const isLoading = ref(false);

const stats = ref({
	total: 0,
	pending: 0,
	approved: 0,
	rejected: 0,
	totalAmount: 0,
	approvedAmount: 0,
});

const detailDialog = ref(false);
const detailTransaction = ref(null);

const snackbar = reactive({
	visible: false,
	color: "success",
	message: "",
});

const options = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

const headers = [
	{ title: t("finance.user"), key: "user" },
	{ title: t("finance.echopayz.referenceId"), key: "referenceId" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("actions"), key: "actions", sortable: false },
];

const statusOptions = computed(() => [
	{
		title: t("finance.echopayz.statusOptions.pending"),
		value: "pending",
	},
	{
		title: t("finance.echopayz.statusOptions.approved"),
		value: "approved",
	},
	{
		title: t("finance.echopayz.statusOptions.rejected"),
		value: "rejected",
	},
	{
		title: t("finance.echopayz.statusOptions.cancelled"),
		value: "cancelled",
	},
	{
		title: t("finance.echopayz.statusOptions.expired"),
		value: "expired",
	},
]);

const statusColor = (status) => {
	if (status === "approved") return "success";
	if (status === "pending") return "warning";
	if (status === "cancelled") return "grey";
	if (status === "expired") return "grey";
	return "error";
};

const statusLabel = (status) => {
	const key = `finance.echopayz.statusOptions.${status}`;
	const translated = t(key);

	return translated === key ? status : translated;
};

const paginationLength = computed(() => {
	const perPage = Number(options.value.itemsPerPage) || 1;
	const total = Number(totalTransactions.value) || 0;

	return Math.max(1, Math.ceil(total / perPage));
});

const showSnackbar = (message, color = "success") => {
	snackbar.message = message;
	snackbar.color = color;
	snackbar.visible = true;
};

// TRY formatla
const formatTRY = (value) => {
	return (
		Number(value || 0).toLocaleString("tr-TR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₺"
	);
};

const copyToClipboard = async (value) => {
	if (!value) return;

	try {
		await navigator.clipboard.writeText(value);
		showSnackbar(t("finance.echopayz.messages.copied"), "success");
	} catch (error) {
		console.error("Clipboard copy failed:", error);
	}
};

const fetchStats = async () => {
	try {
		const { data } = await echoPayzStore.getStats();
		if (data) {
			stats.value = data;
		}
	} catch (error) {
		console.error("Stats fetch error:", error);
	}
};

const fetchTransactions = async () => {
	isLoading.value = true;
	try {
		const { data } = await echoPayzStore.fetchTransactions({
			search: searchQuery.value,
			status: statusFilter.value,
			page: options.value.page,
			limit: options.value.itemsPerPage,
		});

		// Backend response: { success, data: { transactions, pagination, stats } }
		transactions.value = data?.data?.transactions || [];
		totalTransactions.value = data?.data?.pagination?.total || 0;
		options.value.page = data?.data?.pagination?.page || options.value.page;
	} catch (error) {
		console.error("EchoPayz transaction fetch error:", error);
		showSnackbar(t("finance.echopayz.messages.fetchError"), "error");
	} finally {
		isLoading.value = false;
	}
};

watch(
	() => [options.value.page, options.value.itemsPerPage],
	() => {
		fetchTransactions();
	},
	{ immediate: true }
);

watch([searchQuery, statusFilter], () => {
	if (options.value.page !== 1) options.value.page = 1;
	else fetchTransactions();
});

onMounted(() => {
	fetchStats();
});

const openDetails = (transaction) => {
	detailTransaction.value = transaction;
	detailDialog.value = true;
};
</script>

<template>
	<section>
		<!-- Stats Cards -->
		<VRow class="mb-4">
			<VCol cols="12" md="3">
				<VCard>
					<VCardText class="d-flex justify-space-between">
						<div>
							<p class="mb-0 text-sm">{{ t("finance.echopayz.stats.total") }}</p>
							<h4>{{ stats.total }}</h4>
						</div>
						<VAvatar color="primary" variant="tonal" rounded>
							<VIcon icon="tabler-list" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" md="3">
				<VCard>
					<VCardText class="d-flex justify-space-between">
						<div>
							<p class="mb-0 text-sm">{{ t("finance.echopayz.stats.pending") }}</p>
							<h4>{{ stats.pending }}</h4>
						</div>
						<VAvatar color="warning" variant="tonal" rounded>
							<VIcon icon="tabler-clock" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" md="3">
				<VCard>
					<VCardText class="d-flex justify-space-between">
						<div>
							<p class="mb-0 text-sm">{{ t("finance.echopayz.stats.approved") }}</p>
							<h4>{{ stats.approved }}</h4>
						</div>
						<VAvatar color="success" variant="tonal" rounded>
							<VIcon icon="tabler-check" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" md="3">
				<VCard>
					<VCardText class="d-flex justify-space-between">
						<div>
							<p class="mb-0 text-sm">{{ t("finance.echopayz.stats.totalAmount") }}</p>
							<h4>{{ formatTRY(stats.totalAmount) }}</h4>
						</div>
						<VAvatar color="info" variant="tonal" rounded>
							<VIcon icon="tabler-currency-lira" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<VCard>
			<VCardTitle>{{ t("finance.echopayz.title") }}</VCardTitle>
			<VCardText>
				<VRow class="mb-4">
					<VCol cols="12" md="6">
						<AppTextField
							v-model="searchQuery"
							:label="t('finance.echopayz.search')"
							density="compact"
							clearable
						/>
					</VCol>
					<VCol cols="12" md="6">
						<AppSelect
							v-model="statusFilter"
							:items="statusOptions"
							:label="t('finance.echopayz.statusFilter')"
							clearable
							density="compact"
						/>
					</VCol>
				</VRow>

				<VDataTableServer
					v-model="selectedRows"
					v-model:items-per-page="options.itemsPerPage"
					v-model:page="options.page"
					:items="transactions"
					:items-length="totalTransactions"
					:headers="headers"
					:loading="isLoading"
					class="text-no-wrap"
				>
					<template #item.user="{ item }">
						<div class="d-flex align-center">
							<VAvatar size="32" class="me-2">
								<span>{{
									avatarText(item.raw.user?.username || "U")
								}}</span>
							</VAvatar>
							<div>
								<div class="font-weight-medium">
									{{ item.raw.user?.name || "-" }}
								</div>
								<small
									style="display: block"
									v-if="item.raw.user?._id"
									>ID: {{ item.raw.user?._id }}</small
								>
								<small style="display: block" v-else>{{
									t("missing")
								}}</small>
								<small
									style="display: block"
									v-if="item.raw.user?.username"
									>Username:
									{{ item.raw.user?.username }}</small
								>
								<small style="display: block" v-else>{{
									t("missing")
								}}</small>
							</div>
						</div>
					</template>

					<template #item.referenceId="{ item }">
						<div class="d-flex align-center gap-1">
							<code>{{ item.raw.referenceId || "—" }}</code>
							<VBtn
								v-if="item.raw.referenceId"
								icon
								size="x-small"
								variant="text"
								@click="copyToClipboard(item.raw.referenceId)"
							>
								<VIcon icon="tabler-copy" size="14" />
							</VBtn>
						</div>
					</template>

					<template #item.amount="{ item }">
						{{ formatTRY(item.raw.amount) }}
					</template>

					<template #item.status="{ item }">
						<VChip :color="statusColor(item.raw.status)" label>
							{{ statusLabel(item.raw.status) }}
						</VChip>
					</template>

					<template #item.createdAt="{ item }">
						{{ new Date(item.raw.createdAt).toLocaleString() }}
					</template>

					<template #item.actions="{ item }">
						<VBtn
							size="small"
							color="primary"
							@click="openDetails(item.raw)"
						>
							{{ t("finance.view") }}
						</VBtn>
					</template>

					<template #bottom>
						<VDivider />
						<div
							class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
						>
							<p class="text-sm text-disabled mb-0">
								{{ paginationMeta(options, totalTransactions) }}
							</p>
							<VPagination
								v-model="options.page"
								:length="paginationLength"
								:total-visible="5"
							/>
						</div>
					</template>

					<template #no-data>
						<div class="text-center py-6 text-medium-emphasis">
							{{ t("finance.echopayz.noData") }}
						</div>
					</template>
				</VDataTableServer>
			</VCardText>
		</VCard>

		<!-- Detail Dialog -->
		<VDialog v-model="detailDialog" max-width="720">
			<VCard>
				<VCardTitle>{{ t("finance.echopayz.details") }}</VCardTitle>
				<VCardText v-if="detailTransaction">
					<VRow>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.user") }}:</strong>
							{{ detailTransaction.user?.username || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.email") }}:</strong>
							{{ detailTransaction.user?.local?.email || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.phone") }}:</strong>
							{{ detailTransaction.user?.phone || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.amount") }}:</strong>
							{{ formatTRY(detailTransaction.amount) }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.state") }}:</strong>
							<VChip
								:color="statusColor(detailTransaction.status)"
								label
								size="small"
								class="ms-1"
							>
								{{ statusLabel(detailTransaction.status) }}
							</VChip>
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.echopayz.referenceId") }}:</strong>
							<code class="ms-1">{{ detailTransaction.referenceId }}</code>
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.echopayz.echopayzTransactionId") }}:</strong>
							<code class="ms-1">{{ detailTransaction.echopayzTransactionId || "—" }}</code>
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.date") }}:</strong>
							{{
								new Date(
									detailTransaction.createdAt
								).toLocaleString()
							}}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.updatedAt") }}:</strong>
							{{
								new Date(
									detailTransaction.updatedAt
								).toLocaleString()
							}}
						</VCol>
						<VCol cols="12" v-if="detailTransaction.callbackData">
							<strong>{{ t("finance.echopayz.callbackData") }}:</strong>
							<pre class="mt-1" style="background: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto;">{{ JSON.stringify(detailTransaction.callbackData, null, 2) }}</pre>
						</VCol>
					</VRow>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn color="secondary" @click="detailDialog = false">
						{{ t("finance.close") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Snackbar -->
		<VSnackbar v-model="snackbar.visible" :color="snackbar.color" :timeout="3000">
			{{ snackbar.message }}
		</VSnackbar>
	</section>
</template>
