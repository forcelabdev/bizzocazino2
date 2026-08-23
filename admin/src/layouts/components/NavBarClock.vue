<script setup>
import { useTimeMode } from "@/composables/useTimeMode"

const { mode, setMode, TR_LABEL, PC_LABEL } = useTimeMode()

// Her saniye güncellenen "şimdi" zamanı
const now = ref(new Date())
let timer = null

onMounted(() => {
	timer = window.setInterval(() => {
		now.value = new Date()
	}, 1000)
})

onBeforeUnmount(() => {
	if (timer)
		window.clearInterval(timer)
})

// Cihazın yerel saat dilimi adı (örn. Europe/Istanbul)
const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

const timeFormatter = computed(() => {
	return new Intl.DateTimeFormat("tr-TR", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
		timeZone: mode.value === "tr" ? "Europe/Istanbul" : localTimeZone,
	})
})

const dateFormatter = computed(() => {
	return new Intl.DateTimeFormat("tr-TR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: mode.value === "tr" ? "Europe/Istanbul" : localTimeZone,
	})
})

const displayTime = computed(() => timeFormatter.value.format(now.value))
const displayDate = computed(() => dateFormatter.value.format(now.value))

const activeLabel = computed(() => (mode.value === "tr" ? TR_LABEL : PC_LABEL))
</script>

<template>
	<VMenu location="bottom end" offset="4">
		<template #activator="{ props }">
			<div
				v-bind="props"
				class="navbar-clock d-none d-md-flex align-center gap-x-2 rounded px-3 py-1 cursor-pointer"
				role="button"
				:title="`Saat modu: ${activeLabel}`"
			>
				<VIcon size="20" icon="tabler-clock" />
				<div class="d-flex flex-column leading-none">
					<span class="text-sm font-weight-medium text-mono">{{ displayTime }}</span>
					<span class="text-xs text-disabled">{{ activeLabel }}</span>
				</div>
			</div>
		</template>

		<VList min-width="240" density="compact">
			<VListSubheader>Saat Dilimi</VListSubheader>

			<VListItem
				:active="mode === 'tr'"
				@click="setMode('tr')"
			>
				<template #prepend>
					<VIcon icon="tabler-flag" size="20" class="me-2" />
				</template>
				<VListItemTitle>{{ TR_LABEL }}</VListItemTitle>
				<VListItemSubtitle>{{ displayDate }}</VListItemSubtitle>
				<template #append>
					<VIcon v-if="mode === 'tr'" icon="tabler-check" size="18" color="primary" />
				</template>
			</VListItem>

			<VListItem
				:active="mode === 'pc'"
				@click="setMode('pc')"
			>
				<template #prepend>
					<VIcon icon="tabler-device-laptop" size="20" class="me-2" />
				</template>
				<VListItemTitle>{{ PC_LABEL }}</VListItemTitle>
				<VListItemSubtitle>{{ localTimeZone }}</VListItemSubtitle>
				<template #append>
					<VIcon v-if="mode === 'pc'" icon="tabler-check" size="18" color="primary" />
				</template>
			</VListItem>
		</VList>
	</VMenu>
</template>

<style lang="scss" scoped>
.navbar-clock {
	border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
	transition: border-color 0.2s ease;

	&:hover {
		border-color: rgba(var(--v-theme-primary), 0.5);
	}
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
