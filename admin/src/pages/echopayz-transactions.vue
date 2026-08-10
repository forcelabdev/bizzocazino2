<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from '@/plugins/axios'

const transactions = ref([])
const loading = ref(false)
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 1
})
const stats = ref([])
const selectedStatus = ref('')
const searchUserId = ref('')

// İstatistik kartları için hesaplama
const statsCards = computed(() => {
  const sArr = Array.isArray(stats.value) ? stats.value : [];
  const pending = sArr.find(s => s._id === 'pending') || { count: 0, totalAmount: 0 }
  const approved = sArr.find(s => s._id === 'approved') || { count: 0, totalAmount: 0 }
  const rejected = sArr.find(s => s._id === 'rejected') || { count: 0, totalAmount: 0 }
  const expired = sArr.find(s => s._id === 'expired') || { count: 0, totalAmount: 0 }
  
  return [
    { title: 'Bekleyen', count: pending.count, amount: pending.totalAmount, color: 'warning', icon: 'mdi-clock-outline' },
    { title: 'Onaylanan', count: approved.count, amount: approved.totalAmount, color: 'success', icon: 'mdi-check-circle' },
    { title: 'Reddedilen', count: rejected.count, amount: rejected.totalAmount, color: 'error', icon: 'mdi-close-circle' },
    { title: 'Süresi Dolan', count: expired.count, amount: expired.totalAmount, color: 'grey', icon: 'mdi-timer-off' }
  ]
})

// Tablo başlıkları
const headers = [
  { title: 'Tarih', key: 'createdAt', sortable: true },
  { title: 'Kullanıcı', key: 'user', sortable: false },
  { title: 'Tutar', key: 'amount', sortable: true },
  { title: 'Durum', key: 'status', sortable: true },
  { title: 'Referans', key: 'referenceId', sortable: false },
  { title: 'Banka', key: 'bank', sortable: false },
  { title: 'İşlemler', key: 'actions', sortable: false }
]

// Status renkleri
const statusColors = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'grey',
  expired: 'grey'
}

// Status etiketleri
const statusLabels = {
  pending: 'Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
  expired: 'Süresi Doldu'
}

// İşlemleri getir
const fetchTransactions = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    if (selectedStatus.value) params.status = selectedStatus.value
    if (searchUserId.value) params.userId = searchUserId.value

    const response = await axios.get('/admin/echopayz/transactions', { params })
    const payload = response?.data
    if (!payload) {
      console.warn('EchoPayz transactions: empty response', response)
      transactions.value = []
      pagination.value = { page: 1, limit: pagination.value.limit, total: 0, pages: 1 }
      stats.value = []
      return
    }

    if (!payload.success || !payload.data) {
      console.warn('EchoPayz transactions: unexpected payload', payload)
      transactions.value = []
      pagination.value = { page: 1, limit: pagination.value.limit, total: 0, pages: 1 }
      stats.value = []
      return
    }

    transactions.value = payload.data.transactions || []
    pagination.value = payload.data.pagination || { page: 1, limit: pagination.value.limit, total: 0, pages: 1 }
    stats.value = payload.data.stats || []
  } catch (error) {
    console.error('İşlemler yüklenirken hata:', error)
    alert('İşlemler yüklenirken bir hata oluştu!')
  } finally {
    loading.value = false
  }
}

// Sayfa değişimi
const onPageChange = (page) => {
  pagination.value.page = page
  fetchTransactions()
}

// Filtre uygula
const applyFilter = () => {
  pagination.value.page = 1
  fetchTransactions()
}

// Filtreyi temizle
const clearFilter = () => {
  selectedStatus.value = ''
  searchUserId.value = ''
  pagination.value.page = 1
  fetchTransactions()
}

// Manual approve/reject disabled for EchoPayz (automatic system)

// Detay dialogu
const detailDialog = ref(false)
const selectedTransaction = ref(null)

const openDetailDialog = async (id) => {
  try {
    loading.value = true
    const response = await axios.get(`/admin/echopayz/transactions/${id}`)
    if (response.data.success) {
      selectedTransaction.value = response.data.data
      detailDialog.value = true
    }
  } catch (error) {
    console.error('İşlem detayı yüklenirken hata:', error)
    alert('İşlem detayı yüklenirken bir hata oluştu!')
  } finally {
    loading.value = false
  }
}

// Tarih formatla
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR')
}

// Tutar formatla
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '-'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div>
    <!-- İstatistik Kartları -->
    <VRow class="mb-4">
      <VCol v-for="card in statsCards" :key="card.title" cols="12" sm="6" md="3">
        <VCard>
          <VCardText class="d-flex align-center">
            <VAvatar :color="card.color" size="48" class="me-4">
              <VIcon :icon="card.icon" color="white" />
            </VAvatar>
            <div>
              <p class="text-body-2 mb-0">{{ card.title }}</p>
              <h4 class="text-h5">{{ card.count }}</h4>
              <p class="text-caption text-medium-emphasis mb-0">{{ formatAmount(card.amount) }}</p>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Ana Kart -->
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>EchoPayz İşlemleri</span>
        <VBtn color="primary" variant="outlined" size="small" @click="fetchTransactions" :loading="loading">
          <VIcon icon="mdi-refresh" class="me-1" />
          Yenile
        </VBtn>
      </VCardTitle>
      <div class="px-4">
        <p class="text-sm text-medium-emphasis my-2">
          EchoPayz işlemleri otomatik olarak yönetilir; admin panelden manuel onay veya reddetme yapılamaz.
        </p>
      </div>

      <VCardText>
        <!-- Filtreler -->
        <VRow class="mb-4">
          <VCol cols="12" md="4">
            <VSelect
              v-model="selectedStatus"
              :items="[
                { title: 'Tümü', value: '' },
                { title: 'Bekleyen', value: 'pending' },
                { title: 'Onaylanan', value: 'approved' },
                { title: 'Reddedilen', value: 'rejected' },
                { title: 'İptal Edilen', value: 'cancelled' },
                { title: 'Süresi Dolan', value: 'expired' }
              ]"
              label="Durum Filtresi"
              density="compact"
            />
          </VCol>
          <VCol cols="12" md="4">
            <VTextField
              v-model="searchUserId"
              label="Kullanıcı ID"
              density="compact"
              clearable
            />
          </VCol>
          <VCol cols="12" md="4" class="d-flex align-center gap-2">
            <VBtn color="primary" @click="applyFilter">Filtrele</VBtn>
            <VBtn color="secondary" variant="outlined" @click="clearFilter">Temizle</VBtn>
          </VCol>
        </VRow>

        <!-- Tablo -->
        <VDataTable
          :headers="headers"
          :items="transactions"
          :loading="loading"
          :items-per-page="pagination.limit"
          hide-default-footer
        >
          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

          <template #item.user="{ item }">
            <div v-if="item.user">
              <strong>{{ item.user.username || item.user.name || '-' }}</strong>
              <br>
              <small class="text-medium-emphasis">{{ item.user.local?.email || '' }}</small>
            </div>
            <span v-else class="text-medium-emphasis">-</span>
          </template>

          <template #item.amount="{ item }">
            <strong>{{ formatAmount(item.amount) }}</strong>
          </template>

          <template #item.status="{ item }">
            <VChip :color="statusColors[item.status]" size="small">
              {{ statusLabels[item.status] || item.status }}
            </VChip>
          </template>

          <template #item.referenceId="{ item }">
            <code class="text-caption">{{ item.referenceId }}</code>
          </template>

          <template #item.bank="{ item }">
            {{ item.bank || '-' }}
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <VBtn
                icon="mdi-eye"
                size="x-small"
                variant="text"
                color="info"
                @click="openDetailDialog(item._id)"
              />
            </div>
          </template>
        </VDataTable>

        <!-- Pagination -->
        <div class="d-flex justify-center mt-4">
          <VPagination
            v-model="pagination.page"
            :length="pagination.pages"
            @update:model-value="onPageChange"
          />
        </div>
      </VCardText>
    </VCard>

    <!-- Detay Dialog -->
    <VDialog v-model="detailDialog" max-width="700">
      <VCard v-if="selectedTransaction">
        <VCardTitle class="d-flex align-center justify-space-between">
          İşlem Detayı
          <VChip :color="statusColors[selectedTransaction.status]" size="small">
            {{ statusLabels[selectedTransaction.status] }}
          </VChip>
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <p><strong>Referans ID:</strong></p>
              <code>{{ selectedTransaction.referenceId }}</code>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>EchoPayz TX ID:</strong></p>
              <code>{{ selectedTransaction.echopayzTransactionId || '-' }}</code>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Tutar:</strong></p>
              <span class="text-h6">{{ formatAmount(selectedTransaction.amount) }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Kullanıcı:</strong></p>
              <span v-if="selectedTransaction.user">
                {{ selectedTransaction.user.username || selectedTransaction.user.name }}
                <br>
                <small>{{ selectedTransaction.user.local?.email }}</small>
              </span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Banka:</strong></p>
              <span>{{ selectedTransaction.bank || '-' }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>IBAN:</strong></p>
              <code>{{ selectedTransaction.iban || '-' }}</code>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Hesap Sahibi:</strong></p>
              <span>{{ selectedTransaction.holderName || '-' }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Müşteri IP:</strong></p>
              <code>{{ selectedTransaction.customerIp || '-' }}</code>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Oluşturulma:</strong></p>
              <span>{{ formatDate(selectedTransaction.createdAt) }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Onay/Red Tarihi:</strong></p>
              <span>{{ formatDate(selectedTransaction.approvedAt || selectedTransaction.rejectedAt) }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Eski Bakiye:</strong></p>
              <span>{{ formatAmount(selectedTransaction.oldBalance) }}</span>
            </VCol>
            <VCol cols="12" md="6">
              <p><strong>Yeni Bakiye:</strong></p>
              <span>{{ formatAmount(selectedTransaction.newBalance) }}</span>
            </VCol>
            <VCol v-if="selectedTransaction.rejectionReason" cols="12">
              <p><strong>Red Nedeni:</strong></p>
              <VAlert type="error" density="compact">{{ selectedTransaction.rejectionReason }}</VAlert>
            </VCol>
            <VCol v-if="selectedTransaction.paymentUrl" cols="12">
              <p><strong>Ödeme URL:</strong></p>
              <a :href="selectedTransaction.paymentUrl" target="_blank">{{ selectedTransaction.paymentUrl }}</a>
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn color="grey" @click="detailDialog = false">Kapat</VBtn>
          <VBtn
            v-if="selectedTransaction.status === 'pending'"
            color="success"
            @click="approveTransaction(selectedTransaction._id); detailDialog = false"
          >
            Onayla
          </VBtn>
          <VBtn
            v-if="selectedTransaction.status === 'pending'"
            color="error"
            @click="rejectTransaction(selectedTransaction._id); detailDialog = false"
          >
            Reddet
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
