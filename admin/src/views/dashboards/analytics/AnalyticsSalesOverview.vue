<script setup>
import axios from "@/plugins/axios";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const analyticsData = ref({
	// Toplam
	totalDepositsTry: 0,
	totalWithdrawalsTry: 0,
	deposits24hTry: 0,
	withdrawals24hTry: 0,
	// Crypto detay
	cryptoDepositsTry: 0,
	cryptoWithdrawalsTry: 0,
	// Bank detay
	bankDepositsTry: 0,
	bankWithdrawalsTry: 0,
});

// API'den veri çek
const fetchAnalytics = async () => {
	try {
		const res = await axios.get("/admin/analytics");
		if (res.data.success) {
			const d = res.data.data;
			analyticsData.value = {
				totalDepositsTry: d.totalDepositsTry || 0,
				totalWithdrawalsTry: d.totalWithdrawalsTry || 0,
				deposits24hTry: d.deposits24hTry || 0,
				withdrawals24hTry: d.withdrawals24hTry || 0,
				cryptoDepositsTry: d.cryptoDepositsTry || 0,
				cryptoWithdrawalsTry: d.cryptoWithdrawalsTry || 0,
				bankDepositsTry: d.bankDepositsTry || 0,
				bankWithdrawalsTry: d.bankWithdrawalsTry || 0,
			};
		}
	} catch (err) {
		console.error("Analytics fetch error:", err);
	}
};

// TRY formatla
const formatValue = (value) => {
	return Number(value).toLocaleString("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

// Kar/Zarar
const profit = computed(() => {
	return (
		analyticsData.value.totalDepositsTry -
		analyticsData.value.totalWithdrawalsTry
	);
});

onMounted(() => {
	fetchAnalytics();
});
</script>

<template>
	<VCard>
		<VCardItem>
			<VCardTitle>{{ t("analytics.financialOverview") }}</VCardTitle>
		</VCardItem>

		<VCardText>
			<VRow>
				<!-- Row 1: Toplamlar -->
				<VCol cols="12" md="6">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="success"
								variant="tonal"
								class="me-3"
							>
								<VIcon
									size="20"
									icon="tabler-arrow-down-circle"
								/>
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.totalDeposits") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ formatValue(analyticsData.totalDepositsTry) }} ₺
						</h3>
						<div class="text-caption text-disabled mt-1">
							Crypto:
							{{ formatValue(analyticsData.cryptoDepositsTry) }} ₺
							| Banka:
							{{ formatValue(analyticsData.bankDepositsTry) }} ₺
						</div>
					</VCard>
				</VCol>

				<VCol cols="12" md="6">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="error"
								variant="tonal"
								class="me-3"
							>
								<VIcon
									size="20"
									icon="tabler-arrow-up-circle"
								/>
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.totalWithdrawals") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{
								formatValue(analyticsData.totalWithdrawalsTry)
							}}
							₺
						</h3>
						<div class="text-caption text-disabled mt-1">
							Crypto:
							{{
								formatValue(analyticsData.cryptoWithdrawalsTry)
							}}
							₺ | Banka:
							{{
								formatValue(analyticsData.bankWithdrawalsTry)
							}}
							₺
						</div>
					</VCard>
				</VCol>

				<!-- Row 2: 24h -->
				<VCol cols="12" md="6">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="info"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="20" icon="tabler-calendar-plus" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.deposits24h") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ formatValue(analyticsData.deposits24hTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<VCol cols="12" md="6">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="warning"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="20" icon="tabler-calendar-minus" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.withdrawals24h") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ formatValue(analyticsData.withdrawals24hTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<!-- Row 3: Profit / Loss -->
				<VCol cols="12">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center justify-center mb-2">
							<VAvatar
								rounded
								size="36"
								:color="profit >= 0 ? 'success' : 'error'"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="22" icon="tabler-scale" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{
									profit >= 0
										? t("analytics.profit")
										: t("analytics.loss")
								}}
							</h6>
						</div>
						<h2
							class="text-h3 text-center font-weight-bold mb-0"
							:class="profit >= 0 ? 'text-success' : 'text-error'"
						>
							{{ formatValue(Math.abs(profit)) }} ₺
						</h2>
					</VCard>
				</VCol>
			</VRow>
		</VCardText>
	</VCard>
</template>
