<script setup>
import axios from "@axios"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()

const props = defineProps({
	selectedUserId: {
		type: String,
		required: true,
	},
})

const bets = ref([])
const totalItems = ref(0)
const isLoading = ref(false)
const searchQuery = ref("")
const selectedStatus = ref(null)
const selectedBet = ref(null)
const isDetailDialogVisible = ref(false)
const createEmptySummary = () => ({
	totalRecords: 0,
	totalStake: 0,
	totalWin: 0,
	netProfit: 0,
	totalWon: 0,
	totalLost: 0,
	totalPending: 0,
})
const summary = ref(createEmptySummary())

const options = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
})

const statusOptions = computed(() => [
	{ title: t("sportsBetHistory.allStatuses"), value: null },
	{ title: t("sportsBetHistory.statusPending"), value: "pending" },
	{ title: t("sportsBetHistory.statusWon"), value: "won" },
	{ title: t("sportsBetHistory.statusLost"), value: "lost" },
	{ title: t("sportsBetHistory.statusCashout"), value: "cashout" },
	{ title: t("sportsBetHistory.statusCancelled"), value: "cancelled" },
])

const headers = computed(() => [
	{ title: t("sportsBetHistory.couponId"), key: "externalCouponId", sortable: false },
	{ title: t("sportsBetHistory.stake"), key: "amount", align: "end", sortable: false },
	{ title: t("sportsBetHistory.totalOdds"), key: "totalOdds", align: "center", sortable: false },
	{ title: t("sportsBetHistory.potentialWin"), key: "potentialWin", align: "end", sortable: false },
	{ title: t("sportsBetHistory.actualWin"), key: "actualWin", align: "end", sortable: false },
	{ title: t("sportsBetHistory.eventCount"), key: "eventCount", align: "center", sortable: false },
	{ title: t("sportsBetHistory.status"), key: "status", align: "center", sortable: false },
	{ title: t("sportsBetHistory.date"), key: "createdAt", sortable: false },
	{ title: t("gameHistory.completion"), key: "actions", align: "center", sortable: false },
])

const formatMoney = val => {
	const n = Number(val ?? 0)
	if (!Number.isFinite(n)) return "-"
	return n.toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

const formatDate = val => {
	if (!val) return "-"
	return new Date(val).toLocaleString("tr-TR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

const statusColor = status => ({
	pending: "warning",
	won: "success",
	lost: "error",
	cashout: "info",
	cancelled: "secondary",
}[status] || "default")

const statusLabel = status => ({
	pending: t("sportsBetHistory.statusPending"),
	won: t("sportsBetHistory.statusWon"),
	lost: t("sportsBetHistory.statusLost"),
	cashout: t("sportsBetHistory.statusCashout"),
	cancelled: t("sportsBetHistory.statusCancelled"),
}[status] || status)

const betTypeLabel = betType => ({
	single: t("sportsBetHistory.betTypeSingle"),
	multiple: t("sportsBetHistory.betTypeMultiple"),
	system: t("sportsBetHistory.betTypeSystem"),
}[betType] || betType)

const fetchBets = async () => {
	if (!props.selectedUserId) return

	isLoading.value = true
	try {
		const params = {
			page: options.value.page,
			limit: options.value.itemsPerPage,
		}
		if (searchQuery.value) params.search = searchQuery.value
		if (selectedStatus.value) params.status = selectedStatus.value

		const { data } = await axios.get(
			`/admin/users/${props.selectedUserId}/sports-bets`,
			{ params },
		)

		bets.value = data.data || []
		totalItems.value = data.total || 0
		summary.value = { ...createEmptySummary(), ...(data.summary || {}) }
	} catch (err) {
		console.error("❌ Sports bet history fetch error:", err)
		bets.value = []
		totalItems.value = 0
		summary.value = createEmptySummary()
	} finally {
		isLoading.value = false
	}
}

const viewDetail = bet => {
	selectedBet.value = bet
	isDetailDialogVisible.value = true
}

watch(
	[() => props.selectedUserId, options, searchQuery, selectedStatus],
	() => fetchBets(),
	{ immediate: true, deep: true },
)
</script>

<template>
	<VCard>
		<VCardItem>
			<template #title>
				<div class="d-flex align-center gap-2">
					<VIcon icon="tabler-ball-football" size="22" />
					<span>{{ t("sportsBetHistory.title") }}</span>
				</div>
			</template>
			<template #subtitle>
				{{ t("sportsBetHistory.subtitle") }}
			</template>
		</VCardItem>

		<VDivider />

		<VCardText class="pb-0">
			<VRow dense>
				<VCol cols="12" md="5">
					<AppTextField
						v-model="searchQuery"
						:placeholder="t('sportsBetHistory.searchPlaceholder')"
						prepend-inner-icon="tabler-search"
						clearable
						density="comfortable"
					/>
				</VCol>
				<VCol cols="6" md="4">
					<AppSelect
						v-model="selectedStatus"
						:items="statusOptions"
						item-title="title"
						item-value="value"
						density="comfortable"
					/>
				</VCol>
				<VCol cols="6" md="3" class="d-flex justify-end">
					<VBtn
						color="primary"
						prepend-icon="tabler-refresh"
						:loading="isLoading"
						block
						@click="fetchBets"
					>
						{{ t("sportsBetHistory.refresh") }}
					</VBtn>
				</VCol>
			</VRow>
		</VCardText>

		<VDivider class="mt-4" />

		<VCardText class="pa-3 d-flex flex-wrap gap-2">
			<VChip color="info" variant="tonal" size="small">
				<VIcon start icon="tabler-database" />
				{{ t("sportsBetHistory.totalRecords") }}: <b class="ms-1">{{ totalItems }}</b>
			</VChip>
			<VChip color="success" variant="tonal" size="small">
				<VIcon start icon="tabler-trophy" />
				{{ t("sportsBetHistory.statusWon") }}: <b class="ms-1">{{ summary.totalWon }}</b>
			</VChip>
			<VChip color="error" variant="tonal" size="small">
				<VIcon start icon="tabler-x" />
				{{ t("sportsBetHistory.statusLost") }}: <b class="ms-1">{{ summary.totalLost }}</b>
			</VChip>
			<VChip color="warning" variant="tonal" size="small">
				<VIcon start icon="tabler-clock" />
				{{ t("sportsBetHistory.statusPending") }}: <b class="ms-1">{{ summary.totalPending }}</b>
			</VChip>
		</VCardText>

		<VDivider />

		<VDataTableServer
			v-model:page="options.page"
			v-model:items-per-page="options.itemsPerPage"
			:headers="headers"
			:items="bets"
			:items-length="totalItems"
			:loading="isLoading"
			:items-per-page-options="[10, 25, 50, 100]"
			class="text-no-wrap"
			density="comfortable"
			hover
		>
			<!-- Coupon ID -->
			<template #item.externalCouponId="{ item }">
				<div class="d-flex flex-column">
					<span class="font-weight-medium text-primary">
						{{ item.raw.externalCouponId || item.raw._id }}
					</span>
					<div class="d-flex align-center gap-1">
						<span class="text-xs text-disabled">
							{{ betTypeLabel(item.raw.betType) }}
						</span>
						<VChip v-if="item.raw.isLive" size="x-small" color="error" variant="flat">
							{{ t("sportsBetHistory.live") }}
						</VChip>
					</div>
				</div>
			</template>

			<!-- Stake -->
			<template #item.amount="{ item }">
				<span class="amount-bet">₺{{ formatMoney(item.raw.amount) }}</span>
			</template>

			<!-- Total odds -->
			<template #item.totalOdds="{ item }">
				<VChip color="info" size="small" variant="tonal">
					{{ Number(item.raw.totalOdds || 1).toFixed(2) }}
				</VChip>
			</template>

			<!-- Potential win -->
			<template #item.potentialWin="{ item }">
				<span class="text-medium-emphasis">₺{{ formatMoney(item.raw.potentialWin) }}</span>
			</template>

			<!-- Actual win -->
			<template #item.actualWin="{ item }">
				<span :class="Number(item.raw.actualWin) > 0 ? 'amount-win' : 'text-disabled'">
					₺{{ formatMoney(item.raw.actualWin) }}
				</span>
			</template>

			<!-- Event count -->
			<template #item.eventCount="{ item }">
				<VChip color="primary" size="small" variant="outlined">
					{{ item.raw.eventCount || item.raw.details?.length || 0 }}
				</VChip>
			</template>

			<!-- Status -->
			<template #item.status="{ item }">
				<VChip :color="statusColor(item.raw.status)" size="small">
					{{ statusLabel(item.raw.status) }}
				</VChip>
			</template>

			<!-- Date -->
			<template #item.createdAt="{ item }">
				<div class="date-cell">{{ formatDate(item.raw.createdAt) }}</div>
			</template>

			<!-- Actions -->
			<template #item.actions="{ item }">
				<VBtn
					icon
					size="small"
					variant="text"
					color="primary"
					@click="viewDetail(item.raw)"
				>
					<VIcon icon="tabler-eye" />
					<VTooltip activator="parent" location="top">
						{{ t("sportsBetHistory.details") }}
					</VTooltip>
				</VBtn>
			</template>

			<!-- Empty -->
			<template #no-data>
				<div class="d-flex flex-column align-center pa-6 text-disabled">
					<VIcon icon="tabler-mood-empty" size="32" class="mb-2" />
					<span>{{ t("sportsBetHistory.empty") }}</span>
				</div>
			</template>
		</VDataTableServer>

		<VDivider />

		<VCardText class="history-summary">
			<div class="summary-item">
				<span class="summary-label">{{ t("sportsBetHistory.totalRecords") }}</span>
				<strong>{{ summary.totalRecords }}</strong>
			</div>
			<div class="summary-item">
				<span class="summary-label">{{ t("sportsBetHistory.summaryStake") }}</span>
				<strong class="amount-bet">₺{{ formatMoney(summary.totalStake) }}</strong>
			</div>
			<div class="summary-item">
				<span class="summary-label">{{ t("sportsBetHistory.summaryWin") }}</span>
				<strong class="amount-win">₺{{ formatMoney(summary.totalWin) }}</strong>
			</div>
			<div class="summary-item">
				<span class="summary-label">{{ t("sportsBetHistory.summaryProfit") }}</span>
				<strong :class="Number(summary.netProfit) >= 0 ? 'amount-win' : 'amount-bet'">
					{{ Number(summary.netProfit) > 0 ? "+" : "" }}₺{{ formatMoney(summary.netProfit) }}
				</strong>
			</div>
		</VCardText>
	</VCard>

	<!-- Coupon Detail Dialog -->
	<VDialog v-model="isDetailDialogVisible" max-width="800">
		<VCard v-if="selectedBet">
			<VCardTitle class="d-flex justify-space-between align-center pa-4">
				<div class="d-flex align-center gap-2">
					<span>{{ t("sportsBetHistory.couponDetail") }}</span>
					<VChip v-if="selectedBet.betType" size="x-small" color="info" variant="tonal">
						{{ betTypeLabel(selectedBet.betType) }}
					</VChip>
					<VChip v-if="selectedBet.isLive" size="x-small" color="error">
						{{ t("sportsBetHistory.live") }}
					</VChip>
				</div>
				<VChip :color="statusColor(selectedBet.status)" size="small">
					{{ statusLabel(selectedBet.status) }}
				</VChip>
			</VCardTitle>

			<VDivider />

			<VCardText>
				<VRow class="mb-4">
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.couponId") }}</div>
						<div class="font-weight-medium">{{ selectedBet.externalCouponId || selectedBet._id }}</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.stake") }}</div>
						<div class="font-weight-medium">₺{{ formatMoney(selectedBet.amount) }}</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.totalOdds") }}</div>
						<div class="font-weight-medium">{{ Number(selectedBet.totalOdds || 1).toFixed(2) }}</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.potentialWin") }}</div>
						<div class="font-weight-medium text-success">₺{{ formatMoney(selectedBet.potentialWin) }}</div>
					</VCol>
				</VRow>

				<VRow class="mb-4">
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.actualWin") }}</div>
						<div
							class="font-weight-bold"
							:class="Number(selectedBet.actualWin) > 0 ? 'text-success' : ''"
						>
							₺{{ formatMoney(selectedBet.actualWin) }}
						</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.rakeback") }}</div>
						<div class="font-weight-medium">₺{{ formatMoney(selectedBet.rakeback) }}</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.affiliate") }}</div>
						<div class="font-weight-medium">₺{{ formatMoney(selectedBet.affiliateCommission) }}</div>
					</VCol>
					<VCol cols="6" sm="3">
						<div class="text-sm text-disabled">{{ t("sportsBetHistory.date") }}</div>
						<div class="font-weight-medium">{{ formatDate(selectedBet.createdAt) }}</div>
					</VCol>
				</VRow>

				<div class="text-subtitle-1 font-weight-medium mb-3">
					{{ t("sportsBetHistory.matchDetails") }}
					({{ selectedBet.details?.length || 0 }} {{ t("sportsBetHistory.selections") }})
				</div>

				<VCard
					v-for="(event, index) in selectedBet.details"
					:key="index"
					variant="outlined"
					class="mb-2"
				>
					<VCardText class="pa-3">
						<div class="d-flex justify-space-between align-start mb-2">
							<div>
								<div class="d-flex align-center gap-2 mb-1">
									<VChip size="x-small" color="primary" variant="tonal">
										{{ index + 1 }}
									</VChip>
									<span class="font-weight-medium">
										{{
											event.matchTitle
												|| (event.homeTeam && event.awayTeam
													? `${event.homeTeam} vs ${event.awayTeam}`
													: t("unknown"))
										}}
									</span>
								</div>
								<div class="d-flex gap-2 text-xs text-disabled" v-if="event.leagueName || event.sportType">
									<VChip v-if="event.sportType" size="x-small" color="info" variant="flat">
										{{ event.sportType }}
									</VChip>
									<span v-if="event.leagueName">{{ event.leagueName }}</span>
								</div>
							</div>
							<div class="d-flex flex-column align-end gap-1">
								<VChip :color="statusColor(event.status)" size="x-small">
									{{ statusLabel(event.status) }}
								</VChip>
								<VChip v-if="event.isLive" color="error" size="x-small">
									{{ t("sportsBetHistory.live") }}
								</VChip>
							</div>
						</div>

						<VCard variant="flat" color="grey-lighten-5" class="mt-3">
							<VCardText class="pa-2 d-flex align-center gap-3">
								<div class="text-xs text-disabled text-uppercase">
									{{ event.marketName || event.marketType || t("sportsBetHistory.market") }}
								</div>
								<div class="font-weight-medium flex-grow-1">
									{{ event.displayText || event.pick || "-" }}
								</div>
								<VChip color="primary" size="small" variant="elevated">
									@{{ Number(event.odds || 1).toFixed(2) }}
								</VChip>
							</VCardText>
						</VCard>

						<div class="d-flex flex-wrap gap-3 mt-2 text-xs" v-if="event.finalScore || event.startTimestamp">
							<div v-if="event.startTimestamp" class="d-flex align-center gap-1">
								<VIcon icon="tabler-calendar" size="14" />
								{{ new Date(event.startTimestamp).toLocaleString("tr-TR") }}
							</div>
							<div v-if="event.finalScore" class="d-flex align-center gap-1 text-success font-weight-medium">
								<VIcon icon="tabler-trophy" size="14" />
								{{ event.finalScore }}
							</div>
						</div>
					</VCardText>
				</VCard>

				<div v-if="!selectedBet.details?.length" class="text-center text-disabled py-4">
					{{ t("sportsBetHistory.noEvents") }}
				</div>
			</VCardText>

			<VDivider />

			<VCardActions class="pa-4">
				<VSpacer />
				<VBtn color="secondary" variant="outlined" @click="isDetailDialogVisible = false">
					{{ t("sportsBetHistory.close") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<style scoped lang="scss">
.amount-bet {
	color: rgb(var(--v-theme-error));
	font-weight: 600;
}

.amount-win {
	color: rgb(var(--v-theme-success));
	font-weight: 600;
}

.date-cell {
	white-space: nowrap;
}

.history-summary {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12px;
	background: rgba(var(--v-theme-on-surface), 0.025);
}

.summary-item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 12px;
	border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
	border-radius: 8px;
	font-variant-numeric: tabular-nums;
}

.summary-label {
	color: rgba(var(--v-theme-on-surface), 0.6);
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.02em;
}

@media (max-width: 960px) {
	.history-summary {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
