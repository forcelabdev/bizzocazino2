<script setup>
import Shepherd from "shepherd.js";
import { can } from "@layouts/plugins/casl";
import { useThemeConfig } from "@core/composable/useThemeConfig";
import navigationItems from "@/navigation/vertical";
import { useUserListStore } from "@/views/apps/user/useUserListStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { formatCoinType } from "@/utils/currency";
import { avatarText } from "@core/utils/formatters";

const { appContentLayoutNav } = useThemeConfig();
const { t } = useI18n();
const router = useRouter();
const userListStore = useUserListStore();
const permissionStore = usePermissionStore();

defineOptions({ inheritAttrs: false });

// 👉 Is App Search Bar Visible
const isAppSearchBarVisible = ref(false);

// 👉 Flatten the real app navigation (the same menu shown in the sidebar)
// into a searchable, permission-aware index. This guarantees the search
// bar only ever surfaces pages that actually exist and that the current
// admin is allowed to open — no more dead demo links.
const buildSearchIndex = (items, topLevelTitle = null, inheritedIcon = null) => {
	const index = [];

	for (const item of items || []) {
		if (!item) continue;

		const icon = item.icon?.icon || inheritedIcon;
		// The first level we walk into becomes the group/category label
		// used to organize suggestions and search results.
		const categoryKey = topLevelTitle || item.title;

		if (item.to) {
			if (can(item.action, item.subject)) {
				index.push({
					icon: icon || "tabler-point",
					title: t(item.title),
					category: t(categoryKey),
					url: { name: item.to },
				});
			}
		}

		if (Array.isArray(item.children))
			index.push(...buildSearchIndex(item.children, categoryKey, icon));
	}

	return index;
};

const searchIndex = buildSearchIndex(navigationItems);

// 👉 Default suggestions (grouped by real sections, only what's permitted)
const suggestionGroups = computed(() => {
	const groups = [];
	const seen = new Map();

	for (const entry of searchIndex) {
		if (!seen.has(entry.category)) seen.set(entry.category, []);
		const bucket = seen.get(entry.category);
		if (bucket.length < 4) bucket.push(entry);
	}

	for (const [title, content] of seen) {
		if (!content.length) continue;
		groups.push({ title, content });
		if (groups.length >= 4) break;
	}

	return groups;
});

// 👉 No Data suggestion — a few of the most commonly used real pages
const noDataSuggestions = computed(() =>
	searchIndex.filter((entry) =>
		["apps-user-list", "apps-reports-crm", "apps-finance-deposit"].includes(
			entry.url.name
		)
	)
);

const searchQuery = ref("");

const normalize = (value) => (value || "").toLocaleLowerCase("tr-TR");

// 👉 Local, client-side search over the real navigation index
const searchResult = computed(() => {
	const query = normalize(searchQuery.value);
	if (!query) return [];

	const matches = searchIndex.filter((entry) =>
		normalize(entry.title).includes(query)
	);

	const grouped = [];
	const byCategory = new Map();

	for (const entry of matches) {
		if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
		byCategory.get(entry.category).push(entry);
	}

	for (const [category, entries] of byCategory) {
		grouped.push({ header: category, title: category });
		grouped.push(...entries);
	}

	return grouped;
});

const redirectToSuggestedOrSearchedPage = (selected) => {
	router.push(selected.url);
	isAppSearchBarVisible.value = false;
	searchQuery.value = "";
};

// 👉 Canlı kullanıcı arama (kart görünümü)
// Kullanıcılar sayfasını görüntüleme yetkisi yoksa hiç sorgu atmıyoruz —
// aynı yetki, sol menüdeki "Kullanıcı Listesi" öğesini de kontrol ediyor.
const canSearchUsers = computed(() => can("read", "users"));
// Detay yetkisi yoksa (bkz. Kullanıcı Listesi sayfası) e-posta/telefon gizlenir.
const canViewUserDetails = computed(() =>
	permissionStore.can("users.listDetails.read")
);

const userResults = ref([]);
const userResultsLoading = ref(false);
let userSearchRequestId = 0;

const resolveUserRankColor = (rank) => {
	switch (rank) {
	case "admin":
		return "secondary";
	case "partner":
		return "warning";
	case "user":
		return "primary";
	default:
		return "default";
	}
};

const formatUserForSearch = (user) => ({
	_id: user._id,
	username: user.username,
	initials: avatarText(user.username),
	avatar: user.avatar || null,
	numericId: user.numericId ?? null,
	email: canViewUserDetails.value ? user.local?.email || null : null,
	phone: canViewUserDetails.value ? user.phone || null : null,
	rank: user.rank,
	rankColor: resolveUserRankColor(user.rank),
	balanceLabel: `${formatCoinType(user.activeWallet?.coinType)}: ${
		user.activeWallet?.balance ?? 0
	}`,
});

const runUserSearch = useDebounceFn(async (query) => {
	const requestId = ++userSearchRequestId;

	userResultsLoading.value = true;
	try {
		const res = await userListStore.fetchUsers({
			search: query,
			page: 1,
			limit: 5,
			searchMode: "smart",
		});

		if (requestId !== userSearchRequestId) return;
		userResults.value = (res?.users || []).map(formatUserForSearch);
	} catch (error) {
		if (requestId !== userSearchRequestId) return;
		console.error("[v0] Arama çubuğu kullanıcı sonuçları alınamadı:", error);
		userResults.value = [];
	} finally {
		if (requestId === userSearchRequestId) userResultsLoading.value = false;
	}
}, 300);

watch(searchQuery, (query) => {
	if (!canSearchUsers.value || !query) {
		userSearchRequestId++;
		userResults.value = [];
		userResultsLoading.value = false;

		return;
	}

	runUserSearch(query);
});

const goToUserFromSearch = (user) => {
	router.push({ name: "apps-user-view-id", params: { id: user._id } });
	isAppSearchBarVisible.value = false;
	searchQuery.value = "";
};

const LazyAppBarSearch = defineAsyncComponent(() =>
	import("@core/components/AppBarSearch.vue")
);
</script>

<template>
	<div
		class="d-flex align-center cursor-pointer"
		v-bind="$attrs"
		style="user-select: none"
		@click="isAppSearchBarVisible = !isAppSearchBarVisible"
	>
		<!-- 👉 Search Trigger button -->
		<!-- close active tour while opening search bar using icon -->
		<IconBtn class="me-1" @click="Shepherd.activeTour?.cancel()">
			<VIcon size="26" icon="tabler-search" />
		</IconBtn>

		<span
			v-if="appContentLayoutNav === 'vertical'"
			class="d-none d-md-flex align-center text-disabled"
			@click="Shepherd.activeTour?.cancel()"
		>
			<span class="me-3">Ara</span>
			<span class="meta-key">&#8984;K</span>
		</span>
	</div>

	<!-- 👉 App Bar Search -->
	<LazyAppBarSearch
		v-model:isDialogVisible="isAppSearchBarVisible"
		v-model:search-query="searchQuery"
		:search-results="searchResult"
		:suggestions="suggestionGroups"
		:no-data-suggestion="noDataSuggestions"
		:user-results="userResults"
		:user-results-loading="userResultsLoading"
		@item-selected="redirectToSuggestedOrSearchedPage"
		@user-selected="goToUserFromSearch"
	>
		<!--
      <template #suggestions>
      use this slot if you want to override default suggestions
      </template>
    -->

		<!--
      <template #noData>
      use this slot to change the view of no data section
      </template>
    -->

		<!--
      <template #searchResult="{ item }">
      use this slot to change the search item
      </template>
    -->
	</LazyAppBarSearch>
</template>

<style lang="scss" scoped>
@use "@styles/variables/_vuetify.scss";

.meta-key {
	border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
	border-radius: 6px;
	block-size: 1.5625rem;
	line-height: 1.3125rem;
	padding-block: 0.125rem;
	padding-inline: 0.25rem;
}
</style>
