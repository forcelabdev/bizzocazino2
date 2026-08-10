<script setup>
import axios from "@axios";
import { VDataTableServer } from "vuetify/labs/VDataTable";

const searchQuery = ref("");
const selectedStatus = ref();
const totalBets = ref(0);
const bets = ref([]);
const stats = ref(null);
const isLoading = ref(false);
const selectedBet = ref(null);
const isDetailDialogVisible = ref(false);

const options = ref({
	page: 1,
	itemsPerPage: 20,
	sortBy: [],
});

const statusOptions = [
	{ title: "Tümü", value: "" },
	{ title: "Beklemede", value: "pending" },
	{ title: "Kazandı", value: "won" },
	{ title: "Kaybetti", value: "lost" },
	{ title: "İptal", value: "cancelled" },
];

const headers = [
	{ title: "Kupon ID", key: "externalCouponId", width: "180px" },
	{ title: "Kullanıcı", key: "user.username", width: "150px" },
	{ title: "Tutar", key: "amount", width: "100px" },
	{ title: "Toplam Oran", key: "totalOdds", width: "100px" },
	{ title: "Potansiyel", key: "potentialWin", width: "120px" },
	{ title: "Kazanç", key: "actualWin", width: "100px" },
	{ title: "Maç Sayısı", key: "eventCount", width: "100px" },
	{ title: "Durum", key: "status", width: "120px" },
	{ title: "Tarih", key: "createdAt", width: "160px" },
	{ title: "İşlemler", key: "actions", sortable: false, width: "100px" },
];

const fetchBets = async () => {
	isLoading.value = true;
	try {
		const sortBy = options.value.sortBy.length
			? options.value.sortBy[0].key
			: "createdAt";
		const sortOrder = options.value.sortBy.length
			? options.value.sortBy[0].order
			: "desc";

		const params = {
			page: options.value.page,
			limit: options.value.itemsPerPage,
			sortBy,
			sortOrder,
		};

		if (searchQuery.value) params.search = searchQuery.value;
		if (selectedStatus.value) params.status = selectedStatus.value;

		const res = await axios.get("/admin/sports-bets", { params });

		bets.value = res.data.data || [];
		totalBets.value = res.data.total || 0;
	} catch (err) {
		console.error("Bahisler yüklenemedi:", err);
	} finally {
		isLoading.value = false;
	}
};

const fetchStats = async () => {
	try {
		const res = await axios.get("/admin/sports-bets-stats");
		stats.value = res.data.data || {};
	} catch (err) {
		console.error("İstatistikler yüklenemedi:", err);
	}
};

const viewBetDetail = async (bet) => {
	try {
		const res = await axios.get(`/admin/sports-bets/${bet._id}`);
		selectedBet.value = res.data.data;
		isDetailDialogVisible.value = true;
	} catch (err) {
		console.error("Bahis detayı yüklenemedi:", err);
	}
};

const formatMoney = (amount) => {
	return new Intl.NumberFormat("tr-TR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount || 0) + " ₺";
};

const formatDate = (date) => {
	if (!date) return "-";
	return new Date(date).toLocaleString("tr-TR");
};

const getStatusColor = (status) => {
	const colors = {
		pending: "warning",
		won: "success",
		lost: "error",
		cancelled: "secondary",
	};
	return colors[status] || "default";
};

const getStatusText = (status) => {
	const texts = {
		pending: "Beklemede",
		won: "Kazandı",
		lost: "Kaybetti",
		cancelled: "İptal",
	};
	return texts[status] || status;
};

onMounted(() => {
	fetchStats();
});

watchEffect(fetchBets);
watch([selectedStatus, searchQuery], () => {
	options.value.page = 1;
	fetchBets();
});
</script>

<template>
	<section>
		<!-- Stats Cards -->
		<VRow class="mb-6">
			<VCol cols="12" sm="6" md="3">
				<VCard>
					<VCardText class="d-flex align-center justify-space-between">
						<div>
							<span class="text-sm text-disabled">Toplam Bahis</span>
							<h4 class="text-h4">{{ stats?.totalBets || 0 }}</h4>
						</div>
						<VAvatar color="primary" variant="tonal" rounded size="42">
							<VIcon icon="tabler-ticket" size="26" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" sm="6" md="3">
				<VCard>
					<VCardText class="d-flex align-center justify-space-between">
						<div>
							<span class="text-sm text-disabled">Toplam Yatırım</span>
							<h4 class="text-h5">{{ formatMoney(stats?.totalAmount) }}</h4>
						</div>
						<VAvatar color="info" variant="tonal" rounded size="42">
							<VIcon icon="tabler-currency-lira" size="26" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" sm="6" md="3">
				<VCard>
					<VCardText class="d-flex align-center justify-space-between">
						<div>
							<span class="text-sm text-disabled">Toplam Ödeme</span>
							<h4 class="text-h5">{{ formatMoney(stats?.totalWinAmount) }}</h4>
						</div>
						<VAvatar color="success" variant="tonal" rounded size="42">
							<VIcon icon="tabler-cash" size="26" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" sm="6" md="3">
				<VCard>
					<VCardText class="d-flex align-center justify-space-between">
						<div>
							<span class="text-sm text-disabled">Bekleyen</span>
							<h4 class="text-h4">{{ stats?.totalPending || 0 }}</h4>
						</div>
						<VAvatar color="warning" variant="tonal" rounded size="42">
							<VIcon icon="tabler-clock" size="26" />
						</VAvatar>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<!-- Secondary Stats -->
		<VRow class="mb-6">
			<VCol cols="12" sm="4">
				<VCard>
					<VCardText class="d-flex align-center gap-3">
						<VAvatar color="success" variant="tonal" rounded size="38">
							<VIcon icon="tabler-trophy" size="22" />
						</VAvatar>
						<div>
							<span class="text-sm text-disabled">Kazanan</span>
							<h5 class="text-h6">{{ stats?.totalWon || 0 }}</h5>
						</div>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" sm="4">
				<VCard>
					<VCardText class="d-flex align-center gap-3">
						<VAvatar color="error" variant="tonal" rounded size="38">
							<VIcon icon="tabler-x" size="22" />
						</VAvatar>
						<div>
							<span class="text-sm text-disabled">Kaybeden</span>
							<h5 class="text-h6">{{ stats?.totalLost || 0 }}</h5>
						</div>
					</VCardText>
				</VCard>
			</VCol>
			<VCol cols="12" sm="4">
				<VCard>
					<VCardText class="d-flex align-center gap-3">
						<VAvatar color="primary" variant="tonal" rounded size="38">
							<VIcon icon="tabler-calendar-stats" size="22" />
						</VAvatar>
						<div>
							<span class="text-sm text-disabled">Bugün</span>
							<h5 class="text-h6">{{ stats?.todayBets || 0 }} bahis / {{ formatMoney(stats?.todayAmount) }}</h5>
						</div>
					</VCardText>
				</VCard>
			</VCol>
		</VRow>

		<!-- Filters -->
		<VCard class="mb-6">
			<VCardText>
				<VRow>
					<VCol cols="12" sm="4">
						<VTextField
							v-model="searchQuery"
							placeholder="Kupon ID ara..."
							density="compact"
							prepend-inner-icon="tabler-search"
							clearable
						/>
					</VCol>
					<VCol cols="12" sm="4">
						<VSelect
							v-model="selectedStatus"
							:items="statusOptions"
							item-title="title"
							item-value="value"
							placeholder="Durum Filtrele"
							density="compact"
							clearable
						/>
					</VCol>
					<VCol cols="12" sm="4" class="d-flex align-center">
						<VBtn color="primary" @click="fetchBets" :loading="isLoading">
							<VIcon icon="tabler-refresh" class="me-2" />
							Yenile
						</VBtn>
					</VCol>
				</VRow>
			</VCardText>
		</VCard>

		<!-- Data Table -->
		<VCard>
			<VDataTableServer
				v-model:items-per-page="options.itemsPerPage"
				v-model:page="options.page"
				v-model:sort-by="options.sortBy"
				:headers="headers"
				:items="bets"
				:items-length="totalBets"
				:loading="isLoading"
				class="text-no-wrap"
				@update:options="options = $event"
			>
				<!-- Kupon ID -->
				<template #item.externalCouponId="{ item }">
					<div class="d-flex flex-column">
						<span class="font-weight-medium text-primary">
							{{ item.raw.externalCouponId || item.raw._id }}
						</span>
						<span class="text-xs text-disabled" v-if="item.raw.externalBetId">
							Bet: {{ item.raw.externalBetId }}
						</span>
					</div>
				</template>

				<!-- Kullanıcı -->
				<template #item.user.username="{ item }">
					<div class="d-flex align-center gap-2" v-if="item.raw.user">
						<VAvatar size="32" :image="item.raw.user.avatar" />
						<div class="d-flex flex-column">
							<span class="font-weight-medium">{{ item.raw.user.username }}</span>
							<span class="text-xs text-disabled">ID: {{ item.raw.user.numericId }}</span>
						</div>
					</div>
					<span v-else class="text-disabled">-</span>
				</template>

				<!-- Tutar -->
				<template #item.amount="{ item }">
					<span class="font-weight-medium">{{ formatMoney(item.raw.amount) }}</span>
				</template>

				<!-- Toplam Oran -->
				<template #item.totalOdds="{ item }">
					<VChip color="info" size="small" variant="tonal">
						{{ parseFloat(item.raw.totalOdds || 1).toFixed(2) }}
					</VChip>
				</template>

				<!-- Potansiyel -->
				<template #item.potentialWin="{ item }">
					<span class="text-success">{{ formatMoney(item.raw.potentialWin) }}</span>
				</template>

				<!-- Kazanç -->
				<template #item.actualWin="{ item }">
					<span :class="item.raw.actualWin > 0 ? 'text-success font-weight-bold' : 'text-disabled'">
						{{ formatMoney(item.raw.actualWin) }}
					</span>
				</template>

				<!-- Maç Sayısı -->
				<template #item.eventCount="{ item }">
					<VChip color="primary" size="small" variant="outlined">
						{{ item.raw.eventCount || item.raw.details?.length || 0 }} maç
					</VChip>
				</template>

				<!-- Durum -->
				<template #item.status="{ item }">
					<VChip
						:color="getStatusColor(item.raw.status)"
						size="small"
						class="text-capitalize"
					>
						{{ getStatusText(item.raw.status) }}
					</VChip>
				</template>

				<!-- Tarih -->
				<template #item.createdAt="{ item }">
					<span class="text-sm">{{ formatDate(item.raw.createdAt) }}</span>
				</template>

				<!-- İşlemler -->
				<template #item.actions="{ item }">
					<VBtn
						icon
						size="small"
						variant="text"
						color="primary"
						@click="viewBetDetail(item.raw)"
					>
						<VIcon icon="tabler-eye" />
						<VTooltip activator="parent" location="top">Detay</VTooltip>
					</VBtn>
				</template>
			</VDataTableServer>
		</VCard>

		<!-- Bet Detail Dialog -->
		<VDialog v-model="isDetailDialogVisible" max-width="800">
			<VCard v-if="selectedBet">
				<VCardTitle class="d-flex justify-space-between align-center pa-4">
					<div class="d-flex align-center gap-2">
						<span>Kupon Detayı</span>
						<VChip v-if="selectedBet.betType" size="x-small" color="info" variant="tonal">
							{{ selectedBet.betType === 'single' ? 'Tekli' : selectedBet.betType === 'multiple' ? 'Çoklu' : selectedBet.betType === 'system' ? 'Sistem' : selectedBet.betType }}
						</VChip>
						<VChip v-if="selectedBet.isLive" size="x-small" color="error">
							🔴 CANLI
						</VChip>
					</div>
					<VChip
						:color="getStatusColor(selectedBet.status)"
						size="small"
					>
						{{ getStatusText(selectedBet.status) }}
					</VChip>
				</VCardTitle>

				<VDivider />

				<VCardText>
					<!-- Bet Info -->
					<VRow class="mb-4">
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Kupon ID</div>
							<div class="font-weight-medium">{{ selectedBet.externalCouponId || selectedBet._id }}</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Tutar</div>
							<div class="font-weight-medium">{{ formatMoney(selectedBet.amount) }}</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Toplam Oran</div>
							<div class="font-weight-medium">{{ parseFloat(selectedBet.totalOdds || 1).toFixed(2) }}</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Potansiyel Kazanç</div>
							<div class="font-weight-medium text-success">{{ formatMoney(selectedBet.potentialWin) }}</div>
						</VCol>
					</VRow>

					<VRow class="mb-4">
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Gerçek Kazanç</div>
							<div class="font-weight-bold" :class="selectedBet.actualWin > 0 ? 'text-success' : ''">
								{{ formatMoney(selectedBet.actualWin) }}
							</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Rakeback</div>
							<div class="font-weight-medium">{{ formatMoney(selectedBet.rakeback) }}</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Affiliate</div>
							<div class="font-weight-medium">{{ formatMoney(selectedBet.affiliateCommission) }}</div>
						</VCol>
						<VCol cols="6" sm="3">
							<div class="text-sm text-disabled">Tarih</div>
							<div class="font-weight-medium">{{ formatDate(selectedBet.createdAt) }}</div>
						</VCol>
					</VRow>

					<!-- User Info -->
					<VCard variant="outlined" class="mb-4" v-if="selectedBet.user">
						<VCardText class="d-flex align-center gap-3">
							<VAvatar size="48" :image="selectedBet.user.avatar" />
							<div>
								<div class="font-weight-medium">{{ selectedBet.user.username }}</div>
								<div class="text-sm text-disabled">{{ selectedBet.user.local?.email }}</div>
								<div class="text-xs text-disabled">Numeric ID: {{ selectedBet.user.numericId }}</div>
							</div>
						</VCardText>
					</VCard>

					<!-- Events/Details -->
					<div class="text-subtitle-1 font-weight-medium mb-3">
						Maç Detayları ({{ selectedBet.details?.length || 0 }} seçim)
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
											{{ event.matchTitle || event.match_title || (event.homeTeam && event.awayTeam ? `${event.homeTeam} vs ${event.awayTeam}` : 'Maç') }}
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
									<VChip
										:color="getStatusColor(event.status)"
										size="x-small"
									>
										{{ getStatusText(event.status) }}
									</VChip>
									<VChip v-if="event.isLive || event.is_live" color="error" size="x-small">
										🔴 CANLI
									</VChip>
								</div>
							</div>
							
							<!-- Selection Info -->
							<VCard variant="flat" color="grey-lighten-5" class="mt-3">
								<VCardText class="pa-2 d-flex align-center gap-3">
									<div class="text-xs text-disabled text-uppercase">
										{{ event.marketName || event.market_name || event.marketType || 'Market' }}
									</div>
									<div class="font-weight-medium flex-grow-1">
										{{ event.displayText || event.display_text || event.pick || '-' }}
									</div>
									<VChip color="primary" size="small" variant="elevated">
										@{{ parseFloat(event.odds || 1).toFixed(2) }}
									</VChip>
								</VCardText>
							</VCard>
							
							<!-- Score/Time Info -->
							<div class="d-flex flex-wrap gap-3 mt-2 text-xs" v-if="event.finalScore || event.startTimestamp">
								<div v-if="event.startTimestamp" class="d-flex align-center gap-1">
									<VIcon icon="tabler-calendar" size="14" />
									{{ new Date(event.startTimestamp).toLocaleString('tr-TR') }}
								</div>
								<div v-if="event.finalScore" class="d-flex align-center gap-1 text-success font-weight-medium">
									<VIcon icon="tabler-trophy" size="14" />
									Skor: {{ event.finalScore }}
								</div>
							</div>
						</VCardText>
					</VCard>

					<div v-if="!selectedBet.details?.length" class="text-center text-disabled py-4">
						Maç detayı bulunamadı
					</div>
				</VCardText>

				<VDivider />

				<VCardActions class="pa-4">
					<VSpacer />
					<VBtn color="secondary" variant="outlined" @click="isDetailDialogVisible = false">
						Kapat
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</section>
</template>
