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
  enabled: true,
  autoApprove: true,
  percentage: 15,
  fixedAmount: 0,
  minDepositAmount: 0,
  maxDepositAmount: 0,
  maxBonusAmount: 0,
  blockOtherBonuses: true,
  durationHours: 720,
  note: "",
})

const fetchSettings = async () => {
  settingsLoading.value = true
  try {
    const res = await axios.get("/admin/deposit-bonus/settings")
    settings.value = { ...settings.value, ...res.data.data }
  } catch (error) {
    console.error("Yatırım bonusu ayarları alınamadı:", error)
  } finally {
    settingsLoading.value = false
  }
}

const saveSettings = async () => {
  settingsSaving.value = true
  try {
    const res = await axios.put("/admin/deposit-bonus/settings", {
      enabled: settings.value.enabled,
      autoApprove: settings.value.autoApprove,
      percentage: Number(settings.value.percentage),
      fixedAmount: Number(settings.value.fixedAmount),
      minDepositAmount: Number(settings.value.minDepositAmount),
      maxDepositAmount: Number(settings.value.maxDepositAmount),
      maxBonusAmount: Number(settings.value.maxBonusAmount),
      blockOtherBonuses: settings.value.blockOtherBonuses,
      durationHours: Number(settings.value.durationHours),
      note: settings.value.note,
    })
    settings.value = { ...settings.value, ...res.data.data }
    snackbar.value = { show: true, text: t("depositBonusAdmin.saved"), color: "success" }
  } catch (error) {
    console.error("Yatırım bonusu ayarları kaydedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("depositBonusAdmin.saveFailed"), color: "error" }
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
  { value: "pending", title: t("depositBonusAdmin.statusPending") },
  { value: "approved", title: t("depositBonusAdmin.statusApproved") },
  { value: "rejected", title: t("depositBonusAdmin.statusRejected") },
]

const claimHeaders = [
  { title: t("depositBonusAdmin.user"), key: "user" },
  { title: t("depositBonusAdmin.period"), key: "period" },
  { title: t("depositBonusAdmin.totalDeposit"), key: "totalDeposit" },
  { title: t("depositBonusAdmin.bonusAmount"), key: "bonusAmount" },
  { title: t("depositBonusAdmin.status"), key: "status" },
  { title: t("depositBonusAdmin.date"), key: "date" },
  { title: t("depositBonusAdmin.actions"), key: "actions", sortable: false },
]

const statusColor = status => {
  if (status === "approved") return "success"
  if (status === "rejected") return "error"
  return "warning"
}

const statusLabel = status => {
  if (status === "approved") return t("depositBonusAdmin.statusApproved")
  if (status === "rejected") return t("depositBonusAdmin.statusRejected")
  return t("depositBonusAdmin.statusPending")
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
    const res = await axios.get("/admin/deposit-bonus/claims", {
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
    console.error("Yatırım bonusu talepleri alınamadı:", error)
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
    await userStore.approveDepositBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep onaylanamadı:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("depositBonusAdmin.approveFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const rejectClaim = async claimItem => {
  if (!confirm(t("depositBonusAdmin.rejectConfirm"))) return

  actionId.value = claimItem._id
  try {
    await userStore.rejectDepositBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep reddedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("depositBonusAdmin.rejectFailed"), color: "error" }
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
          {{ t("depositBonusAdmin.title") }}
        </h4>
        <span class="text-body-2 text-disabled">{{ t("depositBonusAdmin.description") }}</span>
      </div>
    </VCol>

    <!-- Ayarlar -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("depositBonusAdmin.settingsTitle") }}
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
                  :label="t('depositBonusAdmin.enabled')"
                />
                <span class="text-caption text-disabled">{{ t("depositBonusAdmin.enabledHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.autoApprove"
                  :label="t('depositBonusAdmin.autoApprove')"
                />
                <span class="text-caption text-disabled">{{ t("depositBonusAdmin.autoApproveHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.blockOtherBonuses"
                  :label="t('depositBonusAdmin.blockOtherBonuses')"
                />
                <span class="text-caption text-disabled">{{ t("depositBonusAdmin.blockOtherBonusesHint") }}</span>
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
                  :label="t('depositBonusAdmin.durationHours')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.percentage"
                  type="number"
                  min="0"
                  max="100"
                  :label="t('depositBonusAdmin.percentage')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.fixedAmount"
                  type="number"
                  min="0"
                  :label="t('depositBonusAdmin.fixedAmount')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.minDepositAmount"
                  type="number"
                  min="0"
                  :label="t('depositBonusAdmin.minDeposit')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.maxDepositAmount"
                  type="number"
                  min="0"
                  :label="t('depositBonusAdmin.maxDeposit')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.maxBonusAmount"
                  type="number"
                  min="0"
                  :label="t('depositBonusAdmin.maxBonusAmount')"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="settings.note"
                  :label="t('depositBonusAdmin.note')"
                />
              </VCol>

              <VCol cols="12">
                <span class="text-caption text-disabled">{{ t("depositBonusAdmin.periodHint") }}</span>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  :loading="settingsSaving"
                >
                  {{ t("depositBonusAdmin.save") }}
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
              {{ t("depositBonusAdmin.claimsTitle") }}
            </h5>
            <VChip
              v-if="pendingCount"
              color="warning"
              size="small"
            >
              {{ pendingCount }} {{ t("depositBonusAdmin.statusPending") }}
            </VChip>
          </div>

          <div class="d-flex flex-wrap gap-3">
            <AppTextField
              v-model="search"
              density="compact"
              style="max-width: 220px;"
              :placeholder="t('depositBonusAdmin.user')"
            />
            <AppSelect
              v-model="statusFilter"
              density="compact"
              clearable
              style="min-width: 180px;"
              :items="statusOptions"
              :label="t('depositBonusAdmin.status')"
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

          <template #item.period="{ item }">
            <span class="text-caption">{{ formatDate(item.raw.periodStart) }} → {{ formatDate(item.raw.periodEnd) }}</span>
          </template>

          <template #item.totalDeposit="{ item }">
            {{ formatMoney(item.raw.totalDeposit) }}
          </template>

          <template #item.bonusAmount="{ item }">
            <span class="font-weight-medium text-success">{{ formatMoney(item.raw.appliedAmount) }}</span>
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
                {{ t("depositBonusAdmin.approve") }}
              </VBtn>
              <VBtn
                size="small"
                color="error"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="rejectClaim(item.raw)"
              >
                {{ t("depositBonusAdmin.reject") }}
              </VBtn>
            </div>
            <span
              v-else
              class="text-caption text-disabled"
            >—</span>
          </template>

          <template #no-data>
            <span class="text-body-2 text-disabled">{{ t("depositBonusAdmin.empty") }}</span>
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
  subject: finance.depositBonus
</route>
