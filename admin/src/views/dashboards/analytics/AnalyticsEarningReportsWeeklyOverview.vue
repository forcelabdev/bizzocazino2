<script setup>
import { hexToRgb } from "@layouts/utils";
import axios from "@/plugins/axios";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import VueApexCharts from "vue3-apexcharts";
import { useTheme } from "vuetify";

const { t } = useI18n();
const vuetifyTheme = useTheme();

// Backend'den gelen veriler (TRY bazlı)
const betsData = ref({
	betsAllTry: 0,
	totalWonTry: 0,
});

// Grafik için dummy haftalık değerler (ileride backend'den gelecek)
const series = ref([
	{
		data: [0, 0, 0, 0, 0, 0, 0], // Mo-Su
	},
]);

// Grafik teması
const chartOptions = computed(() => {
	const currentTheme = vuetifyTheme.current.value.colors;
	const variableTheme = vuetifyTheme.current.value.variables;

	return {
		chart: {
			parentHeightOffset: 0,
			type: "bar",
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				barHeight: "60%",
				columnWidth: "55%",
				borderRadius: 4,
				distributed: true,
			},
		},
		grid: { show: false },
		colors: Array(7)
			.fill(
				`rgba(${hexToRgb(currentTheme.primary)},${
					variableTheme["pressed-opacity"]
				})`
			)
			.map((c, i) =>
				i === 4 ? `rgba(${hexToRgb(currentTheme.primary)}, 1)` : c
			),
		dataLabels: { enabled: false },
		legend: { show: false },
		xaxis: {
			categories: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			labels: {
				style: {
					colors: `rgba(${hexToRgb(currentTheme["on-surface"])},${
						variableTheme["disabled-opacity"]
					})`,
					fontSize: "13px",
					fontFamily: "Public Sans",
				},
			},
		},
		yaxis: { labels: { show: false } },
		tooltip: { enabled: false },
	};
});

// Verileri backend'den al
const fetchAnalytics = async () => {
	try {
		const res = await axios.get("/admin/analytics");
		if (res.data.success) {
			const d = res.data.data;
			betsData.value.betsAllTry = d.betsAllTry || 0;
			betsData.value.totalWonTry = d.totalWonTry || 0;

			// TODO: eğer backend haftalık breakdown verirse buraya set edilecek
			// series.value[0].data = d.betsWeekly || [..]
		}
	} catch (err) {
		console.error("Analytics fetch error:", err);
	}
};

// TRY formatla
const formatValue = (value) => {
	return Number(value || 0).toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

onMounted(() => {
	fetchAnalytics();
});
</script>

<template>
	<VCard>
		<VCardItem class="pb-sm-0">
			<VCardTitle>{{ t("analytics.betsOverview") }}</VCardTitle>
		</VCardItem>

		<VCardText class="mt-sm-n6">
			<VRow>
				<VCol
					cols="12"
					sm="5"
					class="d-flex flex-column align-self-end"
				>
					<div class="d-flex align-center gap-2 mb-2 pb-1 flex-wrap">
						<h4 class="text-4xl font-weight-medium">
							{{ formatValue(betsData.betsAllTry) }} ₺
						</h4>
						<VChip label color="primary">{{
							t("analytics.betsAll")
						}}</VChip>
					</div>

					<p class="text-sm">
						{{ t("analytics.totalBetsDesc") }}
					</p>
				</VCol>

				<VCol cols="12" sm="7" class="pt-0">
					<VueApexCharts
						:options="chartOptions"
						:series="series"
						height="190"
					/>
				</VCol>
			</VRow>

			<div class="border rounded mt-3 px-5 py-4">
				<VRow>
					<VCol cols="12" sm="6">
						<div class="d-flex align-center">
							<VAvatar
								rounded
								size="26"
								color="primary"
								variant="tonal"
								class="me-2"
							>
								<VIcon size="18" icon="tabler-coin" />
							</VAvatar>
							<h6 class="text-base font-weight-medium">
								{{ t("analytics.betsAll") }}
							</h6>
						</div>
						<h4 class="text-h4 my-3">
							{{ formatValue(betsData.betsAllTry) }} ₺
						</h4>
					</VCol>

					<VCol cols="12" sm="6">
						<div class="d-flex align-center">
							<VAvatar
								rounded
								size="26"
								color="success"
								variant="tonal"
								class="me-2"
							>
								<VIcon size="18" icon="tabler-trophy" />
							</VAvatar>
							<h6 class="text-base font-weight-medium">
								{{ t("analytics.totalWon") }}
							</h6>
						</div>
						<h4 class="text-h4 my-3">
							{{ formatValue(betsData.totalWonTry) }} ₺
						</h4>
					</VCol>
				</VRow>
			</div>
		</VCardText>
	</VCard>
</template>
