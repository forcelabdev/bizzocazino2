<script setup>
import axios from "@/plugins/axios";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// "Bugün" = TR (Europe/Istanbul, UTC+3) gününün 00:00'ından itibaren.
// Son 24 saat kartlarından farklı olarak gün başlangıcına sabittir.
const todayData = ref({
	depositsTodayTry: 0,
	withdrawalsTodayTry: 0,
	bonusTodayTry: 0,
	freeSpinsTodayCount: 0,
	freeSpinsTodayWinTry: 0,
});

const fetchAnalytics = async () => {
	try {
		const res = await axios.get("/admin/analytics");
		if (res.data.success) {
			const d = res.data.data;
			todayData.value = {
				depositsTodayTry: d.depositsTodayTry || 0,
				withdrawalsTodayTry: d.withdrawalsTodayTry || 0,
				bonusTodayTry: d.bonusTodayTry || 0,
				freeSpinsTodayCount: d.freeSpinsTodayCount || 0,
				freeSpinsTodayWinTry: d.freeSpinsTodayWinTry || 0,
			};
		}
	} catch (err) {
		console.error("Analytics (today) fetch error:", err);
	}
};

const formatValue = (value) => {
	return Number(value).toLocaleString("tr-TR", {
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
		<VCardItem>
			<VCardTitle class="d-flex align-center ga-2">
				{{ t("analytics.todaySummary") }}
				<VChip color="primary" variant="tonal" size="small">
					TR
				</VChip>
			</VCardTitle>
		</VCardItem>

		<VCardText>
			<VRow>
				<!-- Bugünkü Yatırım -->
				<VCol cols="12" sm="6" lg="3">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar rounded size="32" color="success" variant="tonal" class="me-3">
								<VIcon size="20" icon="tabler-arrow-down-circle" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.depositsToday") }}
							</h6>
						</div>
						<h3 class="text-h5 font-weight-bold mb-0">
							{{ formatValue(todayData.depositsTodayTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<!-- Bugünkü Çekim -->
				<VCol cols="12" sm="6" lg="3">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar rounded size="32" color="error" variant="tonal" class="me-3">
								<VIcon size="20" icon="tabler-arrow-up-circle" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.withdrawalsToday") }}
							</h6>
						</div>
						<h3 class="text-h5 font-weight-bold mb-0">
							{{ formatValue(todayData.withdrawalsTodayTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<!-- Bugünkü Bonus -->
				<VCol cols="12" sm="6" lg="3">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar rounded size="32" color="warning" variant="tonal" class="me-3">
								<VIcon size="20" icon="tabler-gift" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.bonusToday") }}
							</h6>
						</div>
						<h3 class="text-h5 font-weight-bold mb-0">
							{{ formatValue(todayData.bonusTodayTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<!-- Bugünkü Freespin -->
				<VCol cols="12" sm="6" lg="3">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar rounded size="32" color="info" variant="tonal" class="me-3">
								<VIcon size="20" icon="tabler-sparkles" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.freeSpinsToday") }}
							</h6>
						</div>
						<h3 class="text-h5 font-weight-bold mb-0">
							{{ todayData.freeSpinsTodayCount }} {{ t("analytics.freeSpinsTodayCount") }}
						</h3>
						<div class="text-caption text-disabled mt-1">
							{{ t("analytics.freeSpinsTodayWin") }}:
							{{ formatValue(todayData.freeSpinsTodayWinTry) }} ₺
							<VTooltip :text="t('analytics.approxNotice')" location="top">
								<template #activator="{ props }">
									<VIcon v-bind="props" size="14" icon="tabler-info-circle" class="ms-1" />
								</template>
							</VTooltip>
						</div>
					</VCard>
				</VCol>
			</VRow>
		</VCardText>
	</VCard>
</template>
