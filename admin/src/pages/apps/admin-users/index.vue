<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { VDataTableServer } from "vuetify/labs/VDataTable";
import ability from "@/plugins/casl/ability";
import { usePermissionStore } from "@/stores/permissionStore";
import {
	getAdminUsers,
	getRoles,
	assignRoleToUser,
} from "@/services/roleService";

const router = useRouter();
const permissionStore = usePermissionStore();
const canUpdateRoles = computed(
	() => ability.can("update", "roles") || ability.can("manage", "roles"),
);

// State
const adminUsers = ref([]);
const roles = ref([]);
const loading = ref(false);
const totalUsers = ref(0);
const search = ref("");
const selectedRole = ref(null);

// Pagination
const options = ref({
	page: 1,
	itemsPerPage: 10,
});

// Role assignment dialog
const isAssignDialogOpen = ref(false);
const selectedUser = ref(null);
const selectedRoleId = ref(null);
const assignLoading = ref(false);

// Table headers
const headers = [
	{ title: "Kullanıcı", key: "user", sortable: false },
	{ title: "Email", key: "email", sortable: false },
	{ title: "Mevcut Rol", key: "adminRole", sortable: false },
	{ title: "Kayıt Tarihi", key: "createdAt", sortable: true },
	{ title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

// Methods
const fetchAdminUsers = async () => {
	loading.value = true;
	try {
		const response = await getAdminUsers({
			page: options.value.page,
			limit: options.value.itemsPerPage,
			search: search.value,
			roleId: selectedRole.value,
		});
		adminUsers.value = response.data || [];
		totalUsers.value = response.total || 0;
	} catch (error) {
		console.error("Error fetching admin users:", error);
	} finally {
		loading.value = false;
	}
};

const fetchRoles = async () => {
	try {
		const response = await getRoles();
		roles.value = response.data || [];
	} catch (error) {
		console.error("Error fetching roles:", error);
	}
};

const openAssignDialog = (user) => {
	if (!canUpdateRoles.value) return;
	selectedUser.value = user;
	selectedRoleId.value = user.adminRole?._id || null;
	isAssignDialogOpen.value = true;
};

const handleAssignRole = async () => {
	if (!canUpdateRoles.value) return;
	if (!selectedUser.value) return;

	assignLoading.value = true;
	try {
		await assignRoleToUser(selectedUser.value._id, selectedRoleId.value);
		isAssignDialogOpen.value = false;
		await fetchAdminUsers();

		// If current user's role changed, refresh ACL immediately
		const currentUserId = JSON.parse(
			localStorage.getItem("userData") || "{}"
		).id;
		if (currentUserId && selectedUser.value._id === currentUserId) {
			await permissionStore.fetchPermissions();
			const abilities = permissionStore.getAbilities();
			localStorage.setItem("userAbilities", JSON.stringify(abilities));
			ability.update(abilities);

			const userData = JSON.parse(
				localStorage.getItem("userData") || "{}"
			);
			userData.isSuperAdmin = permissionStore.isSuperAdmin;
			userData.adminRole = permissionStore.role;
			localStorage.setItem("userData", JSON.stringify(userData));
		}
	} catch (error) {
		console.error("Error assigning role:", error);
		alert(error.response?.data?.message || "Rol atama başarısız");
	} finally {
		assignLoading.value = false;
	}
};

const formatDate = (date) => {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("tr-TR", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

// Watchers
watch(
	[() => options.value.page, () => options.value.itemsPerPage],
	fetchAdminUsers
);
watch(search, () => {
	options.value.page = 1;
	fetchAdminUsers();
});
watch(selectedRole, () => {
	options.value.page = 1;
	fetchAdminUsers();
});

// Lifecycle
onMounted(async () => {
	await Promise.all([fetchAdminUsers(), fetchRoles()]);
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
					<h4 class="text-h4 mb-1">Admin Kullanıcıları</h4>
					<p class="text-body-1 mb-0">
						Admin paneline erişimi olan kullanıcıları ve rollerini
						yönetin
					</p>
				</div>
			</div>
		</VCol>

		<!-- Filters -->
		<VCol cols="12">
			<VCard>
				<VCardText>
					<VRow>
						<VCol cols="12" md="6">
							<VTextField
								v-model="search"
								placeholder="Kullanıcı ara..."
								prepend-inner-icon="tabler-search"
								clearable
								density="compact"
							/>
						</VCol>
						<VCol cols="12" md="6">
							<VSelect
								v-model="selectedRole"
								:items="roles"
								item-title="displayName"
								item-value="_id"
								placeholder="Role göre filtrele"
								clearable
								density="compact"
							>
								<template #selection="{ item }">
									<VChip :color="item.raw.color" size="small">
										<VIcon
											:icon="item.raw.icon"
											size="16"
											class="me-1"
										/>
										{{ item.raw.displayName }}
									</VChip>
								</template>
								<template #item="{ props, item }">
									<VListItem v-bind="props">
										<template #prepend>
											<VIcon
												:icon="item.raw.icon"
												:color="item.raw.color"
											/>
										</template>
									</VListItem>
								</template>
							</VSelect>
						</VCol>
					</VRow>
				</VCardText>
			</VCard>
		</VCol>

		<!-- Table -->
		<VCol cols="12">
			<VCard>
				<VDataTableServer
					v-model:items-per-page="options.itemsPerPage"
					v-model:page="options.page"
					:headers="headers"
					:items="adminUsers"
					:items-length="totalUsers"
					:loading="loading"
					class="text-no-wrap"
				>
					<!-- User -->
					<template #item.user="{ item }">
						<div class="d-flex align-center gap-3">
							<VAvatar
								size="38"
								:image="item.raw.avatar"
								:color="item.raw.adminRole?.color || 'primary'"
								variant="tonal"
							>
								<span v-if="!item.raw.avatar">
									{{
										item.raw.username
											?.charAt(0)
											?.toUpperCase() || "U"
									}}
								</span>
							</VAvatar>
							<div>
								<div class="font-weight-medium">
									{{ item.raw.username || "İsimsiz" }}
								</div>
								<div class="text-body-2 text-disabled">
									ID: {{ item.raw._id }}
								</div>
							</div>
						</div>
					</template>

					<!-- Email -->
					<template #item.email="{ item }">
						{{ item.raw.local?.email || "-" }}
					</template>

					<!-- Admin Role -->
					<template #item.adminRole="{ item }">
						<VChip
							v-if="item.raw.adminRole"
							:color="item.raw.adminRole.color"
							size="small"
						>
							<VIcon
								:icon="item.raw.adminRole.icon"
								size="16"
								class="me-1"
							/>
							{{ item.raw.adminRole.displayName }}
							<VIcon
								v-if="item.raw.adminRole.isSuperAdmin"
								icon="tabler-star-filled"
								size="12"
								class="ms-1"
							/>
						</VChip>
						<VChip
							v-else
							color="secondary"
							variant="outlined"
							size="small"
						>
							Rol Atanmamış
						</VChip>
					</template>

					<!-- Created At -->
					<template #item.createdAt="{ item }">
						{{ formatDate(item.raw.createdAt) }}
					</template>

					<!-- Actions -->
					<template #item.actions="{ item }">
						<VBtn
							v-if="canUpdateRoles"
							icon
							variant="text"
							size="small"
							color="primary"
							title="Rol Ata"
							@click="openAssignDialog(item.raw)"
						>
							<VIcon icon="tabler-shield-cog" />
						</VBtn>
						<VBtn
							icon
							variant="text"
							size="small"
							title="Görüntüle"
							@click="
								router.push({
									name: 'apps-user-view-id',
									params: { id: item.raw._id },
								})
							"
						>
							<VIcon icon="tabler-eye" />
						</VBtn>
					</template>
				</VDataTableServer>
			</VCard>
		</VCol>
	</VRow>

	<!-- Assign Role Dialog -->
	<VDialog v-model="isAssignDialogOpen" max-width="500">
		<VCard>
			<VCardTitle class="d-flex align-center pt-4 px-6">
				<VIcon icon="tabler-shield-cog" class="me-2" />
				Rol Ata
			</VCardTitle>

			<VCardText class="px-6">
				<div
					v-if="selectedUser"
					class="d-flex align-center gap-3 mb-4 pa-3 rounded"
					style="background: rgba(var(--v-theme-on-surface), 0.04)"
				>
					<VAvatar
						size="48"
						:image="selectedUser.avatar"
						:color="selectedUser.adminRole?.color || 'primary'"
						variant="tonal"
					>
						<span v-if="!selectedUser.avatar">
							{{
								selectedUser.username
									?.charAt(0)
									?.toUpperCase() || "U"
							}}
						</span>
					</VAvatar>
					<div>
						<div class="font-weight-medium">
							{{ selectedUser.username }}
						</div>
						<div class="text-body-2 text-disabled">
							{{ selectedUser.local?.email }}
						</div>
					</div>
				</div>

				<VSelect
					v-model="selectedRoleId"
					:items="roles"
					item-title="displayName"
					item-value="_id"
					label="Rol Seçin"
					placeholder="Rol seçin veya boş bırakın"
					clearable
				>
					<template #selection="{ item }">
						<VChip :color="item.raw.color" size="small">
							<VIcon
								:icon="item.raw.icon"
								size="16"
								class="me-1"
							/>
							{{ item.raw.displayName }}
						</VChip>
					</template>
					<template #item="{ props, item }">
						<VListItem v-bind="props">
							<template #prepend>
								<VIcon
									:icon="item.raw.icon"
									:color="item.raw.color"
								/>
							</template>
							<template #append>
								<VChip
									v-if="item.raw.isSuperAdmin"
									color="error"
									size="x-small"
								>
									Süper Admin
								</VChip>
							</template>
						</VListItem>
					</template>
				</VSelect>

				<VAlert
					v-if="!selectedRoleId"
					type="info"
					variant="tonal"
					class="mt-4"
				>
					Rol seçilmezse kullanıcının mevcut rolü kaldırılacaktır.
				</VAlert>
			</VCardText>

			<VCardActions class="px-6 pb-4">
				<VSpacer />
				<VBtn variant="outlined" @click="isAssignDialogOpen = false">
					İptal
				</VBtn>
				<VBtn
					v-if="canUpdateRoles"
					color="primary"
					:loading="assignLoading"
					@click="handleAssignRole"
				>
					Kaydet
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>
