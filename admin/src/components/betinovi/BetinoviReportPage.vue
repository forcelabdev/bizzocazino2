<script setup>
import { computed, ref } from "vue"
import axios from "@axios"
import ability from "@/plugins/casl/ability"
import { VDataTable } from "vuetify/labs/VDataTable"

const props = defineProps({
  reportType: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
})

const toUtcDateTimeLocal = date => {
  const pad = value => String(value).padStart(2, "0")

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

const now = new Date()
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

const loading = ref(false)
const rows = ref([])
const rawResponse = ref(null)
const apiMeta = ref(null)
const lastError = ref("")
const showRaw = ref(false)

const filters = ref({
  startDate: toUtcDateTimeLocal(fiveMinutesAgo),
  endDate: toUtcDateTimeLocal(now),
  startWagerId: 0,
  count: 100,
  userCode: "",
  vendorCode: "",
  gameCode: "",
  period: "daily",
  riskLevel: "",
})

const vendorFilterReports = ["by-vendor", "settlement", "risk-users"]
const gameFilterReports = ["settlement"]
const periodFilterReports = ["by-agent", "by-vendor", "settlement"]

const periodOptions = [
  { title: "Günlük", value: "daily" },
  { title: "Haftalık", value: "weekly" },
  { title: "Aylık", value: "monthly" },
]

const riskOptions = [
  { title: "Tümü", value: "" },
  { title: "Düşük", value: "low" },
  { title: "Orta", value: "medium" },
  { title: "Yüksek", value: "high" },
]

const labelMap = {
  wagerId: "Bahis ID",
  wagerIndex: "Bahis İndeksi",
  betId: "Bahis ID",
  agentCode: "Temsilci",
  agent: "Temsilci",
  vendorCode: "Vendor",
  vendor: "Vendor",
  gameCode: "Oyun Kodu",
  gameName: "Oyun",
  userCode: "Kullanıcı Kodu",
  username: "Kullanıcı",
  betAmount: "Bahis",
  validBetAmount: "Geçerli Bahis",
  winAmount: "Kazanç",
  profit: "Kar/Zarar",
  settlementAmount: "Mutabakat Tutarı",
  currencyCode: "Para Birimi",
  status: "Durum",
  createdAt: "Tarih",
  updatedAt: "Güncelleme",
  betTime: "Bahis Zamanı",
  settledAt: "Mutabakat Zamanı",
  riskLevel: "Risk",
  reason: "Neden",
  count: "Adet",
  total: "Toplam",
}

const canManageReports = computed(
  () => ability.can("manage", "reports.betinovi") || ability.can("manage", "reports"),
)

const formatHeaderTitle = key => {
  if (labelMap[key]) return labelMap[key]
  
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, value => value.toUpperCase())
}

const normalizeCell = value => {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "number") return Number.isFinite(value) ? value : "-"
  if (typeof value === "boolean") return value ? "Evet" : "Hayır"
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : "-"
  if (typeof value === "object") return JSON.stringify(value)
  
  return value
}

const findRows = (value, depth = 0) => {
  if (depth > 4 || value === null || value === undefined) return []
  if (Array.isArray(value)) return value
  if (typeof value !== "object") return []

  const priorityKeys = [
    "rows",
    "items",
    "data",
    "list",
    "reports",
    "report",
    "wagers",
    "transactions",
    "riskUsers",
    "users",
    "result",
  ]

  for (const key of priorityKeys) {
    const nestedRows = findRows(value[key], depth + 1)
    if (nestedRows.length) return nestedRows
  }

  return []
}

const tableRows = computed(() =>
  rows.value.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { _rowId: index, value: normalizeCell(row) }
    }

    const normalized = { _rowId: index }
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeCell(value)
    }
    
    return normalized
  }),
)

const headers = computed(() => {
  const keys = new Set()
  for (const row of tableRows.value.slice(0, 20)) {
    Object.keys(row)
      .filter(key => key !== "_rowId")
      .forEach(key => keys.add(key))
  }

  if (!keys.size) keys.add("value")

  return [...keys].map(key => ({
    title: formatHeaderTitle(key),
    key,
    sortable: true,
  }))
})

const summaryItems = computed(() => {
  const source = rawResponse.value
  if (!source || typeof source !== "object" || Array.isArray(source)) return []

  return Object.entries(source)
    .filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value),
    )
    .slice(0, 8)
    .map(([key, value]) => ({ key, label: formatHeaderTitle(key), value }))
})

const isVendorFilterVisible = computed(() =>
  vendorFilterReports.includes(props.reportType),
)

const isGameFilterVisible = computed(() =>
  gameFilterReports.includes(props.reportType),
)

const isPeriodFilterVisible = computed(() =>
  periodFilterReports.includes(props.reportType),
)

const cleanPayload = payload =>
  Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc
    const nextValue = typeof value === "string" ? value.trim() : value
    if (nextValue === "") return acc
    acc[key] = nextValue
    
    return acc
  }, {})

const buildOptionalFilters = () =>
  cleanPayload({
    userCode: filters.value.userCode,
    vendorCode: isVendorFilterVisible.value ? filters.value.vendorCode : undefined,
    gameCode: isGameFilterVisible.value ? filters.value.gameCode : undefined,
    period: isPeriodFilterVisible.value ? filters.value.period : undefined,
    riskLevel: props.reportType === "risk-users" ? filters.value.riskLevel : undefined,
  })

const buildPayload = () => {
  if (props.reportType === "wager-index") {
    return cleanPayload({
      startWagerId: filters.value.startWagerId,
      count: filters.value.count,
      userCode: filters.value.userCode,
    })
  }

  return cleanPayload({
    startDate: filters.value.startDate,
    endDate: filters.value.endDate,
    count: filters.value.count,
    ...buildOptionalFilters(),
  })
}

const fetchReport = async () => {
  loading.value = true
  lastError.value = ""
  try {
    const { data } = await axios.post(
      `/admin/betinovi-admin/reports/${props.reportType}`,
      buildPayload(),
    )

    rawResponse.value = data.data || null
    apiMeta.value = data.meta || null
    rows.value = findRows(data.data).map(row => row || {})
  } catch (error) {
    console.error("Betinovi rapor hatası:", error)
    lastError.value =
			error?.response?.data?.message || "Rapor alınırken bir hata oluştu."
    rows.value = []
    rawResponse.value = error?.response?.data?.data || null
  } finally {
    loading.value = false
  }
}

const csvEscape = value => {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  
  return text
}

const exportCsv = () => {
  if (!tableRows.value.length) return

  const keys = headers.value.map(header => header.key)

  const csv = [
    headers.value.map(header => csvEscape(header.title)).join(","),
    ...tableRows.value.map(row =>
      keys.map(key => csvEscape(row[key])).join(","),
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = `${props.reportType}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="betinovi-report-page">
    <div class="d-flex flex-wrap align-center justify-space-between gap-3 mb-4">
      <div>
        <h1 class="text-h4 mb-1">
          {{ title }}
        </h1>
        <p class="text-medium-emphasis mb-0">
          {{ description || "Forcelab rapor verilerini Türkçe yönetim ekranında görüntüleyin." }}
        </p>
      </div>
      <VChip
        color="primary"
        variant="tonal"
      >
        <VIcon
          start
          icon="tabler-report-analytics"
        />
        {{ apiMeta?.method || "Method bekleniyor" }}
      </VChip>
    </div>

    <VAlert
      v-if="lastError"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ lastError }}
    </VAlert>

    <VCard class="mb-4">
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="tabler-filter" />
        Filtreler
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol
            v-if="reportType !== 'wager-index'"
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.startDate"
              type="datetime-local"
              label="Başlangıç Zamanı (UTC)"
              density="compact"
            />
          </VCol>
          <VCol
            v-if="reportType !== 'wager-index'"
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.endDate"
              type="datetime-local"
              label="Bitiş Zamanı (UTC)"
              density="compact"
            />
          </VCol>
          <VCol
            v-if="reportType === 'wager-index'"
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="filters.startWagerId"
              type="number"
              label="Başlangıç Wager ID"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="filters.count"
              type="number"
              label="Kayıt Limiti"
              density="compact"
              :min="1"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.userCode"
              label="User Code"
              density="compact"
              clearable
            />
          </VCol>
          <VCol
            v-if="isVendorFilterVisible"
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.vendorCode"
              label="Vendor Kodu"
              density="compact"
              clearable
            />
          </VCol>
          <VCol
            v-if="isGameFilterVisible"
            cols="12"
            md="3"
          >
            <VTextField
              v-model="filters.gameCode"
              label="Oyun Kodu"
              density="compact"
              clearable
            />
          </VCol>
          <VCol
            v-if="isPeriodFilterVisible"
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.period"
              :items="periodOptions"
              label="Periyot"
              density="compact"
            />
          </VCol>
          <VCol
            v-if="reportType === 'risk-users'"
            cols="12"
            md="3"
          >
            <VSelect
              v-model="filters.riskLevel"
              :items="riskOptions"
              label="Risk Seviyesi"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            class="d-flex flex-wrap gap-2"
          >
            <VBtn
              color="primary"
              :loading="loading"
              @click="fetchReport"
            >
              <VIcon
                start
                icon="tabler-search"
              />
              Raporu Getir
            </VBtn>
            <VBtn
              variant="tonal"
              color="secondary"
              :disabled="!tableRows.length || !canManageReports"
              @click="exportCsv"
            >
              <VIcon
                start
                icon="tabler-download"
              />
              CSV Aktar
            </VBtn>
            <VBtn
              variant="text"
              color="secondary"
              @click="showRaw = !showRaw"
            >
              <VIcon
                start
                icon="tabler-code"
              />
              Ham Yanıt
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <VRow
      v-if="summaryItems.length"
      class="mb-4"
    >
      <VCol
        v-for="item in summaryItems"
        :key="item.key"
        cols="12"
        sm="6"
        md="3"
      >
        <VCard>
          <VCardText>
            <div class="text-caption text-medium-emphasis">
              {{ item.label }}
            </div>
            <div class="text-h6">
              {{ item.value }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard>
      <VCardText>
        <VDataTable
          :headers="headers"
          :items="tableRows"
          :loading="loading"
          item-value="_rowId"
          class="text-no-wrap"
        />
      </VCardText>
    </VCard>

    <VCard
      v-if="showRaw"
      class="mt-4"
    >
      <VCardText>
        <VTextarea
          :model-value="JSON.stringify(rawResponse, null, 2)"
          label="Ham API Yanıtı"
          rows="12"
          readonly
          style="font-family: monospace;"
        />
      </VCardText>
    </VCard>
  </section>
</template>
