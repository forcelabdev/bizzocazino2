
<route lang="yaml">
meta:
  action: read
  subject: finance.balanceAnalysis
</route>

<script setup>
import axios from "@axios"
import { computed, onMounted, ref, watch } from "vue"
import { VDataTableServer } from "vuetify/labs/VDataTable"
import BalanceAnalysisMemberDetailDialog from "@/views/apps/balance-analysis/BalanceAnalysisMemberDetailDialog.vue"

const period = ref("all") // today | week | month | all | custom
const customStart = ref(null)
const customEnd = ref(null)

const summary = ref(null)
const summaryLoading = ref(false)

const members = ref([])
const membersLoading = ref(false)
const membersTotal = ref(0)
const page = ref(1)
const itemsPerPage = ref(20)
const search = ref("")

const detailOpen = ref(false)
const selectedUserId = ref(null)

const periods = [
  { value: "today", title: "Bugün" },
  { value: "week", title: "Bu Hafta" },
  { value: "month", title: "Bu Ay" },
  { value: "all", title: "Tüm Zamanlar" },
  { value: "custom", title: "Özel Tarih" },
]

const headers = [
  { title: "#", key: "index", sortable: false, width: "56" },
  { title: "Üye", key: "user", sortable: false },
  { title: "Partner", key: "partner", sortable: false },
  { title: "Manuel Bonus", key: "totalBonus", sortable: false },
  { title: "Kampanya", key: "totalCampaign", sortable: false },
  { title: "Toplam", key: "totalLoaded", sortable: false },
  { title: "İşlem", key: "count", sortable: false, width: "90" },
  { title: "", key: "actions", sortable: false, width: "110" },
]

const dateRange = computed(() => {
  const now = new Date()
  if (period.value === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { startDate: start.toISOString(), endDate: null }
  }
  if (period.value === "week") {
    const start = new Date(now)
    const dayOfWeek = (start.getDay() + 6) % 7 // Pazartesi = 0
    start.setDate(start.getDate() - dayOfWeek)
    start.setHours(0, 0, 0, 0)
    return { startDate: start.toISOString(), endDate: null }
  }
  if (period.value === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: start.toISOString(), endDate: null }
  }
  if (period.value === "custom") {
    return {
      startDate: customStart.value ? new Date(customStart.value).toISOString() : null,
      endDate: customEnd.value ? new Date(customEnd.value).toISOString() : null,
    }
  }
  return { startDate: null, endDate: null }
})

const formatMoney = value => {
  const number = Number(value || 0)

  return `₺${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    const { startDate, endDate } = dateRange.value
    const res = await axios.get("/admin/balance-analysis/summary", {
      params: { startDate: startDate || undefined, endDate: endDate || undefined },
    })

    summary.value = res.data.data
  } catch (error) {
    console.error("Bakiye analizi özeti alınamadı:", error)
  } finally {
    summaryLoading.value = false
  }
}

const fetchMembers = async () => {
  membersLoading.value = true
  try {
    const { startDate, endDate } = dateRange.value
    const res = await axios.get("/admin/balance-analysis/members", {
      params: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        search: search.value || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    })

    members.value = res.data.data || []
    membersTotal.value = res.data.total || 0
  } catch (error) {
    console.error("Üye listesi alınamadı:", error)
  } finally {
    membersLoading.value = false
  }
}

const refreshAll = () => {
  fetchSummary()
  page.value = 1
  fetchMembers()
}

const openDetail = userId => {
  selectedUserId.value = userId
  detailOpen.value = true
}

let searchTimeout = null

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchMembers()
  }, 400)
})

watch(period, value => {
  if (value !== "custom") refreshAll()
})

watch([customStart, customEnd], () => {
  if (period.value === "custom") refreshAll()
})

watch([page, itemsPerPage], fetchMembers)

onMounted(refreshAll)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          Bakiye Analizi
        </h4>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Tüm üyelere yüklenen bonus ve kampanya bakiyelerinin toplu görünümü.
        </p>
      </div>
      <VBtn
        variant="tonal"
        prepend-icon="tabler-refresh"
        :loading="summaryLoading || membersLoading"
        @click="refreshAll"
      >
        Yenile
      </VBtn>
    </div>

    <VCard class="mb-6">
      <VCardText>
        <div class="d-flex flex-wrap align-center gap-2 mb-4">
          <span class="text-body-2 text-medium-emphasis mr-2">Periyot:</span>
          <VBtn
            v-for="item in periods"
            :key="item.value"
            :variant="period === item.value ? 'flat' : 'outlined'"
            :color="period === item.value ? 'primary' : 'default'"
            size="small"
            @click="period = item.value"
          >
            {{ item.title }}
          </VBtn>
        </div>

        <VRow
          v-if="period === 'custom'"
          class="mb-2"
        >
          <VCol
            cols="12"
            sm="4"
          >
            <AppDateTimePicker
              v-model="customStart"
              label="Başlangıç"
              placeholder="Başlangıç tarihi seçin"
            />
          </VCol>
          <VCol
            cols="12"
            sm="4"
          >
            <AppDateTimePicker
              v-model="customEnd"
              label="Bitiş"
              placeholder="Bitiş tarihi seçin"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VRow class="mb-2">
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Toplam Yüklenen
            </p>
            <h5 class="text-h5 text-warning mb-1">
              {{ formatMoney(summary?.totalLoadedAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ membersTotal }} üye
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Toplam Deposit
            </p>
            <h5 class="text-h5 text-error mb-1">
              {{ formatMoney(summary?.totalDepositAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.totalDepositCount || 0 }} işlem (Filux + xPayment)
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Manuel Eklenen Bonus
            </p>
            <h5 class="text-h5 text-warning mb-1">
              {{ formatMoney(summary?.manualBonusAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.manualBonusCount || 0 }} işlem
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Manuel Eklenen Bakiye
            </p>
            <h5 class="text-h5 text-success mb-1">
              {{ formatMoney(summary?.manualBalanceAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.manualBalanceCount || 0 }} işlem
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Filux Eklenen Bakiye
            </p>
            <h5 class="text-h5 text-info mb-1">
              {{ formatMoney(summary?.filuxAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.filuxCount || 0 }} işlem
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              xPayment Eklenen Bakiye
            </p>
            <h5 class="text-h5 mb-1" style="color: rgb(var(--v-theme-secondary));">
              {{ formatMoney(summary?.xpayAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.xpayCount || 0 }} işlem
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Kampanya Bonusu
            </p>
            <h5 class="text-h5 mb-1" style="color: rgb(var(--v-theme-secondary));">
              {{ formatMoney(summary?.campaignAmount) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.campaignCount || 0 }} işlem
            </p>
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Manuel İşlem (Toplam)
            </p>
            <h5 class="text-h5 mb-1">
              {{ summary?.totalManualCount || 0 }}
            </h5>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VAlert
      variant="tonal"
      color="success"
      class="mb-3 d-flex align-center justify-space-between"
    >
      <span class="font-weight-medium">Kalan Agent Bakiyesi</span>
      <span class="text-h6 text-success">{{ formatMoney(summary?.remainingAgentBalance) }}</span>
    </VAlert>

    <VAlert
      variant="tonal"
      color="warning"
      class="mb-6 d-flex align-center justify-space-between"
    >
      <span class="font-weight-medium">Kalan Bonus Bakiyesi</span>
      <span class="text-h6 text-warning">{{ formatMoney(summary?.remainingBonusBalance) }}</span>
    </VAlert>

    <VCard>
      <VCardText>
        <VTextField
          v-model="search"
          placeholder="Kullanıcı adı, partner veya ref kodu ile ara..."
          prepend-inner-icon="tabler-search"
          density="compact"
          class="mb-4"
          style="max-width: 420px;"
        />
      </VCardText>

      <VDataTableServer
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="members"
        :items-length="membersTotal"
        :loading="membersLoading"
        class="text-no-wrap"
      >
        <template #item.index="{ index }">
          {{ (page - 1) * itemsPerPage + index + 1 }}
        </template>

        <template #item.user="{ item }">
          <div class="d-flex align-center gap-x-3">
            <VAvatar
              size="34"
              color="primary"
              variant="tonal"
            >
              {{ (item.raw.username || "?").charAt(0).toUpperCase() }}
            </VAvatar>
            <div>
              <p class="font-weight-medium mb-0">
                {{ item.raw.username }}
              </p>
              <p
                v-if="item.raw.name"
                class="text-caption text-medium-emphasis mb-0"
              >
                {{ item.raw.name }}
              </p>
            </div>
          </div>
        </template>

        <template #item.partner="{ item }">
          <VChip
            v-if="item.raw.partnerName"
            size="small"
            variant="tonal"
            color="warning"
          >
            {{ item.raw.partnerName }}
          </VChip>
          <span
            v-else
            class="text-medium-emphasis"
          >—</span>
        </template>

        <template #item.totalBonus="{ item }">
          <span class="text-warning font-weight-medium">{{ formatMoney(item.raw.totalBonus) }}</span>
        </template>

        <template #item.totalCampaign="{ item }">
          <span class="text-info font-weight-medium">{{ formatMoney(item.raw.totalCampaign) }}</span>
        </template>

        <template #item.totalLoaded="{ item }">
          <span class="text-success font-weight-medium">{{ formatMoney(item.raw.totalLoaded) }}</span>
        </template>

        <template #item.count="{ item }">
          {{ item.raw.bonusCount }} + {{ item.raw.campaignCount }}
        </template>

        <template #item.actions="{ item }">
          <VBtn
            size="small"
            variant="tonal"
            @click="openDetail(item.raw.userId)"
          >
            Detay
          </VBtn>
        </template>
      </VDataTableServer>
    </VCard>

    <BalanceAnalysisMemberDetailDialog
      v-model="detailOpen"
      :user-id="selectedUserId"
      :start-date="dateRange.startDate"
      :end-date="dateRange.endDate"
    />
  </div>
</template>
