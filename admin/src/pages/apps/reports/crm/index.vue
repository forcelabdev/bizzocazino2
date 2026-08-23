
<route lang="yaml">
meta:
  action: read
  subject: finance.balanceAnalysis
</route>

<script setup>
import axios from "@axios"
import { computed, onMounted, ref, watch } from "vue"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const period = ref("all") // today | week | month | all | custom
const customStart = ref(null)
const customEnd = ref(null)

const bonusOrigin = ref("all") // all | claimed | manual
const bucket = ref(null)
const depositMin = ref(null)
const depositMax = ref(null)

const summary = ref(null)
const summaryLoading = ref(false)

const buckets = ref([])
const bucketsLoading = ref(false)

const members = ref([])
const membersLoading = ref(false)
const membersTotal = ref(0)
const page = ref(1)
const itemsPerPage = ref(20)
const search = ref("")
const isExporting = ref(false)

const periods = [
  { value: "today", title: "Bugün" },
  { value: "week", title: "Bu Hafta" },
  { value: "month", title: "Bu Ay" },
  { value: "all", title: "Tüm Zamanlar" },
  { value: "custom", title: "Özel Tarih" },
]

const bonusOrigins = [
  { value: "all", title: "Tümü" },
  { value: "claimed", title: "Alınan Bonus" },
  { value: "manual", title: "Eklenen Bonus" },
]

const headers = [
  { title: "#", key: "index", sortable: false, width: "56" },
  { title: "Üye", key: "user", sortable: false },
  { title: "Partner", key: "partner", sortable: false },
  { title: "Yatırım", key: "totalDeposit", sortable: false },
  { title: "Çekim", key: "totalWithdrawal", sortable: false },
  { title: "Alınan Bonus", key: "claimedBonus", sortable: false },
  { title: "Eklenen Bonus", key: "manualBonus", sortable: false },
  { title: "Bakiye", key: "walletBalance", sortable: false },
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

const commonParams = computed(() => {
  const { startDate, endDate } = dateRange.value
  return {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    bonusOrigin: bonusOrigin.value !== "all" ? bonusOrigin.value : undefined,
    depositMin: depositMin.value || undefined,
    depositMax: depositMax.value || undefined,
  }
})

const formatMoney = value => {
  const number = Number(value || 0)

  return `₺${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fetchSummary = async () => {
  summaryLoading.value = true
  try {
    const res = await axios.get("/admin/crm-report/summary", { params: commonParams.value })

    summary.value = res.data.data
  } catch (error) {
    console.error("CRM raporu özeti alınamadı:", error)
  } finally {
    summaryLoading.value = false
  }
}

const fetchBuckets = async () => {
  bucketsLoading.value = true
  try {
    const res = await axios.get("/admin/crm-report/buckets", { params: commonParams.value })

    buckets.value = res.data.data || []
  } catch (error) {
    console.error("Yatırım segmentleri alınamadı:", error)
  } finally {
    bucketsLoading.value = false
  }
}

const fetchMembers = async () => {
  membersLoading.value = true
  try {
    const res = await axios.get("/admin/crm-report/members", {
      params: {
        ...commonParams.value,
        page: page.value,
        limit: itemsPerPage.value,
        search: search.value || undefined,
        bucket: bucket.value || undefined,
      },
    })

    members.value = res.data.data || []
    membersTotal.value = res.data.total || 0
  } catch (error) {
    console.error("CRM raporu üye listesi alınamadı:", error)
  } finally {
    membersLoading.value = false
  }
}

const refreshAll = () => {
  fetchSummary()
  fetchBuckets()
  page.value = 1
  fetchMembers()
}

const selectBucket = key => {
  bucket.value = bucket.value === key ? null : key
  page.value = 1
  fetchMembers()
}

let searchTimeout = null

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchMembers()
  }, 400)
})

let rangeTimeout = null

watch([depositMin, depositMax], () => {
  clearTimeout(rangeTimeout)
  rangeTimeout = setTimeout(() => {
    page.value = 1
    fetchMembers()
    fetchSummary()
    fetchBuckets()
  }, 500)
})

watch(period, value => {
  if (value !== "custom") refreshAll()
})

watch([customStart, customEnd], () => {
  if (period.value === "custom") refreshAll()
})

watch(bonusOrigin, refreshAll)

watch([page, itemsPerPage], fetchMembers)

const exportMembers = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const XLSXModule = await import("xlsx")
    const XLSX = XLSXModule.default || XLSXModule

    const res = await axios.get("/admin/crm-report/members", {
      params: {
        ...commonParams.value,
        search: search.value || undefined,
        bucket: bucket.value || undefined,
        limit: -1,
      },
    })

    const rows = (res.data.data || []).map(m => ({
      "Kullanıcı Adı": m.username || "",
      "Ad Soyad": m.name || "",
      Partner: m.partnerName || "",
      "Toplam Yatırım": m.totalDeposit || 0,
      "Yatırım Adedi": m.depositCount || 0,
      "Toplam Çekim": m.totalWithdrawal || 0,
      "Alınan Bonus": m.claimedBonus || 0,
      "Eklenen Bonus": m.manualBonus || 0,
      "Eklenen Bakiye": m.manualBalance || 0,
      Bakiye: m.walletBalance || 0,
      "Yatırım Segmenti": m.depositBucket || "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)

    worksheet["!cols"] = [
      { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    ]

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM Raporu")
    XLSX.writeFile(workbook, `crm-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      compression: true,
    })
  } catch (error) {
    console.error("CRM raporu dışa aktarılamadı:", error)
  } finally {
    isExporting.value = false
  }
}

onMounted(refreshAll)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          CRM Raporu
        </h4>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Yatırım aralığına, alınan/eklenen bonusa ve bakiyeye göre üye kırılımı.
        </p>
      </div>
      <div class="d-flex gap-2">
        <VBtn
          variant="tonal"
          prepend-icon="tabler-file-export"
          :loading="isExporting"
          @click="exportMembers"
        >
          Excel&apos;e Aktar
        </VBtn>
        <VBtn
          variant="tonal"
          prepend-icon="tabler-refresh"
          :loading="summaryLoading || membersLoading || bucketsLoading"
          @click="refreshAll"
        >
          Yenile
        </VBtn>
      </div>
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

        <div class="d-flex flex-wrap align-center gap-2 mb-4">
          <span class="text-body-2 text-medium-emphasis mr-2">Bonus Kaynağı:</span>
          <VBtn
            v-for="item in bonusOrigins"
            :key="item.value"
            :variant="bonusOrigin === item.value ? 'flat' : 'outlined'"
            :color="bonusOrigin === item.value ? 'primary' : 'default'"
            size="small"
            @click="bonusOrigin = item.value"
          >
            {{ item.title }}
          </VBtn>
        </div>

        <VRow>
          <VCol
            cols="12"
            sm="4"
          >
            <VTextField
              v-model="depositMin"
              type="number"
              label="Min. Yatırım"
              density="compact"
              prefix="₺"
            />
          </VCol>
          <VCol
            cols="12"
            sm="4"
          >
            <VTextField
              v-model="depositMax"
              type="number"
              label="Maks. Yatırım"
              density="compact"
              prefix="₺"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VRow class="mb-6">
      <VCol
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <p class="text-body-2 text-medium-emphasis mb-1">
              Toplam Üye
            </p>
            <h5 class="text-h5 mb-1">
              {{ summary?.totalMembers || 0 }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              Ort. Yatırım: {{ formatMoney(summary?.avgDeposit) }}
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
              Toplam Yatırım
            </p>
            <h5 class="text-h5 text-error mb-1">
              {{ formatMoney(summary?.totalDeposit) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ summary?.depositCount || 0 }} işlem
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
              Alınan Bonus
            </p>
            <h5 class="text-h5 text-warning mb-1">
              {{ formatMoney(summary?.totalClaimedBonus) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              Sistem onaylı bonuslar
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
              Eklenen Bonus
            </p>
            <h5 class="text-h5 text-info mb-1">
              {{ formatMoney(summary?.totalManualBonus) }}
            </h5>
            <p class="text-caption text-medium-emphasis mb-0">
              Admin tarafından elle eklendi
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
              Toplam Çekim
            </p>
            <h5 class="text-h5 mb-1">
              {{ formatMoney(summary?.totalWithdrawal) }}
            </h5>
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
              Eklenen Bakiye
            </p>
            <h5 class="text-h5 mb-1">
              {{ formatMoney(summary?.totalManualBalance) }}
            </h5>
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
              Toplam Bonus
            </p>
            <h5 class="text-h5 text-success mb-1">
              {{ formatMoney(summary?.totalBonus) }}
            </h5>
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
              Güncel Toplam Bakiye
            </p>
            <h5 class="text-h5 mb-1" style="color: rgb(var(--v-theme-secondary));">
              {{ formatMoney(summary?.totalWalletBalance) }}
            </h5>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard class="mb-6">
      <VCardText>
        <h6 class="text-h6 mb-4">
          Yatırım Aralığına Göre Kırılım
        </h6>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Aralık</th>
              <th>Üye Sayısı</th>
              <th>Toplam Yatırım</th>
              <th>Ort. Yatırım</th>
              <th>Alınan Bonus</th>
              <th>Eklenen Bonus</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in buckets"
              :key="row.key"
              class="cursor-pointer"
              :class="{ 'bg-primary-lighten-5': bucket === row.key }"
              @click="selectBucket(row.key)"
            >
              <td class="font-weight-medium">
                {{ row.label }}
              </td>
              <td>{{ row.memberCount }}</td>
              <td class="text-error">
                {{ formatMoney(row.totalDeposit) }}
              </td>
              <td>{{ formatMoney(row.avgDeposit) }}</td>
              <td class="text-warning">
                {{ formatMoney(row.totalClaimedBonus) }}
              </td>
              <td class="text-info">
                {{ formatMoney(row.totalManualBonus) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <p
          v-if="bucket"
          class="text-caption text-medium-emphasis mt-2 mb-0"
        >
          Filtre uygulandı: {{ buckets.find(b => b.key === bucket)?.label }} —
          <a
            href="#"
            @click.prevent="selectBucket(bucket)"
          >temizle</a>
        </p>
      </VCardText>
    </VCard>

    <VCard>
      <VCardText>
        <VTextField
          v-model="search"
          placeholder="Kullanıcı adı, ad veya partner ile ara..."
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

        <template #item.totalDeposit="{ item }">
          <span class="text-error font-weight-medium">{{ formatMoney(item.raw.totalDeposit) }}</span>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ item.raw.depositCount }} işlem
          </p>
        </template>

        <template #item.totalWithdrawal="{ item }">
          {{ formatMoney(item.raw.totalWithdrawal) }}
        </template>

        <template #item.claimedBonus="{ item }">
          <span class="text-warning font-weight-medium">{{ formatMoney(item.raw.claimedBonus) }}</span>
        </template>

        <template #item.manualBonus="{ item }">
          <span class="text-info font-weight-medium">{{ formatMoney(item.raw.manualBonus) }}</span>
        </template>

        <template #item.walletBalance="{ item }">
          <span class="font-weight-medium">{{ formatMoney(item.raw.walletBalance) }}</span>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>
