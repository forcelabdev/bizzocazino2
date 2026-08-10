<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { avatarText } from "@core/utils/formatters"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
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

  return [wallet.coinType, wallet.chain, wallet.type]
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
</script>

<template>
  <VCard>
    <VCardTitle>{{ t("manualAdjustments.title") }}</VCardTitle>
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
