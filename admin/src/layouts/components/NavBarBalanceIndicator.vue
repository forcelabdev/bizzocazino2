<script setup>
import axios from "@axios"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useAppAbility } from "@/plugins/casl/useAppAbility"

const ability = useAppAbility()

// Sadece Bakiye Analizi sayfasını görebilen roller navbar'da bu göstergeyi de görsün.
const canViewBalanceAnalysis = computed(() => {
	return (
		ability.can("read", "finance.balanceAnalysis") ||
		ability.can("manage", "finance.balanceAnalysis") ||
		ability.can("manage", "all")
	)
})

const remainingAgentBalance = ref(null)
const remainingBonusBalance = ref(null)
const remainingTrialBonusBalance = ref(null)
const loading = ref(false)

const formatMoney = value => {
	if (value === null || value === undefined) return "—"
	const number = Number(value || 0)

	return `₺${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fetchSummary = async () => {
	if (!canViewBalanceAnalysis.value) return

	loading.value = true
	try {
		const res = await axios.get("/admin/balance-analysis/summary")

		remainingAgentBalance.value = res.data?.data?.remainingAgentBalance ?? 0
		remainingBonusBalance.value = res.data?.data?.remainingBonusBalance ?? 0
		remainingTrialBonusBalance.value = res.data?.data?.remainingTrialBonusBalance ?? 0
	} catch (error) {
		console.error("Navbar kalan bakiye özeti alınamadı:", error)
	} finally {
		loading.value = false
	}
}

let refreshTimer = null

onMounted(() => {
	fetchSummary()
	refreshTimer = window.setInterval(fetchSummary, 30000)
})

onBeforeUnmount(() => {
	if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
	<div
		v-if="canViewBalanceAnalysis"
		class="navbar-balance d-none d-lg-flex align-center gap-x-2"
	>
		<VTooltip location="bottom">
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="balance-pill balance-pill--agent d-flex align-center gap-x-2 rounded px-3 py-1"
				>
					<VIcon size="20" icon="tabler-wallet" />
					<div class="d-flex flex-column leading-none">
						<span class="text-sm font-weight-medium text-mono">{{ formatMoney(remainingAgentBalance) }}</span>
						<span class="text-xs text-disabled">Kalan Agent</span>
					</div>
				</div>
			</template>
			Kalan Agent Bakiyesi
		</VTooltip>

		<VTooltip location="bottom">
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="balance-pill balance-pill--bonus d-flex align-center gap-x-2 rounded px-3 py-1"
				>
					<VIcon size="20" icon="tabler-gift" />
					<div class="d-flex flex-column leading-none">
						<span class="text-sm font-weight-medium text-mono">{{ formatMoney(remainingBonusBalance) }}</span>
						<span class="text-xs text-disabled">Kalan Bonus</span>
					</div>
				</div>
			</template>
			Kalan Bonus Bakiyesi
		</VTooltip>

		<VTooltip location="bottom">
			<template #activator="{ props }">
				<div
					v-bind="props"
					class="balance-pill balance-pill--trial d-flex align-center gap-x-2 rounded px-3 py-1"
				>
					<VIcon size="20" icon="tabler-flask" />
					<div class="d-flex flex-column leading-none">
						<span class="text-sm font-weight-medium text-mono">{{ formatMoney(remainingTrialBonusBalance) }}</span>
						<span class="text-xs text-disabled">Kalan Deneme Bonusu</span>
					</div>
				</div>
			</template>
			Kalan Deneme Bonus Bakiyesi
		</VTooltip>
	</div>
</template>

<style lang="scss" scoped>
.balance-pill {
	border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
	transition: border-color 0.2s ease;

	&:hover {
		border-color: rgba(var(--v-theme-primary), 0.5);
	}
}

.balance-pill--agent {
	border-color: rgba(var(--v-theme-success), 0.35);
}

.balance-pill--bonus {
	border-color: rgba(var(--v-theme-warning), 0.35);
}

.balance-pill--trial {
	border-color: rgba(var(--v-theme-info), 0.35);
}

.text-mono {
	font-family: "Courier New", monospace;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.5px;
}

.leading-none {
	line-height: 1.1;
}
</style>
