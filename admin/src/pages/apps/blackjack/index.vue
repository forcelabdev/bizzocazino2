<script setup>
import { fetchBlackjackHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

// 📑 Tablo kolonları
const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.amountMain'), key: 'amountMain' },
  { title: t('tables.amountSideLeft'), key: 'amountSideLeft' },
  { title: t('tables.amountSideRight'), key: 'amountSideRight' },
  { title: t('tables.payout'), key: 'payout' },
  { title: t('tables.multiplier'), key: 'multiplier' },
  { title: t('tables.seat'), key: 'seat' },
  { title: t('tables.actions'), key: 'actions' },
  { title: t('tables.cards'), key: 'cards' },
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

const loadData = async () => {
  try {
    const res = await fetchBlackjackHistory({
      q: search.value,
      startDate: startDate.value,
      endDate: endDate.value,
      page: page.value,
      limit: itemsPerPage.value,
    })

    console.log("✅ Blackjack API Response:", res.data)

    items.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (err) {
    console.error("❌ Blackjack fetch error:", err.response?.data || err.message)
    items.value = []
    total.value = 0
  }
}

onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.blackjackHistory') }}</VCardTitle>

    <!-- 🔍 Filtreler -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VTextField v-model="search" :label="t('tables.user')" dense clearable />
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

      <!-- 💰 Main Bet -->
      <template #item.amountMain="{ item }">
        {{ Number(item.raw.amount?.main || 0).toFixed(2) }}
      </template>

      <!-- 💰 Side Left -->
      <template #item.amountSideLeft="{ item }">
        {{ Number(item.raw.amount?.sideLeft || 0).toFixed(2) }}
      </template>

      <!-- 💰 Side Right -->
      <template #item.amountSideRight="{ item }">
        {{ Number(item.raw.amount?.sideRight || 0).toFixed(2) }}
      </template>

      <!-- 💵 Payout -->
      <template #item.payout="{ item }">
        {{ Number(item.raw.payout).toFixed(2) }}
      </template>

         <!-- ✖ Multiplier -->
<template #item.multiplier="{ item }">
  <span v-if="item.raw.multiplier !== undefined && item.raw.multiplier !== null">
    {{ item.raw.multiplier }}x
  </span>
  <span v-else>—</span>
</template>

      <!-- 🎯 Seat -->
      <template #item.seat="{ item }">
        Seat #{{ item.raw.seat }}
      </template>

      <!-- 🎬 Actions -->
      <template #item.actions="{ item }">
        <span v-if="item.raw.actions?.length">
          {{ item.raw.actions.join(', ') }}
        </span>
        <span v-else>—</span>
      </template>

      <!-- 🃏 Cards -->
      <template #item.cards="{ item }">
        <span v-if="item.raw.cards?.length">
          {{ item.raw.cards.map(c => c.rank + c.suit).join(', ') }}
        </span>
        <span v-else>—</span>
      </template>

   

      <!-- 📅 Tarih -->
      <template #item.createdAt="{ item }">
        {{ new Date(item.raw.createdAt).toLocaleDateString() }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
