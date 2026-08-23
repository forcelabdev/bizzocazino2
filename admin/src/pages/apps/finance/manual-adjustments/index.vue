<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { formatCoinType } from "@/utils/currency"
import { exportToXlsx } from "@/utils/exportXlsx"
import { useNotify } from "@/composables/useNotify"
import { avatarText } from "@core/utils/formatters"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
const { success: notifySuccess, error: notifyError } = useNotify()
const userStore = useUserListStore()

const adjustments = ref([])
const totalAdjustments = ref(0)
const searchQuery = ref("")
const kindFilter = ref(null)
const directionFilter = ref(null)
const isLoading = ref(false)

const options = ref({
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
})

const headers = computed(() => [
  { title: t("manualAdjustments.actor"), key: "actor" },
  { title: t("manualAdjustments.targetUser"), key: "targetUser" },
  { title: t("manualAdjustments.kind"), key: "kind" },
  { title: t("manualAdjustments.direction"), key: "direction" },
  { title: t("manualAdjustments.wallet"), key: "wallet" },
  { title: t("manualAdjustments.category"), key: "category" },
  { title: t("manualAdjustments.requestedAmount"), key: "requestedAmount" },
  { title: t("manualAdjustments.appliedAmount"), key: "appliedAmount" },
  { title: t("manualAdjustments.balanceBefore"), key: "balanceBefore" },
  { title: t("manualAdjustments.balanceAfter"), key: "balanceAfter" },
  { title: t("manualAdjustments.note"), key: "note" },
  { title: t("manualAdjustments.date"), key: "createdAt" },
])

const getRow = item => item?.raw || item || {}

const formatWallet = wallet => {
  if (!wallet) return "-"

  return [formatCoinType(wallet.coinType), wallet.chain, wallet.type]
    .filter(Boolean)
    .join(" / ")
}

const kindItems = computed(() => [
  { title: t("manualAdjustments.kinds.balance"), value: "balance" },
  { title: t("manualAdjustments.kinds.bonus"), value: "bonus" },
])

const directionItems = computed(() => [
  { title: t("manualAdjustments.directions.credit"), value: "credit" },
  { title: t("manualAdjustments.directions.debit"), value: "debit" },
])

const fetchAdjustments = async () => {
  isLoading.value = true
  try {
    const response = await userStore.fetchManualAdjustments({
      q: searchQuery.value || undefined,
      kind: kindFilter.value || undefined,
      direction: directionFilter.value || undefined,
      page: options.value.page,
      itemsPerPage: options.value.itemsPerPage,
    })

    adjustments.value = response.adjustments || []
    totalAdjustments.value = response.total || 0
  } catch (error) {
    console.error("Manual adjustment page fetch error:", error)
    adjustments.value = []
    totalAdjustments.value = 0
  } finally {
    isLoading.value = false
  }
}

watch(
  [
    searchQuery,
    kindFilter,
    directionFilter,
    () => options.value.page,
    () => options.value.itemsPerPage,
  ],
  fetchAdjustments,
  { immediate: true },
)

// 📤 Mevcut filtrelere göre manuel işlemleri xlsx olarak dışa aktar
const isExporting = ref(false)

const exportAdjustments = async () => {
  if (isExporting.value) return
  isExporting.value = true

  try {
    const response = await userStore.fetchManualAdjustments({
      q: searchQuery.value || undefined,
      kind: kindFilter.value || undefined,
      direction: directionFilter.value || undefined,
      page: 1,
      itemsPerPage: 50000,
    })

    const list = response.adjustments || []

    if (!list.length) {
      notifyError(t("manualAdjustments.title") + ": dışa aktarılacak kayıt yok.")

      return
    }

    const rows = list.map(item => ({
      [t("manualAdjustments.actor")]: item.actorSnapshot?.name || item.actorSnapshot?.username || "",
      [t("manualAdjustments.targetUser")]: item.targetSnapshot?.name || item.targetSnapshot?.username || "",
      [t("manualAdjustments.kind")]: item.kind || "",
      [t("manualAdjustments.direction")]: item.direction || "",
      [t("manualAdjustments.wallet")]: formatWallet(item.wallet),
      [t("manualAdjustments.category")]: item.category || "",
      [t("manualAdjustments.requestedAmount")]: Number(item.requestedAmount || 0),
      [t("manualAdjustments.appliedAmount")]: Number(item.appliedAmount || 0),
      [t("manualAdjustments.balanceBefore")]: Number(item.balanceBefore || 0),
      [t("manualAdjustments.balanceAfter")]: Number(item.balanceAfter || 0),
      [t("manualAdjustments.note")]: item.note || "",
      [t("manualAdjustments.date")]: item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "",
    }))

    await exportToXlsx({
      rows,
      fileName: "manuel-islemler",
      sheetName: "Manuel İşlemler",
      columnWidths: [22, 22, 12, 12, 24, 18, 18, 18, 18, 18, 30, 20],
    })

    notifySuccess("Manuel işlemler başarıyla dışa aktarıldı.")
  } catch (error) {
    console.error("Manuel işlemler dışa aktarılamadı:", error)
    notifyError("Dışa aktarım sırasında bir hata oluştu.")
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
      <span>{{ t("manualAdjustments.title") }}</span>
      <VBtn
        color="success"
        variant="tonal"
        size="small"
        prepend-icon="tabler-file-spreadsheet"
        :loading="isExporting"
        @click="exportAdjustments"
      >
        Excel'e Aktar
      </VBtn>
    </VCardTitle>
    <VCardText>
      <VRow class="mb-4">
        <VCol
          cols="12"
          md="6"
        >
          <AppTextField
            v-model="searchQuery"
            :label="t('manualAdjustments.search')"
            density="compact"
          />
        </VCol>
        <VCol
          cols="12"
          md="3"
        >
          <AppSelect
            v-model="kindFilter"
            :items="kindItems"
            :label="t('manualAdjustments.kind')"
            clearable
          />
        </VCol>
        <VCol
          cols="12"
          md="3"
        >
          <AppSelect
            v-model="directionFilter"
            :items="directionItems"
            :label="t('manualAdjustments.direction')"
            clearable
          />
        </VCol>
      </VRow>

      <VDataTableServer
        v-model:page="options.page"
        v-model:items-per-page="options.itemsPerPage"
        :items="adjustments"
        :items-length="totalAdjustments"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
      >
        <template #item.actor="{ item }">
          <div class="d-flex align-center">
            <VAvatar
              size="32"
              class="me-2"
            >
              <span>{{ avatarText(getRow(item).actorSnapshot?.name || getRow(item).actorSnapshot?.username || "A") }}</span>
            </VAvatar>
            <div>
              <div class="font-weight-medium">
                {{ getRow(item).actorSnapshot?.name || getRow(item).actorSnapshot?.username || "-" }}
              </div>
              <small>{{ getRow(item).actorSnapshot?.email || getRow(item).actorSnapshot?.username || "-" }}</small>
            </div>
          </div>
        </template>

        <template #item.targetUser="{ item }">
          <div class="d-flex align-center">
            <div>
              <div class="font-weight-medium">
                {{ getRow(item).targetSnapshot?.name || getRow(item).targetSnapshot?.username || "-" }}
              </div>
              <small>{{ getRow(item).targetSnapshot?.email || getRow(item).targetSnapshot?.username || "-" }}</small>
            </div>
          </div>
        </template>

        <template #item.kind="{ item }">
          <VChip
            color="primary"
            size="small"
            variant="tonal"
          >
            {{ t(`manualAdjustments.kinds.${getRow(item).kind}`) }}
          </VChip>
        </template>

        <template #item.direction="{ item }">
          <VChip
            :color="getRow(item).direction === 'credit' ? 'success' : 'error'"
            size="small"
            variant="tonal"
          >
            {{ t(`manualAdjustments.directions.${getRow(item).direction}`) }}
          </VChip>
        </template>

        <template #item.wallet="{ item }">
          {{ formatWallet(getRow(item).wallet) }}
        </template>

        <template #item.requestedAmount="{ item }">
          {{ Number(getRow(item).requestedAmount || 0).toFixed(2) }}
        </template>

        <template #item.appliedAmount="{ item }">
          {{ Number(getRow(item).appliedAmount || 0).toFixed(2) }}
        </template>

        <template #item.balanceBefore="{ item }">
          {{ Number(getRow(item).balanceBefore || 0).toFixed(2) }}
        </template>

        <template #item.balanceAfter="{ item }">
          {{ Number(getRow(item).balanceAfter || 0).toFixed(2) }}
        </template>

        <template #item.note="{ item }">
          {{ getRow(item).note || "-" }}
        </template>

        <template #item.createdAt="{ item }">
          {{ getRow(item).createdAt ? new Date(getRow(item).createdAt).toLocaleString() : "-" }}
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>
</template>

<route lang="yaml">
meta:
  action: read
  subject: users
</route>
