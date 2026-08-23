<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { getRoles, assignRoleToUser } from "@/services/roleService"
import ability from "@/plugins/casl/ability"
import { usePermissionStore } from "@/stores/permissionStore"
import { avatarText } from "@core/utils/formatters"
import { useI18n } from "vue-i18n"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const { t } = useI18n()

const snackbar = ref({
  visible: false,
  message: "",
  color: "success",
  timeout: 3000,
})

function showSnackbar(message, color = "success") {
  snackbar.value.message = message
  snackbar.value.color = color
  snackbar.value.visible = true
}

const isUserInfoEditDialogVisible = ref(false)
const isRoleDialogVisible = ref(false)
const userListStore = useUserListStore()
const userData = ref(props.userData)
const permissionStore = usePermissionStore()
const canEditUser = computed(() => ability.can("update", "users"))
const canAssignRole = computed(() => ability.can("update", "roles"))
const suspensionLoading = ref(false)
const betAccessLoading = ref(false)

watch(
  () => props.userData,
  value => {
    userData.value = value
  },
)

const isUserSuspended = computed(() => {
  const expire = userData.value?.ban?.expire
  if (!expire) return false

  return new Date(expire).getTime() > Date.now()
})

const isBetAccessBlocked = computed(() => userData.value?.betAccess?.blocked === true)
const isEmailVerified = computed(() => userData.value?.local?.emailVerified === true)

// Profildeki "risk" kategorili etiketler için ilk bakışta görünen kırmızı belirteç.
// (bkz. UserRiskNotesCard.vue — kart içindeki risk uyarısıyla aynı mantık)
const hasRiskTag = computed(() => {
  const rawTags = Array.isArray(userData.value?.tags) ? userData.value.tags : []

  return rawTags.some(tag => typeof tag === "object" && tag?.category === "risk")
})

// Role assignment
const roles = ref([])
const selectedRoleId = ref(null)
const roleLoading = ref(false)

const fetchRoles = async () => {
  try {
    const response = await getRoles()

    roles.value = response.data || []
  } catch (error) {
    console.error("Error fetching roles:", error)
  }
}

const openRoleDialog = async () => {
  await fetchRoles()
  selectedRoleId.value = userData.value.adminRole?._id || null
  isRoleDialogVisible.value = true
}

const handleAssignRole = async () => {
  roleLoading.value = true
  try {
    await assignRoleToUser(userData.value._id, selectedRoleId.value)
    showSnackbar(t("roles.assignRole") + " - " + t("success"), "success")
    isRoleDialogVisible.value = false

    // If current user's role changed, refresh ACL immediately
    const currentUserId = JSON.parse(
      localStorage.getItem("userData") || "{}",
    ).id

    if (currentUserId && userData.value._id === currentUserId) {
      await permissionStore.fetchPermissions()

      const abilities = permissionStore.getAbilities()

      localStorage.setItem("userAbilities", JSON.stringify(abilities))
      ability.update(abilities)

      const storedUserData = JSON.parse(
        localStorage.getItem("userData") || "{}",
      )

      storedUserData.isSuperAdmin = permissionStore.isSuperAdmin
      storedUserData.adminRole = permissionStore.role
      localStorage.setItem("userData", JSON.stringify(storedUserData))
    }

    // Refresh user data
    const response = await userListStore.fetchUser(userData.value._id)

    userData.value = response?.data?.data || userData.value
    emit("updated", userData.value)
  } catch (error) {
    console.error("Error assigning role:", error)
    showSnackbar(
      error.response?.data?.message || t("updateFailed"),
      "error",
    )
  } finally {
    roleLoading.value = false
  }
}

const updateUser = async updatedUser => {
  const { manualAdjustment, ...profilePayload } = updatedUser || {}

  try {
    let message = ""

    const response = await userListStore.editUser(
      userData.value._id,
      profilePayload,
    )

    message = response?.message || message

    if (manualAdjustment) {
      const manualResponse = await userListStore.createUserManualAdjustment(
        userData.value._id,
        manualAdjustment,
      )

      message = manualResponse?.message || t("manualAdjustments.success")
    }

    const refreshedUser = await userListStore.fetchUser(userData.value._id)

    userData.value = refreshedUser?.data?.data || response?.data || userData.value
    emit("updated", userData.value)
    showSnackbar(message || t("userUpdated"), "success")
  } catch (err) {
    console.error("Update error:", err)

    const errorMessage = err.response?.data?.message === "INVALID_MANUAL_BONUS_CATEGORY"
      ? t("manualAdjustments.invalidBonusCategory")
      : err.response?.data?.message || t("updateFailed")

    showSnackbar(errorMessage, "error")
  }
}

const toggleSuspension = async () => {
  if (!canEditUser.value || !userData.value?._id) return

  suspensionLoading.value = true
  try {
    let response

    if (isUserSuspended.value) {
      if (!confirm("Bu kullanıcının askısını kaldırmak istediğinizden emin misiniz?")) return
      response = await userListStore.unsuspendUser(userData.value._id)
      showSnackbar("Kullanıcı askısı kaldırıldı", "success")
    } else {
      const reason = prompt("Askıya alma sebebi", userData.value?.ban?.reason || "")
      if (reason === null) return
      response = await userListStore.suspendUser(userData.value._id, { reason })
      showSnackbar("Kullanıcı askıya alındı", "success")
    }

    userData.value = response?.data || userData.value
    emit("updated", userData.value)
  } catch (error) {
    console.error("Suspension update error:", error)
    showSnackbar(error.response?.data?.message || t("updateFailed"), "error")
  } finally {
    suspensionLoading.value = false
  }
}

const toggleBetAccess = async () => {
  if (!canEditUser.value || !userData.value?._id) return

  let reason
  if (isBetAccessBlocked.value) {
    if (!confirm(t("betAccess.confirmRestore"))) return
  } else {
    reason = prompt(
      t("betAccess.reasonPrompt"),
      userData.value?.betAccess?.reason || "",
    )
    if (reason === null) return
  }

  betAccessLoading.value = true
  try {
    const response = await userListStore.updateBetAccess(userData.value._id, {
      blocked: !isBetAccessBlocked.value,
      reason: reason || undefined,
    })

    userData.value = response?.data || userData.value
    emit("updated", userData.value)
    showSnackbar(response?.message || t("success"), "success")
  } catch (error) {
    console.error("Bet access update error:", error)
    showSnackbar(error.response?.data?.message || t("updateFailed"), "error")
  } finally {
    betAccessLoading.value = false
  }
}

const resolveUserRoleVariant = role => {
  switch (role) {
  case "admin":
    return { color: "secondary", icon: "tabler-server-2" }
  case "partner":
    return { color: "info", icon: "tabler-handshake" }
  case "user":
    return { color: "primary", icon: "tabler-user" }
  default:
    return { color: "primary", icon: "tabler-user" }
  }
}
</script>

<template>
  <VCard v-if="userData">
    <VCardText class="d-flex flex-wrap justify-space-between align-center gap-6 pa-6">
      <div class="d-flex align-center gap-4">
        <VBadge
          :model-value="hasRiskTag"
          color="error"
          dot
          location="top end"
          offset-x="6"
          offset-y="6"
          :title="t('userNotes.riskUser')"
        >
          <VAvatar
            rounded
            :size="72"
            :color="!userData.avatar ? 'primary' : undefined"
            :variant="!userData.avatar ? 'tonal' : undefined"
          >
            <VImg
              v-if="userData.avatar"
              :src="userData.avatar"
            />
            <span
              v-else
              class="text-h4 font-weight-medium"
            >
              {{ avatarText(userData.name) }}
            </span>
          </VAvatar>
        </VBadge>

        <div>
          <div class="d-flex align-center gap-2 flex-wrap">
            <h5 class="text-h5">
              {{ userData.name || userData.username }}
            </h5>
            <VChip
              label
              size="small"
              :color="resolveUserRoleVariant(userData.rank).color"
              class="text-capitalize"
            >
              <VIcon
                :icon="resolveUserRoleVariant(userData.rank).icon"
                size="14"
                class="me-1"
              />
              {{ userData.rank }}
            </VChip>
            <VChip
              v-if="userData.rank === 'admin' && userData.adminRole"
              size="small"
              :color="userData.adminRole.color || 'primary'"
            >
              {{ userData.adminRole.displayName }}
            </VChip>
          </div>

          <div class="d-flex align-center gap-2 flex-wrap mt-2">
            <VChip
              size="x-small"
              variant="tonal"
              :color="isUserSuspended ? 'error' : 'success'"
            >
              {{ isUserSuspended ? t("suspended") : t("active") }}
            </VChip>
            <VChip
              size="x-small"
              variant="tonal"
              :color="isBetAccessBlocked ? 'warning' : 'success'"
            >
              <VIcon
                :icon="isBetAccessBlocked ? 'tabler-device-gamepad-2-off' : 'tabler-device-gamepad-2'"
                size="12"
                class="me-1"
              />
              {{ isBetAccessBlocked ? t("betAccess.block") : t("betAccess.restore") }}
            </VChip>
            <VChip
              size="x-small"
              variant="tonal"
              :color="isEmailVerified ? 'success' : 'secondary'"
            >
              <VIcon
                icon="tabler-mail-check"
                size="12"
                class="me-1"
              />
              {{ isEmailVerified ? t("emailVerified") : t("emailNotVerified") }}
            </VChip>
          </div>
        </div>
      </div>

      <div class="d-flex gap-3 flex-wrap">
        <VBtn
          v-if="canEditUser"
          variant="elevated"
          @click="isUserInfoEditDialogVisible = true"
        >
          {{ t("edit") }}
        </VBtn>
        <VBtn
          v-if="userData.rank === 'admin' && canAssignRole"
          variant="tonal"
          color="info"
          @click="openRoleDialog"
        >
          <VIcon
            icon="tabler-shield-cog"
            class="me-1"
          />
          {{ t("roles.assignRole") }}
        </VBtn>
        <VBtn
          variant="tonal"
          :color="isUserSuspended ? 'success' : 'error'"
          :loading="suspensionLoading"
          :disabled="!canEditUser"
          @click="toggleSuspension"
        >
          <VIcon
            :icon="isUserSuspended ? 'tabler-user-check' : 'tabler-user-pause'"
            class="me-1"
          />
          {{ isUserSuspended ? t("unsuspend") : t("suspend") }}
        </VBtn>
        <VBtn
          variant="tonal"
          :color="isBetAccessBlocked ? 'success' : 'warning'"
          :loading="betAccessLoading"
          :disabled="!canEditUser"
          @click="toggleBetAccess"
        >
          <VIcon
            :icon="isBetAccessBlocked ? 'tabler-device-gamepad-2' : 'tabler-device-gamepad-2-off'"
            class="me-1"
          />
          {{ isBetAccessBlocked ? t("betAccess.restore") : t("betAccess.block") }}
        </VBtn>
      </div>
    </VCardText>
  </VCard>

  <!-- Edit Dialog -->
  <UserInfoEditDialog
    v-if="
      isUserInfoEditDialogVisible &&
        userData &&
        Object.keys(userData).length > 0
    "
    v-model:isDialogVisible="isUserInfoEditDialogVisible"
    :user-data="userData"
    @submit="updateUser"
  />

  <!-- Role Assignment Dialog -->
  <VDialog
    v-model="isRoleDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardTitle class="d-flex align-center pt-4 px-6">
        <VIcon
          icon="tabler-shield-cog"
          class="me-2"
        />
        {{ t("roles.assignRole") }}
      </VCardTitle>

      <VCardText class="px-6">
        <div
          class="d-flex align-center gap-3 mb-4 pa-3 rounded"
          style="background: rgba(var(--v-theme-on-surface), 0.04)"
        >
          <VAvatar
            size="48"
            :image="userData?.avatar"
            :color="userData?.adminRole?.color || 'primary'"
            variant="tonal"
          >
            <span v-if="!userData?.avatar">
              {{
                avatarText(
                  userData?.name || userData?.username || "U"
                )
              }}
            </span>
          </VAvatar>
          <div>
            <div class="font-weight-medium">
              {{ userData?.username }}
            </div>
            <div class="text-body-2 text-disabled">
              {{ userData?.local?.email }}
            </div>
          </div>
        </div>

        <VSelect
          v-model="selectedRoleId"
          :items="roles"
          item-title="displayName"
          item-value="_id"
          :label="t('roles.selectRole')"
          :placeholder="t('roles.selectRole')"
          clearable
        >
          <template #selection="{ item }">
            <VChip
              :color="item.raw.color"
              size="small"
            >
              <VIcon
                :icon="item.raw.icon"
                size="16"
                class="me-1"
              />
              {{ item.raw.displayName }}
            </VChip>
          </template>
          <template #item="{ props: itemProps, item }">
            <VListItem v-bind="itemProps">
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
                  {{ t("roles.superAdmin") }}
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
          {{ t("roles.removeRole") }}
        </VAlert>
      </VCardText>

      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="isRoleDialogVisible = false"
        >
          {{ t("cancel") }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="roleLoading"
          @click="handleAssignRole"
        >
          {{ t("save") }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- Snackbar -->
  <VSnackbar
    v-model="snackbar.visible"
    :timeout="snackbar.timeout"
    :color="snackbar.color"
    location="top"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
