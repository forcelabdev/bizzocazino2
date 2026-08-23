<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const events = ref([])
const searchQuery = ref('')
const isDrawerOpen = ref(false)
const formValid = ref(false)
const refForm = ref()
const saveError = ref('')

const emptyEvent = () => ({
  name: '',
  isActive: true,
  startsAt: '',
  expiresAt: '',
  amountPerTicket: 1000,
  wageringRequirement: 0,
  maxTicketsPerUser: 0,
  eligibleAffiliateCodes: [],
  note: '',
})
const eventToEdit = ref(emptyEvent())

const dateRangeValidator = () => {
  const { startsAt, expiresAt } = eventToEdit.value
  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) return 'Bitiş tarihi başlangıçtan sonra olmalıdır.'
  return true
}
const positiveAmountValidator = value => Number(value) > 0 || 'Tutar sıfırdan büyük olmalıdır.'
const nonNegativeValidator = value => (value === '' || value === null || Number(value) >= 0) || 'Negatif değer girilemez.'

const fetchData = async () => {
  try {
    const res = await axios.get('/admin/ticket-events')

    events.value = res.data.data || []
  } catch (err) { console.error('Bilet etkinlikleri alınamadı:', err) }
}
const localDate = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const openDrawer = (item = null) => {
  saveError.value = ''
  eventToEdit.value = item
    ? { ...emptyEvent(), ...item, startsAt: localDate(item.startsAt), expiresAt: localDate(item.expiresAt), eligibleAffiliateCodes: [...(item.eligibleAffiliateCodes || [])] }
    : emptyEvent()
  isDrawerOpen.value = true
}
const closeDrawer = () => { isDrawerOpen.value = false; saveError.value = ''; nextTick(() => { refForm.value?.reset(); refForm.value?.resetValidation() }) }
const onSubmit = () => refForm.value?.validate().then(async ({ valid }) => {
  if (!valid) return
  saveError.value = ''
  try {
    const item = eventToEdit.value
    if (item._id) await axios.put(`/admin/ticket-events/${item._id}`, item)
    else await axios.post('/admin/ticket-events', item)
    closeDrawer(); await fetchData()
  } catch (err) {
    console.error('Kayıt hatası:', err)
    saveError.value = err?.response?.data?.message || 'Bilet etkinliği kaydedilemedi.'
  }
})
const deleteEvent = async id => {
  if (!id) return
  await axios.delete(`/admin/ticket-events/${id}`)
  await fetchData()
}
const filteredEvents = computed(() => events.value.filter(e => !searchQuery.value || e.name.toLowerCase().includes(searchQuery.value.toLowerCase())))

// ------- Bilet listesi drawer'ı -------
const isTicketsDrawerOpen = ref(false)
const activeEvent = ref(null)
const eventTickets = ref([])
const ticketStatusFilter = ref('')
const ticketsLoading = ref(false)

const fetchTickets = async () => {
  if (!activeEvent.value?._id) return
  ticketsLoading.value = true
  try {
    const res = await axios.get(`/admin/ticket-events/${activeEvent.value._id}/tickets`, { params: { status: ticketStatusFilter.value || undefined } })

    eventTickets.value = res.data.data || []
  } catch (err) { console.error('Biletler alınamadı:', err) } finally { ticketsLoading.value = false }
}
const openTicketsDrawer = event => { activeEvent.value = event; ticketStatusFilter.value = ''; isTicketsDrawerOpen.value = true; fetchTickets() }
watch(ticketStatusFilter, fetchTickets)

const ticketStatusLabel = status => ({ pending: 'Bekliyor (Çevrim)', approved: 'Onaylı', cancelled: 'İptal' }[status] || status)
const ticketStatusColor = status => ({ pending: 'warning', approved: 'success', cancelled: 'secondary' }[status] || 'secondary')

// ------- Manuel bilet ekleme -------
const isManualDialogOpen = ref(false)
const manualForm = ref({ userId: null, quantity: 1 })
const manualUserQuery = ref('')
const manualUserOptions = ref([])
const manualUserLoading = ref(false)
const manualError = ref('')
const manualSubmitting = ref(false)

let manualSearchTimeout = null
watch(manualUserQuery, value => {
  clearTimeout(manualSearchTimeout)
  if (!value || value.length < 2) { manualUserOptions.value = []; return }
  manualSearchTimeout = setTimeout(async () => {
    manualUserLoading.value = true
    try {
      const res = await axios.get('/admin/ticket-events/user-search', { params: { q: value } })

      manualUserOptions.value = res.data.data || []
    } catch (err) { console.error('Kullanıcı araması başarısız:', err) } finally { manualUserLoading.value = false }
  }, 350)
})

const openManualDialog = event => {
  activeEvent.value = event
  manualForm.value = { userId: null, quantity: 1 }
  manualUserQuery.value = ''
  manualUserOptions.value = []
  manualError.value = ''
  isManualDialogOpen.value = true
}
const submitManualTicket = async () => {
  if (!manualForm.value.userId) { manualError.value = 'Kullanıcı seçimi zorunludur.'; return }
  manualSubmitting.value = true
  manualError.value = ''
  try {
    await axios.post(`/admin/ticket-events/${activeEvent.value._id}/manual-ticket`, manualForm.value)
    isManualDialogOpen.value = false
    await fetchData()
  } catch (err) {
    manualError.value = err?.response?.data?.message || 'Manuel bilet eklenemedi.'
  } finally { manualSubmitting.value = false }
}

onMounted(fetchData)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('platform.ticketEvents') }}</span>
        <VBtn color="primary" @click="openDrawer()">Yeni Bilet Etkinliği</VBtn>
      </VCardTitle>
      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Üyelerin yaptıkları yatırıma karşılık çekiliş bileti kazandığı etkinlikleri yönetin. Bilet başına gereken yatırım tutarını ve isteğe bağlı çevrim şartını burada tanımlayabilirsiniz.
        </p>
        <AppTextField v-model="searchQuery" label="Etkinlik ara" clearable />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredEvents"
        :headers="[
          { title: 'Etkinlik', key: 'name' },
          { title: 'Bilet / Tutar', key: 'amountPerTicket' },
          { title: 'Çevrim Şartı', key: 'wageringRequirement' },
          { title: 'Durum', key: 'isActive' },
          { title: 'Onaylı / Bekleyen', key: 'stats' },
          { title: 'İşlemler', key: 'actions', sortable: false },
        ]"
      >
        <template #item.amountPerTicket="{ item }">1 bilet = {{ item.raw.amountPerTicket }} ₺ yatırım</template>
        <template #item.wageringRequirement="{ item }">
          <span v-if="item.raw.wageringRequirement > 0">{{ item.raw.wageringRequirement }} ₺ çevrim</span>
          <span v-else class="text-medium-emphasis">Şart yok</span>
        </template>
        <template #item.isActive="{ item }">
          <VChip :color="item.raw.isActive ? 'success' : 'secondary'" size="small">{{ item.raw.isActive ? 'Aktif' : 'Pasif' }}</VChip>
        </template>
        <template #item.stats="{ item }">
          <VChip color="success" size="small" class="mr-1">{{ item.raw.stats?.approved || 0 }} onaylı</VChip>
          <VChip color="warning" size="small">{{ item.raw.stats?.pending || 0 }} bekliyor</VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="openTicketsDrawer(item.raw)"><VIcon icon="tabler-list" /></IconBtn>
          <IconBtn @click="openManualDialog(item.raw)"><VIcon icon="tabler-user-plus" /></IconBtn>
          <IconBtn @click="openDrawer(item.raw)"><VIcon icon="tabler-edit" /></IconBtn>
          <IconBtn @click="deleteEvent(item.raw._id)"><VIcon icon="tabler-trash" /></IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Etkinlik ekle/düzenle -->
    <VNavigationDrawer v-model="isDrawerOpen" temporary location="end" width="620" class="scrollable-content">
      <AppDrawerHeaderSection title="Bilet Etkinliği Ekle / Düzenle" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12"><AppTextField v-model="eventToEdit.name" label="Etkinlik Adı" :rules="[requiredValidator]" /></VCol>
                <VCol cols="12" md="6"><VSwitch v-model="eventToEdit.isActive" label="Etkinlik aktif" color="primary" /></VCol>
                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="eventToEdit.amountPerTicket"
                    label="Bilet başına gereken yatırım (₺)"
                    type="number"
                    min="0"
                    :rules="[requiredValidator, positiveAmountValidator]"
                  />
                </VCol>
                <VCol cols="12" md="6"><AppTextField v-model="eventToEdit.startsAt" label="Başlangıç tarihi" type="datetime-local" /></VCol>
                <VCol cols="12" md="6"><AppTextField v-model="eventToEdit.expiresAt" label="Bitiş tarihi" type="datetime-local" :rules="[dateRangeValidator]" /></VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="eventToEdit.wageringRequirement"
                    label="Onay için gerekli çevrim (₺) — opsiyonel"
                    hint="0 girilirse bilet, yatırım onaylanır onaylanmaz kullanıcıya verilir ve doğrudan onaylı sayılır."
                    persistent-hint
                    type="number"
                    min="0"
                    :rules="[nonNegativeValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="eventToEdit.maxTicketsPerUser"
                    label="Kullanıcı başı maksimum bilet (0 = sınırsız)"
                    type="number"
                    min="0"
                    :rules="[nonNegativeValidator]"
                  />
                </VCol>
                <VCol cols="12"><AppTextField v-model="eventToEdit.note" label="Not (opsiyonel)" /></VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">{{ t('save') }}</VBtn>
                  <VBtn variant="tonal" color="secondary" @click="closeDrawer">{{ t('cancel') }}</VBtn>
                </VCol>
                <VCol v-if="saveError" cols="12"><VAlert type="error" variant="tonal">{{ saveError }}</VAlert></VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VNavigationDrawer>

    <!-- Bilet listesi -->
    <VNavigationDrawer v-model="isTicketsDrawerOpen" temporary location="end" width="700" class="scrollable-content">
      <AppDrawerHeaderSection :title="`${activeEvent?.name || ''} — Biletler`" @cancel="isTicketsDrawerOpen = false" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VSelect
              v-model="ticketStatusFilter"
              :items="[{ title: 'Tümü', value: '' }, { title: 'Bekliyor', value: 'pending' }, { title: 'Onaylı', value: 'approved' }, { title: 'İptal', value: 'cancelled' }]"
              label="Durum filtrele"
              class="mb-4"
            />
            <VDataTable
              :items="eventTickets"
              :loading="ticketsLoading"
              :headers="[
                { title: 'Kullanıcı', key: 'user' },
                { title: 'Adet', key: 'quantity' },
                { title: 'Kaynak', key: 'source' },
                { title: 'Durum', key: 'status' },
                { title: 'Tarih', key: 'createdAt' },
              ]"
            >
              <template #item.user="{ item }">{{ item.raw.user?.username || '—' }}</template>
              <template #item.source="{ item }">{{ item.raw.source === 'manual' ? 'Manuel' : 'Yatırım' }}</template>
              <template #item.status="{ item }">
                <VChip :color="ticketStatusColor(item.raw.status)" size="small">{{ ticketStatusLabel(item.raw.status) }}</VChip>
              </template>
              <template #item.createdAt="{ item }">{{ new Date(item.raw.createdAt).toLocaleString('tr-TR') }}</template>
            </VDataTable>
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VNavigationDrawer>

    <!-- Manuel bilet ekle -->
    <VDialog v-model="isManualDialogOpen" max-width="480">
      <VCard>
        <VCardTitle>Manuel Bilet Ekle — {{ activeEvent?.name }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Manuel eklenen biletler çevrim şartına bakılmaksızın anında onaylı olarak eklenir.
          </p>
          <VAutocomplete
            v-model="manualForm.userId"
            v-model:search="manualUserQuery"
            :items="manualUserOptions"
            :loading="manualUserLoading"
            item-title="username"
            item-value="_id"
            label="Kullanıcı ara (kullanıcı adı / e-posta)"
            no-filter
            clearable
            class="mb-4"
          >
            <template #item="{ props, item }">
              <VListItem v-bind="props" :title="item.raw.username" :subtitle="item.raw.email" />
            </template>
          </VAutocomplete>
          <AppTextField v-model="manualForm.quantity" label="Bilet adedi" type="number" min="1" />
          <VAlert v-if="manualError" type="error" variant="tonal" class="mt-4">{{ manualError }}</VAlert>
        </VCardText>
        <VCardText class="d-flex justify-end gap-3">
          <VBtn variant="tonal" color="secondary" @click="isManualDialogOpen = false">{{ t('cancel') }}</VBtn>
          <VBtn color="primary" :loading="manualSubmitting" @click="submitManualTicket">Ekle</VBtn>
        </VCardText>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.scrollable-content { max-block-size: 100vh; }
</style>
