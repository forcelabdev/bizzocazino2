<script setup>
import { paginationMeta } from "@/@fake-db/utils";
import UnifiedPaymentTable from "@/components/finance/UnifiedPaymentTable.vue";
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames";
import { useDepositStore } from "@/pages/apps/finance/deposit/useDepositStore";
import { avatarText } from "@core/utils/formatters";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import axios from "@axios";

const { t } = useI18n();
const { formatProviderDisplayName, loadProviderDisplayNames } =
	useProviderDisplayNames();

const depositStore = useDepositStore();

const activeTab = ref("all");

// Ödeme Yöntem Yönetimi ekranındaki "Aktif" toggle'ı kapalıysa (isActive === false),
// o sağlayıcının sekmesi burada gösterilmez. Ayarlar yüklenene kadar sekmeler
// gizli kalmasın diye varsayılan olarak true tutuyoruz; ayarlar dönünce
// gerçek duruma göre güncelleniyor.
const providerEnabled = ref({
	forcelab: true,
	meeldev: true,
	galaxypay: true,
	fluxkripto: true,
	xpayments: true,
});

const loadProviderEnabledStates = async () => {
	const [forcelabRes, meeldevRes, galaxypayRes, fluxkriptoRes, xpaymentsRes] =
		await Promise.allSettled([
			axios.get("/admin/forcelab-finance/settings"),
			axios.get("/admin/meeldev/settings"),
			axios.get("/admin/galaxypay/settings"),
			axios.get("/admin/fluxkripto/settings"),
			axios.get("/admin/xpayments/settings"),
		]);

	const isActive = (result) =>
		result.status === "fulfilled" ? result.value?.data?.data?.isActive === true : true;

	providerEnabled.value = {
		forcelab: isActive(forcelabRes),
		meeldev: isActive(meeldevRes),
		galaxypay: isActive(galaxypayRes),
		fluxkripto: isActive(fluxkriptoRes),
		xpayments: isActive(xpaymentsRes),
	};

	// Aktif sekmede kalan kullanıcı, o sağlayıcı sonradan pasife alınmışsa
	// "Tümü" sekmesine geri düşer.
	if (
		Object.prototype.hasOwnProperty.call(providerEnabled.value, activeTab.value) &&
		!providerEnabled.value[activeTab.value]
	) {
		activeTab.value = "all";
	}
};

onMounted(loadProviderEnabledStates);

// --- Crypto Deposits ---
const searchQuery = ref("");
const dateRange = ref("");
const deposits = ref([]);
const totalDeposits = ref(0);
const stats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const selectedRows = ref([]);
const isLoading = ref(false);
const showModal = ref(false);
const selectedTx = ref(null);

const options = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

// Tablo kolonları
const headers = [
	{ title: t("finance.user"), key: "user" },
	{ title: t("finance.deposit.txId"), key: "txId" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "state" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

const fetchDeposits = () => {
	isLoading.value = true;
	depositStore
		.fetchDeposits({
			search: searchQuery.value,
			startDate: dateRange.value?.split("to")[0]?.trim(),
			endDate: dateRange.value?.split("to")[1]?.trim(),
			page: options.value.page,
			limit: options.value.itemsPerPage,
		})
		.then((res) => {
			const response = res?.data?.data || {};
			deposits.value = response.transactions || [];
			totalDeposits.value = response.total || 0;
			options.value.page = response.page || 1;
			stats.value = response.stats || {
				totalAmount: 0,
				last24hAmount: 0,
				monthlyAmount: 0,
			};
		})
		.finally(() => (isLoading.value = false));
};

watchEffect(fetchDeposits);
watch([searchQuery, dateRange], fetchDeposits);

// --- Forcelab Finance Deposits ---
const flSearchQuery = ref("");
const flStatusFilter = ref(null);
const flDeposits = ref([]);
const flTotalDeposits = ref(0);
const flStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const flIsLoading = ref(false);
const flShowModal = ref(false);
const flSelectedTx = ref(null);

const formatTransactionProvider = (transaction) =>
	formatProviderDisplayName(
		transaction?.providerSlug,
		transaction?.providerName || transaction?.providerSlug,
	);

const flOptions = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

const flHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "Provider", key: "providerSlug" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// --- MeelDev Deposits ---
const mdSearchQuery = ref("");
const mdStatusFilter = ref(null);
const mdDeposits = ref([]);
const mdTotalDeposits = ref(0);
const mdStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const mdIsLoading = ref(false);
const mdShowModal = ref(false);
const mdSelectedTx = ref(null);

const mdOptions = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

const mdHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "Process No", key: "processNo" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// --- GalaxyPay Deposits ---
const gpSearchQuery = ref("");
const gpStatusFilter = ref(null);
const gpMethodFilter = ref(null);
const gpDeposits = ref([]);
const gpTotalDeposits = ref(0);
const gpStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const gpIsLoading = ref(false);
const gpShowModal = ref(false);
const gpSelectedTx = ref(null);

const gpOptions = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

const gpHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "Method", key: "method" },
	{ title: "Payment ID", key: "paymentId" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// --- FluxKripto Native Deposits ---
const fluxSearchQuery = ref("");
const fluxStatusFilter = ref(null);
const fluxCurrencyFilter = ref(null);
const fluxDeposits = ref([]);
const fluxTotalDeposits = ref(0);
const fluxStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const fluxIsLoading = ref(false);
const fluxShowModal = ref(false);
const fluxSelectedTx = ref(null);
const fluxOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [] });
const fluxHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "İşlem No", key: "externalTransactionId" },
	{ title: "Kripto", key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// --- XPayment H2H Deposits ---
const xpSearchQuery = ref("");
const xpStatusFilter = ref(null);
const xpDeposits = ref([]);
const xpTotalDeposits = ref(0);
const xpStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const xpIsLoading = ref(false);
const xpShowModal = ref(false);
const xpSelectedTx = ref(null);
const xpOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [] });
const xpHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "İşlem No", key: "externalTransactionId" },
	{ title: "Hesap", key: "account" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

const galaxyPayMethodLabel = (method) =>
	({
		lobby: "Lobby",
		"bank-transfer": "Banka Transferi",
		papara: "Papara",
	})[method] || method || "—";

const fetchFlDeposits = async () => {
	flIsLoading.value = true;
	try {
		await loadProviderDisplayNames({ force: true });
		const res = await axios.get("/admin/forcelab-finance/transactions", {
			params: {
				type: "deposit",
				status: flStatusFilter.value || undefined,
				q: flSearchQuery.value || undefined,
				page: flOptions.value.page,
				itemsPerPage: flOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		flDeposits.value = data.transactions || [];
		flTotalDeposits.value = data.total || 0;
		flOptions.value.page = data.page || 1;
		flStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("Forcelab deposit fetch error:", err);
	} finally {
		flIsLoading.value = false;
	}
};

watch(activeTab, (val) => {
	if (val === "forcelab") fetchFlDeposits();
	if (val === "meeldev") fetchMdDeposits();
	if (val === "galaxypay") fetchGpDeposits();
	if (val === "fluxkripto") fetchFluxDeposits();
	if (val === "xpayments") fetchXpDeposits();
});
watch([flSearchQuery, flStatusFilter, () => flOptions.value.page], fetchFlDeposits);

const fetchMdDeposits = async () => {
	mdIsLoading.value = true;
	try {
		const res = await axios.get("/admin/meeldev/transactions", {
			params: {
				type: "deposit",
				status: mdStatusFilter.value || undefined,
				q: mdSearchQuery.value || undefined,
				page: mdOptions.value.page,
				itemsPerPage: mdOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		mdDeposits.value = data.transactions || [];
		mdTotalDeposits.value = data.total || 0;
		mdOptions.value.page = data.page || 1;
		mdStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("MeelDev deposit fetch error:", err);
	} finally {
		mdIsLoading.value = false;
	}
};

watch([mdSearchQuery, mdStatusFilter, () => mdOptions.value.page], fetchMdDeposits);

const fetchGpDeposits = async () => {
	gpIsLoading.value = true;
	try {
		const res = await axios.get("/admin/galaxypay/transactions", {
			params: {
				type: "deposit",
				method: gpMethodFilter.value || undefined,
				status: gpStatusFilter.value || undefined,
				q: gpSearchQuery.value || undefined,
				page: gpOptions.value.page,
				itemsPerPage: gpOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		gpDeposits.value = data.transactions || [];
		gpTotalDeposits.value = data.total || 0;
		gpOptions.value.page = data.page || 1;
		gpStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("GalaxyPay deposit fetch error:", err);
	} finally {
		gpIsLoading.value = false;
	}
};

watch(
	[gpSearchQuery, gpStatusFilter, gpMethodFilter, () => gpOptions.value.page],
	fetchGpDeposits,
);

const fetchFluxDeposits = async () => {
	fluxIsLoading.value = true;
	try {
		const res = await axios.get("/admin/fluxkripto/transactions", {
			params: {
				type: "deposit",
				status: fluxStatusFilter.value || undefined,
				currency: fluxCurrencyFilter.value || undefined,
				q: fluxSearchQuery.value || undefined,
				page: fluxOptions.value.page,
				itemsPerPage: fluxOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		fluxDeposits.value = data.transactions || [];
		fluxTotalDeposits.value = data.total || 0;
		fluxOptions.value.page = data.page || 1;
		fluxStats.value = data.stats || {
			totalAmount: 0,
			last24hAmount: 0,
			monthlyAmount: 0,
		};
	} catch (err) {
		console.error("FluxKripto deposit fetch error:", err);
	} finally {
		fluxIsLoading.value = false;
	}
};

const fetchXpDeposits = async () => {
	xpIsLoading.value = true;
	try {
		const res = await axios.get("/admin/xpayments/transactions", {
			params: {
				type: "deposit",
				status: xpStatusFilter.value || undefined,
				q: xpSearchQuery.value || undefined,
				page: xpOptions.value.page,
				itemsPerPage: xpOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		xpDeposits.value = data.transactions || [];
		xpTotalDeposits.value = data.total || 0;
		xpOptions.value.page = data.page || 1;
		xpStats.value = data.stats || {
			totalAmount: 0,
			last24hAmount: 0,
			monthlyAmount: 0,
		};
	} catch (err) {
		console.error("XPayment deposit fetch error:", err);
	} finally {
		xpIsLoading.value = false;
	}
};

watch([fluxSearchQuery, fluxStatusFilter, fluxCurrencyFilter], () => {
	fluxOptions.value.page = 1;
	if (activeTab.value === "fluxkripto") fetchFluxDeposits();
});
watch(
	() => [fluxOptions.value.page, fluxOptions.value.itemsPerPage],
	() => {
		if (activeTab.value === "fluxkripto") fetchFluxDeposits();
	},
);
watch([xpSearchQuery, xpStatusFilter], () => {
	xpOptions.value.page = 1;
	if (activeTab.value === "xpayments") fetchXpDeposits();
});
watch(
	() => [xpOptions.value.page, xpOptions.value.itemsPerPage],
	() => {
		if (activeTab.value === "xpayments") fetchXpDeposits();
	},
);

const copyToClipboard = async (text) => {
	try {
		await navigator.clipboard.writeText(text);
	} catch (err) {
		console.error("Clipboard copy failed:", err);
	}
};

const openDetails = (tx) => {
	selectedTx.value = tx;
	showModal.value = true;
};

const openFlDetails = (tx) => {
	flSelectedTx.value = tx;
	flShowModal.value = true;
};

const openMdDetails = (tx) => {
	mdSelectedTx.value = tx;
	mdShowModal.value = true;
};

const openGpDetails = (tx) => {
	gpSelectedTx.value = tx;
	gpShowModal.value = true;
};

const openFluxDetails = (tx) => {
	fluxSelectedTx.value = tx;
	fluxShowModal.value = true;
};

const openXpDetails = (tx) => {
	xpSelectedTx.value = tx;
	xpShowModal.value = true;
};

const formatDateTime = (value) =>
	value ? new Date(value).toLocaleString("tr-TR") : "—";

// TRY formatla
const formatTRY = (value) => {
	return (
		Number(value || 0).toLocaleString("tr-TR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₺"
	);
};

const flStatusColor = (status) => {
	const map = {
		approved: "success",
		pending: "warning",
		processing: "info",
		rejected: "error",
		cancelled: "error",
		failed: "error",
		expired: "secondary",
	};
	return map[status] || "default";
};
</script>

<template>
	<div>
		<VTabs v-model="activeTab" class="mb-4">
			<VTab value="all">Tümü</VTab>
			<VTab value="crypto">Kripto Yatırımlar</VTab>
			<VTab v-if="providerEnabled.forcelab" value="forcelab">Forcelab Finance</VTab>
			<VTab v-if="providerEnabled.meeldev" value="meeldev">MeelDev</VTab>
			<VTab v-if="providerEnabled.galaxypay" value="galaxypay">GalaxyPay</VTab>
			<VTab v-if="providerEnabled.fluxkripto" value="fluxkripto">FluxKripto</VTab>
			<VTab v-if="providerEnabled.xpayments" value="xpayments">XPayment H2H</VTab>
		</VTabs>

		<UnifiedPaymentTable v-if="activeTab === 'all'" type="deposit" />

		<!-- ====== CRYPTO TAB ====== -->
		<section v-if="activeTab === 'crypto'">
			<!-- Stats Cards -->
			<VRow class="mb-4">
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText
							class="d-flex justify-space-between align-center"
						>
							<div>
								<h6 class="text-h6">
									{{ t("finance.deposit.total") }}
								</h6>
								<h4>{{ formatTRY(stats.totalAmount) }}</h4>
							</div>
							<VAvatar
								color="primary"
								variant="tonal"
								icon="tabler-cash"
							/>
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText
							class="d-flex justify-space-between align-center"
						>
							<div>
								<h6 class="text-h6">
									{{ t("finance.deposit.daily") }}
								</h6>
								<h4>{{ formatTRY(stats.last24hAmount) }}</h4>
							</div>
							<VAvatar
								color="success"
								variant="tonal"
								icon="tabler-clock"
							/>
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText
							class="d-flex justify-space-between align-center"
						>
							<div>
								<h6 class="text-h6">
									{{ t("finance.deposit.monthly") }}
								</h6>
								<h4>{{ formatTRY(stats.monthlyAmount) }}</h4>
							</div>
							<VAvatar
								color="info"
								variant="tonal"
								icon="tabler-calendar"
							/>
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<!-- Transactions Table -->
			<VCard id="deposit-list">
				<VCardTitle>{{ t("finance.deposit.title") }}</VCardTitle>
				<VCardText>
					<VRow class="mb-4">
						<VCol cols="12" sm="6">
							<AppTextField
								v-model="searchQuery"
								:label="t('finance.searchUser')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="6">
							<AppTextField
								v-model="dateRange"
								:label="t('finance.dateRange')"
								density="compact"
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model="selectedRows"
						v-model:items-per-page="options.itemsPerPage"
						v-model:page="options.page"
						:items="deposits"
						:items-length="totalDeposits"
						:headers="headers"
						:loading="isLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center">
								<VAvatar size="32" class="me-2">
									<span>{{
										avatarText(
											item.raw.user?.username || "U"
										)
									}}</span>
								</VAvatar>
								<div>
									<div class="font-weight-medium">
										{{ item.raw.user?.username || "-" }}
									</div>
									<small>ID: {{ item.raw.user?._id }}</small>
								</div>
							</div>
						</template>

						<template #item.txId="{ item }">
							<div class="d-flex align-center">
								<span class="me-2">{{
									item.raw.data?.transaction || "—"
								}}</span>
								<VBtn
									size="x-small"
									variant="tonal"
									icon
									@click="
										copyToClipboard(
											item.raw.data?.transaction || ''
										)
									"
								>
									<VIcon size="16" icon="tabler-copy" />
								</VBtn>
							</div>
						</template>

						<template #item.currency="{ item }">
							{{
								item.raw.data?.currency ||
								item.raw.data?.fiatcurrency ||
								"—"
							}}
						</template>

						<template #item.amount="{ item }">
							{{ formatTRY(item.raw.amount) }}
						</template>

						<template #item.state="{ item }">
							<VChip
								:color="
									item.raw.state === 'completed'
										? 'success'
										: 'warning'
								"
								label
							>
								{{ item.raw.state }}
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
									{{ paginationMeta(options, totalDeposits) }}
								</p>
								<VPagination
									v-model="options.page"
									:length="
										Math.ceil(
											totalDeposits / options.itemsPerPage
										)
									"
									:total-visible="5"
								/>
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<!-- Crypto Detail Modal -->
			<VDialog v-model="showModal" max-width="600">
				<VCard>
					<VCardTitle>{{ t("finance.deposit.details") }}</VCardTitle>
					<VCardText v-if="selectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong>
								{{ selectedTx.user?.username || "-" }} <br />
								<strong>{{ t("finance.email") }}:</strong>
								{{ selectedTx.user?.email || "—" }} <br />
								<strong>{{ t("finance.phone") }}:</strong>
								{{ selectedTx.user?.phone || "—" }}
							</VCol>

							<VCol cols="12">
								<strong
									>{{ t("finance.deposit.txId") }}:</strong
								>
								<span class="me-2">{{
									selectedTx.data?.transaction || "—"
								}}</span>
								<VBtn
									size="x-small"
									variant="tonal"
									icon
									@click="
										copyToClipboard(
											selectedTx.data?.transaction || ''
										)
									"
								>
									<VIcon size="16" icon="tabler-copy" />
								</VBtn>
							</VCol>

							<VCol cols="6">
								<strong>{{ t("finance.currency") }}:</strong>
								{{
									selectedTx.data?.currency ||
									selectedTx.data?.fiatcurrency ||
									"—"
								}}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.amount") }}:</strong> ${{
									Number(selectedTx.amount).toFixed(2)
								}}
							</VCol>

							<VCol cols="6">
								<strong>{{ t("finance.state") }}:</strong>
								<VChip
									:color="
										selectedTx.state === 'completed'
											? 'success'
											: 'warning'
									"
									size="small"
									label
								>
									{{ selectedTx.state }}
								</VChip>
							</VCol>

							<VCol cols="6">
								<strong>{{ t("finance.date") }}:</strong>
								{{
									new Date(
										selectedTx.createdAt
									).toLocaleString()
								}}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.updatedAt") }}:</strong>
								{{
									new Date(
										selectedTx.updatedAt
									).toLocaleString()
								}}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="showModal = false">{{
							t("finance.close")
						}}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== FORCELAB TAB ====== -->
		<section v-if="activeTab === 'forcelab'">
			<VRow class="mb-4">
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.total") }}</h6>
								<h4>{{ formatTRY(flStats.totalAmount) }}</h4>
							</div>
							<VAvatar color="primary" variant="tonal" icon="tabler-cash" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.daily") }}</h6>
								<h4>{{ formatTRY(flStats.last24hAmount) }}</h4>
							</div>
							<VAvatar color="success" variant="tonal" icon="tabler-clock" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.monthly") }}</h6>
								<h4>{{ formatTRY(flStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>Forcelab Finance Yatırımlar</VCardTitle>
				<VCardText>
					<VRow class="mb-4">
						<VCol cols="12" sm="6">
							<AppTextField
								v-model="flSearchQuery"
								:label="t('finance.searchUser')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="6">
							<AppSelect
								v-model="flStatusFilter"
								:items="[
									{ title: 'Beklemede', value: 'pending' },
									{ title: 'İşleniyor', value: 'processing' },
									{ title: 'Onaylandı', value: 'approved' },
									{ title: 'Reddedildi', value: 'rejected' },
									{ title: 'İptal', value: 'cancelled' },
								]"
								clearable
								label="Durum Filtrele"
								density="compact"
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:items-per-page="flOptions.itemsPerPage"
						v-model:page="flOptions.page"
						:items="flDeposits"
						:items-length="flTotalDeposits"
						:headers="flHeaders"
						:loading="flIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center">
								<VAvatar size="32" class="me-2">
									<span>{{ avatarText(item.raw.user?.username || "U") }}</span>
								</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "-" }}</div>
									<small>ID: {{ item.raw.user?._id }}</small>
								</div>
							</div>
						</template>

						<template #item.providerSlug="{ item }">
							{{ formatTransactionProvider(item.raw) }}
						</template>

						<template #item.currency="{ item }">
							{{ item.raw.currency || "TRY" }}
						</template>

						<template #item.amount="{ item }">
							{{ formatTRY(item.raw.amount) }}
						</template>

						<template #item.status="{ item }">
							<VChip :color="flStatusColor(item.raw.status)" label>
								{{ item.raw.status }}
							</VChip>
						</template>

						<template #item.createdAt="{ item }">
							{{ new Date(item.raw.createdAt).toLocaleString() }}
						</template>

						<template #item.actions="{ item }">
							<VBtn size="small" color="primary" @click="openFlDetails(item.raw)">
								{{ t("finance.view") }}
							</VBtn>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">
									{{ paginationMeta(flOptions, flTotalDeposits) }}
								</p>
								<VPagination
									v-model="flOptions.page"
									:length="Math.ceil(flTotalDeposits / flOptions.itemsPerPage)"
									:total-visible="5"
								/>
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<!-- Forcelab Detail Modal -->
			<VDialog v-model="flShowModal" max-width="600">
				<VCard>
					<VCardTitle>Forcelab Yatırım Detayı</VCardTitle>
					<VCardText v-if="flSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong>
								{{ flSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong>
								{{ flSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong>
								{{ flSelectedTx.user?.phone || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>Provider:</strong> {{ formatTransactionProvider(flSelectedTx) }}
							</VCol>
							<VCol cols="6">
								<strong>UUID:</strong> {{ flSelectedTx.uuid || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.amount") }}:</strong> {{ formatTRY(flSelectedTx.amount) }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.currency") }}:</strong> {{ flSelectedTx.currency }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.state") }}:</strong>
								<VChip :color="flStatusColor(flSelectedTx.status)" size="small" label>
									{{ flSelectedTx.status }}
								</VChip>
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.date") }}:</strong>
								{{ new Date(flSelectedTx.createdAt).toLocaleString() }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="flShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== MEELDEV TAB ====== -->
		<section v-if="activeTab === 'meeldev'">
			<VRow class="mb-4">
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.total") }}</h6>
								<h4>{{ formatTRY(mdStats.totalAmount) }}</h4>
							</div>
							<VAvatar color="primary" variant="tonal" icon="tabler-cash" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.daily") }}</h6>
								<h4>{{ formatTRY(mdStats.last24hAmount) }}</h4>
							</div>
							<VAvatar color="success" variant="tonal" icon="tabler-clock" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.monthly") }}</h6>
								<h4>{{ formatTRY(mdStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>MeelDev Yatırımlar</VCardTitle>
				<VCardText>
					<VRow class="mb-4">
						<VCol cols="12" sm="6">
							<AppTextField
								v-model="mdSearchQuery"
								:label="t('finance.searchUser')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="6">
							<AppSelect
								v-model="mdStatusFilter"
								:items="[
									{ title: 'Beklemede', value: 'pending' },
									{ title: 'İşleniyor', value: 'processing' },
									{ title: 'Onaylandı', value: 'approved' },
									{ title: 'Reddedildi', value: 'rejected' },
									{ title: 'İptal', value: 'cancelled' },
								]"
								clearable
								label="Durum Filtrele"
								density="compact"
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:items-per-page="mdOptions.itemsPerPage"
						v-model:page="mdOptions.page"
						:items="mdDeposits"
						:items-length="mdTotalDeposits"
						:headers="mdHeaders"
						:loading="mdIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center">
								<VAvatar size="32" class="me-2">
									<span>{{ avatarText(item.raw.user?.username || "U") }}</span>
								</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "-" }}</div>
									<small>ID: {{ item.raw.user?._id }}</small>
								</div>
							</div>
						</template>

						<template #item.processNo="{ item }">
							{{ item.raw.processNo || "—" }}
						</template>

						<template #item.currency="{ item }">
							{{ item.raw.currency || "TRY" }}
						</template>

						<template #item.amount="{ item }">
							{{ formatTRY(item.raw.amount) }}
						</template>

						<template #item.status="{ item }">
							<VChip :color="flStatusColor(item.raw.status)" label>
								{{ item.raw.status }}
							</VChip>
						</template>

						<template #item.createdAt="{ item }">
							{{ new Date(item.raw.createdAt).toLocaleString() }}
						</template>

						<template #item.actions="{ item }">
							<VBtn size="small" color="primary" @click="openMdDetails(item.raw)">
								{{ t("finance.view") }}
							</VBtn>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">
									{{ paginationMeta(mdOptions, mdTotalDeposits) }}
								</p>
								<VPagination
									v-model="mdOptions.page"
									:length="Math.ceil(mdTotalDeposits / mdOptions.itemsPerPage)"
									:total-visible="5"
								/>
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<!-- MeelDev Detail Modal -->
			<VDialog v-model="mdShowModal" max-width="600">
				<VCard>
					<VCardTitle>MeelDev Yatırım Detayı</VCardTitle>
					<VCardText v-if="mdSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong>
								{{ mdSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong>
								{{ mdSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong>
								{{ mdSelectedTx.user?.phone || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>Transaction ID:</strong> {{ mdSelectedTx.transactionId || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>Process No:</strong> {{ mdSelectedTx.processNo || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.amount") }}:</strong> {{ formatTRY(mdSelectedTx.amount) }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.currency") }}:</strong> {{ mdSelectedTx.currency }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.state") }}:</strong>
								<VChip :color="flStatusColor(mdSelectedTx.status)" size="small" label>
									{{ mdSelectedTx.status }}
								</VChip>
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.date") }}:</strong>
								{{ new Date(mdSelectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="12" v-if="mdSelectedTx.paymentUrl">
								<strong>Payment URL:</strong>
								<a :href="mdSelectedTx.paymentUrl" target="_blank">{{ mdSelectedTx.paymentUrl }}</a>
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="mdShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== GALAXYPAY TAB ====== -->
		<section v-if="activeTab === 'galaxypay'">
			<VRow class="mb-4">
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.total") }}</h6>
								<h4>{{ formatTRY(gpStats.totalAmount) }}</h4>
							</div>
							<VAvatar color="primary" variant="tonal" icon="tabler-cash" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.daily") }}</h6>
								<h4>{{ formatTRY(gpStats.last24hAmount) }}</h4>
							</div>
							<VAvatar color="success" variant="tonal" icon="tabler-clock" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.deposit.monthly") }}</h6>
								<h4>{{ formatTRY(gpStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>GalaxyPay Yatırımlar</VCardTitle>
				<VCardText>
					<VRow class="mb-4">
						<VCol cols="12" sm="4">
							<AppTextField
								v-model="gpSearchQuery"
								:label="t('finance.searchUser')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="4">
							<AppSelect
								v-model="gpStatusFilter"
								:items="[
									{ title: 'Beklemede', value: 'pending' },
									{ title: 'İşleniyor', value: 'processing' },
									{ title: 'Onaylandı', value: 'approved' },
									{ title: 'Reddedildi', value: 'rejected' },
									{ title: 'İptal', value: 'cancelled' },
								]"
								clearable
								label="Durum Filtrele"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="4">
							<AppSelect
								v-model="gpMethodFilter"
								:items="[
									{ title: 'Lobby', value: 'lobby' },
									{ title: 'Banka Transferi', value: 'bank-transfer' },
									{ title: 'Papara', value: 'papara' },
								]"
								clearable
								label="Method Filtrele"
								density="compact"
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:items-per-page="gpOptions.itemsPerPage"
						v-model:page="gpOptions.page"
						:items="gpDeposits"
						:items-length="gpTotalDeposits"
						:headers="gpHeaders"
						:loading="gpIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center">
								<VAvatar size="32" class="me-2">
									<span>{{ avatarText(item.raw.user?.username || "U") }}</span>
								</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "-" }}</div>
									<small>ID: {{ item.raw.user?._id }}</small>
								</div>
							</div>
						</template>

						<template #item.method="{ item }">
							{{ galaxyPayMethodLabel(item.raw.method) }}
						</template>

						<template #item.paymentId="{ item }">
							<div class="d-flex align-center">
								<span class="me-2">{{ item.raw.paymentId || item.raw.externalTransactionId || "—" }}</span>
								<VBtn
									v-if="item.raw.paymentId || item.raw.externalTransactionId"
									size="x-small"
									variant="tonal"
									icon
									@click="copyToClipboard(item.raw.paymentId || item.raw.externalTransactionId)"
								>
									<VIcon size="16" icon="tabler-copy" />
								</VBtn>
							</div>
						</template>

						<template #item.currency="{ item }">
							{{ item.raw.currency || "TRY" }}
						</template>

						<template #item.amount="{ item }">
							{{ formatTRY(item.raw.amount) }}
						</template>

						<template #item.status="{ item }">
							<VChip :color="flStatusColor(item.raw.status)" label>
								{{ item.raw.status }}
							</VChip>
						</template>

						<template #item.createdAt="{ item }">
							{{ new Date(item.raw.createdAt).toLocaleString() }}
						</template>

						<template #item.actions="{ item }">
							<VBtn size="small" color="primary" @click="openGpDetails(item.raw)">
								{{ t("finance.view") }}
							</VBtn>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">
									{{ paginationMeta(gpOptions, gpTotalDeposits) }}
								</p>
								<VPagination
									v-model="gpOptions.page"
									:length="Math.ceil(gpTotalDeposits / gpOptions.itemsPerPage)"
									:total-visible="5"
								/>
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="gpShowModal" max-width="650">
				<VCard>
					<VCardTitle>GalaxyPay Yatırım Detayı</VCardTitle>
					<VCardText v-if="gpSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong>
								{{ gpSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong>
								{{ gpSelectedTx.user?.local?.email || gpSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong>
								{{ gpSelectedTx.user?.phone || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>External ID:</strong> {{ gpSelectedTx.externalTransactionId || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>Payment ID:</strong> {{ gpSelectedTx.paymentId || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>Method:</strong> {{ galaxyPayMethodLabel(gpSelectedTx.method) }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.amount") }}:</strong> {{ formatTRY(gpSelectedTx.amount) }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.currency") }}:</strong> {{ gpSelectedTx.currency || "TRY" }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.state") }}:</strong>
								<VChip :color="flStatusColor(gpSelectedTx.status)" size="small" label>
									{{ gpSelectedTx.status }}
								</VChip>
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.date") }}:</strong>
								{{ new Date(gpSelectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="12" v-if="gpSelectedTx.paymentUrl">
								<strong>Payment URL:</strong>
								<a :href="gpSelectedTx.paymentUrl" target="_blank">{{ gpSelectedTx.paymentUrl }}</a>
							</VCol>
							<VCol cols="12" v-if="gpSelectedTx.rejectionReason">
								<strong>Red Sebebi:</strong> {{ gpSelectedTx.rejectionReason }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="gpShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== FLUXKRIPTO TAB ====== -->
		<section v-if="activeTab === 'fluxkripto'">
			<VCard class="mb-4" variant="outlined">
				<VCardText class="d-flex flex-wrap align-center justify-space-between ga-4">
					<div>
						<div class="text-overline text-medium-emphasis">NATIVE CRYPTO RAIL</div>
						<h2 class="text-h5">FluxKripto Yatırımları</h2>
					</div>
					<div class="d-flex flex-wrap ga-2">
						<VChip color="primary" variant="tonal">Toplam {{ formatTRY(fluxStats.totalAmount) }}</VChip>
						<VChip color="success" variant="tonal">24 saat {{ formatTRY(fluxStats.last24hAmount) }}</VChip>
						<VChip color="info" variant="tonal">Bu ay {{ formatTRY(fluxStats.monthlyAmount) }}</VChip>
					</div>
				</VCardText>
			</VCard>

			<VCard>
				<VCardText>
					<VRow class="mb-2">
						<VCol cols="12" md="5">
							<AppTextField v-model="fluxSearchQuery" label="Kullanıcı veya işlem no ara" density="compact" clearable />
						</VCol>
						<VCol cols="12" sm="6" md="4">
							<AppSelect
								v-model="fluxStatusFilter"
								:items="['pending', 'processing', 'approved', 'rejected', 'cancelled', 'failed']"
								label="Durum"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" sm="6" md="3">
							<AppSelect v-model="fluxCurrencyFilter" :items="['TRX', 'USDT']" label="Kripto" density="compact" clearable />
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:items-per-page="fluxOptions.itemsPerPage"
						v-model:page="fluxOptions.page"
						:headers="fluxHeaders"
						:items="fluxDeposits"
						:items-length="fluxTotalDeposits"
						:loading="fluxIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center ga-2">
								<VAvatar size="32" color="primary" variant="tonal">
									{{ avatarText(item.raw.user?.username || "U") }}
								</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "—" }}</div>
									<div class="text-caption text-medium-emphasis">{{ item.raw.user?.local?.email || item.raw.user?.phone || "—" }}</div>
								</div>
							</div>
						</template>
						<template #item.externalTransactionId="{ item }">
							<code>{{ item.raw.externalTransactionId || "—" }}</code>
						</template>
						<template #item.amount="{ item }">{{ formatTRY(item.raw.amount) }}</template>
						<template #item.status="{ item }">
							<VChip :color="flStatusColor(item.raw.status)" size="small" label>{{ item.raw.status }}</VChip>
						</template>
						<template #item.createdAt="{ item }">{{ formatDateTime(item.raw.createdAt) }}</template>
						<template #item.actions="{ item }">
							<VBtn size="small" variant="tonal" @click="openFluxDetails(item.raw)">{{ t("finance.view") }}</VBtn>
						</template>
						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(fluxOptions, fluxTotalDeposits) }}</p>
								<VPagination v-model="fluxOptions.page" :length="Math.ceil(fluxTotalDeposits / fluxOptions.itemsPerPage)" :total-visible="5" />
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="fluxShowModal" max-width="680">
				<VCard>
					<VCardTitle>FluxKripto yatırım detayı</VCardTitle>
					<VCardText v-if="fluxSelectedTx">
						<VRow>
							<VCol cols="12" md="6"><strong>Kullanıcı:</strong> {{ fluxSelectedTx.user?.username || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>İşlem no:</strong> {{ fluxSelectedTx.externalTransactionId || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Order ID:</strong> {{ fluxSelectedTx.orderId || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Finance ID:</strong> {{ fluxSelectedTx.financeId || "—" }}</VCol>
							<VCol cols="12" md="4"><strong>Uygulanan tutar:</strong> {{ formatTRY(fluxSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="4"><strong>Talep edilen:</strong> {{ formatTRY(fluxSelectedTx.requestedAmount ?? fluxSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="4"><strong>Provider tutarı:</strong> {{ fluxSelectedTx.providerAmount == null ? "—" : formatTRY(fluxSelectedTx.providerAmount) }}</VCol>
							<VCol cols="12" md="4"><strong>Kripto:</strong> {{ fluxSelectedTx.cryptoAmount ?? "—" }} {{ fluxSelectedTx.currency }}</VCol>
							<VCol cols="12" md="4"><strong>Kur:</strong> {{ fluxSelectedTx.rate ?? "—" }}</VCol>
							<VCol cols="12"><strong>Yatırım adresi:</strong> <code>{{ fluxSelectedTx.walletAddress || "—" }}</code></VCol>
							<VCol cols="12" md="6"><strong>Durum:</strong> {{ fluxSelectedTx.status }}</VCol>
							<VCol cols="12" md="6"><strong>Provider durumu:</strong> {{ fluxSelectedTx.providerStatus || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Oluşturulma:</strong> {{ formatDateTime(fluxSelectedTx.createdAt) }}</VCol>
							<VCol cols="12" md="6"><strong>Son kullanım:</strong> {{ formatDateTime(fluxSelectedTx.expiresAt) }}</VCol>
							<VCol v-if="fluxSelectedTx.rejectionReason" cols="12"><strong>Red sebebi:</strong> {{ fluxSelectedTx.rejectionReason }}</VCol>
						</VRow>

						<VAlert
							v-if="fluxSelectedTx.upstreamDiagnostic?.code"
							color="warning"
							variant="tonal"
							icon="mdi-shield-alert-outline"
							class="mt-4"
						>
							<div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-3">
								<div>
									<div class="font-weight-bold">Upstream erişim tanılaması</div>
									<div class="text-caption">Yalnız operasyon ve provider destek görüşmesi içindir; son kullanıcıyla paylaşmayın.</div>
								</div>
								<VChip color="warning" size="small" label>
									{{ fluxSelectedTx.upstreamDiagnostic.code }}
								</VChip>
							</div>
							<VRow dense>
								<VCol cols="12" sm="6"><strong>HTTP status:</strong> {{ fluxSelectedTx.upstreamDiagnostic.status ?? "—" }}</VCol>
								<VCol cols="12" sm="6"><strong>CF-Ray:</strong> <code>{{ fluxSelectedTx.upstreamDiagnostic.cfRay || "—" }}</code></VCol>
								<VCol cols="12" sm="6"><strong>API host:</strong> {{ fluxSelectedTx.upstreamDiagnostic.apiHost || "—" }}</VCol>
								<VCol cols="12" sm="6"><strong>Site host:</strong> {{ fluxSelectedTx.upstreamDiagnostic.siteHost || "—" }}</VCol>
								<VCol cols="12" sm="6"><strong>API key izi:</strong> <code>{{ fluxSelectedTx.upstreamDiagnostic.apiKeyFingerprint || "—" }}</code></VCol>
								<VCol cols="12" sm="6"><strong>Proxy:</strong> {{ fluxSelectedTx.upstreamDiagnostic.proxyConfigured ? "Yapılandırılmış" : "Yok" }}</VCol>
							</VRow>
						</VAlert>
					</VCardText>
					<VCardActions><VSpacer /><VBtn variant="text" @click="fluxShowModal = false">Kapat</VBtn></VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== XPAYMENT TAB ====== -->
		<section v-if="activeTab === 'xpayments'">
			<VCard class="mb-4" variant="outlined">
				<VCardText class="d-flex flex-wrap align-center justify-space-between ga-4">
					<div>
						<div class="text-overline text-medium-emphasis">H2H BANK RAIL</div>
						<h2 class="text-h5">XPayment Yatırımları</h2>
					</div>
					<div class="d-flex flex-wrap ga-2">
						<VChip color="primary" variant="tonal">Toplam {{ formatTRY(xpStats.totalAmount) }}</VChip>
						<VChip color="success" variant="tonal">24 saat {{ formatTRY(xpStats.last24hAmount) }}</VChip>
						<VChip color="info" variant="tonal">Bu ay {{ formatTRY(xpStats.monthlyAmount) }}</VChip>
					</div>
				</VCardText>
			</VCard>

			<VCard>
				<VCardText>
					<VRow class="mb-2">
						<VCol cols="12" md="7">
							<AppTextField v-model="xpSearchQuery" label="Kullanıcı veya işlem no ara" density="compact" clearable />
						</VCol>
						<VCol cols="12" md="5">
							<AppSelect
								v-model="xpStatusFilter"
								:items="['pending', 'processing', 'approved', 'rejected', 'cancelled', 'failed']"
								label="Durum"
								density="compact"
								clearable
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model:items-per-page="xpOptions.itemsPerPage"
						v-model:page="xpOptions.page"
						:headers="xpHeaders"
						:items="xpDeposits"
						:items-length="xpTotalDeposits"
						:loading="xpIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center ga-2">
								<VAvatar size="32" color="info" variant="tonal">{{ avatarText(item.raw.user?.username || "U") }}</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "—" }}</div>
									<div class="text-caption text-medium-emphasis">{{ item.raw.user?.local?.email || item.raw.user?.phone || "—" }}</div>
								</div>
							</div>
						</template>
						<template #item.externalTransactionId="{ item }"><code>{{ item.raw.externalTransactionId || "—" }}</code></template>
						<template #item.account="{ item }">
							<div>{{ item.raw.account?.bankName || "—" }}</div>
							<div class="text-caption text-medium-emphasis">{{ item.raw.account?.methodType || "—" }}</div>
						</template>
						<template #item.amount="{ item }">{{ formatTRY(item.raw.amount) }}</template>
						<template #item.status="{ item }"><VChip :color="flStatusColor(item.raw.status)" size="small" label>{{ item.raw.status }}</VChip></template>
						<template #item.createdAt="{ item }">{{ formatDateTime(item.raw.createdAt) }}</template>
						<template #item.actions="{ item }"><VBtn size="small" variant="tonal" @click="openXpDetails(item.raw)">{{ t("finance.view") }}</VBtn></template>
						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(xpOptions, xpTotalDeposits) }}</p>
								<VPagination v-model="xpOptions.page" :length="Math.ceil(xpTotalDeposits / xpOptions.itemsPerPage)" :total-visible="5" />
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="xpShowModal" max-width="680">
				<VCard>
					<VCardTitle>XPayment H2H yatırım detayı</VCardTitle>
					<VCardText v-if="xpSelectedTx">
						<VRow>
							<VCol cols="12" md="6"><strong>Kullanıcı:</strong> {{ xpSelectedTx.user?.username || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>İşlem no:</strong> {{ xpSelectedTx.externalTransactionId || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Finance ID:</strong> {{ xpSelectedTx.financeId || "—" }}</VCol>
							<VCol cols="12" md="4"><strong>Uygulanan tutar:</strong> {{ formatTRY(xpSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="4"><strong>Talep edilen:</strong> {{ formatTRY(xpSelectedTx.requestedAmount ?? xpSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="4"><strong>Provider tutarı:</strong> {{ xpSelectedTx.providerAmount == null ? "—" : formatTRY(xpSelectedTx.providerAmount) }}</VCol>
							<VCol cols="12" md="6"><strong>Banka:</strong> {{ xpSelectedTx.account?.bankName || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Hesap sahibi:</strong> {{ xpSelectedTx.account?.accountHolderName || "—" }}</VCol>
							<VCol cols="12"><strong>IBAN:</strong> <code>{{ xpSelectedTx.account?.iban || "—" }}</code></VCol>
							<VCol cols="12" md="6"><strong>Transfer türü:</strong> {{ xpSelectedTx.account?.methodType || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Durum:</strong> {{ xpSelectedTx.status }}</VCol>
							<VCol cols="12" md="6"><strong>Provider durumu:</strong> {{ xpSelectedTx.providerStatus || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Oluşturulma:</strong> {{ formatDateTime(xpSelectedTx.createdAt) }}</VCol>
						</VRow>
					</VCardText>
					<VCardActions><VSpacer /><VBtn variant="text" @click="xpShowModal = false">Kapat</VBtn></VCardActions>
				</VCard>
			</VDialog>
		</section>
	</div>
</template>
