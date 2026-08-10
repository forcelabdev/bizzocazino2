<script setup>
import axios from "@/plugins/axios";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";

import AnalyticsEarningReportsWeeklyOverview from "@/views/dashboards/analytics/AnalyticsEarningReportsWeeklyOverview.vue";
import AnalyticsProjectTable from "@/views/dashboards/analytics/AnalyticsProjectTable.vue";
import AnalyticsSalesByCountries from "@/views/dashboards/analytics/AnalyticsSalesByCountries.vue";
import AnalyticsSalesOverview from "@/views/dashboards/analytics/AnalyticsSalesOverview.vue";
import AnalyticsSourceVisits from "@/views/dashboards/analytics/AnalyticsSourceVisits.vue";
import AnalyticsTotalEarning from "@/views/dashboards/analytics/AnalyticsTotalEarning.vue";
import AnalyticsWebsiteAnalytics from "@/views/dashboards/analytics/AnalyticsWebsiteAnalytics.vue";

// i18n
const { t } = useI18n();

// Theme
const vuetifyTheme = useTheme();
const currentTheme = vuetifyTheme.current.value.colors;

// State - TRY bazlı
const analyticsData = ref({
	totalDepositsTry: 0,
	totalWithdrawalsTry: 0,
	// Crypto detay
	cryptoDepositsTry: 0,
	cryptoWithdrawalsTry: 0,
	// Bank detay
	bankDepositsTry: 0,
	bankWithdrawalsTry: 0,
});

// Para birimi artık sabit TRY
const displayCurrency = "₺";

// Backend verilerini çek
const fetchAnalytics = async () => {
	try {
		const res = await axios.get("/admin/analytics");
		if (res.data.success) {
			analyticsData.value.totalDepositsTry =
				res.data.data.totalDepositsTry || 0;
			analyticsData.value.totalWithdrawalsTry =
				res.data.data.totalWithdrawalsTry || 0;
			analyticsData.value.cryptoDepositsTry =
				res.data.data.cryptoDepositsTry || 0;
			analyticsData.value.cryptoWithdrawalsTry =
				res.data.data.cryptoWithdrawalsTry || 0;
			analyticsData.value.bankDepositsTry =
				res.data.data.bankDepositsTry || 0;
			analyticsData.value.bankWithdrawalsTry =
				res.data.data.bankWithdrawalsTry || 0;
		}
	} catch (err) {
		console.error("Analytics fetch error:", err);
	}
};

const formatValue = (value) => {
	return Number(value).toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

// Profit / Loss Card
const statisticsVertical = computed(() => {
	const profit =
		analyticsData.value.totalDepositsTry -
		analyticsData.value.totalWithdrawalsTry;

	return {
		title: profit >= 0 ? t("analytics.profit") : t("analytics.loss"),
		color: profit >= 0 ? "success" : "error",
		icon: "tabler-coin",
		stats: formatValue(Math.abs(profit)) + " " + displayCurrency,
		series: [{ data: [profit] }],
		chartOptions: {
			chart: {
				height: 110,
				type: "area",
				parentHeightOffset: 0,
				toolbar: { show: false },
				sparkline: { enabled: true },
			},
			tooltip: { enabled: false },
			markers: {
				colors: "transparent",
				strokeColors: "transparent",
			},
			grid: { show: false },
			colors: [profit >= 0 ? currentTheme.success : currentTheme.error],
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 0.8,
					opacityFrom: 0.6,
					opacityTo: 0.1,
				},
			},
			dataLabels: { enabled: false },
			stroke: {
				width: 2,
				curve: "smooth",
			},
			xaxis: {
				show: true,
				lines: { show: false },
				labels: { show: false },
				stroke: { width: 0 },
				axisBorder: { show: false },
			},
			yaxis: {
				stroke: { width: 0 },
				show: false,
			},
		},
		height: 97,
	};
});

onMounted(() => {
	fetchAnalytics();
});
</script>

<template>
	<VRow class="match-height">
		<!-- 👉 Website analytics -->
		<VCol cols="12" md="6">
			<AnalyticsWebsiteAnalytics />
		</VCol>

		<!-- 👉 Sales Overview -->
		<VCol cols="12" md="6">
			<AnalyticsSalesOverview />
		</VCol>

		<!-- 👉 Earning Reports Weekly Overview -->
		<VCol cols="12" md="6" style="display: none">
			<AnalyticsEarningReportsWeeklyOverview />
		</VCol>

		<!-- 👉 Support Tracker -->
		<VCol cols="12" md="6" style="display: none">
			<AnalyticsSupportTracker />
		</VCol>

		<!-- 👉 Sales by Countries -->
		<VCol cols="12" sm="6" lg="4" style="display: none">
			<AnalyticsSalesByCountries />
		</VCol>

		<!-- 👉 Total Earning -->
		<VCol cols="12" md="12">
			<AnalyticsTotalEarning />
		</VCol>

		<!-- 👉 Source Visits -->
		<VCol cols="12" sm="6" lg="4" style="display: none">
			<AnalyticsSourceVisits />
		</VCol>

		<!-- 👉 Project Table -->
		<VCol cols="12" lg="8" style="display: none">
			<AnalyticsProjectTable />
		</VCol>
	</VRow>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";
</style>

<route lang="yaml">
meta:
    action: read
    subject: dashboard
</route>
