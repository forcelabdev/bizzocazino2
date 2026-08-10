<script setup>
import { paginationMeta } from '@/@fake-db/utils'
import { useDepositStore } from '@/pages/apps/invoice/useDepositStore'
import { avatarText } from '@core/utils/formatters'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const searchQuery = ref('')
const dateRange = ref('')
const totalDeposits = ref(0)
const options = ref({
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
})

const selectedRows = ref([])
const depositStore = useDepositStore()

// headers
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
const fetchDeposits = () => {
  const [start, end] = dateRange.value ? dateRange.value.split('to') : []
  depositStore.fetchDeposits({
    q: searchQuery.value,
    startDate: start?.trim(),
    endDate: end?.trim(),
    page: options.value.page,
    itemsPerPage: options.value.itemsPerPage,
  })
}

// lifecycle
onMounted(fetchDeposits)
watch([searchQuery, dateRange, options], fetchDeposits, { deep: true })

// Modal
const isDialogOpen = ref(false)
const selectedTx = ref(null)
const openDetails = tx => {
  selectedTx.value = tx
  isDialogOpen.value = true
}
</script>

<template>
  <VCard id="deposit-list">
    <VCardText class="d-flex align-center flex-wrap gap-4">
      <div class="me-3 d-flex gap-3">
        <AppSelect
          :model-value="options.itemsPerPage"
          :items="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 50, title: '50' },
            { value: 100, title: '100' },
            { value: -1, title: 'All' },
          ]"
          style="width: 6.25rem;"
          @update:model-value="options.itemsPerPage = parseInt($event, 10)"
        />
      </div>

      <VSpacer />

      <div class="d-flex align-center flex-wrap gap-4">
        <AppTextField
          v-model="searchQuery"
          placeholder="Search User"
          density="compact"
        />
        <AppTextField
          v-model="dateRange"
          placeholder="YYYY-MM-DD to YYYY-MM-DD"
          density="compact"
        />
      </div>
    </VCardText>

    <VDivider />

    <VDataTableServer
      v-model="selectedRows"
      v-model:items-per-page="options.itemsPerPage"
      v-model:page="options.page"
      :loading="depositStore.loading"
      :items-length="depositStore.total"
      :headers="headers"
      :items="depositStore.items"
      class="text-no-wrap"
    >
      <!-- User -->
      <template #item.user="{ item }">
        <div class="d-flex align-center">
          <VAvatar size="32" class="me-2">
            <span>{{ avatarText(item.raw.user?.username || 'U') }}</span>
          </VAvatar>
          <div>
            <div class="font-weight-medium">{{ item.raw.user?.username || '-' }}</div>
            <small>ID: {{ item.raw.user?._id || 'N/A' }}</small>
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
            title="Copy"
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
          <VIcon icon="tabler-eye" />
        </IconBtn>
      </template>

      <!-- pagination -->
      <template #bottom>
        <VDivider />
        <div
          class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3"
        >
          <p class="text-sm text-disabled mb-0">
            {{ paginationMeta(options, depositStore.total) }}
          </p>

          <VPagination
            v-model="options.page"
            :length="Math.ceil(depositStore.total / options.itemsPerPage)"
            :total-visible="5"
          >
            <template #prev="slotProps">
              <VBtn variant="tonal" color="default" v-bind="slotProps" :icon="false">
                Previous
              </VBtn>
            </template>

            <template #next="slotProps">
              <VBtn variant="tonal" color="default" v-bind="slotProps" :icon="false">
                Next
              </VBtn>
            </template>
          </VPagination>
        </div>
      </template>
    </VDataTableServer>
  </VCard>

  <!-- Deposit Details Modal -->
  <VDialog v-model="isDialogOpen" max-width="600px">
    <VCard>
      <VCardTitle>Deposit Details</VCardTitle>
      <VCardText v-if="selectedTx">
        <p><strong>User:</strong> {{ selectedTx.user?.username || '-' }} (ID: {{ selectedTx.user?._id }})</p>
        <p><strong>Email:</strong> {{ selectedTx.user?.email || 'N/A' }}</p>
        <p><strong>TxID:</strong> {{ selectedTx.data?.transaction || 'N/A' }}</p>
        <p><strong>Currency:</strong> {{ selectedTx.data?.currency || selectedTx.data?.fiatcurrency }}</p>
        <p><strong>Amount:</strong> ${{ Number(selectedTx.amount).toFixed(2) }}</p>
        <p><strong>Status:</strong> {{ selectedTx.state }}</p>
        <p><strong>Date:</strong> {{ new Date(selectedTx.createdAt).toLocaleString() }}</p>
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn color="primary" @click="isDialogOpen = false">Close</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
