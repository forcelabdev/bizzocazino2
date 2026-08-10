<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
const userStore = useUserListStore()

const snackbar = ref({ show: false, text: "", color: "success" })

/* --------------------------------------------------------------------- */
/* Ayarlar                                                               */
/* --------------------------------------------------------------------- */

const settingsLoading = ref(false)
const settingsSaving = ref(false)

const settings = ref({
  enabled: true,
  defaultPercentage: 10,
  defaultIntervalType: "daily",
  defaultIntervalMinutes: 1440,
  defaultWageringMultiplier: 1,
  minTotalAmount: 0,
  maxTotalAmount: 0,
  note: "",
})

const intervalTypeOptions = [
  { value: "daily", title: t("reloadBonusAdmin.intervalDaily") },
  { value: "hourly", title: t("reloadBonusAdmin.intervalHourly") },
  { value: "minute", title: t("reloadBonusAdmin.intervalMinute") },
]

const fetchSettings = async () => {
  settingsLoading.value = true
  try {
    const data = await userStore.fetchReloadBonusSettings()

    settings.value = { ...settings.value, ...data }
    form.value.percentage = settings.value.defaultPercentage
    form.value.intervalType = settings.value.defaultIntervalType
    form.value.intervalMinutes = settings.value.defaultIntervalMinutes
    form.value.wageringMultiplier = settings.value.defaultWageringMultiplier
  } catch (error) {
    console.error("Reload bonusu ayarları alınamadı:", error)
  } finally {
    settingsLoading.value = false
  }
}

const saveSettings = async () => {
  settingsSaving.value = true
  try {
    const data = await userStore.updateReloadBonusSettings({
      enabled: settings.value.enabled,
      defaultPercentage: Number(settings.value.defaultPercentage),
      defaultIntervalType: settings.value.defaultIntervalType,
      defaultIntervalMinutes: Number(settings.value.defaultIntervalMinutes),
      defaultWageringMultiplier: Number(settings.value.defaultWageringMultiplier),
      minTotalAmount: Number(settings.value.minTotalAmount),
      maxTotalAmount: Number(settings.value.maxTotalAmount),
      note: settings.value.note,
    })

    settings.value = { ...settings.value, ...data.data }
    snackbar.value = { show: true, text: t("reloadBonusAdmin.saved"), color: "success" }
  } catch (error) {
    console.error("Reload bonusu ayarları kaydedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("reloadBonusAdmin.saveFailed"), color: "error" }
  } finally {
    settingsSaving.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Yeni Atama Oluştur                                                    */
/* --------------------------------------------------------------------- */

const userSearch = ref("")
const userOptions = ref([])
const userSearchLoading = ref(false)
const selectedUser = ref(null)

const form = ref({
  referenceLossAmount: 0,
  percentage: 10,
  intervalType: "daily",
  intervalMinutes: 1440,
  totalPeriods: 7,
  wageringMultiplier: 1,
})

let userSearchTimeout = null

watch(userSearch, value => {
  clearTimeout(userSearchTimeout)
  if (!value || value.length < 2) {
    userOptions.value = selectedUser.value ? [selectedUser.value] : []
    
    return
  }
  userSearchTimeout = setTimeout(async () => {
    userSearchLoading.value = true
    try {
      const res = await userStore.fetchUsers({ search: value, limit: 15 })

      userOptions.value = res.users || []
    } catch (error) {
      console.error("Kullanıcı arama hatası:", error)
    } finally {
      userSearchLoading.value = false
    }
  }, 300)
})

const userOptionTitle = user => {
  const email = user?.local?.email || ""

  return `${user?.username || user?.name || "—"}${email ? ` (${email})` : ""}`
}

const preview = ref(null)
const previewLoading = ref(false)
let previewTimeout = null

const canPreview = computed(() => Number(form.value.referenceLossAmount) > 0 && Number(form.value.percentage) > 0)

watch(form, () => {
  clearTimeout(previewTimeout)
  if (!canPreview.value) {
    preview.value = null
    
    return
  }
  previewTimeout = setTimeout(async () => {
    previewLoading.value = true
    try {
      preview.value = await userStore.previewReloadBonusAssignment({ ...form.value })
    } catch (error) {
      console.error("Önizleme hesaplanamadı:", error)
    } finally {
      previewLoading.value = false
    }
  }, 250)
}, { deep: true, immediate: true })

const assigning = ref(false)

const createAssignment = async () => {
  if (!selectedUser.value) return

  assigning.value = true
  try {
    await userStore.createUserReloadBonusAssignment(selectedUser.value._id, { ...form.value })
    snackbar.value = { show: true, text: t("reloadBonusAdmin.assignSuccess"), color: "success" }
    selectedUser.value = null
    userSearch.value = ""
    userOptions.value = []
    form.value.referenceLossAmount = 0
    await fetchAssignments()
  } catch (error) {
    console.error("Reload ataması oluşturulamadı:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("reloadBonusAdmin.assignFailed"), color: "error" }
  } finally {
    assigning.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Atama Geçmişi                                                         */
/* --------------------------------------------------------------------- */

const assignmentsLoading = ref(false)
const assignments = ref([])
const totalAssignments = ref(0)
const options = ref({ page: 1, itemsPerPage: 10 })
const statusFilter = ref(null)
const actionId = ref(null)

const statusOptions = [
  { value: "active", title: t("reloadBonusAdmin.statusActive") },
  { value: "completed", title: t("reloadBonusAdmin.statusCompleted") },
  { value: "expired", title: t("reloadBonusAdmin.statusExpired") },
  { value: "cancelled", title: t("reloadBonusAdmin.statusCancelled") },
]

const assignmentHeaders = [
  { title: t("reloadBonusAdmin.user"), key: "user" },
  { title: t("reloadBonusAdmin.totalAmountCol"), key: "totalAmount" },
  { title: t("reloadBonusAdmin.progress"), key: "progress" },
  { title: t("reloadBonusAdmin.status"), key: "status" },
  { title: t("reloadBonusAdmin.date"), key: "date" },
  { title: t("reloadBonusAdmin.actions"), key: "actions", sortable: false },
]

const statusColor = status => {
  if (status === "active") return "info"
  if (status === "completed") return "success"
  if (status === "cancelled") return "error"

  return "warning"
}

const statusLabel = status => {
  if (status === "active") return t("reloadBonusAdmin.statusActive")
  if (status === "completed") return t("reloadBonusAdmin.statusCompleted")
  if (status === "cancelled") return t("reloadBonusAdmin.statusCancelled")

  return t("reloadBonusAdmin.statusExpired")
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

const fetchAssignments = async () => {
  assignmentsLoading.value = true
  try {
    const res = await userStore.fetchReloadBonusAssignments({
      page: options.value.page,
      itemsPerPage: options.value.itemsPerPage,
      status: statusFilter.value || undefined,
    })

    assignments.value = res.assignments
    totalAssignments.value = res.total
  } catch (error) {
    console.error("Reload atamaları alınamadı:", error)
  } finally {
    assignmentsLoading.value = false
  }
}

watch([statusFilter, () => options.value.page, () => options.value.itemsPerPage], fetchAssignments)

const cancelAssignment = async assignmentItem => {
  if (!confirm(t("reloadBonusAdmin.cancelConfirm"))) return

  actionId.value = assignmentItem._id
  try {
    await userStore.cancelReloadBonusAssignment(assignmentItem._id)
    await fetchAssignments()
  } catch (error) {
    console.error("Atama iptal edilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("reloadBonusAdmin.cancelFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

onMounted(() => {
  fetchSettings()
  fetchAssignments()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <div class="d-flex flex-column mb-2">
        <h4 class="text-h4">
          {{ t("reloadBonusAdmin.title") }}
        </h4>
        <span class="text-body-2 text-disabled">{{ t("reloadBonusAdmin.description") }}</span>
      </div>
    </VCol>

    <!-- Genel Ayarlar -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("reloadBonusAdmin.settingsTitle") }}
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
                  :label="t('reloadBonusAdmin.enabled')"
                />
                <span class="text-caption text-disabled">{{ t("reloadBonusAdmin.enabledHint") }}</span>
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.defaultPercentage"
                  type="number"
                  min="0"
                  max="100"
                  :label="t('reloadBonusAdmin.defaultPercentage')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppSelect
                  v-model="settings.defaultIntervalType"
                  :items="intervalTypeOptions"
                  :label="t('reloadBonusAdmin.defaultIntervalType')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="settings.defaultWageringMultiplier"
                  type="number"
                  min="0"
                  step="0.1"
                  :label="t('reloadBonusAdmin.defaultWageringMultiplier')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.minTotalAmount"
                  type="number"
                  min="0"
                  :label="t('reloadBonusAdmin.minTotalAmount')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.maxTotalAmount"
                  type="number"
                  min="0"
                  :label="t('reloadBonusAdmin.maxTotalAmount')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="settings.note"
                  :label="t('reloadBonusAdmin.note')"
                />
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  :loading="settingsSaving"
                >
                  {{ t("reloadBonusAdmin.save") }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Yeni Atama -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("reloadBonusAdmin.assignTitle") }}
          </h5>

          <VForm @submit.prevent="createAssignment">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <VAutocomplete
                  v-model="selectedUser"
                  v-model:search="userSearch"
                  :items="userOptions"
                  :loading="userSearchLoading"
                  :item-title="userOptionTitle"
                  return-object
                  :label="t('reloadBonusAdmin.selectUser')"
                  :hint="t('reloadBonusAdmin.selectUserHint')"
                  persistent-hint
                  no-filter
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.referenceLossAmount"
                  type="number"
                  min="0"
                  :label="t('reloadBonusAdmin.referenceLossAmount')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="form.percentage"
                  type="number"
                  min="0"
                  max="100"
                  :label="t('reloadBonusAdmin.percentage')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppSelect
                  v-model="form.intervalType"
                  :items="intervalTypeOptions"
                  :label="t('reloadBonusAdmin.intervalType')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="form.totalPeriods"
                  type="number"
                  min="1"
                  :label="t('reloadBonusAdmin.totalPeriods')"
                />
              </VCol>

              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="form.wageringMultiplier"
                  type="number"
                  min="0"
                  step="0.1"
                  :label="t('reloadBonusAdmin.wageringMultiplier')"
                />
              </VCol>

              <VCol
                v-if="preview"
                cols="12"
              >
                <VAlert
                  color="info"
                  variant="tonal"
                  density="compact"
                >
                  <span class="font-weight-medium">{{ t("reloadBonusAdmin.previewTitle") }}:</span>
                  {{ t("reloadBonusAdmin.totalAmount") }} {{ formatMoney(preview.totalAmount) }}
                  &middot;
                  {{ t("reloadBonusAdmin.amountPerPeriod") }} {{ formatMoney(preview.amountPerPeriod) }}
                  &times; {{ preview.totalPeriods }}
                </VAlert>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  color="primary"
                  :disabled="!selectedUser || !canPreview"
                  :loading="assigning"
                >
                  {{ t("reloadBonusAdmin.assign") }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Atama Geçmişi -->
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <h5 class="text-h5">
            {{ t("reloadBonusAdmin.assignmentsTitle") }}
          </h5>

          <AppSelect
            v-model="statusFilter"
            density="compact"
            clearable
            style="min-width: 180px;"
            :items="statusOptions"
            :label="t('reloadBonusAdmin.status')"
          />
        </VCardText>

        <VDataTableServer
          v-model:page="options.page"
          v-model:items-per-page="options.itemsPerPage"
          :headers="assignmentHeaders"
          :items="assignments"
          :items-length="totalAssignments"
          :loading="assignmentsLoading"
        >
          <template #item.user="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">{{ item.raw.userSnapshot?.username || item.raw.userSnapshot?.name }}</span>
              <span class="text-caption text-disabled">{{ item.raw.userSnapshot?.email }}</span>
            </div>
          </template>

          <template #item.totalAmount="{ item }">
            <span class="font-weight-medium text-success">{{ formatMoney(item.raw.totalAmount) }}</span>
          </template>

          <template #item.progress="{ item }">
            <span class="text-caption">{{ item.raw.claimedPeriods }}/{{ item.raw.totalPeriods }} &middot; {{ formatMoney(item.raw.claimedAmount) }}</span>
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
            <VBtn
              v-if="item.raw.status === 'active'"
              size="small"
              color="error"
              variant="tonal"
              :loading="actionId === item.raw._id"
              @click="cancelAssignment(item.raw)"
            >
              {{ t("reloadBonusAdmin.cancel") }}
            </VBtn>
            <span
              v-else
              class="text-caption text-disabled"
            >—</span>
          </template>

          <template #no-data>
            <span class="text-body-2 text-disabled">{{ t("reloadBonusAdmin.empty") }}</span>
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
  subject: finance.reloadBonus
</route>
