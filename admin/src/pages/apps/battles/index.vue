<script setup>
import { fetchBattleHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

// 📑 Tablo kolonları
const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.amount'), key: 'amount' },
  { title: t('tables.fiatCurrency'), key: 'fiatCurrency' },
  { title: t('tables.payout'), key: 'payout' },
  { title: t('tables.multiplier'), key: 'multiplier' },
  { title: t('tables.playerCount'), key: 'playerCount' },
  { title: t('tables.mode'), key: 'mode' },
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
const fiatCurrency = ref(null)

const stateOptions = ['completed', 'canceled', 'created']
const fiatOptions = ['USD', 'TRY', 'EUR', 'BTC', 'ETH'] // senin sistemine göre genişletilebilir

// 📥 Veri yükleme
const loadData = async () => {
  try {
    const res = await fetchBattleHistory({
      q: search.value,
      startDate: startDate.value,
      endDate: endDate.value,
      state: state.value,
      fiatCurrency: fiatCurrency.value,
      page: page.value,
      limit: itemsPerPage.value,
    })

    console.log("✅ Battle API Response:", res.data)

    items.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (err) {
    console.error("❌ Battle fetch error:", err.response?.data || err.message)
    items.value = []
    total.value = 0
  }
}

onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate, state, fiatCurrency], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.battleHistory') }}</VCardTitle>

    <!-- 🔍 Filtreler -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VTextField v-model="search" :label="t('tables.user')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="state" :items="stateOptions" :label="t('tables.state')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="fiatCurrency" :items="fiatOptions" :label="t('tables.fiatCurrency')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VTextField v-model="startDate" type="date" label="Start Date" dense />
        </VCol>
        <VCol cols="12" md="2">
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
            {{ item.raw.user?.username   }}
          </RouterLink>
          <br />
          <small>{{ item.raw.user?.email  }}</small>
        </div>
      </template>

      <!-- 💰 Amount -->
      <template #item.amount="{ item }">
        {{ Number(item.raw.amount).toFixed(2) }}
      </template>

      <!-- 💵 Payout -->
      <template #item.payout="{ item }">
        {{ item.raw.payout ? Number(item.raw.payout).toFixed(2) : '—' }}
      </template>

      <!-- 🎯 Multiplier -->
      <template #item.multiplier="{ item }">
        {{ item.raw.multiplier   }}x
      </template>

      <!-- 💱 Fiat -->
      <template #item.fiatCurrency="{ item }">
        <VChip color="info" size="small">
          {{ item.raw.fiatCurrency || '—' }}
        </VChip>
      </template>

      <!-- 👥 Player Count -->
      <template #item.playerCount="{ item }">
        {{ item.raw.playerCount }}
      </template>

      <!-- 🎮 Mode -->
      <template #item.mode="{ item }">
        <VChip color="info" size="small">
          {{ item.raw.mode }}
        </VChip>
      </template>

      <!-- 📌 State -->
      <template #item.state="{ item }">
        <VChip
          :color="item.raw.state === 'completed' ? 'success' : item.raw.state === 'canceled' ? 'error' : 'warning'"
          size="small"
        >
          {{ item.raw.state }}
        </VChip>
      </template>

      <!-- 📅 Tarih -->
      <template #item.createdAt="{ item }">
        {{ new Date(item.raw.createdAt).toLocaleString() }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
