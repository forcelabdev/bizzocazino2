<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import ability from "@/plugins/casl/ability";
import {
	getRoles,
	getPermissions,
	createRole,
	updateRole,
	deleteRole,
} from "@/services/roleService";

const { t } = useI18n();

// State
const roles = ref([]);
const permissions = ref([]);
const groupedPermissions = ref({});
const loading = ref(false);
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const editingRole = ref(null);
const deletingRole = ref(null);

// Form
const formData = ref({
	name: "",
	displayName: "",
	description: "",
	permissions: [],
	color: "primary",
	icon: "tabler-user-shield",
});

// Colors for role badge
const colorOptions = [
	{ title: "Primary", value: "primary" },
	{ title: "Secondary", value: "secondary" },
	{ title: "Success", value: "success" },
	{ title: "Warning", value: "warning" },
	{ title: "Error", value: "error" },
	{ title: "Info", value: "info" },
];

// Icons for role
const iconOptions = [
	{ title: "Shield Star", value: "tabler-shield-star" },
	{ title: "Shield", value: "tabler-shield" },
	{ title: "User Shield", value: "tabler-user-shield" },
	{ title: "Crown", value: "tabler-crown" },
	{ title: "Key", value: "tabler-key" },
	{ title: "Lock", value: "tabler-lock" },
	{ title: "Settings", value: "tabler-settings" },
	{ title: "Dollar", value: "tabler-currency-dollar" },
	{ title: "Headset", value: "tabler-headset" },
	{ title: "Pencil", value: "tabler-pencil" },
	{ title: "Eye", value: "tabler-eye" },
	{ title: "Gamepad", value: "tabler-device-gamepad-2" },
];

// Resource labels for UI (group keys can be capitalized from backend "group")
// Backend returns Turkish group names, so we map them here
const resourceLabels = {
	// English keys (resource prefix)
	dashboard: "Dashboard",
	users: "Kullanıcılar",
	finance: "Finans",
	games: "Oyunlar",
	sports: "Spor Bahisleri",
	providers: "Sağlayıcılar",
	nft: "NFT / Kutular",
	platform: "Platform Ayarları",
	battlepass: "Battle Pass",
	notice: "Duyurular",
	communication: "İletişim",
	reports: "Raporlar",
	controlGame: "ControlGame",
	roles: "Roller",
	// Turkish keys (from backend group field)
	finans: "Finans",
	oyunlar: "Oyunlar",
	"spor bahisleri": "Spor Bahisleri",
	sağlayıcılar: "Sağlayıcılar",
	kullanıcılar: "Kullanıcılar",
	iletişim: "İletişim",
	duyurular: "Duyurular",
	raporlar: "Raporlar",
	controlgame: "ControlGame",
	roller: "Roller",
};

const resolveGroupLabel = (key) => {
	if (!key) return "";
	const normalized = String(key).toLowerCase();
	return resourceLabels[normalized] || key;
};

const resolvePermLabel = (perm) => {
	// Prefer the permission display name; fallback to action code
	return perm?.name || actionLabels[perm?.action] || perm?.action || "";
};

const resolvePermDisplay = (perm) => {
	const base = resolvePermLabel(perm);
	const parts = (perm?.resource || "").split(".");
	if (parts.length > 1) {
		const suffix = parts.slice(1).join(".");
		return `${base} (${suffix})`;
	}
	return base;
};

// Action labels
const actionLabels = {
	read: "Görüntüle",
	create: "Oluştur",
	update: "Güncelle",
	delete: "Sil",
	manage: "Tam Yetki",
};

// Computed
const isEditing = computed(() => !!editingRole.value);
const canCreateRoles = computed(
	() => ability.can("create", "roles") || ability.can("manage", "roles"),
);
const canUpdateRoles = computed(
	() => ability.can("update", "roles") || ability.can("manage", "roles"),
);
const canDeleteRoles = computed(
	() => ability.can("delete", "roles") || ability.can("manage", "roles"),
);
const dialogTitle = computed(() =>
	isEditing.value ? "Rol Düzenle" : "Yeni Rol Oluştur"
);

const sortedGroupedPermissions = computed(() => {
	return Object.entries(groupedPermissions.value || {}).sort((a, b) =>
		resolveGroupLabel(a[0]).localeCompare(resolveGroupLabel(b[0]))
	);
});

// Sub-resource labels (page-level)
const subResourceLabels = {
	listDetails: "Liste Detayları ve XLSX",
	deposits: "Yatırımlar",
	withdraws: "Çekimler",
	bankTransfers: "Banka Transferleri",
	bankTransfersWithdraw: "Banka Transfer Çekim",
	campaigns: "Kampanyalar",
	promo: "Promolar",
	betinovi: "Forcelab",
	apiSettings: "API Ayarları",
};

// Build nested structure: group → subresource (if any) → permissions
const nestedGroupedPermissions = computed(() => {
	const result = [];

	for (const [groupKey, perms] of sortedGroupedPermissions.value) {
		// Separate root-level perms (resource has no dot) vs page-level (has dot)
		const rootPerms = [];
		const subMap = {};

		for (const perm of perms) {
			const parts = (perm.resource || "").split(".");
			if (parts.length > 1) {
				const subKey = parts.slice(1).join(".");
				if (!subMap[subKey]) subMap[subKey] = [];
				subMap[subKey].push(perm);
			} else {
				rootPerms.push(perm);
			}
		}

		const subGroups = Object.entries(subMap).map(([subKey, subPerms]) => ({
			key: subKey,
			label: subResourceLabels[subKey] || subKey,
			perms: subPerms,
		}));

		result.push({
			key: groupKey,
			label: resolveGroupLabel(groupKey),
			rootPerms,
			subGroups,
			allPerms: perms,
		});
	}

	return result;
});

// Helpers for nested selection
const isSubGroupFullySelected = (perms) =>
	perms.every((p) => formData.value.permissions.includes(p._id));

const isSubGroupPartiallySelected = (perms) => {
	const count = perms.filter((p) =>
		formData.value.permissions.includes(p._id)
	).length;
	return count > 0 && count < perms.length;
};

const toggleSubGroupPermissions = (perms, value) => {
	const ids = perms.map((p) => p._id);
	if (value) {
		formData.value.permissions = [
			...new Set([...formData.value.permissions, ...ids]),
		];
	} else {
		formData.value.permissions = formData.value.permissions.filter(
			(id) => !ids.includes(id)
		);
	}
};

const isGroupFullySelected = (group) =>
	group.allPerms.every((p) => formData.value.permissions.includes(p._id));

const isGroupPartiallySelected = (group) => {
	const count = group.allPerms.filter((p) =>
		formData.value.permissions.includes(p._id)
	).length;
	return count > 0 && count < group.allPerms.length;
};

const toggleGroupPermissions = (group, value) => {
	const ids = group.allPerms.map((p) => p._id);
	if (value) {
		formData.value.permissions = [
			...new Set([...formData.value.permissions, ...ids]),
		];
	} else {
		formData.value.permissions = formData.value.permissions.filter(
			(id) => !ids.includes(id)
		);
	}
};

// Check if all permissions for a resource are selected
const isResourceFullySelected = (resource) => {
	const resourcePerms = groupedPermissions.value[resource] || [];
	return resourcePerms.every((p) =>
		formData.value.permissions.includes(p._id)
	);
};

// Check if some permissions for a resource are selected
const isResourcePartiallySelected = (resource) => {
	const resourcePerms = groupedPermissions.value[resource] || [];
	const selectedCount = resourcePerms.filter((p) =>
		formData.value.permissions.includes(p._id)
	).length;
	return selectedCount > 0 && selectedCount < resourcePerms.length;
};

// Toggle all permissions for a resource
const toggleResourcePermissions = (resource, value) => {
	const resourcePerms = groupedPermissions.value[resource] || [];
	const permIds = resourcePerms.map((p) => p._id);

	if (value) {
		// Add all permissions for this resource
		const newPerms = [
			...new Set([...formData.value.permissions, ...permIds]),
		];
		formData.value.permissions = newPerms;
	} else {
		// Remove all permissions for this resource
		formData.value.permissions = formData.value.permissions.filter(
			(id) => !permIds.includes(id)
		);
	}
};

// Methods
const fetchRoles = async () => {
	loading.value = true;
	try {
		const response = await getRoles();
		roles.value = response.data || [];
	} catch (error) {
		console.error("Error fetching roles:", error);
	} finally {
		loading.value = false;
	}
};

const fetchPermissions = async () => {
	try {
		const response = await getPermissions();
		permissions.value = response.data || [];
		groupedPermissions.value = response.grouped || {};
	} catch (error) {
		console.error("Error fetching permissions:", error);
	}
};

const openCreateDialog = () => {
	if (!canCreateRoles.value) return;
	editingRole.value = null;
	formData.value = {
		name: "",
		displayName: "",
		description: "",
		permissions: [],
		color: "primary",
		icon: "tabler-user-shield",
	};
	isDialogOpen.value = true;
};

const openEditDialog = (role) => {
	if (!canUpdateRoles.value) return;
	editingRole.value = role;
	formData.value = {
		name: role.name,
		displayName: role.displayName,
		description: role.description || "",
		permissions: role.permissions?.map((p) => p._id) || [],
		color: role.color || "primary",
		icon: role.icon || "tabler-user-shield",
	};
	isDialogOpen.value = true;
};

const openDeleteDialog = (role) => {
	if (!canDeleteRoles.value) return;
	deletingRole.value = role;
	isDeleteDialogOpen.value = true;
};

const handleSave = async () => {
	if (isEditing.value ? !canUpdateRoles.value : !canCreateRoles.value) return;
	try {
		loading.value = true;

		if (isEditing.value) {
			await updateRole(editingRole.value._id, formData.value);
		} else {
			await createRole(formData.value);
		}

		isDialogOpen.value = false;
		await fetchRoles();
	} catch (error) {
		console.error("Error saving role:", error);
	} finally {
		loading.value = false;
	}
};

const handleDelete = async () => {
	if (!canDeleteRoles.value) return;
	try {
		loading.value = true;
		await deleteRole(deletingRole.value._id);
		isDeleteDialogOpen.value = false;
		deletingRole.value = null;
		await fetchRoles();
	} catch (error) {
		console.error("Error deleting role:", error);
		alert(error.response?.data?.message || "Silme işlemi başarısız");
	} finally {
		loading.value = false;
	}
};

// Lifecycle
onMounted(async () => {
	await Promise.all([fetchRoles(), fetchPermissions()]);
});
</script>

<route lang="yaml">
meta:
  action: read
  subject: roles
</route>

<template>
	<VRow>
		<!-- Header -->
		<VCol cols="12">
			<div
				class="d-flex align-center justify-space-between flex-wrap gap-4"
			>
				<div>
					<h4 class="text-h4 mb-1">Rol Yönetimi</h4>
					<p class="text-body-1 mb-0">
						Admin kullanıcıları için roller ve yetkiler tanımlayın
					</p>
				</div>
				<VBtn
					v-if="canCreateRoles"
					color="primary"
					prepend-icon="tabler-plus"
					@click="openCreateDialog"
				>
					Yeni Rol
				</VBtn>
			</div>
		</VCol>

		<!-- Roles Grid -->
		<VCol v-for="role in roles" :key="role._id" cols="12" sm="6" lg="4">
			<VCard>
				<VCardItem>
					<template #prepend>
						<VAvatar :color="role.color" variant="tonal" rounded>
							<VIcon :icon="role.icon || 'tabler-user-shield'" />
						</VAvatar>
					</template>

					<VCardTitle>
						{{ role.displayName }}
						<VChip
							v-if="role.isSuperAdmin"
							color="error"
							size="x-small"
							class="ms-2"
						>
							Süper Admin
						</VChip>
						<VChip
							v-if="role.isSystem && !role.isSuperAdmin"
							color="secondary"
							size="x-small"
							class="ms-2"
						>
							Sistem
						</VChip>
					</VCardTitle>

					<VCardSubtitle>
						{{ role.description || "Açıklama yok" }}
					</VCardSubtitle>
				</VCardItem>

				<VCardText>
					<div class="d-flex align-center justify-space-between mb-2">
						<span class="text-body-2">Atanan Kullanıcı</span>
						<VChip size="small" color="primary" variant="tonal">
							{{ role.userCount || 0 }}
						</VChip>
					</div>

					<div class="d-flex align-center justify-space-between">
						<span class="text-body-2">Yetkiler</span>
						<VChip size="small" color="info" variant="tonal">
							{{
								role.isSuperAdmin
									? "Tümü"
									: role.permissions?.length || 0
							}}
						</VChip>
					</div>
				</VCardText>

				<VDivider />

				<VCardActions>
					<VBtn
						v-if="canUpdateRoles"
						variant="text"
						color="primary"
						:disabled="role.isSuperAdmin"
						@click="openEditDialog(role)"
					>
						Düzenle
					</VBtn>
					<VSpacer />
					<VBtn
						v-if="canDeleteRoles"
						variant="text"
						color="error"
						:disabled="role.isSystem"
						@click="openDeleteDialog(role)"
					>
						Sil
					</VBtn>
				</VCardActions>
			</VCard>
		</VCol>

		<!-- Empty State -->
		<VCol v-if="!loading && roles.length === 0" cols="12">
			<VCard>
				<VCardText class="text-center py-8">
					<VIcon icon="tabler-shield-off" size="48" class="mb-4" />
					<h5 class="text-h5 mb-2">Henüz rol tanımlanmamış</h5>
					<p class="text-body-1 mb-4">
						Yeni bir rol oluşturarak başlayın
					</p>
					<VBtn v-if="canCreateRoles" color="primary" @click="openCreateDialog">
						İlk Rolü Oluştur
					</VBtn>
				</VCardText>
			</VCard>
		</VCol>
	</VRow>

	<!-- Create/Edit Dialog -->
	<VDialog v-model="isDialogOpen" max-width="800" persistent>
		<VCard>
			<VCardTitle class="d-flex align-center pt-4 px-6">
				<VIcon icon="tabler-shield-plus" class="me-2" />
				{{ dialogTitle }}
			</VCardTitle>

			<VCardText class="px-6">
				<VForm @submit.prevent="handleSave">
					<VRow>
						<!-- Basic Info -->
						<VCol cols="12" md="6">
							<VTextField
								v-model="formData.displayName"
								label="Görüntüleme Adı *"
								placeholder="Finans Yöneticisi"
								:disabled="
									editingRole?.isSystem &&
									editingRole?.isSuperAdmin
								"
							/>
						</VCol>

						<VCol cols="12" md="6">
							<VTextField
								v-model="formData.name"
								label="Sistem Adı"
								placeholder="finance_manager"
								hint="Otomatik oluşturulur"
								:disabled="isEditing"
							/>
						</VCol>

						<VCol cols="12">
							<VTextarea
								v-model="formData.description"
								label="Açıklama"
								placeholder="Bu rol için açıklama yazın..."
								rows="2"
							/>
						</VCol>

						<VCol cols="12" md="6">
							<VSelect
								v-model="formData.color"
								:items="colorOptions"
								item-title="title"
								item-value="value"
								label="Renk"
							/>
						</VCol>

						<VCol cols="12" md="6">
							<VSelect
								v-model="formData.icon"
								:items="iconOptions"
								item-title="title"
								item-value="value"
								label="İkon"
							>
								<template #selection="{ item }">
									<VIcon :icon="item.value" class="me-2" />
									{{ item.title }}
								</template>
								<template #item="{ props, item }">
									<VListItem v-bind="props">
										<template #prepend>
											<VIcon :icon="item.value" />
										</template>
									</VListItem>
								</template>
							</VSelect>
						</VCol>

						<!-- Permissions -->
						<VCol cols="12">
							<h6 class="text-h6 mb-4">Yetkiler</h6>

							<VExpansionPanels variant="accordion">
								<VExpansionPanel
									v-for="group in nestedGroupedPermissions"
									:key="group.key"
								>
									<VExpansionPanelTitle>
										<div class="d-flex align-center gap-2">
											<VCheckbox
												:model-value="
													isGroupFullySelected(group)
												"
												:indeterminate="
													isGroupPartiallySelected(
														group
													)
												"
												hide-details
												density="compact"
												@update:model-value="
													toggleGroupPermissions(
														group,
														$event
													)
												"
												@click.stop
											/>
											<span
												class="text-body-1 font-weight-medium"
											>
												{{ group.label }}
											</span>
											<VChip
												size="x-small"
												color="primary"
												variant="tonal"
											>
												{{
													group.allPerms.filter((p) =>
														formData.permissions.includes(
															p._id
														)
													).length
												}}/{{ group.allPerms.length }}
											</VChip>
										</div>
									</VExpansionPanelTitle>

									<VExpansionPanelText>
										<!-- Root-level permissions (no sub-resource) -->
										<VRow
											v-if="group.rootPerms.length"
											dense
											class="mb-2"
										>
											<VCol
												v-for="perm in group.rootPerms"
												:key="perm._id"
												cols="12"
												sm="6"
												md="4"
											>
												<VCheckbox
													v-model="
														formData.permissions
													"
													:value="perm._id"
													:label="
														resolvePermLabel(perm)
													"
													hide-details
													density="compact"
												/>
											</VCol>
										</VRow>

										<!-- Nested sub-groups (page-level) -->
										<VExpansionPanels
											v-if="group.subGroups.length"
											variant="accordion"
											class="mt-2"
										>
											<VExpansionPanel
												v-for="sub in group.subGroups"
												:key="sub.key"
											>
												<VExpansionPanelTitle>
													<div
														class="d-flex align-center gap-2"
													>
														<VCheckbox
															:model-value="
																isSubGroupFullySelected(
																	sub.perms
																)
															"
															:indeterminate="
																isSubGroupPartiallySelected(
																	sub.perms
																)
															"
															hide-details
															density="compact"
															@update:model-value="
																toggleSubGroupPermissions(
																	sub.perms,
																	$event
																)
															"
															@click.stop
														/>
														<span
															class="text-body-2 font-weight-medium"
														>
															{{ sub.label }}
														</span>
														<VChip
															size="x-small"
															color="secondary"
															variant="tonal"
														>
															{{
																sub.perms.filter(
																	(p) =>
																		formData.permissions.includes(
																			p._id
																		)
																).length
															}}/{{
																sub.perms.length
															}}
														</VChip>
													</div>
												</VExpansionPanelTitle>

												<VExpansionPanelText>
													<VRow dense>
														<VCol
															v-for="perm in sub.perms"
															:key="perm._id"
															cols="12"
															sm="6"
															md="4"
														>
															<VCheckbox
																v-model="
																	formData.permissions
																"
																:value="
																	perm._id
																"
																:label="
																	resolvePermLabel(
																		perm
																	)
																"
																hide-details
																density="compact"
															/>
														</VCol>
													</VRow>
												</VExpansionPanelText>
											</VExpansionPanel>
										</VExpansionPanels>
									</VExpansionPanelText>
								</VExpansionPanel>
							</VExpansionPanels>
						</VCol>
					</VRow>
				</VForm>
			</VCardText>

			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="outlined" @click="isDialogOpen = false">
					İptal
				</VBtn>
				<VBtn
					v-if="isEditing ? canUpdateRoles : canCreateRoles"
					color="primary"
					:loading="loading"
					@click="handleSave"
				>
					{{ isEditing ? "Güncelle" : "Oluştur" }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>

	<!-- Delete Confirmation Dialog -->
	<VDialog v-model="isDeleteDialogOpen" max-width="400">
		<VCard>
			<VCardTitle class="text-h5 pt-4"> Rolü Sil </VCardTitle>
			<VCardText>
				<strong>{{ deletingRole?.displayName }}</strong> rolünü silmek
				istediğinize emin misiniz? <br /><br />
				Bu işlem geri alınamaz.
			</VCardText>
			<VCardActions>
				<VSpacer />
				<VBtn variant="outlined" @click="isDeleteDialogOpen = false">
					İptal
				</VBtn>
				<VBtn v-if="canDeleteRoles" color="error" :loading="loading" @click="handleDelete">
					Sil
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>
