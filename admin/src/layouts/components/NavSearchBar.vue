<script setup>
import Shepherd from "shepherd.js";
import { can } from "@layouts/plugins/casl";
import { useThemeConfig } from "@core/composable/useThemeConfig";
import navigationItems from "@/navigation/vertical";

const { appContentLayoutNav } = useThemeConfig();
const { t } = useI18n();

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
const router = useRouter();

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
		@item-selected="redirectToSuggestedOrSearchedPage"
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
