<script setup>
import { paginationMeta } from "@/@fake-db/utils";
import { useBankTransferWithdrawStore } from "@/pages/apps/finance/bank-transfers-withdraw/useBankTransferWithdrawStore";
import { avatarText } from "@core/utils/formatters";
import { useI18n } from "vue-i18n";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import ability from "@/plugins/casl/ability";

const { t } = useI18n();
const bankTransferStore = useBankTransferWithdrawStore();
const canManageBankTransferWithdraws = computed(
	() =>
		ability.can("manage", "finance.bankTransfersWithdraw") ||
		ability.can("manage", "finance"),
);

const searchQuery = ref("");
const statusFilter = ref(null);
const transfers = ref([]);
const totalTransfers = ref(0);
const selectedRows = ref([]);
const isLoading = ref(false);

const detailDialog = ref(false);
const detailTransfer = ref(null);

const confirmDialog = ref(false);
const confirmStatus = ref(null);
const confirmTransfer = ref(null);
const isUpdatingStatus = ref(false);

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
	{ title: t("finance.bankTransfer.bank"), key: "bankName" },
	{ title: t("finance.bankTransfer.accountName"), key: "accountName" },
	{ title: t("finance.bankTransfer.iban"), key: "iban" },
	{ title: t("finance.amount"), key: "amount" },
	{ title: t("finance.balance"), key: "userBalance" },
	{ title: t("finance.state"), key: "status" },
	{ title: t("finance.date"), key: "createdAt" },
	{ title: t("actions"), key: "actions", sortable: false },
];

const statusOptions = computed(() => [
	{
		title: t("finance.bankTransfer.statusOptions.pending"),
		value: "pending",
	},
	{
		title: t("finance.bankTransfer.statusOptions.processing"),
		value: "processing",
	},
	{
		title: t("finance.bankTransfer.statusOptions.approved"),
		value: "approved",
	},
	{
		title: t("finance.bankTransfer.statusOptions.rejected"),
		value: "rejected",
	},
]);

const statusColor = (status) => {
	if (status === "approved") return "success";
	if (status === "pending") return "warning";
	if (status === "processing") return "info";
	return "error";
};

const statusLabel = (status) => {
	const key = `finance.bankTransfer.statusOptions.${status}`;
	const translated = t(key);

	return translated === key ? status : translated;
};

const metadataEntries = computed(() => {
	if (
		!detailTransfer.value?.metadata ||
		typeof detailTransfer.value.metadata !== "object"
	)
		return [];

	return Object.entries(detailTransfer.value.metadata).map(
		([key, value], index) => ({
			id: `${key}-${index}`,
			key,
			value,
		})
	);
});

const paginationLength = computed(() => {
	const perPage = Number(options.value.itemsPerPage) || 1;
	const total = Number(totalTransfers.value) || 0;

	return Math.max(1, Math.ceil(total / perPage));
});

const showSnackbar = (message, color = "success") => {
	snackbar.message = message;
	snackbar.color = color;
	snackbar.visible = true;
};

const formatMetadataValue = (value) => {
	if (value === null || value === undefined || value === "") return "—";

	if (typeof value === "object") return JSON.stringify(value);

	return value;
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
	} catch (error) {
		console.error("Clipboard copy failed:", error);
	}
};

const fetchTransfers = async () => {
	isLoading.value = true;
	try {
		const { data } = await bankTransferStore.fetchTransfers({
			search: searchQuery.value,
			status: statusFilter.value,
			page: options.value.page,
			limit: options.value.itemsPerPage,
		});

		transfers.value = data?.data || [];
		totalTransfers.value = data?.total || 0;
		options.value.page = data?.page || options.value.page;
	} catch (error) {
		console.error("Bank transfer withdraw fetch error:", error);
		showSnackbar(t("finance.bankTransfer.messages.fetchError"), "error");
	} finally {
		isLoading.value = false;
	}
};

watch(
	() => [options.value.page, options.value.itemsPerPage],
	() => {
		fetchTransfers();
	},
	{ immediate: true }
);

watch([searchQuery, statusFilter], () => {
	if (options.value.page !== 1) options.value.page = 1;
	else fetchTransfers();
});

const openDetails = (transfer) => {
	detailTransfer.value = transfer;
	detailDialog.value = true;
};

const requestStatusUpdate = (transfer, status) => {
	if (!canManageBankTransferWithdraws.value) return;
	confirmTransfer.value = transfer;
	confirmStatus.value = status;
	confirmDialog.value = true;
};

const submitStatusUpdate = async () => {
	if (!canManageBankTransferWithdraws.value) return;
	if (!confirmTransfer.value || !confirmStatus.value) return;

	isUpdatingStatus.value = true;
	try {
		await bankTransferStore.updateTransferStatus(
			confirmTransfer.value._id,
			confirmStatus.value
		);
		confirmDialog.value = false;
		showSnackbar(
			t("finance.bankTransfer.messages.updateSuccess"),
			"success"
		);
		await fetchTransfers();
	} catch (error) {
		console.error("Bank transfer withdraw status update error:", error);
		const errorMsg =
			error.response?.data?.message ||
			t("finance.bankTransfer.messages.updateError");
		showSnackbar(errorMsg, "error");
	} finally {
		isUpdatingStatus.value = false;
	}
};
</script>

<template>
	<section>
		<VCard>
			<VCardTitle>{{
				t("finance.bankTransferWithdraw.title")
			}}</VCardTitle>
			<VCardText>
				<VRow class="mb-4">
					<VCol cols="12" md="6">
						<AppTextField
							v-model="searchQuery"
							:label="t('finance.bankTransfer.search')"
							density="compact"
							clearable
						/>
					</VCol>
					<VCol cols="12" md="6">
						<AppSelect
							v-model="statusFilter"
							:items="statusOptions"
							:label="t('finance.bankTransfer.statusFilter')"
							clearable
							density="compact"
						/>
					</VCol>
				</VRow>

				<VDataTableServer
					v-model="selectedRows"
					v-model:items-per-page="options.itemsPerPage"
					v-model:page="options.page"
					:items="transfers"
					:items-length="totalTransfers"
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

					<template #item.bankName="{ item }">
						<div>
							<div class="font-weight-medium">
								{{ item.raw.bankName || "—" }}
							</div>
							<div
								v-if="item.raw.bankId"
								class="text-caption text-medium-emphasis"
							>
								{{ t("finance.bankTransfer.bankId") }}:
								{{ item.raw.bankId }}
							</div>
						</div>
					</template>

					<template #item.accountName="{ item }">
						{{ item.raw.accountName || "—" }}
					</template>

					<template #item.iban="{ item }">
						<div class="d-flex align-center">
							<span class="me-2">{{ item.raw.iban || "—" }}</span>
							<VBtn
								v-if="item.raw.iban"
								size="x-small"
								variant="text"
								icon
								color="primary"
								@click="copyToClipboard(item.raw.iban)"
							>
								<VIcon size="16" icon="tabler-copy" />
							</VBtn>
						</div>
					</template>

					<template #item.amount="{ item }">
						<span class="text-error font-weight-bold">
							-{{ formatTRY(item.raw.amount) }}
						</span>
					</template>

					<template #item.userBalance="{ item }">
						<span
							:class="
								item.raw.userBalance >= item.raw.amount
									? 'text-success'
									: 'text-error'
							"
						>
							${{
								Number(
									item.raw.userBalance || 0
								).toLocaleString(undefined, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})
							}}
						</span>
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
						<div class="d-flex flex-wrap gap-2">
							<VBtn
								size="small"
								color="primary"
								@click="openDetails(item.raw)"
							>
								{{ t("finance.view") }}
							</VBtn>
							<!-- Beklemede durumundakiler -->
							<template
								v-if="item.raw.status === 'pending' && canManageBankTransferWithdraws"
							>
								<VBtn
									size="small"
									variant="tonal"
									color="info"
									:disabled="
										item.raw.userBalance < item.raw.amount
									"
									@click="
										requestStatusUpdate(
											item.raw,
											'processing'
										)
									"
								>
									{{
										t(
											"finance.bankTransfer.actions.processing"
										)
									}}
								</VBtn>
								<VBtn
									size="small"
									variant="tonal"
									color="error"
									@click="
										requestStatusUpdate(
											item.raw,
											'rejected'
										)
									"
								>
									{{
										t("finance.bankTransfer.actions.reject")
									}}
								</VBtn>
							</template>
							<!-- Ödeme aşamasındakiler -->
							<template
								v-if="item.raw.status === 'processing' && canManageBankTransferWithdraws"
							>
								<VBtn
									size="small"
									variant="tonal"
									color="success"
									@click="
										requestStatusUpdate(
											item.raw,
											'approved'
										)
									"
								>
									{{
										t(
											"finance.bankTransfer.actions.approve"
										)
									}}
								</VBtn>
								<VBtn
									size="small"
									variant="tonal"
									color="error"
									@click="
										requestStatusUpdate(
											item.raw,
											'rejected'
										)
									"
								>
									{{
										t("finance.bankTransfer.actions.reject")
									}}
								</VBtn>
							</template>
						</div>
					</template>

					<template #bottom>
						<VDivider />
						<div
							class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
						>
							<p class="text-sm text-disabled mb-0">
								{{ paginationMeta(options, totalTransfers) }}
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
							{{ t("finance.bankTransfer.noData") }}
						</div>
					</template>
				</VDataTableServer>
			</VCardText>
		</VCard>

		<VDialog v-model="detailDialog" max-width="720">
			<VCard>
				<VCardTitle>{{
					t("finance.bankTransferWithdraw.details")
				}}</VCardTitle>
				<VCardText v-if="detailTransfer">
					<VRow>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.user") }}:</strong>
							{{ detailTransfer.user?.username || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.email") }}:</strong>
							{{ detailTransfer.user?.email || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.phone") }}:</strong>
							{{ detailTransfer.user?.phone || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.amount") }}:</strong>
							<span class="text-error font-weight-bold">
								-${{
									Number(
										detailTransfer.amount || 0
									).toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})
								}}
							</span>
						</VCol>

						<VCol cols="12" md="6">
							<strong>{{ t("finance.balance") }}:</strong>
							<span
								:class="
									detailTransfer.userBalance >=
									detailTransfer.amount
										? 'text-success'
										: 'text-error'
								"
							>
								${{
									Number(
										detailTransfer.userBalance || 0
									).toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})
								}}
							</span>
						</VCol>

						<VCol cols="12" md="6">
							<strong
								>{{ t("finance.bankTransfer.bank") }}:</strong
							>
							{{ detailTransfer.bankName || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong
								>{{ t("finance.bankTransfer.bankId") }}:</strong
							>
							{{ detailTransfer.bankId || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong
								>{{
									t("finance.bankTransfer.accountName")
								}}:</strong
							>
							{{ detailTransfer.accountName || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong
								>{{ t("finance.bankTransfer.iban") }}:</strong
							>
							{{ detailTransfer.iban || "—" }}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.state") }}:</strong>
							<VChip
								:color="statusColor(detailTransfer.status)"
								size="small"
								label
							>
								{{ statusLabel(detailTransfer.status) }}
							</VChip>
						</VCol>

						<VCol cols="12">
							<strong
								>{{ t("finance.bankTransfer.note") }}:</strong
							>
							<span class="ms-1">{{
								detailTransfer.note ||
								t("finance.bankTransfer.noNote")
							}}</span>
						</VCol>

						<VCol cols="12">
							<strong
								>{{
									t("finance.bankTransfer.metadata")
								}}:</strong
							>
							<div v-if="metadataEntries.length" class="mt-2">
								<VList density="compact">
									<VListItem
										v-for="meta in metadataEntries"
										:key="meta.id"
									>
										<template #title>{{
											meta.key
										}}</template>
										<template #subtitle>{{
											formatMetadataValue(meta.value)
										}}</template>
									</VListItem>
								</VList>
							</div>
							<div v-else class="text-body-2 text-disabled mt-1">
								{{ t("finance.bankTransfer.noMetadata") }}
							</div>
						</VCol>

						<VCol cols="12" md="6">
							<strong>{{ t("finance.date") }}:</strong>
							{{
								new Date(
									detailTransfer.createdAt
								).toLocaleString()
							}}
						</VCol>
						<VCol cols="12" md="6">
							<strong>{{ t("finance.updatedAt") }}:</strong>
							{{
								new Date(
									detailTransfer.updatedAt
								).toLocaleString()
							}}
						</VCol>
					</VRow>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="detailDialog = false">
						{{ t("finance.close") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<VDialog v-model="confirmDialog" max-width="420">
			<VCard>
				<VCardTitle>{{
					t("finance.bankTransfer.actions.confirmTitle")
				}}</VCardTitle>
				<VCardText>
					<template v-if="confirmStatus === 'processing'">
						{{
							t("finance.bankTransferWithdraw.confirmProcessing")
						}}
					</template>
					<template v-else-if="confirmStatus === 'approved'">
						{{ t("finance.bankTransferWithdraw.confirmApprove") }}
						<div class="mt-2 text-warning font-weight-bold">
							{{
								t(
									"finance.bankTransferWithdraw.balanceWarning",
									{ amount: confirmTransfer?.amount }
								)
							}}
						</div>
					</template>
					<template v-else>
						{{ t("finance.bankTransfer.actions.confirmReject") }}
					</template>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn
						variant="text"
						:disabled="isUpdatingStatus"
						@click="confirmDialog = false"
					>
						{{ t("cancel") }}
					</VBtn>
					<VBtn
						v-if="canManageBankTransferWithdraws"
						:color="
							confirmStatus === 'approved'
								? 'success'
								: confirmStatus === 'processing'
								? 'info'
								: 'error'
						"
						:loading="isUpdatingStatus"
						@click="submitStatusUpdate"
					>
						{{
							confirmStatus === "approved"
								? t("finance.bankTransfer.actions.approve")
								: confirmStatus === "processing"
								? t("finance.bankTransfer.actions.processing")
								: t("finance.bankTransfer.actions.reject")
						}}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<VSnackbar
			v-model="snackbar.visible"
			:timeout="3000"
			location="bottom end"
			:color="snackbar.color"
		>
			{{ snackbar.message }}
		</VSnackbar>
	</section>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.bankTransfersWithdraw
</route>
