<script setup>
import { fetchTurboHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.symbol'), key: 'symbol' },
  { title: t('tables.amount'), key: 'amount' },
  { title: t('tables.direction'), key: 'direction' },
  { title: t('tables.entryPrice'), key: 'entryPrice' },
  { title: t('tables.payout'), key: 'payoutAmount' },
  { title: t('tables.status'), key: 'result' },
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

const statusOptions = ['win', 'lose', 'pending']
const directionOptions = ['UP', 'DOWN']
const fiatOptions = ['USD', 'USDT', 'TRY']
const symbolOptions = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']

const loadData = async () => {
  try {
    const res = await fetchTurboHistory({
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

    items.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (err) {
    console.error('Turbo fetch error:', err)
    items.value = []
    total.value = 0
  }
}


onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate, status, direction, symbol, fiatCurrency], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.turboHistory') }}</VCardTitle>

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

      <!-- 💰 Amount -->
      <template #item.amount="{ item }">
        {{ Number(item.raw.amount).toFixed(2) }} {{ item.raw.fiatCurrency || '' }}
      </template>

      <!-- 💵 Payout -->
      <template #item.payoutAmount="{ item }">
        {{ Number(item.raw.payoutAmount).toFixed(2) }} {{ item.raw.fiatCurrency || '' }}
      </template>

      <!-- 📌 Status -->
      <template #item.result="{ item }">
        <VChip
          :color="item.raw.result === 'win' ? 'success' : item.raw.result === 'lose' ? 'error' : 'warning'"
          size="small"
        >
          {{ item.raw.result }}
        </VChip>
      </template>

      <!-- 📅 Tarih -->
      <template #item.createdAt="{ item }">
        {{ new Date(item.raw.createdAt).toLocaleDateString() }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
