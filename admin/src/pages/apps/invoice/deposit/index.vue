<script setup>
import { avatarText } from '@core/utils/formatters'
import axios from 'axios'
import { onActivated, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const route = useRoute()

const searchQuery = ref('')
const dateRange = ref('')
const transactions = ref([])
const total = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
})
const isLoading = ref(false)

// Modal
const isDialogOpen = ref(false)
const selectedTx = ref(null)

// Tablo kolonları
const headers = [
  { title: 'User', key: 'user' },
  { title: 'Transaction ID', key: 'txId' },
  { title: 'Currency', key: 'currency' },
  { title: 'Amount', key: 'amount' },
  { title: 'State', key: 'state' },
  { title: 'Created At', key: 'createdAt' },
  { title: 'Actions', key: 'actions', sortable: false },
]

// API’den verileri çek
const fetchDeposits = async () => {
  try {
    isLoading.value = true
    const [start, end] = dateRange.value ? dateRange.value.split('to') : []

    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/transactions-deposit`, {
      params: {
        q: searchQuery.value,
        startDate: start?.trim(),
        endDate: end?.trim(),
        page: options.value.page,
        itemsPerPage: options.value.itemsPerPage,
      },
    })

    if (res.data.success) {
      transactions.value = res.data.data.transactions
      total.value = res.data.data.total
    }
  } catch (err) {
    console.error('Deposits fetch error:', err)
  } finally {
    isLoading.value = false
  }
}

// lifecycle
onMounted(fetchDeposits)
onActivated(fetchDeposits)
watch(() => route.fullPath, fetchDeposits)
watch([options, searchQuery, dateRange], fetchDeposits)

// Modal aç
const openDetails = (tx) => {
  selectedTx.value = tx
  isDialogOpen.value = true
}
</script>

<template>
  <VCard>
    <VCardTitle>{{ t('transactions.deposits') }}</VCardTitle>
    <VCardText>
      <!-- Search -->
      <VRow class="mb-4">
        <VCol cols="12" sm="6">
          <AppTextField
            v-model="searchQuery"
            :label="t('transactions.searchUser')"
            density="compact"
          />
        </VCol>
        <VCol cols="12" sm="6">
          <AppTextField
            v-model="dateRange"
            :label="t('transactions.dateRange')"
            density="compact"
          />
        </VCol>
      </VRow>

      <VDataTableServer
        :headers="headers"
        :items="transactions"
        :items-length="total"
        v-model:page="options.page"
        v-model:items-per-page="options.itemsPerPage"
        :loading="isLoading"
      >
        <!-- User -->
        <template #item.user="{ item }">
          <div class="d-flex align-center">
            <VAvatar size="32" class="me-2">
              <span>{{ avatarText(item.raw.user?.username || 'U') }}</span>
            </VAvatar>
            <div>
              <div class="font-weight-medium">{{ item.raw.user?.username || '-' }}</div>
              <small>{{ t('transactions.id') }}: {{ item.raw.user?._id || 'N/A' }}</small>
            </div>
          </div>
        </template>

        <!-- TxID -->
        <template #item.txId="{ item }">
          <div class="d-flex align-center">
            <span>{{ item.raw.data?.transaction || 'N/A' }}</span>
            <VBtn
              icon
              size="x-small"
              variant="text"
              :title="t('transactions.copy')"
              @click="navigator.clipboard.writeText(item.raw.data?.transaction || '')"
            >
              <VIcon size="16" icon="tabler-copy" />
            </VBtn>
          </div>
        </template>

        <!-- Currency -->
        <template #item.currency="{ item }">
          {{ item.raw.data?.currency || item.raw.data?.fiatcurrency || 'USD' }}
        </template>

        <!-- Amount -->
        <template #item.amount="{ item }">
          ${{ Number(item.raw.amount).toFixed(2) }}
        </template>

        <!-- State -->
        <template #item.state="{ item }">
          <VChip :color="item.raw.state === 'completed' ? 'success' : 'warning'" label>
            {{ item.raw.state }}
          </VChip>
        </template>

        <!-- Created At -->
        <template #item.createdAt="{ item }">
          {{ new Date(item.raw.createdAt).toLocaleString() }}
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click="openDetails(item.raw)">
            <VIcon icon="tabler-eye" :title="t('transactions.view')" />
          </IconBtn>
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>

  <!-- Deposit Details Modal -->
  <VDialog v-model="isDialogOpen" max-width="600px">
    <VCard>
      <VCardTitle>{{ t('transactions.depositDetails') }}</VCardTitle>
      <VCardText v-if="selectedTx">
        <p><strong>{{ t('transactions.user') }}:</strong> {{ selectedTx.user?.username || '-' }} ({{ t('transactions.id') }}: {{ selectedTx.user?._id }})</p>
        <p><strong>{{ t('transactions.email') }}:</strong> {{ selectedTx.user?.email || 'N/A' }}</p>
        <p><strong>{{ t('transactions.phone') }}:</strong> {{ selectedTx.user?.phone || 'N/A' }}</p>
        <p><strong>{{ t('transactions.txId') }}:</strong> {{ selectedTx.data?.transaction || 'N/A' }}</p>
        <p><strong>{{ t('transactions.currency') }}:</strong> {{ selectedTx.data?.currency || selectedTx.data?.fiatcurrency }}</p>
        <p><strong>{{ t('transactions.amount') }}:</strong> ${{ Number(selectedTx.amount).toFixed(2) }}</p>
        <p><strong>{{ t('transactions.status') }}:</strong> {{ selectedTx.state }}</p>
        <p><strong>{{ t('transactions.date') }}:</strong> {{ new Date(selectedTx.createdAt).toLocaleString() }}</p>
        <p><strong>Updated At:</strong> {{ new Date(selectedTx.updatedAt).toLocaleString() }}</p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="primary" @click="isDialogOpen = false">{{ t('transactions.close') }}</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
