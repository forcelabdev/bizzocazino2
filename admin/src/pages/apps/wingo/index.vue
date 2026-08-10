<script setup>
import { fetchWingoHistory } from '@/services/historyService'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const headers = [
  { title: t('tables.user'), key: 'user' },
  { title: t('tables.betType'), key: 'betType' },
  { title: t('tables.choice'), key: 'choice' },
  { title: t('tables.amount'), key: 'amount' },
  { title: t('tables.payout'), key: 'payout' },
  { title: t('tables.colorResult'), key: 'colorResult' },
  { title: t('tables.numberResult'), key: 'numberResult' },
  { title: t('tables.status'), key: 'isWin' },
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
const betType = ref(null)
const choice = ref(null)
const isWin = ref(null)

const betTypeOptions = ['color', 'number']
const winOptions = [
  { title: 'Win', value: true },
  { title: 'Lose', value: false },
]

const loadData = async () => {
  try {
    const res = await fetchWingoHistory({
      q: search.value,
      startDate: startDate.value,
      endDate: endDate.value,
      betType: betType.value,
      choice: choice.value,
      isWin: isWin.value,
      page: page.value,
      limit: itemsPerPage.value,
    })

    console.log("✅ Wingo API Response:", res.data)

    items.value = res.data.data || []
    total.value = res.data.total || 0
  } catch (err) {
    console.error("❌ Wingo fetch error:", err.response?.data || err.message)
    items.value = []
    total.value = 0
  }
}


onMounted(loadData)
watch([page, itemsPerPage, search, startDate, endDate, betType, choice, isWin], loadData)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('tables.wingoHistory') }}</VCardTitle>

    <!-- 🔍 Filtreler -->
    <VCardText>
      <VRow>
        <VCol cols="12" md="3">
          <VTextField v-model="search" :label="t('tables.user')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="betType" :items="betTypeOptions" :label="t('tables.betType')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VTextField v-model="choice" :label="t('tables.choice')" dense clearable />
        </VCol>
        <VCol cols="12" md="2">
          <VSelect v-model="isWin" :items="winOptions" :label="t('tables.status')" dense clearable />
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
    <small>{{ item.raw.user?.email || '—' }}</small>
  </div>
</template>




      <!-- 💰 Amount -->
      <template #item.amount="{ item }">
        {{ Number(item.raw.amount).toFixed(2) }} {{ item.raw.fiatCurrency || '' }}
      </template>

      <!-- 💵 Payout -->
      <template #item.payout="{ item }">
        {{ Number(item.raw.payout).toFixed(2) }} {{ item.raw.fiatCurrency || '' }}
      </template>

      <!-- 🎨 Color Result -->
      <template #item.colorResult="{ item }">
        <VChip :color="item.raw.colorResult" size="small">
          {{ item.raw.colorResult }}
        </VChip>
      </template>

      <!-- 🔢 Number Result -->
      <template #item.numberResult="{ item }">
        {{ item.raw.numberResult }}
      </template>

      <!-- 🟢🔴 Status -->
      <template #item.isWin="{ item }">
        <VChip :color="item.raw.isWin ? 'success' : 'error'" size="small">
          {{ item.raw.isWin ? 'Win' : 'Lose' }}
        </VChip>
      </template>

      <!-- 📅 Tarih -->
      <template #item.createdAt="{ item }">
        {{ new Date(item.raw.createdAt).toLocaleDateString() }}
      </template>
    </VDataTableServer>
  </VCard>
</template>
