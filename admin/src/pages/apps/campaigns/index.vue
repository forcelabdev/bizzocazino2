<script setup lang="ts">
import axios from "@/plugins/axios";
import ability from "@/plugins/casl/ability";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { VDataTable } from "vuetify/labs/VDataTable";

const { t } = useI18n();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getBannerUrl = (path: string) => {
	if (!path) return '';
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return API_BASE_URL + path;
};

const campaigns = ref([]);
const loading = ref(false);
const canManageCampaigns = computed(
	() =>
		ability.can("manage", "finance.campaigns") ||
		ability.can("manage", "finance"),
);
const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const assignDialogOpen = ref(false);
const isEditing = ref(false);
const selectedCampaign = ref(null);
const selectedCampaignForAssign = ref(null);
const assignUserId = ref("");
const bannerFile = ref(null);
const uploadingBanner = ref(false);

const pagination = ref({
	page: 1,
	limit: 20,
	total: 0,
	totalPages: 0,
});

const defaultForm = {
	title: "",
	description: "",
	banner: "",
	category: "",
	mode: "auto",
	rewardAmount: 0,
	maxClaims: 0,
	startDate: null,
	endDate: null,
	requirements: [],
	terms: "",
	active: true,
	order: 0,
};
const form = ref({ ...defaultForm });
const formRef = ref(null);
const formValid = ref(false);

const requiredRule = (v: any) => !!v || t("validation.required");
const positiveNumberRule = (v: any) => v >= 0 || t("validation.positiveNumber");

const newRequirement = ref({
	type: "reg_date",
	operator: ">=",
	value: "",
});

const requirementTypes = [
	{ title: t("campaign.reqType.regDate"), value: "reg_date" },
];

const operators = [
	{ title: ">=", value: ">=" },
	{ title: ">", value: ">" },
	{ title: "<=", value: "<=" },
	{ title: "<", value: "<" },
	{ title: "==", value: "==" },
];

const modeOptions = [
	{ title: t("campaign.mode.auto"), value: "auto" },
	{ title: t("campaign.mode.manual"), value: "manual" },
];

const categoryOptions = ref([]);
const categoryDialogOpen = ref(false);
const categoryForm = ref({ slug: "", label: "", icon: "🎁", order: 0, active: true });
const editingCategory = ref(null);
const categoryLoading = ref(false);

const categoryHeaders = [
	{ title: t("campaign.order"), key: "order", width: 80 },
	{ title: "Slug", key: "slug" },
	{ title: t("campaign.category.label"), key: "label" },
	{ title: "İkon", key: "icon", width: 60 },
	{ title: t("campaign.active"), key: "active" },
	{ title: t("actions"), key: "actions", sortable: false },
];

const fetchCategories = async () => {
	try {
		const res = await axios.get("/admin/campaign-categories");
		const cats = res.data.data || [];
		categoryOptions.value = cats.map((c) => ({
			title: `${c.icon} ${c.label}`,
			value: c.slug,
			...c,
		}));
	} catch (err) {
		console.error("Failed to fetch categories:", err);
	}
};

const openCategoryDialog = (cat = null) => {
	if (!canManageCampaigns.value) return;
	if (cat) {
		editingCategory.value = cat;
		categoryForm.value = { slug: cat.slug, label: cat.label, icon: cat.icon || "🎁", order: cat.order || 0, active: cat.active };
	} else {
		editingCategory.value = null;
		categoryForm.value = { slug: "", label: "", icon: "🎁", order: 0, active: true };
	}
	categoryDialogOpen.value = true;
};

const saveCategory = async () => {
	if (!canManageCampaigns.value) return;
	try {
		if (editingCategory.value) {
			await axios.put(`/admin/campaign-categories/${editingCategory.value._id}`, categoryForm.value);
		} else {
			await axios.post("/admin/campaign-categories", categoryForm.value);
		}
		categoryDialogOpen.value = false;
		await fetchCategories();
	} catch (err) {
		console.error("Failed to save category:", err);
	}
};

const deleteCategory = async (cat) => {
	if (!canManageCampaigns.value) return;
	if (!confirm(`"${cat.label}" kategorisini silmek istediğinizden emin misiniz?`)) return;
	try {
		await axios.delete(`/admin/campaign-categories/${cat._id}`);
		await fetchCategories();
	} catch (err) {
		console.error("Failed to delete category:", err);
	}
};

const headers = computed(() => [
	{ title: t("campaign.order"), key: "order", width: 80 },
	{ title: t("campaign.title"), key: "title" },
	{ title: t("campaign.category.label"), key: "category" },
	{ title: t("campaign.mode.label"), key: "mode" },
	{ title: t("campaign.rewardAmount"), key: "rewardAmount" },
	{ title: t("campaign.maxClaims"), key: "maxClaims" },
	{ title: t("campaign.startDate"), key: "startDate" },
	{ title: t("campaign.endDate"), key: "endDate" },
	{ title: t("campaign.claimedCount"), key: "claimedCount" },
	{ title: t("campaign.active"), key: "active" },
	{ title: t("actions"), key: "actions", sortable: false },
]);

const fetchCampaigns = async () => {
	loading.value = true;
	try {
		const res = await axios.get("/admin/campaigns", {
			params: {
				page: pagination.value.page,
				limit: pagination.value.limit,
			},
		});
		campaigns.value = res.data.data.map((c) => ({
			...c,
			claimedCount: c.claimedBy?.length || 0,
		}));
		pagination.value = { ...pagination.value, ...res.data.pagination };
	} catch (err) {
		console.error("Failed to fetch campaigns:", err);
	} finally {
		loading.value = false;
	}
};

const createCampaign = async () => {
	if (!canManageCampaigns.value) return;
	try {
		await axios.post("/admin/campaigns", form.value);
		dialogOpen.value = false;
		resetForm();
		fetchCampaigns();
	} catch (err) {
		console.error("Failed to create campaign:", err);
	}
};

const updateCampaign = async () => {
	if (!canManageCampaigns.value || !selectedCampaign.value) return;
	try {
		await axios.put(
			`/admin/campaigns/${selectedCampaign.value._id || selectedCampaign.value.id}`,
			form.value
		);
		dialogOpen.value = false;
		resetForm();
		fetchCampaigns();
	} catch (err) {
		console.error("Failed to update campaign:", err);
	}
};

const deleteCampaign = async () => {
	if (!canManageCampaigns.value || !selectedCampaign.value) return;
	try {
		await axios.delete(`/admin/campaigns/${selectedCampaign.value._id || selectedCampaign.value.id}`);
		deleteDialogOpen.value = false;
		selectedCampaign.value = null;
		fetchCampaigns();
	} catch (err) {
		console.error("Failed to delete campaign:", err);
	}
};

const assignCampaign = async () => {
	if (!canManageCampaigns.value || !selectedCampaignForAssign.value || !assignUserId.value) return;
	try {
		await axios.post(
			`/admin/campaigns/${selectedCampaignForAssign.value._id}/assign`,
			{
				userId: assignUserId.value,
			}
		);
		assignDialogOpen.value = false;
		assignUserId.value = "";
		selectedCampaignForAssign.value = null;
		fetchCampaigns();
	} catch (err) {
		console.error("Failed to assign campaign:", err);
	}
};

const uploadBannerFile = async () => {
	if (!canManageCampaigns.value) return;
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

const openEditDialog = (campaign) => {
	if (!canManageCampaigns.value) return;
	isEditing.value = true;
	selectedCampaign.value = campaign;
	form.value = {
		title: campaign.title,
		description: campaign.description,
		banner: campaign.banner,
		category: campaign.category || "",
		mode: campaign.mode,
		rewardAmount: campaign.rewardAmount || 0,
		maxClaims: campaign.maxClaims || 0,
		startDate: campaign.startDate ? campaign.startDate.split("T")[0] : null,
		endDate: campaign.endDate ? campaign.endDate.split("T")[0] : null,
		requirements: campaign.requirements || [],
		terms: campaign.terms || "",
		active: campaign.active,
		order: campaign.order || 0,
	};
	dialogOpen.value = true;
};

const openCreateDialog = () => {
	if (!canManageCampaigns.value) return;
	isEditing.value = false;
	selectedCampaign.value = null;
	resetForm();
	dialogOpen.value = true;
};

const openDeleteDialog = (campaign) => {
	if (!canManageCampaigns.value) return;
	selectedCampaign.value = campaign;
	deleteDialogOpen.value = true;
};

const openAssignDialog = (campaign) => {
	if (!canManageCampaigns.value) return;
	selectedCampaignForAssign.value = campaign;
	assignUserId.value = "";
	assignDialogOpen.value = true;
};

const resetForm = () => {
	form.value = { ...defaultForm, requirements: [] };
};

const addRequirement = () => {
	if (!newRequirement.value.value) return;
	form.value.requirements.push({ ...newRequirement.value });
	newRequirement.value = { type: "reg_date", operator: ">=", value: "" };
};

const removeRequirement = (index) => {
	form.value.requirements.splice(index, 1);
};

const formatDate = (dateStr) => {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString();
};

const handleSubmit = async () => {
	if (!canManageCampaigns.value) return;
	const { valid } = await formRef.value?.validate();
	if (!valid) return;

	if (isEditing.value) {
		updateCampaign();
	} else {
		createCampaign();
	}
};

onMounted(async () => {
	await fetchCategories();
	await fetchCampaigns();
});

watch(() => pagination.value.page, fetchCampaigns);
</script>

<template>
	<div>
		<!-- Header -->
		<VCard class="mb-6">
			<VCardTitle class="d-flex align-center justify-space-between">
				<span>{{ t("campaign.management") }}</span>
				<div v-if="canManageCampaigns" class="d-flex gap-2">
					<VBtn color="secondary" variant="outlined" @click="categoryDialogOpen = true">
						<VIcon icon="tabler-category" class="me-2" />
						Kategoriler
					</VBtn>
					<VBtn color="primary" @click="openCreateDialog">
						<VIcon icon="tabler-plus" class="me-2" />
						{{ t("campaign.add") }}
					</VBtn>
				</div>
			</VCardTitle>
		</VCard>

		<!-- Campaigns Table -->
		<VCard>
			<VDataTable
				:items="campaigns"
				:headers="headers"
				:loading="loading"
				:items-per-page="pagination.limit"
			>
				<template #item.order="{ item }">
					<VChip size="small" color="secondary" label>
						{{ item.raw.order || 0 }}
					</VChip>
				</template>

				<template #item.category="{ item }">
					<VChip
						size="small"
						color="primary"
					>
						{{ categoryOptions.find(c => c.value === item.raw.category)?.title || item.raw.category || '-' }}
					</VChip>
				</template>

				<template #item.mode="{ item }">
					<VChip
						:color="
							item.raw.mode === 'auto' ? 'success' : 'warning'
						"
						size="small"
					>
						{{
							item.raw.mode === "auto"
								? t("campaign.mode.auto")
								: t("campaign.mode.manual")
						}}
					</VChip>
				</template>

				<template #item.rewardAmount="{ item }">
					<span class="font-weight-medium">{{
						item.raw.rewardAmount?.toLocaleString() || 0
					}}</span>
				</template>

				<template #item.maxClaims="{ item }">
					<VChip
						size="small"
						:color="
							item.raw.maxClaims === 0 ? 'secondary' : 'primary'
						"
					>
						{{
							item.raw.maxClaims === 0
								? t("campaign.unlimited")
								: item.raw.maxClaims
						}}
					</VChip>
				</template>

				<template #item.startDate="{ item }">
					{{ formatDate(item.raw.startDate) }}
				</template>

				<template #item.endDate="{ item }">
					{{ formatDate(item.raw.endDate) }}
				</template>

				<template #item.claimedCount="{ item }">
					<VChip size="small" color="info">
						{{ item.raw.claimedCount }}
					</VChip>
				</template>

				<template #item.active="{ item }">
					<VChip
						:color="item.raw.active ? 'success' : 'secondary'"
						size="small"
					>
						{{
							item.raw.active
								? t("campaign.active")
								: t("campaign.inactive")
						}}
					</VChip>
				</template>

				<template #item.actions="{ item }">
					<div v-if="canManageCampaigns" class="d-flex gap-1">
						<VBtn
							icon
							size="small"
							variant="text"
							color="primary"
							@click="openEditDialog(item.raw)"
						>
							<VIcon icon="tabler-edit" />
						</VBtn>
						<VBtn
							v-if="item.raw.mode === 'manual'"
							icon
							size="small"
							variant="text"
							color="info"
							@click="openAssignDialog(item.raw)"
						>
							<VIcon icon="tabler-user-plus" />
						</VBtn>
						<VBtn
							icon
							size="small"
							variant="text"
							color="error"
							@click="openDeleteDialog(item.raw)"
						>
							<VIcon icon="tabler-trash" />
						</VBtn>
					</div>
				</template>
			</VDataTable>

			<!-- Pagination -->
			<VCardActions class="justify-center">
				<VPagination
					v-model="pagination.page"
					:length="pagination.totalPages"
					:total-visible="5"
				/>
			</VCardActions>
		</VCard>

		<!-- Create/Edit Dialog -->
		<VDialog v-model="dialogOpen" max-width="960" persistent scrollable>
			<VCard>
				<VCardTitle>
					{{ isEditing ? t("campaign.edit") : t("campaign.add") }}
				</VCardTitle>
				<VCardText>
					<VForm
						ref="formRef"
						v-model="formValid"
						@submit.prevent="handleSubmit"
					>
						<VRow>
							<VCol cols="12" md="4">
								<VTextField
									v-model="form.title"
									:label="t('campaign.title') + ' *'"
									:rules="[requiredRule]"
								/>
							</VCol>
							<VCol cols="12" md="4">
								<VSelect
									v-model="form.category"
									:items="categoryOptions"
									item-title="title"
									item-value="value"
									:label="t('campaign.category.label')"
									clearable
								/>
							</VCol>
							<VCol cols="12" md="4">
								<VSelect
									v-model="form.mode"
									:items="modeOptions"
									item-title="title"
									item-value="value"
									:label="t('campaign.mode.label') + ' *'"
									:rules="[requiredRule]"
								/>
							</VCol>
							<VCol cols="12">
								<VTextarea
									v-model="form.description"
									:label="t('campaign.description')"
									rows="2"
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VFileInput
									v-model="bannerFile"
									:label="t('campaign.banner') + ' (Dosya Yükle)'"
									accept="image/*"
									prepend-icon="mdi-image"
									:disabled="!canManageCampaigns"
									@change="uploadBannerFile"
									:loading="uploadingBanner"
								/>
								<!-- Upload Status Indicator -->
								<div v-if="uploadingBanner" class="d-flex align-center mt-2">
									<VProgressCircular size="20" width="2" indeterminate color="primary" class="me-2" />
									<span class="text-caption text-medium-emphasis">Banner yükleniyor...</span>
								</div>
								<VAlert 
									v-else-if="form.banner" 
									type="success" 
									variant="tonal" 
									density="compact" 
									class="mt-2"
								>
									<div class="d-flex align-center justify-space-between">
										<span>Banner başarıyla yüklendi</span>
										<VBtn
											icon
											size="x-small"
											variant="text"
											color="primary"
											:href="getBannerUrl(form.banner)"
											target="_blank"
										>
											<VIcon icon="mdi-open-in-new" size="16" />
										</VBtn>
									</div>
								</VAlert>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model.number="form.rewardAmount"
									:label="t('campaign.rewardAmount')"
									:rules="[positiveNumberRule]"
									type="number"
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model.number="form.maxClaims"
									:label="t('campaign.maxClaims')"
									:hint="t('campaign.maxClaimsHint')"
									:rules="[positiveNumberRule]"
									type="number"
									persistent-hint
								/>
							</VCol>
							<VCol cols="12" md="3">
								<VTextField
									v-model="form.startDate"
									:label="t('campaign.startDate')"
									type="date"
								/>
							</VCol>
							<VCol cols="12" md="3">
								<VTextField
									v-model="form.endDate"
									:label="t('campaign.endDate')"
									type="date"
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VTextField
									v-model.number="form.order"
									:label="t('campaign.order')"
									:hint="t('campaign.orderHint')"
									:rules="[positiveNumberRule]"
									type="number"
									persistent-hint
								/>
							</VCol>
							<VCol cols="12" md="6">
								<VSwitch
									v-model="form.active"
									:label="t('campaign.active')"
								/>
							</VCol>

							<!-- Requirements Section -->
							<VCol cols="12">
								<VDivider class="my-2" />
								<div class="text-subtitle-1 mb-2">
									{{ t("campaign.requirements") }}
								</div>

								<!-- Existing requirements -->
								<div
									v-for="(req, idx) in form.requirements"
									:key="idx"
									class="d-flex align-center gap-2 mb-2"
								>
									<VChip
										closable
										@click:close="removeRequirement(idx)"
									>
										{{
											requirementTypes.find(
												(r) => r.value === req.type
											)?.title || req.type
										}}
										{{ req.operator }} {{ req.value }}
									</VChip>
								</div>

								<!-- Add new requirement -->
								<VRow dense>
									<VCol cols="12" md="4">
										<VSelect
											v-model="newRequirement.type"
											:items="requirementTypes"
											item-title="title"
											item-value="value"
											:label="t('campaign.reqType.label')"
											density="compact"
										/>
									</VCol>
									<VCol cols="12" md="3">
										<VSelect
											v-model="newRequirement.operator"
											:items="operators"
											item-title="title"
											item-value="value"
											:label="t('campaign.operator')"
											density="compact"
										/>
									</VCol>
									<VCol cols="12" md="3">
										<VTextField
											v-model="newRequirement.value"
											:label="t('campaign.value')"
											type="date"
											density="compact"
										/>
									</VCol>
									<VCol cols="12" md="2">
										<VBtn
											color="secondary"
											block
											:disabled="!canManageCampaigns"
											@click="addRequirement"
										>
											{{ t("add") }}
										</VBtn>
									</VCol>
								</VRow>
							</VCol>

							<!-- Terms (Basit Mod / HTML) -->
							<VCol cols="12">
								<VDivider class="my-2" />
								<CampaignTermsBuilder v-model="form.terms" />
							</VCol>
						</VRow>
					</VForm>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="dialogOpen = false">
						{{ t("cancel") }}
					</VBtn>
					<VBtn color="primary" :disabled="!canManageCampaigns" @click="handleSubmit">
						{{ isEditing ? t("save") : t("create") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Delete Confirmation Dialog -->
		<VDialog v-model="deleteDialogOpen" max-width="400">
			<VCard>
				<VCardTitle>{{ t("campaign.deleteConfirm") }}</VCardTitle>
				<VCardText>
					{{
						t("campaign.deleteMessage", {
							title: selectedCampaign?.title,
						})
					}}
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="deleteDialogOpen = false">
						{{ t("cancel") }}
					</VBtn>
					<VBtn color="error" :disabled="!canManageCampaigns" @click="deleteCampaign">
						{{ t("delete") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Assign Dialog (Manual Mode) -->
		<VDialog v-model="assignDialogOpen" max-width="500">
			<VCard>
				<VCardTitle>{{ t("campaign.assignToUser") }}</VCardTitle>
				<VCardText>
					<p class="mb-4">
						{{
							t("campaign.assignMessage", {
								title: selectedCampaignForAssign?.title,
							})
						}}
					</p>
					<VTextField
						v-model="assignUserId"
						:label="t('campaign.userId')"
						placeholder="User ID (ObjectId)"
					/>
				</VCardText>
				<VCardActions>
					<VSpacer />
					<VBtn variant="text" @click="assignDialogOpen = false">
						{{ t("cancel") }}
					</VBtn>
					<VBtn
						color="primary"
						:disabled="!canManageCampaigns || !assignUserId"
						@click="assignCampaign"
					>
						{{ t("campaign.assign") }}
					</VBtn>
				</VCardActions>
			</VCard>
		</VDialog>

		<!-- Category Management Dialog -->
		<VDialog v-model="categoryDialogOpen" max-width="700" persistent>
			<VCard>
				<VCardTitle class="d-flex align-center justify-space-between">
					<span>Kategori Yönetimi</span>
					<VBtn icon size="small" variant="text" @click="categoryDialogOpen = false">
						<VIcon icon="tabler-x" />
					</VBtn>
				</VCardTitle>
				<VCardText>
					<!-- Add/Edit Category Form -->
					<VCard variant="outlined" class="mb-4 pa-4">
						<div class="text-subtitle-2 mb-3">
							{{ editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle' }}
						</div>
						<VRow dense>
							<VCol cols="12" md="3">
								<VTextField
									v-model="categoryForm.slug"
									label="Slug *"
									placeholder="casino"
									density="compact"
									:disabled="!!editingCategory"
								/>
							</VCol>
							<VCol cols="12" md="4">
								<VTextField
									v-model="categoryForm.label"
									label="Görünen Ad *"
									placeholder="Casino Bonusları"
									density="compact"
								/>
							</VCol>
							<VCol cols="12" md="2">
								<VTextField
									v-model="categoryForm.icon"
									label="İkon"
									placeholder="🎲"
									density="compact"
								/>
							</VCol>
							<VCol cols="12" md="1">
								<VTextField
									v-model.number="categoryForm.order"
									label="Sıra"
									type="number"
									density="compact"
								/>
							</VCol>
							<VCol cols="12" md="2" class="d-flex align-center gap-2">
								<VBtn color="primary" size="small" :disabled="!canManageCampaigns" @click="saveCategory">
									{{ editingCategory ? t("save") : t("add") }}
								</VBtn>
								<VBtn v-if="editingCategory" variant="text" size="small" @click="openCategoryDialog()">
									İptal
								</VBtn>
							</VCol>
						</VRow>
					</VCard>

					<!-- Categories List -->
					<VDataTable
						:items="categoryOptions"
						:headers="categoryHeaders"
						:items-per-page="-1"
						density="compact"
					>
						<template #item.icon="{ item }">
							<span style="font-size: 20px;">{{ item.raw.icon }}</span>
						</template>
						<template #item.active="{ item }">
							<VChip :color="item.raw.active ? 'success' : 'secondary'" size="small">
								{{ item.raw.active ? t("campaign.active") : t("campaign.inactive") }}
							</VChip>
						</template>
						<template #item.actions="{ item }">
							<div v-if="canManageCampaigns" class="d-flex gap-1">
								<VBtn icon size="small" variant="text" color="primary" @click="openCategoryDialog(item.raw)">
									<VIcon icon="tabler-edit" />
								</VBtn>
								<VBtn icon size="small" variant="text" color="error" @click="deleteCategory(item.raw)">
									<VIcon icon="tabler-trash" />
								</VBtn>
							</div>
						</template>
					</VDataTable>
				</VCardText>
			</VCard>
		</VDialog>
	</div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.campaigns
</route>
