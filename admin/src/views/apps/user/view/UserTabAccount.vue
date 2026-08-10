<script setup>
import { useUserListStore } from '@/views/apps/user/useUserListStore'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UserInvoiceTable from './UserInvoiceTable.vue'

const { t } = useI18n()

const props = defineProps({
  selectedUserId: {
    type: String,
    required: true,
  },
})

const userStore = useUserListStore()

const transactions = ref([])
const total = ref(0)
const search = ref('')
const loading = ref(false)

const options = ref({
  itemsPerPage: 10,
  page: 1,
})

// headers çok dillidir
const headers = computed(() => [
  { title: t('transactions.amount'), key: 'amount' },
  { title: t('transactions.type'), key: 'type' },
  { title: t('transactions.state'), key: 'state' },
  { title: t('transactions.date'), key: 'createdAt' },
])

const fetchTransactions = async () => {
  if (!props.selectedUserId) return

  loading.value = true
  try {
    const res = await userStore.fetchUserBalanceTransactions(props.selectedUserId, {
      page: options.value.page,
      limit: options.value.itemsPerPage,
    })

    transactions.value = res.transactions
    total.value = res.total
  } catch (err) {
    console.error('❌ Balance transactions fetch error:', err)
  } finally {
    loading.value = false
  }
}

// User ID veya pagination değiştiğinde tekrar çek
watch([() => props.selectedUserId, options], fetchTransactions, { immediate: true })
</script>

<template>
  <VRow>
    

    <!-- UserInvoiceTable -->
    <VCol cols="12">
      <UserInvoiceTable :user-id="selectedUserId" />
    </VCol>
  </VRow>
</template>
