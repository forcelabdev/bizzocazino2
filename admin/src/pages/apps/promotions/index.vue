<script setup lang="ts">
import axios from "@/plugins/axios";
import ability from "@/plugins/casl/ability";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { VDataTable } from "vuetify/labs/VDataTable";

const { t } = useI18n();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getBannerUrl = (path: string) => {
	if (!path) return '';
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return API_BASE_URL + path;
};

const promotions = ref([]);
const loading = ref(false);
const canManagePromotions = computed(
	() => ability.can("manage", "finance.promo") || ability.can("manage", "finance"),
);
const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const isEditing = ref(false);
const selectedPromotion = ref(null);
const bannerFile = ref(null);
const uploadingBanner = ref(false);

const pagination = ref({
	page: 1,
	limit: 50,
	total: 0,
	totalPages: 0,
});

const defaultForm = {
	title: "",
	subtitle: "",
	banner: "",
	category: "",
	content: "",
	active: true,
	order: 0,
};
const form = ref({ ...defaultForm });
const formValid = ref(false);

const requiredRule = (v: any) => !!v || t("validation.required");

// Promosyon kategorileri
const categoryOptions = ref([]);
const allCategories = ref([]);
const categoryDialogOpen = ref(false);
const editingCategory = ref(null);
const categoryForm = ref({
	slug: "",
	label: "",
	icon: "🎁",
	order: 0,
	active: true,
});

const categoryHeaders = computed(() => [
	{ title: "Sıra", key: "order", width: 70 },
	{ title: "İkon", key: "icon", width: 60, sortable: false },
	{ title: "Slug", key: "slug" },
	{ title: "Etiket", key: "label" },
	{ title: "Aktif", key: "active", width: 80 },
	{ title: "İşlem", key: "actions", sortable: false, width: 120 },
]);

const fetchCategories = async () => {
	try {
		const res = await axios.get("/admin/promotion-categories");
		const cats = res.data.data || [];
		allCategories.value = cats;
		categoryOptions.value = cats.map((c) => ({
			title: `${c.icon} ${c.label}`,
			value: c.slug,
		}));
	} catch (err) {
		console.error("Failed to fetch categories:", err);
	}
};

const openCategoryDialog = (cat = null) => {
	if (!canManagePromotions.value) return;
	if (cat) {
		editingCategory.value = cat;
		categoryForm.value = {
			slug: cat.slug,
			label: cat.label,
			icon: cat.icon || "🎁",
			order: cat.order || 0,
			active: cat.active !== false,
		};
	} else {
		editingCategory.value = null;
		categoryForm.value = { slug: "", label: "", icon: "🎁", order: 0, active: true };
	}
	categoryDialogOpen.value = true;
};

const saveCategory = async () => {
	if (!canManagePromotions.value) return;
	try {
		if (editingCategory.value) {
			await axios.put(`/admin/promotion-categories/${editingCategory.value._id}`, categoryForm.value);
		} else {
			await axios.post("/admin/promotion-categories", categoryForm.value);
		}
		categoryDialogOpen.value = false;
		await fetchCategories();
	} catch (err) {
		const msg = err.response?.data?.message || "Kategori kaydedilemedi.";
		alert(msg);
		console.error("Failed to save category:", err);
	}
};

const deleteCategoryItem = async (cat) => {
	if (!canManagePromotions.value) return;
	if (!confirm(`"${cat.label}" kategorisini silmek istediğinize emin misiniz?`)) return;
	try {
		await axios.delete(`/admin/promotion-categories/${cat._id}`);
		await fetchCategories();
	} catch (err) {
		console.error("Failed to delete category:", err);
	}
};

const headers = computed(() => [
	{ title: t("promotion.order"), key: "order", width: 80 },
	{ title: t("promotion.banner"), key: "banner", width: 120, sortable: false },
	{ title: t("promotion.title"), key: "title" },
	{ title: t("promotion.subtitle"), key: "subtitle" },
	{ title: t("promotion.category"), key: "category" },
	{ title: t("promotion.active"), key: "active" },
	{ title: t("actions"), key: "actions", sortable: false },
]);

const fetchPromotions = async () => {
	loading.value = true;
	try {
		const response = await axios.get("/admin/promotions", {
			params: {
				page: pagination.value.page,
				limit: pagination.value.limit,
			},
		});
		promotions.value = response.data.data;
		pagination.value = {
			...pagination.value,
			...response.data.pagination,
		};
	} catch (err) {
		console.error("Failed to fetch promotions:", err);
	} finally {
		loading.value = false;
	}
};

const uploadBannerFile = async () => {
	if (!canManagePromotions.value) return;
	if (!bannerFile.value || bannerFile.value.length === 0) return;

	const formData = new FormData();
	formData.append("file", bannerFile.value[0]);

	try {
		uploadingBanner.value = true;
		const response = await axios.post("/admin/files/upload", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		form.value.banner = response.data.url;
		bannerFile.value = null;
	} catch (error) {
		console.error("Banner yüklenemedi:", error);
		alert("Banner yüklenirken bir hata oluştu!");
	} finally {
		uploadingBanner.value = false;
	}
};

const openCreateDialog = () => {
	if (!canManagePromotions.value) return;
	isEditing.value = false;
	selectedPromotion.value = null;
	form.value = { ...defaultForm };
	bannerFile.value = null;
	dialogOpen.value = true;
};

const openEditDialog = (promotion) => {
	if (!canManagePromotions.value) return;
	isEditing.value = true;
	selectedPromotion.value = promotion;
	form.value = {
		title: promotion.title,
		subtitle: promotion.subtitle || "",
		banner: promotion.banner,
		category: promotion.category || "",
		content: promotion.content || "",
		active: promotion.active,
		order: promotion.order || 0,
	};
	bannerFile.value = null;
	dialogOpen.value = true;
};

const savePromotion = async () => {
	if (!canManagePromotions.value) return;
	try {
		const payload = { ...form.value };
		if (isEditing.value && selectedPromotion.value) {
			const id = selectedPromotion.value._id || selectedPromotion.value.id;
			await axios.put(`/admin/promotions/${id}`, payload);
		} else {
			await axios.post("/admin/promotions", payload);
		}
		dialogOpen.value = false;
		fetchPromotions();
	} catch (err) {
		console.error("Failed to save promotion:", err);
	}
};

const confirmDelete = (promotion) => {
	if (!canManagePromotions.value) return;
	selectedPromotion.value = promotion;
	deleteDialogOpen.value = true;
};

const deletePromotion = async () => {
	if (!canManagePromotions.value || !selectedPromotion.value) return;
	try {
		await axios.delete(`/admin/promotions/${selectedPromotion.value._id || selectedPromotion.value.id}`);
		deleteDialogOpen.value = false;
		selectedPromotion.value = null;
		fetchPromotions();
	} catch (err) {
		console.error("Failed to delete promotion:", err);
	}
};

const getCategoryLabel = (slug: string) => {
	if (!slug) return "-";
	const cat = categoryOptions.value.find((c) => c.value === slug);
	return cat ? cat.title : slug;
};

onMounted(async () => {
	await fetchCategories();
	fetchPromotions();
});
</script>

<template>
	<section>
		<!-- Header -->
		<VCard class="mb-6">
			<VCardText class="d-flex align-center justify-space-between flex-wrap gap-4">
				<div>
					<h5 class="text-h5 font-weight-bold">{{ t("promotion.management") }}</h5>
				</div>
				<div v-if="canManagePromotions" class="d-flex gap-2">
					<VBtn color="secondary" prepend-icon="tabler-category" @click="openCategoryDialog()">
						Kategoriler
					</VBtn>
					<VBtn color="primary" prepend-icon="tabler-plus" @click="openCreateDialog">
						{{ t("promotion.add") }}
					</VBtn>
				</div>
			</VCardText>
		</VCard>

		<!-- Table -->
		<VCard>
			<VDataTable
				:headers="headers"
				:items="promotions"
				:loading="loading"
				:items-per-page="pagination.limit"
				density="comfortable"
			>
				<template #item.banner="{ item }">
					<VImg
						v-if="(item.raw || item).banner"
						:src="getBannerUrl((item.raw || item).banner)"
						width="100"
						height="60"
						cover
						class="rounded my-1"
					/>
					<span v-else>-</span>
				</template>

				<template #item.category="{ item }">
					<VChip v-if="(item.raw || item).category" size="small" color="primary">
						{{ getCategoryLabel((item.raw || item).category) }}
					</VChip>
					<span v-else>-</span>
				</template>

				<template #item.active="{ item }">
					<VChip :color="(item.raw || item).active ? 'success' : 'error'" size="small">
						{{ (item.raw || item).active ? t("promotion.active") : "Pasif" }}
					</VChip>
				</template>

				<template #item.actions="{ item }">
					<div v-if="canManagePromotions" class="d-flex gap-1">
						<VBtn icon variant="text" size="small" @click="openEditDialog(item.raw || item)">
							<VIcon icon="tabler-edit" />
						</VBtn>
						<VBtn icon variant="text" size="small" color="error" @click="confirmDelete(item.raw || item)">
							<VIcon icon="tabler-trash" />
						</VBtn>
					</div>
				</template>
			</VDataTable>
		</VCard>
							:disabled="!canManagePromotions"

		<!-- Create/Edit Dialog -->
		<VDialog v-model="dialogOpen" max-width="900" persistent>
			<VCard>
				<VCardTitle class="pa-4">
					{{ isEditing ? t("promotion.edit") : t("promotion.add") }}
				</VCardTitle>

				<VCardText class="pa-4">
					<VRow>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.title"
								:label="t('promotion.title')"
								:rules="[requiredRule]"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VTextField
								v-model="form.subtitle"
								:label="t('promotion.subtitle')"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VSelect
								v-model="form.category"
								:items="categoryOptions"
								:label="t('promotion.category')"
								density="compact"
								clearable
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model.number="form.order"
								:label="t('promotion.order')"
								type="number"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VSwitch v-model="form.active" :label="t('promotion.active')" color="success" />
						</VCol>

						<!-- Banner -->
						<VCol cols="12">
							<VRow>
								<VCol cols="12" md="8">
									<VTextField
										v-model="form.banner"
										:label="t('promotion.banner')"
										:rules="[requiredRule]"
										density="compact"
									/>
								</VCol>
								<VCol cols="12" md="4">
									<VFileInput
										v-model="form.bannerFile"
										label="Banner Yükle"
										accept="image/*"
										density="compact"
										prepend-icon=""
										prepend-inner-icon="tabler-upload"
										@update:model-value="(v) => { bannerFile = v; uploadBannerFile(); }"
										:loading="uploadingBanner"
									/>
								</VCol>
							</VRow>
							<VImg
								v-if="form.banner"
								:src="getBannerUrl(form.banner)"
								max-width="400"
								class="rounded mt-2"
							/>
						</VCol>

						<!-- HTML Content -->
						<VCol cols="12">
							<VTextarea
								v-model="form.content"
								:label="t('promotion.content')"
								:hint="t('promotion.contentHint')"
								persistent-hint
								rows="12"
								density="compact"
								style="font-family: monospace; font-size: 13px;"
							/>
						</VCol>
					</VRow>
				</VCardText>

				<VCardActions class="pa-4">
					<VSpacer />
					<VBtn variant="tonal" @click="dialogOpen = false">{{ t("cancel") }}</VBtn>
					<VBtn color="primary" :disabled="!canManagePromotions" @click="savePromotion">{{ t("save") }}</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Category Management Dialog -->
		<VDialog v-model="categoryDialogOpen" max-width="800" persistent>
			<VCard>
				<VCardTitle class="pa-4 d-flex align-center justify-space-between">
					<span>Promosyon Kategorileri</span>
					<VBtn icon variant="text" size="small" @click="categoryDialogOpen = false">
						<VIcon icon="tabler-x" />
					</VBtn>
				</VCardTitle>

				<VCardText class="pa-4">
					<!-- Mevcut Kategoriler -->
					<VDataTable
						:headers="categoryHeaders"
						:items="allCategories"
						density="compact"
						:items-per-page="-1"
						class="mb-4"
					>
						<template #item.icon="{ item }">
							<span style="font-size: 1.3em">{{ item.icon }}</span>
						</template>

						<template #item.active="{ item }">
							<VChip :color="item.active ? 'success' : 'error'" size="x-small">
								{{ item.active ? 'Aktif' : 'Pasif' }}
							</VChip>
						</template>

						<template #item.actions="{ item }">
							<div v-if="canManagePromotions" class="d-flex gap-1">
								<VBtn icon variant="text" size="x-small" @click="openCategoryDialog(item)">
									<VIcon icon="tabler-edit" size="18" />
								</VBtn>
								<VBtn icon variant="text" size="x-small" color="error" @click="deleteCategoryItem(item)">
									<VIcon icon="tabler-trash" size="18" />
								</VBtn>
							</div>
						</template>

						<template #no-data>
							<div class="text-center pa-4 text-disabled">
								Henüz kategori yok. Aşağıdan ekleyebilirsiniz.
							</div>
						</template>
					</VDataTable>

					<!-- Kategori Formu -->
					<VDivider class="mb-4" />
					<h6 class="text-subtitle-1 font-weight-bold mb-3">
						{{ editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle' }}
					</h6>
					<VRow>
						<VCol cols="12" md="3">
							<VTextField
								v-model="categoryForm.slug"
								label="Slug"
								hint="Benzersiz, küçük harf (ör: hosgeldin)"
								persistent-hint
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="3">
							<VTextField
								v-model="categoryForm.label"
								label="Etiket"
								hint="Görünen isim (ör: Hoşgeldin)"
								persistent-hint
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VTextField
								v-model="categoryForm.icon"
								label="İkon"
								hint="Emoji (ör: 🎁)"
								persistent-hint
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2">
							<VTextField
								v-model.number="categoryForm.order"
								label="Sıra"
								type="number"
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="2" class="d-flex align-center gap-2">
							<VSwitch v-model="categoryForm.active" label="Aktif" density="compact" color="success" />
						</VCol>
					</VRow>
					<div class="d-flex gap-2 mt-3">
						<VBtn color="primary" size="small" :disabled="!canManagePromotions" @click="saveCategory">
							{{ editingCategory ? 'Güncelle' : 'Ekle' }}
						</VBtn>
						<VBtn
							v-if="editingCategory"
							variant="tonal"
							size="small"
							@click="editingCategory = null; categoryForm = { slug: '', label: '', icon: '🎁', order: 0, active: true }"
						>
							İptal
						</VBtn>
					</div>
				</VCardText>
			</VCard>
		</VDialog>

		<!-- Delete Confirm Dialog -->
		<VDialog v-model="deleteDialogOpen" max-width="500">
			<VCard>
				<VCardTitle>{{ t("promotion.deleteConfirm") }}</VCardTitle>
				<VCardText>
					{{ t("promotion.deleteMessage", { title: selectedPromotion?.title || "" }) }}
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="tonal" @click="deleteDialogOpen = false">{{ t("cancel") }}</VBtn>
					<VBtn color="error" :disabled="!canManagePromotions" @click="deletePromotion">{{ t("delete") }}</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>
	</section>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.promo
</route>
