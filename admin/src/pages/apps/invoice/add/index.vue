<script setup>
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const transactions = ref([])
const total = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
})
const searchQuery = ref('')
const dateRange = ref('')
const isLoading = ref(false)

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    alert(t('transactions.copied')) // basit bildirim, istersen VSnackbar kullanabilirsin
  } catch (err) {
    console.error('Clipboard copy failed:', err)
  }
}

const fetchWithdraws = async () => {
  isLoading.value = true
  try {
    const [start, end] = dateRange.value ? dateRange.value.split('to') : []
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/transactions-withdraw`, {
      params: {
        q: searchQuery.value,
        startDate: start,
        endDate: end,
        page: options.value.page,
        itemsPerPage: options.value.itemsPerPage,
      },
    })
    if (res.data.success) {
      transactions.value = res.data.data.transactions
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('Withdraw fetch error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchWithdraws)
watch([options, searchQuery, dateRange], fetchWithdraws)

const headers = [
  { title: t('transactions.user'), key: 'user' },
  { title: t('transactions.amount'), key: 'amount' },
  { title: t('transactions.cryptoAmount'), key: 'cryptoAmount' },
  { title: t('transactions.receiver'), key: 'receiver' },
  { title: t('transactions.state'), key: 'state' },
  { title: t('transactions.date'), key: 'createdAt' },
  { title: t('transactions.actions'), key: 'actions', sortable: false },
]

const formatAmount = val => Number(val).toFixed(2)
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('transactions.withdraws') }}</VCardTitle>

    <VCardText>
      <VRow class="mb-4">
        <VCol cols="12" sm="4">
          <AppTextField v-model="searchQuery" :label="t('transactions.searchUser')" density="compact" />
        </VCol>
        <VCol cols="12" sm="4">
          <AppTextField v-model="dateRange" label="YYYY-MM-DD to YYYY-MM-DD" density="compact" />
        </VCol>
      </VRow>

      <VDataTableServer
        :headers="headers"
        :items="transactions"
        :items-length="total"
        v-model:page="options.page"
        v-model:items-per-page="options.itemsPerPage"
        :loading="isLoading"
        class="text-no-wrap"
      >
        <!-- user info -->
        <template #item.user="{ item }">
          <div class="d-flex align-center">
            <VAvatar size="32" class="me-2" :src="item.raw.user?.avatar || ''">
              <span v-if="!item.raw.user?.avatar">{{ item.raw.user?.username?.charAt(0).toUpperCase() }}</span>
            </VAvatar>
            <div>
              <p class="mb-0 font-weight-medium">{{ item.raw.user?.username || '—' }}</p>
              <span class="text-sm text-disabled">ID: {{ item.raw.user?._id }}</span>
            </div>
          </div>
        </template>

        <!-- amount -->
        <template #item.amount="{ item }">
          {{ formatAmount(item.raw.amount) }} {{ item.raw.data.fiatcurrency }}
        </template>

        <!-- cryptoAmount -->
        <template #item.cryptoAmount="{ item }">
          {{ item.raw.data.cryptoAmount }} {{ item.raw.data.currency || '—' }}
        </template>

      <!-- receiver -->
<template #item.receiver="{ item }">
  <div class="d-flex align-center">
    <span class="me-2">{{ item.raw.data.receiver }}</span>
    <VBtn
      size="x-small"
      variant="tonal"
      icon
      @click="copyToClipboard(item.raw.data.receiver)"
    >
      <VIcon size="16" icon="tabler-copy" />
    </VBtn>
  </div>
</template>


        <!-- state -->
        <template #item.state="{ item }">
          <VChip :color="item.raw.state === 'completed' ? 'success' : 'warning'" label>
            {{ item.raw.state }}
          </VChip>
        </template>

        <!-- createdAt -->
        <template #item.createdAt="{ item }">
          {{ new Date(item.raw.createdAt).toLocaleString() }}
        </template>

        <!-- actions -->
        <template #item.actions="{ item }">
          <VBtn size="small" color="primary" @click="selectedTx = item.raw; showModal = true">
            {{ t('transactions.view') }}
          </VBtn>
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>

  <!-- modal -->
  <VDialog v-model="showModal" max-width="600">
    <VCard>
      <VCardTitle>{{ t('transactions.withdrawDetails') }}</VCardTitle>
      <VCardText>
        <pre>{{ JSON.stringify(selectedTx, null, 2) }}</pre>
      </VCardText>
      <VCardActions>
        <VBtn text @click="showModal = false">{{ t('close') }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
