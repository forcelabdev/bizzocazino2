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
  percentage: 20,
  minLossAmount: 0,
  maxBonusAmount: 5000,
  note: "",
})

const fetchSettings = async () => {
  settingsLoading.value = true
  try {
    const res = await axios.get("/admin/loss-bonus/settings")
    settings.value = { ...settings.value, ...res.data.data }
  } catch (error) {
    console.error("Kayıp bonusu ayarları alınamadı:", error)
  } finally {
    settingsLoading.value = false
  }
}

const saveSettings = async () => {
  settingsSaving.value = true
  try {
    const res = await axios.put("/admin/loss-bonus/settings", {
      enabled: settings.value.enabled,
      autoApprove: settings.value.autoApprove,
      percentage: Number(settings.value.percentage),
      minLossAmount: Number(settings.value.minLossAmount),
      maxBonusAmount: Number(settings.value.maxBonusAmount),
      note: settings.value.note,
    })
    settings.value = { ...settings.value, ...res.data.data }
    snackbar.value = { show: true, text: t("lossBonusAdmin.saved"), color: "success" }
  } catch (error) {
    console.error("Kayıp bonusu ayarları kaydedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("lossBonusAdmin.saveFailed"), color: "error" }
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
  { value: "pending", title: t("lossBonusAdmin.statusPending") },
  { value: "approved", title: t("lossBonusAdmin.statusApproved") },
  { value: "rejected", title: t("lossBonusAdmin.statusRejected") },
]

const claimHeaders = [
  { title: t("lossBonusAdmin.user"), key: "user" },
  { title: t("lossBonusAdmin.period"), key: "period" },
  { title: t("lossBonusAdmin.netLoss"), key: "netLoss" },
  { title: t("lossBonusAdmin.bonusAmount"), key: "bonusAmount" },
  { title: t("lossBonusAdmin.status"), key: "status" },
  { title: t("lossBonusAdmin.date"), key: "date" },
  { title: t("lossBonusAdmin.actions"), key: "actions", sortable: false },
]

const statusColor = status => {
  if (status === "approved") return "success"
  if (status === "rejected") return "error"
  return "warning"
}

const statusLabel = status => {
  if (status === "approved") return t("lossBonusAdmin.statusApproved")
  if (status === "rejected") return t("lossBonusAdmin.statusRejected")
  return t("lossBonusAdmin.statusPending")
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
    const res = await axios.get("/admin/loss-bonus/claims", {
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
    console.error("Kayıp bonusu talepleri alınamadı:", error)
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
    await userStore.approveLossBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep onaylanamadı:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("lossBonusAdmin.approveFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const rejectClaim = async claimItem => {
  if (!confirm(t("lossBonusAdmin.rejectConfirm"))) return

  actionId.value = claimItem._id
  try {
    await userStore.rejectLossBonusClaim(claimItem._id)
    await fetchClaims()
  } catch (error) {
    console.error("Talep reddedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("lossBonusAdmin.rejectFailed"), color: "error" }
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
          {{ t("lossBonusAdmin.title") }}
        </h4>
        <span class="text-body-2 text-disabled">{{ t("lossBonusAdmin.description") }}</span>
      </div>
    </VCol>

    <!-- Ayarlar -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("lossBonusAdmin.settingsTitle") }}
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
                  :label="t('lossBonusAdmin.enabled')"
                />
                <span class="text-caption text-disabled">{{ t("lossBonusAdmin.enabledHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <VSwitch
                  v-model="settings.autoApprove"
                  :label="t('lossBonusAdmin.autoApprove')"
                />
                <span class="text-caption text-disabled">{{ t("lossBonusAdmin.autoApproveHint") }}</span>
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
                  :label="t('lossBonusAdmin.percentage')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.minLossAmount"
                  type="number"
                  min="0"
                  :label="t('lossBonusAdmin.minLoss')"
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
                  :label="t('lossBonusAdmin.maxBonusAmount')"
                />
              </VCol>

              <VCol cols="12">
                <span class="text-caption text-disabled">{{ t("lossBonusAdmin.periodHint") }}</span>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  :loading="settingsSaving"
                >
                  {{ t("lossBonusAdmin.save") }}
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
              {{ t("lossBonusAdmin.claimsTitle") }}
            </h5>
            <VChip
              v-if="pendingCount"
              color="warning"
              size="small"
            >
              {{ pendingCount }} {{ t("lossBonusAdmin.statusPending") }}
            </VChip>
          </div>

          <div class="d-flex flex-wrap gap-3">
            <AppTextField
              v-model="search"
              density="compact"
              style="max-width: 220px;"
              :placeholder="t('lossBonusAdmin.user')"
            />
            <AppSelect
              v-model="statusFilter"
              density="compact"
              clearable
              style="min-width: 180px;"
              :items="statusOptions"
              :label="t('lossBonusAdmin.status')"
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

          <template #item.netLoss="{ item }">
            {{ formatMoney(item.raw.netLoss) }}
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
                {{ t("lossBonusAdmin.approve") }}
              </VBtn>
              <VBtn
                size="small"
                color="error"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="rejectClaim(item.raw)"
              >
                {{ t("lossBonusAdmin.reject") }}
              </VBtn>
            </div>
            <span
              v-else
              class="text-caption text-disabled"
            >—</span>
          </template>

          <template #no-data>
            <span class="text-body-2 text-disabled">{{ t("lossBonusAdmin.empty") }}</span>
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
  subject: finance.lossBonus
</route>
