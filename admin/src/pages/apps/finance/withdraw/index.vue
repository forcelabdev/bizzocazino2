<script setup>
import { paginationMeta } from "@/@fake-db/utils";
import UnifiedPaymentTable from "@/components/finance/UnifiedPaymentTable.vue";
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames";
import { useWithdrawStore } from "@/pages/apps/finance/withdraw/useWithdrawStore";
import { avatarText } from "@core/utils/formatters";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import axios from "@axios";
import ability from "@/plugins/casl/ability";

const { t } = useI18n();
const { formatProviderDisplayName, loadProviderDisplayNames } =
	useProviderDisplayNames();
const canManageFinanceWithdraws = computed(
	() => ability.can("manage", "finance.withdraws") || ability.can("manage", "finance"),
);

const withdrawStore = useWithdrawStore();

// ---- Active Tab ----
const activeTab = ref("all");

// ---- Crypto Withdraw State ----
const searchQuery = ref("");
const dateRange = ref("");
const selectedState = ref(null);
const withdraws = ref([]);
const totalWithdraws = ref(0);
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

const headers = [
	{ title: t("finance.user"), key: "user" },
	{ title: t("finance.withdraw.receiver"), key: "receiver" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "state" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

const fetchWithdraws = () => {
	isLoading.value = true;
	withdrawStore
		.fetchWithdraws({
			search: searchQuery.value,
			startDate: dateRange.value?.split("to")[0]?.trim(),
			endDate: dateRange.value?.split("to")[1]?.trim(),
			page: options.value.page,
			limit: options.value.itemsPerPage,
			state: selectedState.value,
		})
		.then((res) => {
			const response = res?.data?.data || {};
			withdraws.value = response.transactions || [];
			totalWithdraws.value = response.total || 0;
			options.value.page = response.page || 1;
			stats.value = response.stats || {
				totalAmount: 0,
				last24hAmount: 0,
				monthlyAmount: 0,
			};
		})
		.finally(() => (isLoading.value = false));
};

watchEffect(fetchWithdraws);
watch([searchQuery, dateRange, selectedState], fetchWithdraws);

// ---- Forcelab Withdraw State ----
const flSearchQuery = ref("");
const flStatusFilter = ref(null);
const flWithdraws = ref([]);
const flTotalWithdraws = ref(0);
const flStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const flIsLoading = ref(false);
const flShowModal = ref(false);
const flSelectedTx = ref(null);

const formatTransactionProvider = (transaction) =>
	formatProviderDisplayName(
		transaction?.providerSlug,
		transaction?.providerName || transaction?.providerSlug,
	);

// ---- MeelDev Withdraw State ----
const mdSearchQuery = ref("");
const mdStatusFilter = ref(null);
const mdWithdraws = ref([]);
const mdTotalWithdraws = ref(0);
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
	{ title: "Banka", key: "bankInfo" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// ---- GalaxyPay Withdraw State ----
const gpSearchQuery = ref("");
const gpStatusFilter = ref(null);
const gpMethodFilter = ref(null);
const gpWithdraws = ref([]);
const gpTotalWithdraws = ref(0);
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
	{ title: "Alıcı", key: "destination" },
	{ title: t("finance.currency"), key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("finance.view"), key: "actions", sortable: false },
];

// ---- FluxKripto Native Withdraw State ----
const fluxSearchQuery = ref("");
const fluxStatusFilter = ref(null);
const fluxCurrencyFilter = ref(null);
const fluxWithdraws = ref([]);
const fluxTotalWithdraws = ref(0);
const fluxStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const fluxIsLoading = ref(false);
const fluxShowModal = ref(false);
const fluxSelectedTx = ref(null);
const fluxOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [] });
const fluxHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "Alıcı cüzdan", key: "receiverWallet" },
	{ title: "Kripto", key: "currency" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: "İşlem", key: "actions", sortable: false },
];

// ---- XPayment Withdraw State ----
const xpSearchQuery = ref("");
const xpStatusFilter = ref(null);
const xpWithdraws = ref([]);
const xpTotalWithdraws = ref(0);
const xpStats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 });
const xpIsLoading = ref(false);
const xpShowModal = ref(false);
const xpSelectedTx = ref(null);
const xpOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [] });
const xpHeaders = [
	{ title: t("finance.user"), key: "user" },
	{ title: "Alıcı / IBAN", key: "withdrawal" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.state"), key: "status" },
	{ title: "İşleniyor", key: "isProcessing" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: "İşlem", key: "actions", sortable: false },
];

const providerActionLoading = ref("");

const canManagePendingXPayment = (transaction) =>
	transaction?.status === "pending" &&
	["not_submitted", "failed"].includes(transaction?.submissionState);

const galaxyPayMethodLabel = (method) =>
	({
		"bank-transfer": "Banka Transferi",
		papara: "Papara",
	})[method] || method || "—";

const galaxyPayDestinationLabel = (transaction) => {
	if (transaction?.method === "papara") {
		return transaction?.paparaInfo?.accountNumber || "-";
	}

	if (transaction?.bankInfo) {
		const bankName = transaction.bankInfo.bankName || "Banka";
		const account = transaction.bankInfo.iban || transaction.bankInfo.accountNumber || "-";
		return `${bankName} - ${account}`;
	}

	return "-";
};

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

const fetchFlWithdraws = async () => {
	flIsLoading.value = true;
	try {
		await loadProviderDisplayNames({ force: true });
		const params = {
			type: "withdraw",
			page: flOptions.value.page,
			limit: flOptions.value.itemsPerPage,
		};
		if (flSearchQuery.value) params.search = flSearchQuery.value;
		if (flStatusFilter.value) params.status = flStatusFilter.value;

		const res = await axios.get("/admin/forcelab-finance/transactions", { params });
		const data = res?.data?.data || {};
		flWithdraws.value = data.transactions || [];
		flTotalWithdraws.value = data.total || 0;
		flOptions.value.page = data.page || 1;
		flStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("Forcelab withdraws fetch error:", err);
	} finally {
		flIsLoading.value = false;
	}
};

watch([flSearchQuery, flStatusFilter], () => {
	flOptions.value.page = 1;
	fetchFlWithdraws();
});
watch(() => [flOptions.value.page, flOptions.value.itemsPerPage], fetchFlWithdraws);
watch(activeTab, (tab) => {
	if (tab === "forcelab" && flWithdraws.value.length === 0) fetchFlWithdraws();
});
onMounted(fetchFlWithdraws);

// ---- Approve / Reject ----
const approveLoading = ref(false);
const rejectLoading = ref(false);
const showRejectDialog = ref(false);
const rejectTxId = ref(null);
const rejectReason = ref("");

const approveWithdraw = async (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	if (!confirm("Bu çekim talebini onaylamak istediğinize emin misiniz?")) return;
	approveLoading.value = true;
	try {
		await axios.post(`/admin/forcelab-finance/withdraw/${txId}/approve`);
		fetchFlWithdraws();
		if (flShowModal.value) flShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.error || err?.response?.data?.message || "Onaylama hatası");
	} finally {
		approveLoading.value = false;
	}
};

const openRejectDialog = (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	rejectTxId.value = txId;
	rejectReason.value = "";
	showRejectDialog.value = true;
};

const confirmReject = async () => {
	rejectLoading.value = true;
	try {
		await axios.post(`/admin/forcelab-finance/withdraw/${rejectTxId.value}/reject`, {
			reason: rejectReason.value || undefined,
		});
		showRejectDialog.value = false;
		fetchFlWithdraws();
		if (flShowModal.value) flShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.message || "Red hatası");
	} finally {
		rejectLoading.value = false;
	}
};

// ---- Common helpers ----
const flStatusColor = (status) => {
	const map = {
		pending: "warning",
		processing: "info",
		approved: "success",
		rejected: "error",
		cancelled: "secondary",
		failed: "error",
	};
	return map[status] || "default";
};

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

// ---- MeelDev Fetch ----
const fetchMdWithdraws = async () => {
	mdIsLoading.value = true;
	try {
		const params = {
			type: "withdraw",
			page: mdOptions.value.page,
			itemsPerPage: mdOptions.value.itemsPerPage,
		};
		if (mdSearchQuery.value) params.q = mdSearchQuery.value;
		if (mdStatusFilter.value) params.status = mdStatusFilter.value;

		const res = await axios.get("/admin/meeldev/transactions", { params });
		const data = res?.data?.data || {};
		mdWithdraws.value = data.transactions || [];
		mdTotalWithdraws.value = data.total || 0;
		mdOptions.value.page = data.page || 1;
		mdStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("MeelDev withdraws fetch error:", err);
	} finally {
		mdIsLoading.value = false;
	}
};

watch([mdSearchQuery, mdStatusFilter], () => {
	mdOptions.value.page = 1;
	fetchMdWithdraws();
});
watch(() => [mdOptions.value.page, mdOptions.value.itemsPerPage], fetchMdWithdraws);
watch(activeTab, (tab) => {
	if (tab === "meeldev" && mdWithdraws.value.length === 0) fetchMdWithdraws();
});

// ---- GalaxyPay Fetch ----
const fetchGpWithdraws = async () => {
	gpIsLoading.value = true;
	try {
		const params = {
			type: "withdraw",
			page: gpOptions.value.page,
			itemsPerPage: gpOptions.value.itemsPerPage,
		};
		if (gpSearchQuery.value) params.q = gpSearchQuery.value;
		if (gpStatusFilter.value) params.status = gpStatusFilter.value;
		if (gpMethodFilter.value) params.method = gpMethodFilter.value;

		const res = await axios.get("/admin/galaxypay/transactions", { params });
		const data = res?.data?.data || {};
		gpWithdraws.value = data.transactions || [];
		gpTotalWithdraws.value = data.total || 0;
		gpOptions.value.page = data.page || 1;
		gpStats.value = data.stats || { totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 };
	} catch (err) {
		console.error("GalaxyPay withdraws fetch error:", err);
	} finally {
		gpIsLoading.value = false;
	}
};

watch([gpSearchQuery, gpStatusFilter, gpMethodFilter], () => {
	gpOptions.value.page = 1;
	fetchGpWithdraws();
});
watch(() => [gpOptions.value.page, gpOptions.value.itemsPerPage], fetchGpWithdraws);
watch(activeTab, (tab) => {
	if (tab === "galaxypay" && gpWithdraws.value.length === 0) fetchGpWithdraws();
});

// ---- FluxKripto / XPayment Fetch ----
const fetchFluxWithdraws = async () => {
	fluxIsLoading.value = true;
	try {
		const res = await axios.get("/admin/fluxkripto/transactions", {
			params: {
				type: "withdraw",
				status: fluxStatusFilter.value || undefined,
				currency: fluxCurrencyFilter.value || undefined,
				q: fluxSearchQuery.value || undefined,
				page: fluxOptions.value.page,
				itemsPerPage: fluxOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		fluxWithdraws.value = data.transactions || [];
		fluxTotalWithdraws.value = data.total || 0;
		fluxOptions.value.page = data.page || 1;
		fluxStats.value = data.stats || {
			totalAmount: 0,
			last24hAmount: 0,
			monthlyAmount: 0,
		};
	} catch (err) {
		console.error("FluxKripto withdraw fetch error:", err);
	} finally {
		fluxIsLoading.value = false;
	}
};

const fetchXpWithdraws = async () => {
	xpIsLoading.value = true;
	try {
		const res = await axios.get("/admin/xpayments/transactions", {
			params: {
				type: "withdraw",
				status: xpStatusFilter.value || undefined,
				q: xpSearchQuery.value || undefined,
				page: xpOptions.value.page,
				itemsPerPage: xpOptions.value.itemsPerPage,
			},
		});
		const data = res?.data?.data || {};
		xpWithdraws.value = data.transactions || [];
		xpTotalWithdraws.value = data.total || 0;
		xpOptions.value.page = data.page || 1;
		xpStats.value = data.stats || {
			totalAmount: 0,
			last24hAmount: 0,
			monthlyAmount: 0,
		};
	} catch (err) {
		console.error("XPayment withdraw fetch error:", err);
	} finally {
		xpIsLoading.value = false;
	}
};

watch([fluxSearchQuery, fluxStatusFilter, fluxCurrencyFilter], () => {
	fluxOptions.value.page = 1;
	if (activeTab.value === "fluxkripto") fetchFluxWithdraws();
});
watch(
	() => [fluxOptions.value.page, fluxOptions.value.itemsPerPage],
	() => {
		if (activeTab.value === "fluxkripto") fetchFluxWithdraws();
	},
);
watch([xpSearchQuery, xpStatusFilter], () => {
	xpOptions.value.page = 1;
	if (activeTab.value === "xpayments") fetchXpWithdraws();
});
watch(
	() => [xpOptions.value.page, xpOptions.value.itemsPerPage],
	() => {
		if (activeTab.value === "xpayments") fetchXpWithdraws();
	},
);
watch(activeTab, (tab) => {
	if (tab === "fluxkripto") fetchFluxWithdraws();
	if (tab === "xpayments") fetchXpWithdraws();
});

const runProviderWithdrawAction = async (provider, tx, action) => {
	if (!canManageFinanceWithdraws.value) return;

	const actionLabels = {
		approve: "onaylamak",
		reject: "reddetmek",
		cancel: "sağlayıcı tarafında iptal etmek",
	};
	if (!confirm(`Bu çekim talebini ${actionLabels[action]} istediğinize emin misiniz?`)) return;

	const key = `${provider}:${tx._id}:${action}`;
	providerActionLoading.value = key;
	try {
		await axios.post(`/admin/${provider}/withdraw/${tx._id}/${action}`);
		if (provider === "fluxkripto") {
			fluxShowModal.value = false;
			await fetchFluxWithdraws();
		} else {
			xpShowModal.value = false;
			await fetchXpWithdraws();
		}
	} catch (err) {
		alert(
			err?.response?.data?.error ||
				err?.response?.data?.message ||
				"İşlem tamamlanamadı.",
		);
	} finally {
		providerActionLoading.value = "";
	}
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

// ---- MeelDev Approve / Reject ----
const mdApproveLoading = ref(false);
const mdRejectLoading = ref(false);
const mdShowRejectDialog = ref(false);
const mdRejectTxId = ref(null);
const mdRejectReason = ref("");

const mdApproveWithdraw = async (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	if (!confirm("Bu MeelDev çekim talebini onaylamak istediğinize emin misiniz?")) return;
	mdApproveLoading.value = true;
	try {
		await axios.post(`/admin/meeldev/withdraw/${txId}/approve`);
		fetchMdWithdraws();
		if (mdShowModal.value) mdShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.error || err?.response?.data?.message || "Onaylama hatası");
	} finally {
		mdApproveLoading.value = false;
	}
};

const mdOpenRejectDialog = (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	mdRejectTxId.value = txId;
	mdRejectReason.value = "";
	mdShowRejectDialog.value = true;
};

const mdConfirmReject = async () => {
	mdRejectLoading.value = true;
	try {
		await axios.post(`/admin/meeldev/withdraw/${mdRejectTxId.value}/reject`, {
			reason: mdRejectReason.value || undefined,
		});
		mdShowRejectDialog.value = false;
		fetchMdWithdraws();
		if (mdShowModal.value) mdShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.message || "Red hatası");
	} finally {
		mdRejectLoading.value = false;
	}
};

const openMdDetails = (tx) => {
	mdSelectedTx.value = tx;
	mdShowModal.value = true;
};

// ---- GalaxyPay Approve / Reject ----
const gpApproveLoading = ref(false);
const gpRejectLoading = ref(false);
const gpShowRejectDialog = ref(false);
const gpRejectTxId = ref(null);
const gpRejectReason = ref("");

const gpApproveWithdraw = async (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	if (!confirm("Bu GalaxyPay çekim talebini onaylamak istediğinize emin misiniz?")) return;
	gpApproveLoading.value = true;
	try {
		await axios.post(`/admin/galaxypay/withdraw/${txId}/approve`);
		fetchGpWithdraws();
		if (gpShowModal.value) gpShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.error || err?.response?.data?.message || "Onaylama hatası");
	} finally {
		gpApproveLoading.value = false;
	}
};

const gpOpenRejectDialog = (txId) => {
	if (!canManageFinanceWithdraws.value) return;
	gpRejectTxId.value = txId;
	gpRejectReason.value = "";
	gpShowRejectDialog.value = true;
};

const gpConfirmReject = async () => {
	gpRejectLoading.value = true;
	try {
		await axios.post(`/admin/galaxypay/withdraw/${gpRejectTxId.value}/reject`, {
			reason: gpRejectReason.value || undefined,
		});
		gpShowRejectDialog.value = false;
		fetchGpWithdraws();
		if (gpShowModal.value) gpShowModal.value = false;
	} catch (err) {
		alert(err?.response?.data?.message || "Red hatası");
	} finally {
		gpRejectLoading.value = false;
	}
};

const openGpDetails = (tx) => {
	gpSelectedTx.value = tx;
	gpShowModal.value = true;
};

const formatTRY = (value) => {
	return (
		Number(value || 0).toLocaleString("tr-TR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}) + " ₺"
	);
};
</script>

<route lang="yaml">
meta:
  action: read
  subject: finance.withdraws
</route>

<template>
	<div>
		<VTabs v-model="activeTab" class="mb-4">
			<VTab value="all">Tümü</VTab>
			<VTab value="crypto">Kripto Çekimler</VTab>
			<VTab value="forcelab">Forcelab Finance</VTab>
			<VTab value="meeldev">MeelDev</VTab>
			<VTab value="galaxypay">GalaxyPay</VTab>
			<VTab value="fluxkripto">FluxKripto</VTab>
			<VTab value="xpayments">XPayment</VTab>
		</VTabs>

		<UnifiedPaymentTable v-if="activeTab === 'all'" type="withdraw" />

		<!-- ====== CRYPTO TAB ====== -->
		<section v-if="activeTab === 'crypto'">
			<VRow class="mb-4">
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.withdraw.total") }}</h6>
								<h4>{{ formatTRY(stats.totalAmount) }}</h4>
							</div>
							<VAvatar color="primary" variant="tonal" icon="tabler-cash" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.withdraw.daily") }}</h6>
								<h4>{{ formatTRY(stats.last24hAmount) }}</h4>
							</div>
							<VAvatar color="success" variant="tonal" icon="tabler-clock" />
						</VCardText>
					</VCard>
				</VCol>
				<VCol cols="12" sm="4">
					<VCard>
						<VCardText class="d-flex justify-space-between align-center">
							<div>
								<h6 class="text-h6">{{ t("finance.withdraw.monthly") }}</h6>
								<h4>{{ formatTRY(stats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard id="withdraw-list">
				<VCardTitle>{{ t("finance.withdraw.title") }}</VCardTitle>
				<VCardText>
					<VRow class="mb-4">
						<VCol cols="12" sm="4">
							<AppTextField
								v-model="searchQuery"
								:label="t('finance.searchUser')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="4">
							<AppTextField
								v-model="dateRange"
								:label="t('finance.dateRange')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" sm="4">
							<AppSelect
								v-model="selectedState"
								:items="[
									{ title: t('finance.withdraw.states.pending'), value: 'pending' },
									{ title: t('finance.withdraw.states.completed'), value: 'completed' },
									{ title: t('finance.withdraw.states.rejected'), value: 'rejected' },
								]"
								clearable
								:label="t('finance.withdraw.selectState')"
								density="compact"
							/>
						</VCol>
					</VRow>

					<VDataTableServer
						v-model="selectedRows"
						v-model:items-per-page="options.itemsPerPage"
						v-model:page="options.page"
						:items="withdraws"
						:items-length="totalWithdraws"
						:headers="headers"
						:loading="isLoading"
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

						<template #item.receiver="{ item }">
							<div class="d-flex align-center">
								<span class="me-2">{{ item.raw.data?.receiver || "—" }}</span>
								<VBtn size="x-small" variant="tonal" icon @click="copyToClipboard(item.raw.data?.receiver || '')">
									<VIcon size="16" icon="tabler-copy" />
								</VBtn>
							</div>
						</template>

						<template #item.currency="{ item }">
							{{ item.raw.data?.currency || item.raw.data?.fiatcurrency || "—" }}
						</template>

						<template #item.amount="{ item }">
							{{ formatTRY(item.raw.amount) }}
						</template>

						<template #item.state="{ item }">
							<VChip
								:color="item.raw.state === 'completed' ? 'success' : item.raw.state === 'pending' ? 'warning' : 'error'"
								label
							>
								{{ t("finance.withdraw.states." + item.raw.state) }}
							</VChip>
						</template>

						<template #item.createdAt="{ item }">
							{{ new Date(item.raw.createdAt).toLocaleString() }}
						</template>

						<template #item.actions="{ item }">
							<VBtn size="small" color="primary" @click="openDetails(item.raw)">
								{{ t("finance.view") }}
							</VBtn>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(options, totalWithdraws) }}</p>
								<VPagination
									v-model="options.page"
									:length="Math.ceil(totalWithdraws / options.itemsPerPage)"
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
					<VCardTitle>{{ t("finance.withdraw.details") }}</VCardTitle>
					<VCardText v-if="selectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong> {{ selectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong> {{ selectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong> {{ selectedTx.user?.phone || "—" }}
							</VCol>
							<VCol cols="12">
								<strong>{{ t("finance.withdraw.receiver") }}:</strong>
								<span class="me-2">{{ selectedTx.data?.receiver || "—" }}</span>
								<VBtn size="x-small" variant="tonal" icon @click="copyToClipboard(selectedTx.data?.receiver || '')">
									<VIcon size="16" icon="tabler-copy" />
								</VBtn>
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.currency") }}:</strong>
								{{ selectedTx.data?.currency || selectedTx.data?.fiatcurrency || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.amount") }}:</strong> ${{ Number(selectedTx.amount).toFixed(2) }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.state") }}:</strong>
								<VChip
									:color="selectedTx.state === 'completed' ? 'success' : selectedTx.state === 'pending' ? 'warning' : 'error'"
									size="small" label
								>
									{{ t("finance.withdraw.states." + selectedTx.state) }}
								</VChip>
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.txId") }}:</strong> {{ selectedTx.data?.transaction || "—" }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.date") }}:</strong> {{ new Date(selectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="6">
								<strong>{{ t("finance.updatedAt") }}:</strong> {{ new Date(selectedTx.updatedAt).toLocaleString() }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="showModal = false">{{ t("finance.close") }}</VBtn>
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
								<h6 class="text-h6">{{ t("finance.withdraw.total") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.daily") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.monthly") }}</h6>
								<h4>{{ formatTRY(flStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>Forcelab Finance Çekimler</VCardTitle>
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
						:items="flWithdraws"
						:items-length="flTotalWithdraws"
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
							<div class="d-flex gap-1">
								<VBtn size="small" color="primary" @click="openFlDetails(item.raw)">
									{{ t("finance.view") }}
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="success"
									:loading="approveLoading"
									@click="approveWithdraw(item.raw._id)"
								>
									Onayla
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="error"
									@click="openRejectDialog(item.raw._id)"
								>
									Reddet
								</VBtn>
							</div>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(flOptions, flTotalWithdraws) }}</p>
								<VPagination
									v-model="flOptions.page"
									:length="Math.ceil(flTotalWithdraws / flOptions.itemsPerPage)"
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
					<VCardTitle>Forcelab Çekim Detayı</VCardTitle>
					<VCardText v-if="flSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong> {{ flSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong> {{ flSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong> {{ flSelectedTx.user?.phone || "—" }}
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
								<strong>{{ t("finance.date") }}:</strong> {{ new Date(flSelectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="12" v-if="flSelectedTx.rejectionReason">
								<strong>Red Sebebi:</strong> {{ flSelectedTx.rejectionReason }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VBtn
							v-if="flSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="success"
							:loading="approveLoading"
							@click="approveWithdraw(flSelectedTx._id)"
						>
							Onayla
						</VBtn>
						<VBtn
							v-if="flSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="error"
							@click="openRejectDialog(flSelectedTx._id)"
						>
							Reddet
						</VBtn>
						<VSpacer />
						<VBtn text @click="flShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>

			<!-- Reject Reason Dialog -->
			<VDialog v-model="showRejectDialog" max-width="400">
				<VCard>
					<VCardTitle>Çekim Reddi</VCardTitle>
					<VCardText>
						<AppTextField
							v-model="rejectReason"
							label="Red Sebebi (opsiyonel)"
							placeholder="Neden reddediliyor?"
						/>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="showRejectDialog = false">İptal</VBtn>
						<VBtn color="error" :loading="rejectLoading" @click="confirmReject">Reddet</VBtn>
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
								<h6 class="text-h6">{{ t("finance.withdraw.total") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.daily") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.monthly") }}</h6>
								<h4>{{ formatTRY(mdStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>MeelDev Çekimler</VCardTitle>
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
						:items="mdWithdraws"
						:items-length="mdTotalWithdraws"
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

						<template #item.bankInfo="{ item }">
							<div v-if="item.raw.bankInfo">
								<div>{{ item.raw.bankInfo.bankName || "-" }}</div>
								<small>{{ item.raw.bankInfo.iban || "-" }}</small>
							</div>
							<span v-else>-</span>
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
							<div class="d-flex gap-1">
								<VBtn size="small" color="primary" @click="openMdDetails(item.raw)">
									{{ t("finance.view") }}
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="success"
									:loading="mdApproveLoading"
									@click="mdApproveWithdraw(item.raw._id)"
								>
									Onayla
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="error"
									@click="mdOpenRejectDialog(item.raw._id)"
								>
									Reddet
								</VBtn>
							</div>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(mdOptions, mdTotalWithdraws) }}</p>
								<VPagination
									v-model="mdOptions.page"
									:length="Math.ceil(mdTotalWithdraws / mdOptions.itemsPerPage)"
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
					<VCardTitle>MeelDev Çekim Detayı</VCardTitle>
					<VCardText v-if="mdSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong> {{ mdSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong> {{ mdSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong> {{ mdSelectedTx.user?.phone || "—" }}
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
								<strong>{{ t("finance.date") }}:</strong> {{ new Date(mdSelectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="12" v-if="mdSelectedTx.bankInfo">
								<strong>Banka:</strong> {{ mdSelectedTx.bankInfo.bankName || "-" }}<br />
								<strong>IBAN:</strong> {{ mdSelectedTx.bankInfo.iban || "-" }}<br />
								<strong>Hesap Sahibi:</strong> {{ mdSelectedTx.bankInfo.accountHolder || "-" }}
							</VCol>
							<VCol cols="12" v-if="mdSelectedTx.rejectionReason">
								<strong>Red Sebebi:</strong> {{ mdSelectedTx.rejectionReason }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VBtn
							v-if="mdSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="success"
							:loading="mdApproveLoading"
							@click="mdApproveWithdraw(mdSelectedTx._id)"
						>
							Onayla
						</VBtn>
						<VBtn
							v-if="mdSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="error"
							@click="mdOpenRejectDialog(mdSelectedTx._id)"
						>
							Reddet
						</VBtn>
						<VSpacer />
						<VBtn text @click="mdShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>

			<!-- MeelDev Reject Reason Dialog -->
			<VDialog v-model="mdShowRejectDialog" max-width="400">
				<VCard>
					<VCardTitle>Çekim Reddi</VCardTitle>
					<VCardText>
						<AppTextField
							v-model="mdRejectReason"
							label="Red Sebebi (opsiyonel)"
							placeholder="Neden reddediliyor?"
						/>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="mdShowRejectDialog = false">İptal</VBtn>
						<VBtn color="error" :loading="mdRejectLoading" @click="mdConfirmReject">Reddet</VBtn>
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
								<h6 class="text-h6">{{ t("finance.withdraw.total") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.daily") }}</h6>
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
								<h6 class="text-h6">{{ t("finance.withdraw.monthly") }}</h6>
								<h4>{{ formatTRY(gpStats.monthlyAmount) }}</h4>
							</div>
							<VAvatar color="info" variant="tonal" icon="tabler-calendar" />
						</VCardText>
					</VCard>
				</VCol>
			</VRow>

			<VCard>
				<VCardTitle>GalaxyPay Çekimler</VCardTitle>
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
						:items="gpWithdraws"
						:items-length="gpTotalWithdraws"
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

						<template #item.destination="{ item }">
							{{ galaxyPayDestinationLabel(item.raw) }}
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
							<div class="d-flex gap-1">
								<VBtn size="small" color="primary" @click="openGpDetails(item.raw)">
									{{ t("finance.view") }}
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="success"
									:loading="gpApproveLoading"
									@click="gpApproveWithdraw(item.raw._id)"
								>
									Onayla
								</VBtn>
								<VBtn
									v-if="item.raw.status === 'pending' && canManageFinanceWithdraws"
									size="small"
									color="error"
									@click="gpOpenRejectDialog(item.raw._id)"
								>
									Reddet
								</VBtn>
							</div>
						</template>

						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(gpOptions, gpTotalWithdraws) }}</p>
								<VPagination
									v-model="gpOptions.page"
									:length="Math.ceil(gpTotalWithdraws / gpOptions.itemsPerPage)"
									:total-visible="5"
								/>
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="gpShowModal" max-width="650">
				<VCard>
					<VCardTitle>GalaxyPay Çekim Detayı</VCardTitle>
					<VCardText v-if="gpSelectedTx">
						<VRow>
							<VCol cols="12">
								<strong>{{ t("finance.user") }}:</strong> {{ gpSelectedTx.user?.username || "-" }}<br />
								<strong>{{ t("finance.email") }}:</strong>
								{{ gpSelectedTx.user?.local?.email || gpSelectedTx.user?.email || "—" }}<br />
								<strong>{{ t("finance.phone") }}:</strong> {{ gpSelectedTx.user?.phone || "—" }}
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
								<strong>{{ t("finance.date") }}:</strong> {{ new Date(gpSelectedTx.createdAt).toLocaleString() }}
							</VCol>
							<VCol cols="12" v-if="gpSelectedTx.bankInfo">
								<strong>Banka:</strong> {{ gpSelectedTx.bankInfo.bankName || "-" }}<br />
								<strong>IBAN:</strong> {{ gpSelectedTx.bankInfo.iban || "-" }}<br />
								<strong>Hesap No:</strong> {{ gpSelectedTx.bankInfo.accountNumber || "-" }}<br />
								<strong>Şube Kodu:</strong> {{ gpSelectedTx.bankInfo.branchCode || "-" }}<br />
								<strong>Hesap Sahibi:</strong> {{ gpSelectedTx.bankInfo.accountHolder || "-" }}
							</VCol>
							<VCol cols="12" v-if="gpSelectedTx.paparaInfo">
								<strong>Papara No:</strong> {{ gpSelectedTx.paparaInfo.accountNumber || "-" }}<br />
								<strong>Hesap Sahibi:</strong> {{ gpSelectedTx.paparaInfo.accountHolder || "-" }}
							</VCol>
							<VCol cols="12" v-if="gpSelectedTx.rejectionReason">
								<strong>Red Sebebi:</strong> {{ gpSelectedTx.rejectionReason }}
							</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VBtn
							v-if="gpSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="success"
							:loading="gpApproveLoading"
							@click="gpApproveWithdraw(gpSelectedTx._id)"
						>
							Onayla
						</VBtn>
						<VBtn
							v-if="gpSelectedTx?.status === 'pending' && canManageFinanceWithdraws"
							color="error"
							@click="gpOpenRejectDialog(gpSelectedTx._id)"
						>
							Reddet
						</VBtn>
						<VSpacer />
						<VBtn text @click="gpShowModal = false">{{ t("finance.close") }}</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>

			<VDialog v-model="gpShowRejectDialog" max-width="400">
				<VCard>
					<VCardTitle>Çekim Reddi</VCardTitle>
					<VCardText>
						<AppTextField
							v-model="gpRejectReason"
							label="Red Sebebi (opsiyonel)"
							placeholder="Neden reddediliyor?"
						/>
					</VCardText>
					<VCardActions>
						<VSpacer />
						<VBtn text @click="gpShowRejectDialog = false">İptal</VBtn>
						<VBtn color="error" :loading="gpRejectLoading" @click="gpConfirmReject">Reddet</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== FLUXKRIPTO TAB ====== -->
		<section v-if="activeTab === 'fluxkripto'">
			<VCard class="mb-4" variant="outlined">
				<VCardText class="d-flex flex-wrap align-center justify-space-between ga-4">
					<div>
						<div class="text-overline text-medium-emphasis">NATIVE CRYPTO QUEUE</div>
						<h2 class="text-h5">FluxKripto Çekimleri</h2>
					</div>
					<div class="d-flex flex-wrap ga-2">
						<VChip color="primary" variant="tonal">Toplam {{ formatTRY(fluxStats.totalAmount) }}</VChip>
						<VChip color="warning" variant="tonal">24 saat {{ formatTRY(fluxStats.last24hAmount) }}</VChip>
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
						:items="fluxWithdraws"
						:items-length="fluxTotalWithdraws"
						:loading="fluxIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center ga-2">
								<VAvatar size="32" color="primary" variant="tonal">{{ avatarText(item.raw.user?.username || "U") }}</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "—" }}</div>
									<div class="text-caption text-medium-emphasis">{{ item.raw.externalTransactionId || "—" }}</div>
								</div>
							</div>
						</template>
						<template #item.receiverWallet="{ item }"><code>{{ item.raw.receiverWallet || "—" }}</code></template>
						<template #item.amount="{ item }">{{ formatTRY(item.raw.amount) }}</template>
						<template #item.status="{ item }"><VChip :color="flStatusColor(item.raw.status)" size="small" label>{{ item.raw.status }}</VChip></template>
						<template #item.createdAt="{ item }">{{ formatDateTime(item.raw.createdAt) }}</template>
						<template #item.actions="{ item }">
							<div class="d-flex align-center ga-1">
								<VBtn icon="mdi-eye-outline" size="x-small" variant="tonal" @click="openFluxDetails(item.raw)" />
								<VBtn
									v-if="item.raw.status === 'pending'"
									icon="mdi-check"
									size="x-small"
									color="success"
									:disabled="!canManageFinanceWithdraws"
									:loading="providerActionLoading === `fluxkripto:${item.raw._id}:approve`"
									@click="runProviderWithdrawAction('fluxkripto', item.raw, 'approve')"
								/>
								<VBtn
									v-if="item.raw.status === 'pending'"
									icon="mdi-close"
									size="x-small"
									color="error"
									:disabled="!canManageFinanceWithdraws"
									:loading="providerActionLoading === `fluxkripto:${item.raw._id}:reject`"
									@click="runProviderWithdrawAction('fluxkripto', item.raw, 'reject')"
								/>
							</div>
						</template>
						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(fluxOptions, fluxTotalWithdraws) }}</p>
								<VPagination v-model="fluxOptions.page" :length="Math.ceil(fluxTotalWithdraws / fluxOptions.itemsPerPage)" :total-visible="5" />
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="fluxShowModal" max-width="700">
				<VCard>
					<VCardTitle>FluxKripto çekim detayı</VCardTitle>
					<VCardText v-if="fluxSelectedTx">
						<VRow>
							<VCol cols="12" md="6"><strong>Kullanıcı:</strong> {{ fluxSelectedTx.user?.username || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>İşlem no:</strong> {{ fluxSelectedTx.externalTransactionId || "—" }}</VCol>
							<VCol cols="12"><strong>Alıcı cüzdan:</strong> <code>{{ fluxSelectedTx.receiverWallet || "—" }}</code></VCol>
							<VCol cols="12" md="4"><strong>TRY tutarı:</strong> {{ formatTRY(fluxSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="4"><strong>Kripto:</strong> {{ fluxSelectedTx.cryptoAmount ?? "—" }} {{ fluxSelectedTx.currency }}</VCol>
							<VCol cols="12" md="4"><strong>Kur:</strong> {{ fluxSelectedTx.rate ?? "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Durum:</strong> {{ fluxSelectedTx.status }}</VCol>
							<VCol cols="12" md="6"><strong>Provider durumu:</strong> {{ fluxSelectedTx.providerStatus || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Bakiye:</strong> {{ formatTRY(fluxSelectedTx.oldBalance) }} → {{ formatTRY(fluxSelectedTx.newBalance) }}</VCol>
							<VCol cols="12" md="6"><strong>Oluşturulma:</strong> {{ formatDateTime(fluxSelectedTx.createdAt) }}</VCol>
							<VCol cols="12" md="4"><strong>Rezerv:</strong> <VChip size="small" :color="fluxSelectedTx.balanceRefundedAt ? 'info' : fluxSelectedTx.balanceDebitedAt ? 'success' : 'error'">{{ fluxSelectedTx.balanceRefundedAt ? "İade edildi" : fluxSelectedTx.balanceDebitedAt ? "Bakiye ayrıldı" : "Rezerv eksik" }}</VChip></VCol>
							<VCol cols="12" md="4"><strong>Bakiye ayrılma:</strong> {{ fluxSelectedTx.balanceDebitedAt ? formatDateTime(fluxSelectedTx.balanceDebitedAt) : "—" }}</VCol>
							<VCol cols="12" md="4"><strong>Bakiye iade:</strong> {{ fluxSelectedTx.balanceRefundedAt ? formatDateTime(fluxSelectedTx.balanceRefundedAt) : "—" }}</VCol>
							<VCol v-if="fluxSelectedTx.rejectionReason" cols="12"><strong>Red sebebi:</strong> {{ fluxSelectedTx.rejectionReason }}</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VBtn
							v-if="fluxSelectedTx?.status === 'pending'"
							color="success"
							:disabled="!canManageFinanceWithdraws"
							@click="runProviderWithdrawAction('fluxkripto', fluxSelectedTx, 'approve')"
						>Onayla</VBtn>
						<VBtn
							v-if="fluxSelectedTx?.status === 'pending'"
							color="error"
							variant="tonal"
							:disabled="!canManageFinanceWithdraws"
							@click="runProviderWithdrawAction('fluxkripto', fluxSelectedTx, 'reject')"
						>Reddet</VBtn>
						<VSpacer /><VBtn variant="text" @click="fluxShowModal = false">Kapat</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>

		<!-- ====== XPAYMENT TAB ====== -->
		<section v-if="activeTab === 'xpayments'">
			<VCard class="mb-4" variant="outlined">
				<VCardText class="d-flex flex-wrap align-center justify-space-between ga-4">
					<div>
						<div class="text-overline text-medium-emphasis">H2H WITHDRAW QUEUE</div>
						<h2 class="text-h5">XPayment Çekimleri</h2>
					</div>
					<div class="d-flex flex-wrap ga-2">
						<VChip color="primary" variant="tonal">Toplam {{ formatTRY(xpStats.totalAmount) }}</VChip>
						<VChip color="warning" variant="tonal">24 saat {{ formatTRY(xpStats.last24hAmount) }}</VChip>
						<VChip color="info" variant="tonal">Bu ay {{ formatTRY(xpStats.monthlyAmount) }}</VChip>
					</div>
				</VCardText>
			</VCard>

			<VCard>
				<VCardText>
					<VRow class="mb-2">
						<VCol cols="12" md="7">
							<AppTextField v-model="xpSearchQuery" label="Kullanıcı, işlem no veya IBAN ara" density="compact" clearable />
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
						:items="xpWithdraws"
						:items-length="xpTotalWithdraws"
						:loading="xpIsLoading"
						class="text-no-wrap"
					>
						<template #item.user="{ item }">
							<div class="d-flex align-center ga-2">
								<VAvatar size="32" color="info" variant="tonal">{{ avatarText(item.raw.user?.username || "U") }}</VAvatar>
								<div>
									<div class="font-weight-medium">{{ item.raw.user?.username || "—" }}</div>
									<div class="text-caption text-medium-emphasis">{{ item.raw.externalTransactionId || "—" }}</div>
								</div>
							</div>
						</template>
						<template #item.withdrawal="{ item }">
							<div>{{ item.raw.withdrawal?.accountHolder || "—" }}</div>
							<code class="text-caption">{{ item.raw.withdrawal?.iban || "—" }}</code>
						</template>
						<template #item.amount="{ item }">{{ formatTRY(item.raw.amount) }}</template>
						<template #item.status="{ item }"><VChip :color="flStatusColor(item.raw.status)" size="small" label>{{ item.raw.status }}</VChip></template>
						<template #item.isProcessing="{ item }">
							<VChip :color="item.raw.isProcessing ? 'warning' : 'secondary'" size="small" variant="tonal">
								{{ item.raw.isProcessing ? "Evet" : "Hayır" }}
							</VChip>
						</template>
						<template #item.createdAt="{ item }">{{ formatDateTime(item.raw.createdAt) }}</template>
						<template #item.actions="{ item }">
							<div class="d-flex align-center ga-1">
								<VBtn icon="mdi-eye-outline" size="x-small" variant="tonal" @click="openXpDetails(item.raw)" />
								<VBtn
									v-if="canManagePendingXPayment(item.raw)"
									icon="mdi-check"
									size="x-small"
									color="success"
									:disabled="!canManageFinanceWithdraws"
									:loading="providerActionLoading === `xpayments:${item.raw._id}:approve`"
									@click="runProviderWithdrawAction('xpayments', item.raw, 'approve')"
								/>
								<VBtn
									v-if="canManagePendingXPayment(item.raw)"
									icon="mdi-close"
									size="x-small"
									color="error"
									:disabled="!canManageFinanceWithdraws"
									:loading="providerActionLoading === `xpayments:${item.raw._id}:reject`"
									@click="runProviderWithdrawAction('xpayments', item.raw, 'reject')"
								/>
								<VBtn
									v-if="item.raw.status === 'processing'"
									icon="mdi-cancel"
									size="x-small"
									color="warning"
									:disabled="!canManageFinanceWithdraws || item.raw.isProcessing === true"
									:loading="providerActionLoading === `xpayments:${item.raw._id}:cancel`"
									@click="runProviderWithdrawAction('xpayments', item.raw, 'cancel')"
								/>
							</div>
						</template>
						<template #bottom>
							<VDivider />
							<div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
								<p class="text-sm text-disabled mb-0">{{ paginationMeta(xpOptions, xpTotalWithdraws) }}</p>
								<VPagination v-model="xpOptions.page" :length="Math.ceil(xpTotalWithdraws / xpOptions.itemsPerPage)" :total-visible="5" />
							</div>
						</template>
					</VDataTableServer>
				</VCardText>
			</VCard>

			<VDialog v-model="xpShowModal" max-width="700">
				<VCard>
					<VCardTitle>XPayment çekim detayı</VCardTitle>
					<VCardText v-if="xpSelectedTx">
						<VRow>
							<VCol cols="12" md="6"><strong>Kullanıcı:</strong> {{ xpSelectedTx.user?.username || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>İşlem no:</strong> {{ xpSelectedTx.externalTransactionId || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Finance ID:</strong> {{ xpSelectedTx.financeId || "—" }}</VCol>
							<VCol cols="12" md="6"><strong>Tutar:</strong> {{ formatTRY(xpSelectedTx.amount) }}</VCol>
							<VCol cols="12" md="6"><strong>Alıcı:</strong> {{ xpSelectedTx.withdrawal?.accountHolder || "—" }}</VCol>
							<VCol cols="12"><strong>IBAN:</strong> <code>{{ xpSelectedTx.withdrawal?.iban || "—" }}</code></VCol>
							<VCol cols="12" md="4"><strong>Durum:</strong> {{ xpSelectedTx.status }}</VCol>
							<VCol cols="12" md="4"><strong>Provider durumu:</strong> {{ xpSelectedTx.providerStatus || "—" }}</VCol>
							<VCol cols="12" md="4"><strong>İşleniyor:</strong> {{ xpSelectedTx.isProcessing ? "Evet" : "Hayır" }}</VCol>
							<VCol cols="12" md="6"><strong>Bakiye:</strong> {{ formatTRY(xpSelectedTx.oldBalance) }} → {{ formatTRY(xpSelectedTx.newBalance) }}</VCol>
							<VCol cols="12" md="6"><strong>Oluşturulma:</strong> {{ formatDateTime(xpSelectedTx.createdAt) }}</VCol>
							<VCol cols="12" md="4"><strong>Rezerv:</strong> <VChip size="small" :color="xpSelectedTx.balanceRefundedAt ? 'info' : xpSelectedTx.balanceDebitedAt ? 'success' : 'error'">{{ xpSelectedTx.balanceRefundedAt ? "İade edildi" : xpSelectedTx.balanceDebitedAt ? "Bakiye ayrıldı" : "Rezerv eksik" }}</VChip></VCol>
							<VCol cols="12" md="4"><strong>Bakiye ayrılma:</strong> {{ xpSelectedTx.balanceDebitedAt ? formatDateTime(xpSelectedTx.balanceDebitedAt) : "—" }}</VCol>
							<VCol cols="12" md="4"><strong>Bakiye iade:</strong> {{ xpSelectedTx.balanceRefundedAt ? formatDateTime(xpSelectedTx.balanceRefundedAt) : "—" }}</VCol>
							<VCol v-if="xpSelectedTx.rejectionReason" cols="12"><strong>Red sebebi:</strong> {{ xpSelectedTx.rejectionReason }}</VCol>
						</VRow>
					</VCardText>
					<VCardActions>
						<VBtn v-if="canManagePendingXPayment(xpSelectedTx)" color="success" :disabled="!canManageFinanceWithdraws" @click="runProviderWithdrawAction('xpayments', xpSelectedTx, 'approve')">Onayla</VBtn>
						<VBtn v-if="canManagePendingXPayment(xpSelectedTx)" color="error" variant="tonal" :disabled="!canManageFinanceWithdraws" @click="runProviderWithdrawAction('xpayments', xpSelectedTx, 'reject')">Reddet</VBtn>
						<VBtn
							v-if="xpSelectedTx?.status === 'processing'"
							color="warning"
							variant="tonal"
							:disabled="!canManageFinanceWithdraws || xpSelectedTx.isProcessing === true"
							@click="runProviderWithdrawAction('xpayments', xpSelectedTx, 'cancel')"
						>Provider iptali</VBtn>
						<VSpacer /><VBtn variant="text" @click="xpShowModal = false">Kapat</VBtn>
					</VCardActions>
				</VCard>
			</VDialog>
		</section>
	</div>
</template>
