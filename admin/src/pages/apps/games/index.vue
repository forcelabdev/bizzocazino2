<script setup>
import { paginationMeta } from "@/@fake-db/utils";
import { useProviderDisplayNames } from "@/composables/useProviderDisplayNames";
import { useGameListStore } from "@/pages/apps/games/useGameListStore";
import axios from "@axios";
import { useRouter } from "vue-router";
import { VDataTableServer } from "vuetify/labs/VDataTable";

const gameListStore = useGameListStore();
const searchQuery = ref("");
const selectedCategory = ref();
const selectedProvider = ref();
const selectedDistribution = ref();
const totalGames = ref(0);
const games = ref([]);
const categoryOptions = ref([]);
const providerOptions = ref([]);
const router = useRouter();
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const {
	formatProviderDisplayName,
	getProviderDisplayItems,
	loadProviderDisplayNames,
} = useProviderDisplayNames();

const options = ref({
	page: 1,
	itemsPerPage: 10,
	sortBy: [],
});

const distributionCodes = ["drakon", "nexus", "betinovi", "betcolabs"];
const distributionOptions = computed(() => getProviderDisplayItems(distributionCodes));
const providerOptionItems = computed(() => getProviderDisplayItems(providerOptions.value));

const headers = [
	{ title: "Banner", key: "raw.banner" },
	{ title: "Game", key: "raw.game_name" },
	{ title: "Categories", key: "raw.categories" },
	{ title: "Type", key: "raw.game_type" },
	{ title: "Provider", key: "raw.provider_code" },
	{ title: "Source", key: "raw.distribution" },
	{ title: "Featured", key: "raw.featured" },
	{ title: "Status", key: "raw.status" },
	{ title: "Actions", key: "raw.actions", sortable: false },
];

const isAddNewGameDrawerVisible = ref(false);
const isEditGameModalVisible = ref(false);
const gameToEdit = ref(null);
const bannerFile = ref(null);
const backgroundFile = ref(null);
const backgroundImageUrl = ref("");

const resolveImageUrl = (value) => {
	if (!value) return "";
	if (!value.startsWith("/")) return value;

	return BASE_URL ? `${BASE_URL}${value}` : value;
};

const getSingleFile = (value) => (Array.isArray(value) ? value[0] : value);

const closeEditGameModal = () => {
	isEditGameModalVisible.value = false;
	bannerFile.value = null;
	backgroundFile.value = null;
	backgroundImageUrl.value = "";
	gameToEdit.value = null;
};

const fetchGames = () => {
	const sort = options.value.sortBy.length
		? {
				key: options.value.sortBy[0].key.replace("raw.", ""),
				order: options.value.sortBy[0].order === "desc" ? -1 : 1,
		  }
		: null;

	gameListStore
		.fetchGames({
			search: searchQuery.value,
			category: selectedCategory.value,
			provider: selectedProvider.value,
			distribution: selectedDistribution.value,
			page: options.value.page,
			limit: options.value.itemsPerPage,
			sort_by: sort?.key,
			order: sort?.order === 1 ? "asc" : "desc",
		})
		.then((res) => {
			const data = res?.data || [];
			const mapped = data.map((g) => ({
				...g,
				provider_code:
					g.provider_code || g.provider?.provider_code || "—",
			}));
			games.value = mapped;
			totalGames.value = typeof res.total === "number" ? res.total : 0;
		})
		.catch((err) => {
			console.error("❌ API Hatası:", err);
		});
};

const fetchGameMeta = async () => {
	try {
		const res = await axios.get("/admin/games/meta");
		categoryOptions.value = res.data.categories || [];
		providerOptions.value = res.data.providerCodes || [];
	} catch (err) {
		console.error("Meta veriler alınamadı:", err);
	}
};

onMounted(async () => {
	await loadProviderDisplayNames({ force: true });
	fetchGameMeta();
});

const getDistributionColor = (distribution) => {
	const colors = {
		drakon: "primary",
		betinovi: "warning",
		betcolabs: "info",
		nexus: "success",
	};

	return colors[String(distribution || "").toLowerCase()] || "secondary";
};

watchEffect(fetchGames);
watch(
	[selectedCategory, selectedProvider, selectedDistribution, searchQuery],
	fetchGames
);

const deleteGame = (id) => {
	gameListStore.deleteGame(id).then(() => fetchGames());
};

const saveGameEdits = () => {
	const selectedBannerFile = getSingleFile(bannerFile.value);
	const selectedBackgroundFile = getSingleFile(backgroundFile.value);
	const formData = new FormData();
	Object.keys(gameToEdit.value).forEach((key) => {
		if (
			(key !== 'banner' || !selectedBannerFile) &&
			(key !== 'background' ||
				(!selectedBackgroundFile && !backgroundImageUrl.value.trim()))
		) {
			const val = gameToEdit.value[key];
			formData.append(key, Array.isArray(val) ? JSON.stringify(val) : val);
		}
	});
	if (selectedBannerFile) {
		formData.append('bannerFile', selectedBannerFile);
	}
	if (selectedBackgroundFile) {
		formData.append('backgroundFile', selectedBackgroundFile);
	} else if (backgroundImageUrl.value.trim()) {
		formData.append('backgroundImageUrl', backgroundImageUrl.value.trim());
	}
	axios
		.put(
			`/admin/games/${gameToEdit.value._id}`,
			formData,
			{ headers: { 'Content-Type': 'multipart/form-data' } }
		)
		.then(() => {
			closeEditGameModal();
			fetchGames();
		})
		.catch((err) => {
			console.error("❌ Game update error:", err);
		});
};

const editGame = async (game) => {
	// Ensure categories array exists (migrate from legacy category field if needed)
	const categories = game.categories?.length
		? game.categories
		: game.category
		? [game.category]
		: [];

	gameToEdit.value = { ...game, categories };
	bannerFile.value = null;
	backgroundFile.value = null;
	backgroundImageUrl.value = "";
	isEditGameModalVisible.value = true;

	try {
		const res = await axios.get("/admin/categories");
		categoryOptions.value = res.data.data.map((cat) => ({
			title: cat.name,
			value: cat.slug,
		}));
	} catch (err) {
		console.error("Kategori listesi alınamadı:", err);
		categoryOptions.value = [];
	}
};
</script>

<template>
	<section>
		<VRow>
			<VCol
				v-for="meta in [
					{
						icon: 'tabler-device-gamepad',
						color: 'primary',
						title: 'Games',
						stats: totalGames,
						percentage: +12,
						subtitle: 'Total Games',
					},
					{
						icon: 'tabler-star',
						color: 'success',
						title: 'Featured',
						stats: '12',
						percentage: +5,
						subtitle: 'Featured games',
					},
					{
						icon: 'tabler-eye',
						color: 'info',
						title: 'Viewed',
						stats: '3546',
						percentage: +8,
						subtitle: 'Total views',
					},
					{
						icon: 'tabler-activity',
						color: 'warning',
						title: 'Status',
						stats: 'Active',
						percentage: 0,
						subtitle: 'Current filter',
					},
				]"
				:key="meta.title"
				cols="12"
				sm="6"
				lg="3"
			>
				<VCard>
					<VCardText class="d-flex justify-space-between">
						<div>
							<span>{{ meta.title }}</span>
							<div class="d-flex align-center gap-2 my-1">
								<h6 class="text-h4">
									{{ meta.stats }}
								</h6>
								<span
									:class="
										meta.percentage > 0
											? 'text-success'
											: 'text-error'
									"
								>
									( {{ meta.percentage > 0 ? "+" : "" }}
									{{ meta.percentage }}%)
								</span>
							</div>
							<span>{{ meta.subtitle }}</span>
						</div>
						<VAvatar
							rounded
							variant="tonal"
							:color="meta.color"
							:icon="meta.icon"
						/>
					</VCardText>
				</VCard>
			</VCol>

			<VCol cols="12">
				<VCard title="Search Filter">
					<VCardText>
						<VRow>
							<VCol cols="12" sm="4">
								<AppSelect
									v-model="selectedCategory"
									label="Select Category"
									:items="categoryOptions"
									clearable
									clear-icon="tabler-x"
								/>
							</VCol>
							<VCol cols="12" sm="4">
								<AppSelect
									v-model="selectedProvider"
									label="Select Provider"
									:items="providerOptionItems"
									item-title="title"
									item-value="value"
									clearable
									clear-icon="tabler-x"
								/>
							</VCol>
							<VCol cols="12" sm="4">
								<AppSelect
									v-model="selectedDistribution"
									label="Select Source"
									:items="distributionOptions"
									item-title="title"
									item-value="value"
									clearable
									clear-icon="tabler-x"
								/>
							</VCol>
						</VRow>
					</VCardText>

					<VDivider />

					<VCardText class="d-flex flex-wrap py-4 gap-4">
						<div class="me-3 d-flex gap-3">
							<AppSelect
								:model-value="options.itemsPerPage"
								:items="[
									{ value: 10, title: '10' },
									{ value: 25, title: '25' },
									{ value: 50, title: '50' },
									{ value: 100, title: '100' },
									{ value: -1, title: 'All' },
								]"
								style="width: 6.25rem"
								@update:model-value="
									options.itemsPerPage = parseInt($event, 10)
								"
							/>
						</div>

						<VSpacer />

						<div
							class="app-user-search-filter d-flex align-center flex-wrap gap-4"
						>
							<div style="inline-size: 10rem">
								<AppTextField
									v-model="searchQuery"
									placeholder="Search"
									density="compact"
								/>
							</div>

							<VBtn
								variant="tonal"
								color="secondary"
								prepend-icon="tabler-screen-share"
							>
								Export
							</VBtn>
						</div>
					</VCardText>

					<VDivider />

					<VDataTableServer
						v-model:items-per-page="options.itemsPerPage"
						v-model:page="options.page"
						v-model:sort-by="options.sortBy"
						:items="games"
						:items-length="totalGames"
						:headers="headers"
						class="text-no-wrap"
					>
						<template #item.raw.banner="{ item }">
							<VAvatar size="38" variant="tonal">
								<VImg
									:src="resolveImageUrl(item.raw.banner)"
									alt="Banner"
									height="38"
									width="70"
									cover
								/>
							</VAvatar>
						</template>

						<template #item.raw.game_name="{ item }">
							<span>{{ item.raw.game_name }}</span>
						</template>

						<template #item.raw.categories="{ item }">
							<div class="d-flex flex-wrap gap-1">
								<VChip
									v-for="cat in (
										item.raw.categories || [
											item.raw.category,
										]
									).filter(Boolean)"
									:key="cat"
									size="small"
									label
									color="info"
									class="text-capitalize"
								>
									{{ cat }}
								</VChip>
								<span
									v-if="
										!item.raw.categories?.length &&
										!item.raw.category
									"
									class="text-disabled"
									>—</span
								>
							</div>
						</template>

						<template #item.raw.game_type="{ item }">
							<span class="text-capitalize">{{
								item.raw.game_type
							}}</span>
						</template>

						<template #item.raw.provider_code="{ item }">
							<span>{{ formatProviderDisplayName(item.raw.provider_code) }}</span>
						</template>

						<template #item.raw.distribution="{ item }">
							<VChip
								:color="getDistributionColor(item.raw.distribution)"
								size="small"
								label
							>
								{{ formatProviderDisplayName(item.raw.distribution) }}
							</VChip>
						</template>

						<template #item.raw.featured="{ item }">
							<VSwitch
								density="compact"
								:model-value="item.raw.featured === 1"
								@update:model-value="
									(val) =>
										gameListStore.updateGameFeature(
											item.raw._id,
											val ? 1 : 0
										)
								"
							/>
						</template>

						<template #item.raw.status="{ item }">
							<VChip
								:color="
									item.raw.status === 1 ? 'success' : 'error'
								"
								size="small"
								label
								class="text-capitalize"
							>
								{{
									item.raw.status === 1
										? "Active"
										: "Inactive"
								}}
							</VChip>
						</template>

						<template #item.raw.actions="{ item }">
							<IconBtn @click="editGame(item.raw)">
								<VIcon icon="tabler-edit" />
							</IconBtn>
							<IconBtn @click="deleteGame(item.raw._id)">
								<VIcon icon="tabler-trash" />
							</IconBtn>
						</template>

						<template #bottom>
							<VDivider />
							<div
								class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
							>
								<p class="text-sm text-disabled mb-0">
									{{ paginationMeta(options, totalGames) }}
								</p>

								<VPagination
									v-model="options.page"
									:length="
										Math.ceil(
											totalGames / options.itemsPerPage
										)
									"
									:total-visible="5"
								>
									<template #prev="slotProps">
										<VBtn
											variant="tonal"
											color="default"
											v-bind="slotProps"
											:icon="false"
										>
											Previous
										</VBtn>
									</template>

									<template #next="slotProps">
										<VBtn
											variant="tonal"
											color="default"
											v-bind="slotProps"
											:icon="false"
										>
											Next
										</VBtn>
									</template>
								</VPagination>
							</div>
						</template>
					</VDataTableServer>
					<VDialog v-model="isEditGameModalVisible" max-width="800">
						<VCard title="Edit Game">
							<VCardText>
								<VRow>
									<VCol cols="12" sm="6">
										<AppTextField
											v-model="gameToEdit.game_name"
											label="Game Name"
										/>
									</VCol>
									<VCol cols="12" sm="6">
										<AppTextField
											v-model="gameToEdit.game_code"
											label="Game Code"
										/>
									</VCol>
									<VCol cols="12" sm="6">
										<VFileInput
											v-model="bannerFile"
											label="Banner Image"
											accept="image/*"
											prepend-icon="tabler-photo"
										/>
										<div v-if="gameToEdit.banner" class="mt-1">
											<small class="text-disabled">Mevcut: {{ gameToEdit.banner }}</small>
										</div>
									</VCol>
									<VCol cols="12" sm="6">
										<AppTextField
											v-model="backgroundImageUrl"
											label="Background Image URL"
											placeholder="https://example.com/background.jpg"
										/>
										<div v-if="gameToEdit.background" class="mt-1">
											<small class="text-disabled">Mevcut background: {{ gameToEdit.background }}</small>
										</div>
									</VCol>
									<VCol cols="12" sm="6">
										<VFileInput
											v-model="backgroundFile"
											label="Background Image"
											accept="image/*"
											prepend-icon="tabler-photo-scan"
										/>
										<div class="mt-1">
											<small class="text-disabled">Dosya seçilirse URL alanı yok sayılır.</small>
										</div>
									</VCol>
									<VCol v-if="gameToEdit.background" cols="12">
										<VImg
											:src="resolveImageUrl(gameToEdit.background)"
											alt="Background"
											class="rounded"
											max-height="160"
											cover
										/>
									</VCol>
									<VCol cols="12" sm="6">
										<AppTextField
											v-model="gameToEdit.cover"
											label="Cover Path"
										/>
									</VCol>
									<VCol cols="12" sm="6">
										<AppSelect
											v-model="gameToEdit.categories"
											label="Categories"
											:items="categoryOptions"
											multiple
											chips
											closable-chips
										/>
									</VCol>
									<VCol cols="12" sm="6">
										<AppSelect
											v-model="gameToEdit.provider_code"
											label="Provider"
											:items="providerOptionItems"
											item-title="title"
											item-value="value"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.featured"
											label="Featured"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.status"
											label="Status"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.has_freespins"
											label="Freespins"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.has_lobby"
											label="Lobby"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.has_tables"
											label="Tables"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
									<VCol cols="12" sm="3">
										<VSwitch
											v-model="gameToEdit.is_mobile"
											label="Mobile"
											:true-value="1"
											:false-value="0"
										/>
									</VCol>
								</VRow>
							</VCardText>
							<VCardActions>
								<VSpacer />
								<VBtn
									color="secondary"
									variant="tonal"
									@click="closeEditGameModal"
									>Cancel</VBtn
								>
								<VBtn
									color="primary"
									@click="saveGameEdits"
								>
									Save Changes
								</VBtn>
							</VCardActions>
						</VCard>
					</VDialog>
				</VCard>
			</VCol>
		</VRow>
	</section>
</template>

<style lang="scss">
.app-user-search-filter {
	inline-size: 31.6rem;
}

.text-capitalize {
	text-transform: capitalize;
}
</style>
