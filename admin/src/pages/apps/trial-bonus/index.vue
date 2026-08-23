<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import axios from "@axios"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
const userStore = useUserListStore()

/* --------------------------------------------------------------------- */
/* Ayarlar                                                               */
/* --------------------------------------------------------------------- */

const settingsLoading = ref(false)
const settingsSaving = ref(false)
const settings = ref({
  enabled: false,
  autoApprove: true,
  amount: 1000,
  wageringMultiplier: 0,
  blockOtherBonuses: false,
  durationHours: 0,
  note: "",
})

const fetchSettings = async () => {
  settingsLoading.value = true
  try {
    const res = await axios.get("/admin/trial-bonus/settings")
    settings.value = { ...settings.value, ...res.data.data }
  } catch (error) {
    console.error("Deneme bonusu ayarları alınamadı:", error)
  } finally {
    settingsLoading.value = false
  }
}

const saveSettings = async () => {
  settingsSaving.value = true
  try {
    const res = await axios.put("/admin/trial-bonus/settings", {
      enabled: settings.value.enabled,
      autoApprove: settings.value.autoApprove,
      amount: Number(settings.value.amount),
      wageringMultiplier: Number(settings.value.wageringMultiplier),
      blockOtherBonuses: settings.value.blockOtherBonuses,
      durationHours: Number(settings.value.durationHours),
      note: settings.value.note,
    })
    settings.value = { ...settings.value, ...res.data.data }
    snackbar.value = { show: true, text: t("trialBonusAdmin.saved"), color: "success" }
  } catch (error) {
    console.error("Deneme bonusu ayarları kaydedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("trialBonusAdmin.saveFailed"), color: "error" }
  } finally {
    settingsSaving.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Talepler                                                              */
/* --------------------------------------------------------------------- */

const claimsLoading = ref(false)
const claims = ref([])
const totalClaims = ref(0)
const pendingCount = ref(0)
const options = ref({ page: 1, itemsPerPage: 10 })
const search = ref("")
const statusFilter = ref(null)
const actionId = ref(null)

const statusOptions = [
  { value: "pending", title: t("trialBonusAdmin.statusPending") },
  { value: "approved", title: t("trialBonusAdmin.statusApproved") },
  { value: "rejected", title: t("trialBonusAdmin.statusRejected") },
]

const claimHeaders = [
  { title: t("trialBonusAdmin.user"), key: "user" },
  { title: t("trialBonusAdmin.bonusAmount"), key: "bonusAmount" },
  { title: t("trialBonusAdmin.status"), key: "status" },
  { title: t("trialBonusAdmin.date"), key: "date" },
  { title: t("trialBonusAdmin.actions"), key: "actions", sortable: false },
]

const statusColor = status => {
  if (status === "approved") return "success"
  if (status === "rejected") return "error"
  return "warning"
}

const statusLabel = status => {
  if (status === "approved") return t("trialBonusAdmin.statusApproved")
  if (status === "rejected") return t("trialBonusAdmin.statusRejected")
  return t("trialBonusAdmin.statusPending")
}

const formatMoney = value => {
  const number = Number(value || 0)

  return `${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

const formatDate = value => {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const fetchClaims = async () => {
  claimsLoading.value = true
  try {
    const res = await axios.get("/admin/trial-bonus/claims", {
      params: {
        page: options.value.page,
        itemsPerPage: options.value.itemsPerPage,
        q: search.value || undefined,
        status: statusFilter.value || undefined,
      },
    })
    claims.value = res.data.data
    totalClaims.value = res.data.total
    pendingCount.value = res.data.pendingCount
  } catch (error) {
    console.error("Deneme bonusu talepleri alınamadı:", error)
  } finally {
    claimsLoading.value = false
  }
}

watch(
  [search, statusFilter, () => options.value.page, () => options.value.itemsPerPage],
  fetchClaims,
)

const approveClaim = async claimItem => {
  actionId.value = claimItem._id
  try {
    await userStore.approveTrialBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep onaylanamadı:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("trialBonusAdmin.approveFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const rejectClaim = async claimItem => {
  if (!confirm(t("trialBonusAdmin.rejectConfirm"))) return

  actionId.value = claimItem._id
  try {
    await userStore.rejectTrialBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep reddedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("trialBonusAdmin.rejectFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const snackbar = ref({ show: false, text: "", color: "success" })

onMounted(() => {
  fetchSettings()
  fetchClaims()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <div class="d-flex flex-column mb-2">
        <h4 class="text-h4">
          {{ t("trialBonusAdmin.title") }}
        </h4>
        <span class="text-body-2 text-disabled">{{ t("trialBonusAdmin.description") }}</span>
      </div>
    </VCol>

    <!-- Ayarlar -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("trialBonusAdmin.settingsTitle") }}
          </h5>

          <VProgressLinear
            v-if="settingsLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <VForm @submit.prevent="saveSettings">
            <VRow>
              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.enabled"
                  :label="t('trialBonusAdmin.enabled')"
                />
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.enabledHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.autoApprove"
                  :label="t('trialBonusAdmin.autoApprove')"
                />
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.autoApproveHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.blockOtherBonuses"
                  :label="t('trialBonusAdmin.blockOtherBonuses')"
                />
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.blockOtherBonusesHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.durationHours"
                  type="number"
                  min="0"
                  :disabled="!settings.blockOtherBonuses"
                  :label="t('trialBonusAdmin.durationHours')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.amount"
                  type="number"
                  min="0"
                  :label="t('trialBonusAdmin.amount')"
                />
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.amountHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.wageringMultiplier"
                  type="number"
                  min="0"
                  :label="t('trialBonusAdmin.wageringMultiplier')"
                />
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.wageringMultiplierHint") }}</span>
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="settings.note"
                  :label="t('trialBonusAdmin.note')"
                />
              </VCol>

              <VCol cols="12">
                <span class="text-caption text-disabled">{{ t("trialBonusAdmin.onceHint") }}</span>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  :loading="settingsSaving"
                >
                  {{ t("trialBonusAdmin.save") }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Talepler -->
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <div class="d-flex align-center gap-3">
            <h5 class="text-h5">
              {{ t("trialBonusAdmin.claimsTitle") }}
            </h5>
            <VChip
              v-if="pendingCount"
              color="warning"
              size="small"
            >
              {{ pendingCount }} {{ t("trialBonusAdmin.statusPending") }}
            </VChip>
          </div>

          <div class="d-flex flex-wrap gap-3">
            <AppTextField
              v-model="search"
              density="compact"
              style="max-width: 220px;"
              :placeholder="t('trialBonusAdmin.user')"
            />
            <AppSelect
              v-model="statusFilter"
              density="compact"
              clearable
              style="min-width: 180px;"
              :items="statusOptions"
              :label="t('trialBonusAdmin.status')"
            />
          </div>
        </VCardText>

        <VDataTableServer
          v-model:page="options.page"
          v-model:items-per-page="options.itemsPerPage"
          :headers="claimHeaders"
          :items="claims"
          :items-length="totalClaims"
          :loading="claimsLoading"
        >
          <template #item.user="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">{{ item.raw.userSnapshot?.username || item.raw.userSnapshot?.name }}</span>
              <span class="text-caption text-disabled">{{ item.raw.userSnapshot?.email }}</span>
            </div>
          </template>

          <template #item.bonusAmount="{ item }">
            <span class="font-weight-medium text-success">{{ formatMoney(item.raw.amount) }}</span>
          </template>

          <template #item.status="{ item }">
            <VChip
              :color="statusColor(item.raw.status)"
              size="small"
            >
              {{ statusLabel(item.raw.status) }}
            </VChip>
          </template>

          <template #item.date="{ item }">
            <span class="text-caption">{{ formatDate(item.raw.createdAt) }}</span>
          </template>

          <template #item.actions="{ item }">
            <div
              v-if="item.raw.status === 'pending'"
              class="d-flex gap-1"
            >
              <VBtn
                size="small"
                color="success"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="approveClaim(item.raw)"
              >
                {{ t("trialBonusAdmin.approve") }}
              </VBtn>
              <VBtn
                size="small"
                color="error"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="rejectClaim(item.raw)"
              >
                {{ t("trialBonusAdmin.reject") }}
              </VBtn>
            </div>
            <span
              v-else
              class="text-caption text-disabled"
            >—</span>
          </template>

          <template #no-data>
            <span class="text-body-2 text-disabled">{{ t("trialBonusAdmin.empty") }}</span>
          </template>
        </VDataTableServer>
      </VCard>
    </VCol>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom end"
    >
      {{ snackbar.text }}
    </VSnackbar>
  </VRow>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.trialBonus
</route>
