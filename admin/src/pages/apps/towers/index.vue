<script setup>
import { fetchTowersHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

// 📑 Tablo kolonları
const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.amount'), key: 'amount' },
  { title: t('tables.payout'), key: 'payout' },
  { title: t('tables.multiplier'), key: 'multiplier' },
  { title: t('tables.risk'), key: 'risk' },
  { title: t('tables.fiatCurrency'), key: 'fiatCurrency' },
  { title: t('tables.coinType'), key: 'coinType' },
  { title: t('tables.chain'), key: 'chain' },
  { title: t('tables.walletType'), key: 'walletType' },
  { title: t('tables.state'), key: 'state' },
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
const state = ref(null)

const stateOptions = ['created', 'completed', 'canceled']

const loadData = async () => {
  try {
    const res = await fetchTowersHistory({
      q: search.value,
      startDate: startDate.value,
      endDate: endDate.value,
      state: state.value,
      page: page.value,
      limit: itemsPerPage.value,
    })

    console.log("✅ Towers API Response:", res.data)

    items.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (err) {
    console.error("❌ Towers fetch error:", err.response?.data || err.message)
    items.value = []
    total.value = 0
  }
}

onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate, state], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.towersHistory') }}</VCardTitle>

    <!-- 🔍 Filtreler -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VTextField v-model="search" :label="t('tables.user')" dense clearable />
        </VCol>
        <VCol cols="12" md="3">
          <VSelect v-model="state" :items="stateOptions" :label="t('tables.state')" dense clearable />
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
          <br />
          <small>{{ item.raw.user?.email || '—' }}</small>
        </div>
      </template>

      <!-- 💰 Amount -->
      <template #item.amount="{ item }">
        {{ Number(item.raw.amount).toFixed(2) }} {{ item.raw.fiatCurrency }}
      </template>

      <!-- 💵 Payout -->
      <template #item.payout="{ item }">
        {{ Number(item.raw.payout || 0).toFixed(2) }} {{ item.raw.fiatCurrency }}
      </template>

      <!-- 📈 Multiplier -->
      <template #item.multiplier="{ item }">
        {{ item.raw.multiplier ? item.raw.multiplier + 'x' : '—' }}
      </template>

      <!-- 🎲 Risk -->
      <template #item.risk="{ item }">
        <VChip color="warning" size="small">
          {{ item.raw.risk }}
        </VChip>
      </template>

      <!-- 🪙 Coin Type -->
      <template #item.coinType="{ item }">
        {{ item.raw.coinType || '—' }}
      </template>

      <!-- 🔗 Chain -->
      <template #item.chain="{ item }">
        {{ item.raw.chain || '—' }}
      </template>

      <!-- 👛 Wallet Type -->
      <template #item.walletType="{ item }">
        {{ item.raw.walletType || '—' }}
      </template>

      <!-- 📌 State -->
      <template #item.state="{ item }">
        <VChip
          :color="item.raw.state === 'completed' ? 'success' : item.raw.state === 'canceled' ? 'error' : 'info'"
          size="small"
        >
          {{ item.raw.state }}
        </VChip>
      </template>

      <!-- 📅 Tarih -->
      <template #item.createdAt="{ item }">
        {{ new Date(item.raw.createdAt).toLocaleDateString() }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
