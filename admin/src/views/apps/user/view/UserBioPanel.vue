<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { getRoles, assignRoleToUser } from "@/services/roleService"
import ability from "@/plugins/casl/ability"
import { usePermissionStore } from "@/stores/permissionStore"
import { avatarText, kFormatter } from "@core/utils/formatters"
import { useI18n } from "vue-i18n"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

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

const copyAccountNumber = async () => {
  const numericId = userData.value?.numericId
  if (numericId === null || numericId === undefined) return

  try {
    await navigator.clipboard.writeText(String(numericId))
    showSnackbar(t("accountNumberCopied"), "success")
  } catch (error) {
    console.error("Hesap numarası panoya kopyalanamadı:", error)
    showSnackbar(t("copyFailed"), "error")
  }
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

const isUserSuspended = computed(() => {
  const expire = userData.value?.ban?.expire
  if (!expire) return false

  return new Date(expire).getTime() > Date.now()
})

const isBetAccessBlocked = computed(() => userData.value?.betAccess?.blocked === true)

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
  <VRow>
    <VCol cols="12">
      <VCard v-if="userData">
        <!-- Avatar + Name -->
        <VCardText class="text-center pt-10">
          <VAvatar
            rounded
            :size="100"
            :color="!userData.avatar ? 'primary' : undefined"
            :variant="!userData.avatar ? 'tonal' : undefined"
          >
            <VImg
              v-if="userData.avatar"
              :src="userData.avatar"
            />
            <span
              v-else
              class="text-5xl font-weight-medium"
            >
              {{ avatarText(userData.name) }}
            </span>
          </VAvatar>

          <h6 class="text-h4 mt-4">
            {{ userData.name }}
          </h6>

          <VChip
            label
            :color="resolveUserRoleVariant(userData.rank).color"
            size="small"
            class="text-capitalize mt-3"
          >
            {{ t("totalBet") }}
            {{ kFormatter(userData.stats?.bet || 0) }}
            {{ userData.fiatCurrency }}
          </VChip>
        </VCardText>

        <!-- Deposit & Withdraw -->
        <VCardText>
          <VRow class="text-center">
            <VCol cols="6">
              <VAvatar
                size="38"
                rounded
                color="success"
                variant="tonal"
                class="mb-2"
              >
                <VIcon icon="tabler-currency-dollar" />
              </VAvatar>
              <h6 class="text-h6">
                {{ kFormatter(userData.stats?.deposit || 0) }}
                {{ userData.fiatCurrency }}
              </h6>
              <span class="text-sm">{{ t("deposit") }}</span>
            </VCol>

            <VCol cols="6">
              <VAvatar
                size="38"
                rounded
                color="error"
                variant="tonal"
                class="mb-2"
              >
                <VIcon icon="tabler-arrow-bar-to-down" />
              </VAvatar>
              <h6 class="text-h6">
                {{ kFormatter(userData.stats?.withdraw || 0) }}
                {{ userData.fiatCurrency }}
              </h6>
              <span class="text-sm">{{ t("withdraw") }}</span>
            </VCol>
          </VRow>
        </VCardText>

        <VDivider />

        <!-- Details -->
        <VCardText>
          <p class="text-sm text-uppercase text-disabled mb-2">
            {{ t("details") }}
          </p>

          <VTable density="compact">
            <tbody>
              <tr>
                <td>
                  <strong>{{ t("username") }}</strong>
                </td>
                <td>{{ userData.username }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("accountNumber") }}</strong>
                </td>
                <td>
                  <button
                    v-if="userData.numericId !== null && userData.numericId !== undefined"
                    type="button"
                    class="d-inline-flex align-center text-body-2 account-number-copy"
                    :title="t('copyAccountNumber')"
                    :aria-label="t('copyAccountNumber')"
                    @click="copyAccountNumber"
                  >
                    <span>{{ userData.numericId }}</span>
                    <VIcon
                      icon="tabler-copy"
                      size="15"
                      class="ms-1"
                    />
                  </button>
                  <span v-else>—</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("email") }}</strong>
                </td>
                <td>{{ userData.local?.email }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("identity") }}</strong>
                </td>
                <td>{{ userData.identity?.idNumber }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("phone") }}</strong>
                </td>
                <td>{{ userData.phone }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("wallets.wallets") }}</strong>
                </td>
                <td>
                  <VMenu>
                    <template #activator="{ props: activatorProps }">
                      <VChip
                        v-bind="activatorProps"
                        color="primary"
                        size="small"
                        label
                        class="cursor-pointer"
                      >
                        {{
                          userData.activeWallet
                            ?.coinType
                        }}:
                        {{
                          userData.activeWallet
                            ?.balance
                        }}
                      </VChip>
                    </template>

                    <VList>
                      <VListSubheader>
                        {{
                          t("allWallets")
                        }}
                      </VListSubheader>
                      <VListItem
                        v-for="wallet in userData.wallets"
                        :key="
                          wallet.coinType +
                            wallet.chain +
                            wallet.type
                        "
                      >
                        <VListItemTitle>
                          {{ wallet.coinType }} ({{
                            wallet.chain
                          }}
                          - {{ wallet.type }}):
                          {{ wallet.balance }}
                        </VListItemTitle>
                      </VListItem>
                    </VList>
                  </VMenu>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("fiatCurrency") }}</strong>
                </td>
                <td>{{ userData.fiatCurrency }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("shop.coinBalance") }}</strong>
                </td>
                <td>{{ userData.currency?.coins || 0 }}</td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("affiliates.redeemedCode") }}</strong>
                </td>
                <td>
                  <VChip
                    v-if="userData.affiliates?.redeemedCode"
                    color="info"
                    size="small"
                    label
                  >
                    {{ userData.affiliates.redeemedCode }}
                  </VChip>
                  <span v-else>-</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{{ t("role") }}</strong>
                </td>
                <td>
                  {{ userData.rank }}
                  <VChip
                    v-if="
                      userData.rank === 'admin' &&
                        userData.adminRole
                    "
                    :color="
                      userData.adminRole.color ||
                        'primary'
                    "
                    size="x-small"
                    class="ms-2"
                  >
                    {{ userData.adminRole.displayName }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>

        <!-- Edit / Suspend / Role -->
        <VCardText class="d-flex justify-center gap-3 flex-wrap">
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
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

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

<style lang="scss" scoped>
.cursor-pointer {
	cursor: pointer;
}

.account-number-copy {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>
