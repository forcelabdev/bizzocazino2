<script setup>
import axios from "@axios"
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames"
import { exportToXlsx } from "@/utils/exportXlsx"
import { computed, ref, watch, watchEffect } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
const route = useRoute()
const { formatProviderDisplayName, loadProviderDisplayNames } = useProviderDisplayNames()

const props = defineProps({
	userId: {
		type: String,
		default: null,
	},
})

// Props üzerinden userId gelirse onu kullan, yoksa route params'tan al
const effectiveUserId = computed(() => props.userId || route.params.id)

// 📦 Tablo & sayfalama
const options = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
})

const isLoading = ref(false)
const isLoadingFilters = ref(false)
const totalItems = ref(0)
const gameHistory = ref([])
const userCurrency = ref("TRY")
const createEmptySummary = () => ({
	totalRecords: 0,
	totalBet: 0,
	totalWin: 0,
	netProfit: 0,
})
const historySummary = ref(createEmptySummary())

// 🔍 Filtreler
const filters = ref({
	source: "provider",
	provider: null,
	gameCode: null,
	search: "",
	dateFrom: null,
	dateTo: null,
	result: "all",
	merge: true, // round_id bazında merge
})

const providerOptions = ref([])
const gameOptions = ref([])

const sourceOptions = computed(() => [
	{ value: "provider", title: t("gameHistory.sourceProvider") },
	{ value: "internal", title: t("gameHistory.sourceInternal") },
	{ value: "all", title: t("gameHistory.sourceAll") },
])

const resultOptions = computed(() => [
	{ value: "all", title: t("gameHistory.resultAll") },
	{ value: "wins", title: t("gameHistory.resultWins") },
	{ value: "losses", title: t("gameHistory.resultLosses") },
	{ value: "bets", title: t("gameHistory.resultBets") },
])

const dateTimePickerConfig = {
	enableTime: true,
	enableSeconds: true,
	time_24hr: true,
	allowInput: true,
	dateFormat: "d.m.Y H:i:S",
}

const filteredGameOptions = computed(() => {
	if (!filters.value.provider) return gameOptions.value
	return gameOptions.value.filter(
		(g) => g.provider_code === providerCode.value,
	)
})

const providerCode = computed(() => {
	const p = providerOptions.value.find(
		(x) => String(x.id) === String(filters.value.provider),
	)
	return p?.code || null
})

const headers = computed(() => [
	{ title: t("gameHistory.userCode"), key: "user_code", sortable: false },
	{ title: t("gameHistory.vendor"), key: "provider", sortable: false },
	{ title: t("gameHistory.game"), key: "game_name", sortable: false },
	{ title: t("gameHistory.roundId"), key: "round_id", sortable: false },
	{ title: t("gameHistory.currency"), key: "currency", sortable: false, align: "center" },
	{ title: t("gameHistory.bet"), key: "bet_money", align: "end", sortable: false },
	{ title: t("gameHistory.win"), key: "win_money", align: "end", sortable: false },
	{ title: t("gameHistory.profit"), key: "profit", align: "end", sortable: false },
	{ title: t("gameHistory.real"), key: "real", align: "center", sortable: false },
	{ title: t("gameHistory.beforeBalance"), key: "balance_before", align: "end", sortable: false },
	{ title: t("gameHistory.afterBalance"), key: "balance_after", align: "end", sortable: false },
	{ title: t("gameHistory.bettingTime"), key: "created_at", sortable: false },
	{ title: t("gameHistory.processingDay"), key: "processing_day", sortable: false },
	{ title: t("gameHistory.completion"), key: "completed", align: "center", sortable: false },
])

// 💱 Helpers
const formatMoney = (val) => {
	const n = Number(val ?? 0)
	if (!Number.isFinite(n)) return "-"
	return n.toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	})
}

const formatDate = (val) => {
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

const formatDay = (val) => {
	if (!val) return "-"
	const d = new Date(val)
	return `${d.toLocaleDateString("tr-TR")}\n${d.toLocaleTimeString("tr-TR", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})}`
}

const parseFilterDate = value => {
	if (!value) return null
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

	const raw = String(value).trim()
	const match = raw.match(
		/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
	)

	if (match) {
		const [, day, month, year, hour = "00", minute = "00", second = "00"] = match
		const parsed = new Date(
			Number(year),
			Number(month) - 1,
			Number(day),
			Number(hour),
			Number(minute),
			Number(second),
		)
		const isValid =
			parsed.getFullYear() === Number(year) &&
			parsed.getMonth() === Number(month) - 1 &&
			parsed.getDate() === Number(day) &&
			parsed.getHours() === Number(hour) &&
			parsed.getMinutes() === Number(minute) &&
			parsed.getSeconds() === Number(second)

		return isValid ? parsed : null
	}

	const parsed = new Date(raw)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parsedDateFrom = computed(() => parseFilterDate(filters.value.dateFrom))
const parsedDateTo = computed(() => parseFilterDate(filters.value.dateTo))
const dateFromError = computed(() =>
	filters.value.dateFrom && !parsedDateFrom.value
		? t("gameHistory.invalidDate")
		: "",
)
const dateToError = computed(() => {
	if (filters.value.dateTo && !parsedDateTo.value) return t("gameHistory.invalidDate")
	if (
		parsedDateFrom.value &&
		parsedDateTo.value &&
		parsedDateFrom.value > parsedDateTo.value
	) return t("gameHistory.invalidDateRange")
	return ""
})

const truncate = (str, n = 12) => {
	if (!str) return "-"
	const s = String(str)
	return s.length > n ? `${s.slice(0, n)}…` : s
}

const copyToClipboard = (text) => {
	if (!text) return
	navigator.clipboard?.writeText(String(text))
}

// 🌐 Veri çekimleri
const fetchFilters = async () => {
	if (!effectiveUserId.value) return
	isLoadingFilters.value = true
	try {
		await loadProviderDisplayNames({ force: true })
		const { data } = await axios.get(
			`/admin/users/${effectiveUserId.value}/history/filters`,
		)
		providerOptions.value = (data.providers || []).map((provider) => ({
			...provider,
			name: formatProviderDisplayName(provider.code, provider.name),
		}))
		gameOptions.value = data.games || []
	} catch (err) {
		console.error("❌ Filter list error:", err)
		providerOptions.value = []
		gameOptions.value = []
	}
	isLoadingFilters.value = false
}

const fetchGameHistory = async () => {
	if (!effectiveUserId.value) return
	if (dateFromError.value || dateToError.value) {
		gameHistory.value = []
		totalItems.value = 0
		historySummary.value = createEmptySummary()
		return
	}

	isLoading.value = true

	try {
		const params = {
			page: options.value.page,
			itemsPerPage: options.value.itemsPerPage,
			source: filters.value.source,
			result: filters.value.result,
		}
		if (filters.value.provider) params.provider = filters.value.provider
		if (filters.value.gameCode) params.gameCode = filters.value.gameCode
		if (filters.value.search) params.search = filters.value.search
		if (parsedDateFrom.value) params.dateFrom = parsedDateFrom.value.toISOString()
		if (parsedDateTo.value) params.dateTo = parsedDateTo.value.toISOString()
		if (filters.value.source === "provider" && filters.value.merge === false) params.merge = "false"

		const { data } = await axios.get(
			`/admin/users/${effectiveUserId.value}/history`,
			{ params },
		)

		gameHistory.value = data.data || []
		totalItems.value = data.total || 0
		historySummary.value = {
			...createEmptySummary(),
			...(data.summary || {}),
		}

		if (data.currency) userCurrency.value = data.currency
	} catch (err) {
		console.error("❌ Error fetching game history:", err)
		gameHistory.value = []
		totalItems.value = 0
		historySummary.value = createEmptySummary()
	}

	isLoading.value = false
}

const resetFilters = () => {
	filters.value = {
		source: "provider",
		provider: null,
		gameCode: null,
		search: "",
		dateFrom: null,
		dateTo: null,
		result: "all",
		merge: true,
	}
	options.value.page = 1
}

// İlk yüklemede filtre listesini al
watchEffect(() => {
	if (effectiveUserId.value) fetchFilters()
})

// Filtreler değişince sayfa 1’e dön ve fetch
watch(
	() => ({ ...filters.value }),
	() => {
		options.value.page = 1
	},
	{ deep: true },
)

watch(
	() => filters.value.result,
	value => {
		if (value !== "all") filters.value.merge = true
	},
)

watchEffect(fetchGameHistory)

// 📤 Mevcut filtrelere göre üyenin oyun geçmişini xlsx olarak dışa aktar
const isExporting = ref(false)

const exportGameHistory = async () => {
	if (!effectiveUserId.value) return
	if (dateFromError.value || dateToError.value) return
	if (isExporting.value) return

	isExporting.value = true

	try {
		const params = {
			export: true,
			source: filters.value.source,
			result: filters.value.result,
		}
		if (filters.value.provider) params.provider = filters.value.provider
		if (filters.value.gameCode) params.gameCode = filters.value.gameCode
		if (filters.value.search) params.search = filters.value.search
		if (parsedDateFrom.value) params.dateFrom = parsedDateFrom.value.toISOString()
		if (parsedDateTo.value) params.dateTo = parsedDateTo.value.toISOString()
		if (filters.value.source === "provider" && filters.value.merge === false) params.merge = "false"

		const { data } = await axios.get(
			`/admin/users/${effectiveUserId.value}/history`,
			{ params },
		)

		const list = data.data || []

		if (!list.length) return

		const rows = list.map(item => ({
			[t("gameHistory.userCode")]: item.user_code || "",
			[t("gameHistory.vendor")]: formatProviderDisplayName(item.provider_code, item.provider) || item.provider || "",
			[t("gameHistory.game")]: item.game_name || "",
			[t("gameHistory.roundId")]: item.round_id || "",
			[t("gameHistory.currency")]: item.currency || userCurrency.value,
			[t("gameHistory.bet")]: Number(item.bet_money || 0),
			[t("gameHistory.win")]: Number(item.win_money || 0),
			[t("gameHistory.profit")]: Number(item.win_money || 0) - Number(item.bet_money || 0),
			[t("gameHistory.beforeBalance")]: Number(item.balance_before || 0),
			[t("gameHistory.afterBalance")]: Number(item.balance_after || 0),
			[t("gameHistory.bettingTime")]: formatDate(item.created_at),
		}))

		await exportToXlsx({
			rows,
			fileName: "oyun-gecmisi",
			sheetName: "Oyun Geçmişi",
			columnWidths: [22, 18, 22, 20, 12, 14, 14, 14, 16, 16, 20],
		})
	} catch (err) {
		console.error("❌ Oyun geçmişi dışa aktarılamadı:", err)
	} finally {
		isExporting.value = false
	}
}
</script>

<template>
	<section>
		<VCard>
			<VCardItem>
				<template #title>
					<div class="d-flex align-center gap-2">
						<VIcon icon="tabler-device-gamepad-2" size="22" />
						<span>{{ t("gameHistory.title") }}</span>
					</div>
				</template>
				<template #subtitle>
					{{ t("gameHistory.subtitle") }}
				</template>
			</VCardItem>

			<VDivider />

			<!-- 🔍 Filters -->
			<VCardText class="pb-0">
				<VRow dense>
					<VCol cols="12" md="3">
						<AppTextField
							v-model="filters.search"
							:placeholder="t('gameHistory.searchPlaceholder')"
							prepend-inner-icon="tabler-search"
							clearable
							density="comfortable"
						/>
					</VCol>

					<VCol cols="6" md="2">
						<AppSelect
							v-model="filters.provider"
							:items="providerOptions"
							:loading="isLoadingFilters"
							:placeholder="t('gameHistory.allProviders')"
							item-title="name"
							item-value="id"
							clearable
							density="comfortable"
						/>
					</VCol>

					<VCol cols="6" md="3">
						<AppSelect
							v-model="filters.gameCode"
							:items="filteredGameOptions"
							:loading="isLoadingFilters"
							:placeholder="t('gameHistory.allGames')"
							item-title="name"
							item-value="code"
							clearable
							density="comfortable"
						/>
					</VCol>

					<VCol cols="6" md="2">
						<AppDateTimePicker
							v-model="filters.dateFrom"
							:placeholder="t('gameHistory.from')"
							:config="dateTimePickerConfig"
							:error-messages="dateFromError"
							density="comfortable"
							clearable
						/>
					</VCol>

					<VCol cols="6" md="2">
						<AppDateTimePicker
							v-model="filters.dateTo"
							:placeholder="t('gameHistory.to')"
							:config="dateTimePickerConfig"
							:error-messages="dateToError"
							density="comfortable"
							clearable
						/>
					</VCol>
				</VRow>

				<VRow dense class="mt-1 align-center">
					<VCol cols="12" md="3">
						<AppSelect
							v-model="filters.source"
							:items="sourceOptions"
							density="comfortable"
							:label="t('gameHistory.source')"
						/>
					</VCol>

					<VCol cols="12" md="3">
						<AppSelect
							v-model="filters.result"
							:items="resultOptions"
							:label="t('gameHistory.result')"
							density="comfortable"
						/>
					</VCol>

					<VCol cols="6" md="2">
						<AppSelect
							:model-value="options.itemsPerPage"
							:items="[
								{ value: 10, title: '10' },
								{ value: 25, title: '25' },
								{ value: 50, title: '50' },
								{ value: 100, title: '100' },
							]"
							:label="t('gameHistory.perPage')"
							density="comfortable"
							@update:model-value="
								(val) => {
									options.itemsPerPage = parseInt(val, 10)
									options.page = 1
								}
							"
						/>
					</VCol>

					<VCol cols="12" md="4" class="d-flex justify-end align-center gap-2 flex-wrap">
						<VSwitch
							v-if="filters.source === 'provider'"
							v-model="filters.merge"
							:disabled="filters.result !== 'all'"
							:label="t('gameHistory.mergeRounds')"
							color="primary"
							density="compact"
							hide-details
							inset
						/>
						<VBtn
							variant="tonal"
							color="secondary"
							prepend-icon="tabler-restore"
							@click="resetFilters"
						>
							{{ t("gameHistory.reset") }}
						</VBtn>
						<VBtn
							color="primary"
							prepend-icon="tabler-refresh"
							:loading="isLoading"
							@click="fetchGameHistory"
						>
							{{ t("gameHistory.refresh") }}
						</VBtn>
						<VBtn
							color="success"
							variant="tonal"
							prepend-icon="tabler-file-spreadsheet"
							:loading="isExporting"
							@click="exportGameHistory"
						>
							Excel&apos;e Aktar
						</VBtn>
					</VCol>
				</VRow>
			</VCardText>

			<VDivider class="mt-4" />

			<!-- 📊 Mini stats -->
			<VCardText class="pa-3 d-flex flex-wrap gap-2 stats-row">
				<VChip color="info" variant="tonal" size="small">
					<VIcon start icon="tabler-database" />
					{{ t("gameHistory.totalRecords") }}: <b class="ms-1">{{ totalItems }}</b>
				</VChip>
				<VChip color="primary" variant="tonal" size="small">
					<VIcon start icon="tabler-coin" />
					{{ t("gameHistory.currency") }}: <b class="ms-1">{{ userCurrency }}</b>
				</VChip>
			</VCardText>

			<VDivider />

			<VDataTableServer
				v-model:page="options.page"
				v-model:items-per-page="options.itemsPerPage"
				:headers="headers"
				:items="gameHistory"
				:items-length="totalItems"
				:loading="isLoading"
				:items-per-page-options="[10, 25, 50, 100]"
				class="game-history-table text-no-wrap"
				density="comfortable"
				hover
			>
				<!-- User code -->
				<template #item.user_code="{ item }">
					<button
						type="button"
						class="mono-cell"
						:title="item.raw.user_code || effectiveUserId"
						@click="copyToClipboard(item.raw.user_code || effectiveUserId)"
					>
						{{ truncate(item.raw.user_code || effectiveUserId, 18) }}
					</button>
				</template>

				<!-- Vendor / Provider -->
				<template #item.provider="{ item }">
					<div class="d-flex flex-column">
						<span v-if="item.raw.provider" class="text-medium-emphasis">
							{{ formatProviderDisplayName(item.raw.provider_code, item.raw.provider) }}
						</span>
						<span v-else class="text-disabled">—</span>
						<span
							v-if="
								item.raw.channel &&
								item.raw.channel.toLowerCase() !==
									(item.raw.provider_code || '').toLowerCase()
							"
							class="channel-badge"
						>
							{{ formatProviderDisplayName(item.raw.channel) }}
						</span>
					</div>
				</template>

				<!-- Game name -->
				<template #item.game_name="{ item }">
					<div class="d-flex align-center gap-2">
						<VAvatar
							v-if="item.raw.banner"
							size="28"
							rounded
							:image="item.raw.banner"
						/>
						<span class="font-weight-medium text-primary">{{
							item.raw.game_name || item.raw.type || t("unknown")
						}}</span>
					</div>
				</template>

				<!-- RoundId -->
				<template #item.round_id="{ item }">
					<div class="d-flex flex-column align-start">
						<button
							type="button"
							class="round-pill"
							:title="item.raw.round_id"
							@click="copyToClipboard(item.raw.round_id)"
						>
							{{ truncate(item.raw.round_id, 16) }}
						</button>
						<span
							v-if="item.raw.txn_count && item.raw.txn_count > 1"
							class="merge-badge"
							:title="t('gameHistory.mergedHint')"
						>
							{{ item.raw.txn_count }}× {{ t("gameHistory.txn") }}
						</span>
					</div>
				</template>

				<!-- Currency -->
				<template #item.currency="{ item }">
					<VChip
						size="x-small"
						color="warning"
						variant="elevated"
						class="currency-chip"
					>
						{{ item.raw.currency || userCurrency }}
					</VChip>
				</template>

				<!-- Bet -->
				<template #item.bet_money="{ item }">
					<span v-if="Number(item.raw.bet_money)" class="amount-bet">
						₺{{ formatMoney(item.raw.bet_money) }}
					</span>
					<span v-else class="text-disabled">—</span>
				</template>

				<!-- Win -->
				<template #item.win_money="{ item }">
					<span v-if="Number(item.raw.win_money)" class="amount-win">
						₺{{ formatMoney(item.raw.win_money) }}
					</span>
					<span v-else class="text-disabled">—</span>
				</template>

				<!-- Profit -->
				<template #item.profit="{ item }">
					<span
						v-if="Number(item.raw.profit) !== 0 || item.raw.win_money !== undefined"
						:class="
							Number(item.raw.profit) > 0
								? 'amount-win'
								: Number(item.raw.profit) < 0
									? 'amount-bet'
									: 'text-disabled'
						"
					>
						<template v-if="Number(item.raw.profit) > 0">+₺{{ formatMoney(item.raw.profit) }}</template>
						<template v-else-if="Number(item.raw.profit) < 0">-₺{{ formatMoney(Math.abs(item.raw.profit)) }}</template>
						<template v-else>₺{{ formatMoney(0) }}</template>
					</span>
					<span v-else class="text-disabled">—</span>
				</template>

				<!-- Real -->
				<template #item.real="{ item }">
					<VAvatar
						size="22"
						:color="item.raw.real === false ? 'error' : 'success'"
						variant="tonal"
					>
						<VIcon
							size="14"
							:icon="item.raw.real === false ? 'tabler-x' : 'tabler-check'"
						/>
					</VAvatar>
				</template>

				<!-- Before balance -->
				<template #item.balance_before="{ item }">
					<span class="balance-cell">
						<template v-if="item.raw.balance_before != null">
							₺{{ formatMoney(item.raw.balance_before) }}
						</template>
						<template v-else>—</template>
					</span>
				</template>

				<!-- After balance -->
				<template #item.balance_after="{ item }">
					<span class="balance-cell">
						<template v-if="item.raw.balance_after != null">
							₺{{ formatMoney(item.raw.balance_after) }}
						</template>
						<template v-else>—</template>
					</span>
				</template>

				<!-- Betting time -->
				<template #item.created_at="{ item }">
					<div class="date-cell">{{ formatDate(item.raw.created_at || item.raw.createdAt) }}</div>
				</template>

				<!-- Processing day -->
				<template #item.processing_day="{ item }">
					<div class="date-cell">{{ formatDate(item.raw.created_at || item.raw.createdAt) }}</div>
				</template>

				<!-- Completion -->
				<template #item.completed="{ item }">
					<VAvatar
						size="22"
						:color="item.raw.completed === false ? 'warning' : 'success'"
						variant="tonal"
					>
						<VIcon
							size="14"
							:icon="
								item.raw.completed === false
									? 'tabler-clock'
									: 'tabler-check'
							"
						/>
					</VAvatar>
				</template>

				<!-- Empty -->
				<template #no-data>
					<div class="d-flex flex-column align-center pa-6 text-disabled">
						<VIcon icon="tabler-mood-empty" size="32" class="mb-2" />
						<span>{{ t("gameHistory.empty") }}</span>
					</div>
				</template>
			</VDataTableServer>

			<VDivider />

			<VCardText class="history-summary">
				<div class="summary-item">
					<span class="summary-label">{{ t("gameHistory.summaryRecords") }}</span>
					<strong>{{ historySummary.totalRecords }}</strong>
				</div>
				<div class="summary-item">
					<span class="summary-label">{{ t("gameHistory.summaryBet") }}</span>
					<strong class="amount-bet">
						{{ formatMoney(historySummary.totalBet) }} {{ userCurrency }}
					</strong>
				</div>
				<div class="summary-item">
					<span class="summary-label">{{ t("gameHistory.summaryWin") }}</span>
					<strong class="amount-win">
						{{ formatMoney(historySummary.totalWin) }} {{ userCurrency }}
					</strong>
				</div>
				<div class="summary-item">
					<span class="summary-label">{{ t("gameHistory.summaryProfit") }}</span>
					<strong
						:class="
							Number(historySummary.netProfit) > 0
								? 'amount-win'
								: Number(historySummary.netProfit) < 0
									? 'amount-bet'
									: 'text-disabled'
						"
					>
						{{ Number(historySummary.netProfit) > 0 ? "+" : "" }}{{ formatMoney(historySummary.netProfit) }} {{ userCurrency }}
					</strong>
				</div>
			</VCardText>
		</VCard>
	</section>
</template>

<style scoped lang="scss">
.stats-row {
	background: rgba(var(--v-theme-on-surface), 0.02);
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
	color: rgba(var(--v-theme-on-surface), 0.65);
	font-size: 0.75rem;
}

@media (max-width: 959px) {
	.history-summary {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 599px) {
	.history-summary {
		grid-template-columns: 1fr;
	}
}

.mono-cell {
	font-family: "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
	font-size: 0.78rem;
	color: rgb(var(--v-theme-primary));
	background: rgba(var(--v-theme-primary), 0.08);
	padding: 4px 8px;
	border-radius: 6px;
	cursor: pointer;
	border: none;
	transition: background 0.15s ease;

	&:hover {
		background: rgba(var(--v-theme-primary), 0.16);
	}
}

.round-pill {
	font-family: "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
	font-size: 0.78rem;
	color: rgb(var(--v-theme-info));
	background: rgba(var(--v-theme-info), 0.1);
	padding: 4px 8px;
	border-radius: 6px;
	cursor: pointer;
	border: none;

	&:hover {
		background: rgba(var(--v-theme-info), 0.18);
	}
}

.currency-chip {
	font-weight: 600 !important;
	letter-spacing: 0.5px;
}

.amount-bet {
	color: rgb(var(--v-theme-error));
	font-weight: 600;
}

.amount-win {
	color: rgb(var(--v-theme-success));
	font-weight: 600;
}

.balance-cell {
	color: rgba(var(--v-theme-on-surface), 0.85);
	font-variant-numeric: tabular-nums;
}

.date-cell {
	color: rgba(var(--v-theme-on-surface), 0.7);
	font-size: 0.8rem;
	line-height: 1.25;
	font-variant-numeric: tabular-nums;
}

.channel-badge {
	display: inline-block;
	margin-top: 2px;
	font-size: 0.65rem;
	letter-spacing: 0.5px;
	text-transform: uppercase;
	color: rgb(var(--v-theme-warning));
	background: rgba(var(--v-theme-warning), 0.1);
	padding: 1px 6px;
	border-radius: 4px;
	width: fit-content;
}

.merge-badge {
	display: inline-block;
	margin-top: 3px;
	font-size: 0.65rem;
	letter-spacing: 0.4px;
	color: rgb(var(--v-theme-secondary));
	background: rgba(var(--v-theme-secondary), 0.12);
	padding: 1px 6px;
	border-radius: 4px;
	width: fit-content;
}

.game-history-table :deep(thead th) {
	background: rgba(var(--v-theme-on-surface), 0.04);
	font-weight: 600 !important;
	font-size: 0.78rem !important;
	letter-spacing: 0.3px;
	text-transform: uppercase;
}

.game-history-table :deep(tbody tr:hover td) {
	background: rgba(var(--v-theme-primary), 0.04);
}
</style>
