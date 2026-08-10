<script setup>
import { fetchFuturesHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

// 📊 Tablo kolonları
const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.symbol'), key: 'symbol' },
  { title: t('tables.amount'), key: 'amount' },
  { title: t('tables.leverage'), key: 'leverage' },
  { title: t('tables.direction'), key: 'direction' },
  { title: t('tables.entryPrice'), key: 'entryPrice' },
  { title: t('tables.exitPrice'), key: 'exitPrice' },
  { title: t('tables.pnl'), key: 'pnl' },
  { title: t('tables.status'), key: 'status' },
  { title: t('tables.fiatCurrency'), key: 'fiatCurrency' },
  { title: t('tables.date'), key: 'createdAt' },
]

// 📦 State
const items = ref([])
const total = ref(0)
const page = ref(1)
const itemsPerPage = ref(20)

// 🔎 Filtreler
const search = ref('')
const startDate = ref(null)
const endDate = ref(null)
const status = ref(null)
const direction = ref(null)
const symbol = ref(null)
const fiatCurrency = ref(null)

const statusOptions = ['open', 'closed', 'liquidated']
const directionOptions = ['LONG', 'SHORT']
const fiatOptions = ['USD', 'USDT', 'TRY']
const symbolOptions = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']

// 📥 Veri yükleme
const loadData = async () => {
  try {
    const res = await fetchFuturesHistory({
      q: search.value,
      startDate: startDate.value,
      endDate: endDate.value,
      status: status.value,
      direction: direction.value,
      symbol: symbol.value,
      fiatCurrency: fiatCurrency.value,
      page: page.value,
      limit: itemsPerPage.value,
    })

    // 🔑 API’den gelen format: { success, data, total, page, totalPages }
    items.value = res.data
    total.value = res.total
  } catch (err) {
    console.error('Futures fetch error:', err)
  }
}

onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate, status, direction, symbol, fiatCurrency], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.futuresHistory') }}</VCardTitle>

    <!-- 🔍 Filtre Alanları -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VTextField v-model="search" :label="t('tables.user')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="status" :items="statusOptions" :label="t('tables.status')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="direction" :items="directionOptions" :label="t('tables.direction')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="symbol" :items="symbolOptions" :label="t('tables.symbol')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="fiatCurrency" :items="fiatOptions" :label="t('tables.fiatCurrency')" dense clearable />
        </VCol>
        <VCol cols="12" md="3">
          <VTextField v-model="startDate" type="date" label="Start Date" dense />
        </VCol>
        <VCol cols="12" md="3">
          <VTextField v-model="endDate" type="date" label="End Date" dense />
        </VCol>
      </VRow>
    </VCardText>

    <!-- 📊 Tablo -->
    <VDataTableServer
      :headers="headers"
      :items="items"
      :items-length="total"
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      class="elevation-1"
    >
       <!-- 👤 Kullanıcı -->
<template #item.user="{ item }">
  <div>
    <RouterLink
      :to="`/apps/user/view/${item.raw.user?._id}`"
      class="text-primary font-weight-medium"
    >
      {{ item.raw.user?.username || 'Unknown' }}
    </RouterLink>
    <br>
    <small>{{ item.raw.user?.local?.email || '—' }}</small>
  </div>
</template>

<template #item.leverage="{ item }">
  {{ (item.raw.leverage) }}x
</template>

<!-- 📅 Tarih -->
<template #item.createdAt="{ item }">
  {{ new Date(item.raw.createdAt).toLocaleDateString() }}
</template>
     <!-- 💰 Amount -->
<template #item.amount="{ item }">
  {{ Number(item.raw.amount).toFixed(2) }} {{ item.raw.fiatCurrency || '' }}
</template>

<!-- 💹 Entry Price -->
<template #item.entryPrice="{ item }">
  ${{ Number(item.raw.entryPrice).toFixed(2) }}
</template>

<!-- 💹 Exit Price -->
<template #item.exitPrice="{ item }">
  <span v-if="item.raw.exitPrice !== null">
    ${{ Number(item.raw.exitPrice).toFixed(2) }}
  </span>
  <span v-else>—</span>
</template>

<!-- 💰 PnL -->
<template #item.pnl="{ item }">
  <div
    class="px-2 py-1 rounded text-white text-center"
    :class="Number(item.raw.pnl) > 0 ? 'bg-success' : Number(item.raw.pnl) < 0 ? 'bg-error' : 'bg-secondary'"
  >
    {{ item.raw.pnl !== undefined && item.raw.pnl !== null ? Number(item.raw.pnl).toFixed(2) : '-' }}
    <span v-if="item.raw.fiatCurrency"> {{ item.raw.fiatCurrency }}</span>
  </div>
</template>

    </VDataTableServer>
  </VCard>
</template>
