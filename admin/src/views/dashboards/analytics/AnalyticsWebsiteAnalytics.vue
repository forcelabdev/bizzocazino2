<script setup>
import axios from "@/plugins/axios";
import { io } from "socket.io-client";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const analyticsData = ref({
	totalUsers: 0,
	newUsers24h: 0,
	activeUsers: 0,
	betsAllTry: 0,
});

let socket = null;

// API'den verileri çek
const fetchAnalytics = async () => {
	try {
		const res = await axios.get("/admin/analytics");
		if (res.data.success) {
			const d = res.data.data;
			analyticsData.value = {
				totalUsers: d.totalUsers || 0,
				newUsers24h: d.newUsers24h || 0,
				activeUsers: d.activeUsers || 0,
				betsAllTry: d.betsAllTry || 0,
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

onMounted(() => {
	fetchAnalytics();

	// Socket bağlantısı
	socket = io(import.meta.env.VITE_API_BASE_URL, {
		transports: ["websocket"], // websocket zorunlu kıl
		withCredentials: true,
	});

	// ✅ Backend "siteOnline" event gönderiyor
	socket.on("siteOnline", (data) => {
		analyticsData.value.activeUsers = data.online;
	});
});

onBeforeUnmount(() => {
	if (socket) {
		socket.disconnect();
	}
});
</script>

<template>
	<VCard>
		<VCardItem>
			<VCardTitle>{{ t("analytics.usersAndBets") }}</VCardTitle>
		</VCardItem>

		<VCardText>
			<VRow>
				<!-- Row 1: Kullanıcılar -->
				<VCol cols="12" md="6">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="primary"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="20" icon="tabler-users" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.totalUsers") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ analyticsData.totalUsers }}
						</h3>
					</VCard>
				</VCol>

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
								<VIcon size="20" icon="tabler-user-plus" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.newUsers24h") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ analyticsData.newUsers24h }}
						</h3>
					</VCard>
				</VCol>

				<!-- Row 2: Bahisler -->
				<VCol cols="12">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center mb-2">
							<VAvatar
								rounded
								size="32"
								color="info"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="20" icon="tabler-coin" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.totalBets") }}
							</h6>
						</div>
						<h3 class="text-h4 font-weight-bold mb-0">
							{{ formatValue(analyticsData.betsAllTry) }} ₺
						</h3>
					</VCard>
				</VCol>

				<!-- Row 3: Aktif Kullanıcı -->
				<VCol cols="12">
					<VCard class="pa-4" outlined>
						<div class="d-flex align-center justify-center mb-2">
							<VAvatar
								rounded
								size="36"
								color="error"
								variant="tonal"
								class="me-3"
							>
								<VIcon size="22" icon="tabler-activity" />
							</VAvatar>
							<h6 class="text-base font-weight-medium mb-0">
								{{ t("analytics.activeUsers") }}
							</h6>
						</div>
						<h2
							class="text-h3 text-center font-weight-bold text-info mb-0"
						>
							{{ analyticsData.activeUsers }}
						</h2>
					</VCard>
				</VCol>
			</VRow>
		</VCardText>
	</VCard>
</template>
