<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const GAME_CATEGORY_OPTIONS = [
  { title: 'Tümü', value: 'all' },
  { title: 'Slotlar', value: 'slots' },
  { title: 'Canlı Casino', value: 'liveCasino' },
  { title: 'Spor Bahis', value: 'sportsBook' },
  { title: 'Orijinal Oyunlar', value: 'originals' },
]

const STATE_LABELS = { scheduled: 'Planlandı', running: 'Devam Ediyor', completed: 'Tamamlandı', canceled: 'İptal' }
const STATE_COLORS = { scheduled: 'info', running: 'success', completed: 'secondary', canceled: 'error' }

const tournaments = ref([])
const searchQuery = ref('')
const isDrawerOpen = ref(false)
const formValid = ref(false)
const refForm = ref()
const saveError = ref('')

const emptyTournament = () => ({
  name: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
  providers: ['all'],
  gameCategory: 'all',
  pointsPerWager: 1,
  prizes: [{ rank: 1, amount: 0 }],
  autoDistribute: true,
  note: '',
})
const tournamentToEdit = ref(emptyTournament())

const dateRangeValidator = () => {
  const { startsAt, endsAt } = tournamentToEdit.value
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) return 'Bitiş tarihi başlangıçtan sonra olmalıdır.'
  return true
}
const positivePointsValidator = value => Number(value) > 0 || 'Puan sıfırdan büyük olmalıdır.'

const fetchData = async () => {
  try {
    const res = await axios.get('/admin/race-tournaments')

    tournaments.value = res.data.data || []
  } catch (err) { console.error('Turnuvalar alınamadı:', err) }
}

const localDate = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''

const openDrawer = (item = null) => {
  saveError.value = ''
  tournamentToEdit.value = item
    ? {
        ...emptyTournament(),
        ...item,
        startsAt: localDate(item.startsAt),
        endsAt: localDate(item.endsAt),
        providers: item.providers?.length ? [...item.providers] : ['all'],
        prizes: item.prizes?.length ? item.prizes.map(p => ({ ...p })) : [{ rank: 1, amount: 0 }],
      }
    : emptyTournament()
  isDrawerOpen.value = true
}
const closeDrawer = () => { isDrawerOpen.value = false; saveError.value = ''; nextTick(() => { refForm.value?.reset(); refForm.value?.resetValidation() }) }

const addPrizeRow = () => {
  const nextRank = (tournamentToEdit.value.prizes.reduce((max, p) => Math.max(max, Number(p.rank) || 0), 0)) + 1

  tournamentToEdit.value.prizes.push({ rank: nextRank, amount: 0 })
}
const removePrizeRow = index => tournamentToEdit.value.prizes.splice(index, 1)

const providersText = computed({
  get: () => (tournamentToEdit.value.providers || []).join(', '),
  set: value => {
    tournamentToEdit.value.providers = value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
  },
})

const onSubmit = () => refForm.value?.validate().then(async ({ valid }) => {
  if (!valid) return
  saveError.value = ''
  try {
    const item = tournamentToEdit.value

    if (!item.providers?.length) item.providers = ['all']
    if (item._id) await axios.put(`/admin/race-tournaments/${item._id}`, item)
    else await axios.post('/admin/race-tournaments', item)
    closeDrawer(); await fetchData()
  } catch (err) {
    console.error('Kayıt hatası:', err)
    saveError.value = err?.response?.data?.message || 'Turnuva kaydedilemedi.'
  }
})

const deleteTournament = async id => {
  if (!id) return
  await axios.delete(`/admin/race-tournaments/${id}`)
  await fetchData()
}

const settlingId = ref(null)
const settleTournament = async id => {
  settlingId.value = id
  try {
    await axios.post(`/admin/race-tournaments/${id}/settle`)
    await fetchData()
  } catch (err) {
    console.error('Sonuçlandırma hatası:', err)
  } finally { settlingId.value = null }
}

const filteredTournaments = computed(() => tournaments.value.filter(tItem => !searchQuery.value || tItem.name.toLowerCase().includes(searchQuery.value.toLowerCase())))

// ------- Sıralama (leaderboard) drawer'ı -------
const isLeaderboardDrawerOpen = ref(false)
const activeTournament = ref(null)
const leaderboard = ref([])
const leaderboardLoading = ref(false)

const fetchLeaderboard = async () => {
  if (!activeTournament.value?._id) return
  leaderboardLoading.value = true
  try {
    const res = await axios.get(`/admin/race-tournaments/${activeTournament.value._id}/leaderboard`)

    leaderboard.value = res.data.data || []
  } catch (err) { console.error('Sıralama alınamadı:', err) } finally { leaderboardLoading.value = false }
}
const openLeaderboardDrawer = tournamentItem => { activeTournament.value = tournamentItem; isLeaderboardDrawerOpen.value = true; fetchLeaderboard() }

const deleteEntry = async entryId => {
  if (!activeTournament.value?._id) return
  await axios.delete(`/admin/race-tournaments/${activeTournament.value._id}/entries/${entryId}`)
  await fetchLeaderboard()
  await fetchData()
}

// ------- Manuel / sanal katılımcı ekleme -------
const isManualDialogOpen = ref(false)
const manualForm = ref({ userId: null, displayName: '', startingPoints: 0, manualGrowthRate: 0 })
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
      const res = await axios.get('/admin/race-tournaments/user-search', { params: { q: value } })

      manualUserOptions.value = res.data.data || []
    } catch (err) { console.error('Kullanıcı araması başarısız:', err) } finally { manualUserLoading.value = false }
  }, 350)
})

const openManualDialog = tournamentItem => {
  activeTournament.value = tournamentItem
  manualForm.value = { userId: null, displayName: '', startingPoints: 0, manualGrowthRate: 0 }
  manualUserQuery.value = ''
  manualUserOptions.value = []
  manualError.value = ''
  isManualDialogOpen.value = true
}
const submitManualEntry = async () => {
  if (!manualForm.value.userId && !manualForm.value.displayName.trim()) {
    manualError.value = 'Gerçek kullanıcı seçin veya bir görünen ad girin.'
    return
  }
  manualSubmitting.value = true
  manualError.value = ''
  try {
    await axios.post(`/admin/race-tournaments/${activeTournament.value._id}/manual-entry`, manualForm.value)
    isManualDialogOpen.value = false
    await fetchData()
  } catch (err) {
    manualError.value = err?.response?.data?.message || 'Katılımcı eklenemedi.'
  } finally { manualSubmitting.value = false }
}

onMounted(fetchData)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('platform.raceTournaments') }}</span>
        <VBtn color="primary" @click="openDrawer()">Yeni Turnuva</VBtn>
      </VCardTitle>
      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Belirli bir süre içinde en çok çevrim (bahis) yapan üyelere ödül dağıtan turnuvaları yönetin. Turnuva
          süresi dolduğunda otomatik olarak sonuçlandırılır ve ödüller — ayarlandıysa — bakiyeye otomatik eklenir.
        </p>
        <AppTextField v-model="searchQuery" label="Turnuva ara" clearable />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredTournaments"
        :headers="[
          { title: 'Turnuva', key: 'name' },
          { title: 'Kapsam', key: 'scope' },
          { title: 'Puan / Çevrim', key: 'pointsPerWager' },
          { title: 'Durum', key: 'state' },
          { title: 'Katılımcı', key: 'entryCount' },
          { title: 'İşlemler', key: 'actions', sortable: false },
        ]"
      >
        <template #item.scope="{ item }">
          <div class="text-body-2">
            {{ item.raw.gameCategory === 'all' ? 'Tüm kategoriler' : GAME_CATEGORY_OPTIONS.find(o => o.value === item.raw.gameCategory)?.title }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ item.raw.providers?.includes('all') ? 'Tüm sağlayıcılar' : item.raw.providers?.join(', ') }}
          </div>
        </template>
        <template #item.pointsPerWager="{ item }">1 ₺ = {{ item.raw.pointsPerWager }} puan</template>
        <template #item.state="{ item }">
          <VChip :color="STATE_COLORS[item.raw.state] || 'secondary'" size="small">{{ STATE_LABELS[item.raw.state] || item.raw.state }}</VChip>
          <VChip v-if="!item.raw.isActive" color="secondary" size="small" class="ml-1">Pasif</VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="openLeaderboardDrawer(item.raw)"><VIcon icon="tabler-trophy" /></IconBtn>
          <IconBtn @click="openManualDialog(item.raw)"><VIcon icon="tabler-user-plus" /></IconBtn>
          <IconBtn @click="openDrawer(item.raw)"><VIcon icon="tabler-edit" /></IconBtn>
          <IconBtn
            v-if="item.raw.state !== 'completed'"
            :loading="settlingId === item.raw._id"
            @click="settleTournament(item.raw._id)"
          >
            <VIcon icon="tabler-flag-2" />
          </IconBtn>
          <IconBtn @click="deleteTournament(item.raw._id)"><VIcon icon="tabler-trash" /></IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Turnuva ekle/düzenle -->
    <VNavigationDrawer v-model="isDrawerOpen" temporary location="end" width="640" class="scrollable-content">
      <AppDrawerHeaderSection title="Turnuva Ekle / Düzenle" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12"><AppTextField v-model="tournamentToEdit.name" label="Turnuva Adı" :rules="[requiredValidator]" /></VCol>
                <VCol cols="12" md="6"><VSwitch v-model="tournamentToEdit.isActive" label="Turnuva aktif" color="primary" /></VCol>
                <VCol cols="12" md="6"><VSwitch v-model="tournamentToEdit.autoDistribute" label="Ödülleri otomatik dağıt" color="primary" /></VCol>
                <VCol cols="12" md="6"><AppTextField v-model="tournamentToEdit.startsAt" label="Başlangıç tarihi" type="datetime-local" /></VCol>
                <VCol cols="12" md="6"><AppTextField v-model="tournamentToEdit.endsAt" label="Bitiş tarihi" type="datetime-local" :rules="[dateRangeValidator]" /></VCol>
                <VCol cols="12" md="6">
                  <VSelect v-model="tournamentToEdit.gameCategory" :items="GAME_CATEGORY_OPTIONS" label="Oyun kategorisi kapsamı" />
                </VCol>
                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="tournamentToEdit.pointsPerWager"
                    label="1 ₺ çevrime karşılık puan"
                    type="number"
                    min="0.0001"
                    step="0.01"
                    :rules="[requiredValidator, positivePointsValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="providersText"
                    label="Sağlayıcı kodları (virgülle ayır, boş = tümü)"
                    hint="Örn: pragmatic, evolution — boş bırakılırsa tüm sağlayıcıların çevrimleri sayılır."
                    persistent-hint
                  />
                </VCol>

                <VCol cols="12">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-subtitle-2">Ödül Sıralaması</span>
                    <VBtn size="small" variant="tonal" @click="addPrizeRow">Sıra Ekle</VBtn>
                  </div>
                  <VRow v-for="(prize, index) in tournamentToEdit.prizes" :key="index" class="mb-1">
                    <VCol cols="4">
                      <AppTextField v-model="prize.rank" label="Sıra" type="number" min="1" density="compact" />
                    </VCol>
                    <VCol cols="6">
                      <AppTextField v-model="prize.amount" label="Ödül (₺)" type="number" min="0" density="compact" />
                    </VCol>
                    <VCol cols="2" class="d-flex align-center">
                      <IconBtn @click="removePrizeRow(index)"><VIcon icon="tabler-trash" /></IconBtn>
                    </VCol>
                  </VRow>
                </VCol>

                <VCol cols="12"><AppTextField v-model="tournamentToEdit.note" label="Not (opsiyonel)" /></VCol>
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

    <!-- Sıralama (leaderboard) -->
    <VNavigationDrawer v-model="isLeaderboardDrawerOpen" temporary location="end" width="700" class="scrollable-content">
      <AppDrawerHeaderSection :title="`${activeTournament?.name || ''} — Sıralama`" @cancel="isLeaderboardDrawerOpen = false" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VDataTable
              :items="leaderboard"
              :loading="leaderboardLoading"
              :headers="[
                { title: 'Sıra', key: 'rank' },
                { title: 'Katılımcı', key: 'name' },
                { title: 'Puan', key: 'points' },
                { title: 'Ödül', key: 'prizeAmount' },
                { title: 'İşlemler', key: 'actions', sortable: false },
              ]"
            >
              <template #item.rank="{ index }">{{ index + 1 }}</template>
              <template #item.name="{ item }">
                {{ item.raw.user?.username || item.raw.displayName || '—' }}
                <VChip v-if="item.raw.isManual" size="x-small" color="secondary" class="ml-1">Manuel</VChip>
              </template>
              <template #item.points="{ item }">{{ Math.floor(item.raw.points) }}</template>
              <template #item.prizeAmount="{ item }">
                <span v-if="item.raw.prizeAmount > 0">{{ item.raw.prizeAmount }} ₺ <VIcon v-if="item.raw.prizeAwarded" icon="tabler-check" color="success" size="16" /></span>
                <span v-else class="text-medium-emphasis">—</span>
              </template>
              <template #item.actions="{ item }">
                <IconBtn @click="deleteEntry(item.raw._id)"><VIcon icon="tabler-trash" /></IconBtn>
              </template>
            </VDataTable>
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VNavigationDrawer>

    <!-- Manuel / sanal katılımcı ekle -->
    <VDialog v-model="isManualDialogOpen" max-width="480">
      <VCard>
        <VCardTitle>Katılımcı Ekle — {{ activeTournament?.name }}</VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Gerçek bir üye seçebilir veya sadece görünen ad girerek sanal bir katılımcı ekleyebilirsiniz. Sanal
            katılımcının puanı, dakika başı büyüme oranına göre otomatik olarak artar.
          </p>
          <VAutocomplete
            v-model="manualForm.userId"
            v-model:search="manualUserQuery"
            :items="manualUserOptions"
            :loading="manualUserLoading"
            item-title="username"
            item-value="_id"
            label="Gerçek kullanıcı ara (opsiyonel)"
            no-filter
            clearable
            class="mb-4"
          >
            <template #item="{ props, item }">
              <VListItem v-bind="props" :title="item.raw.username" :subtitle="item.raw.email" />
            </template>
          </VAutocomplete>
          <AppTextField
            v-model="manualForm.displayName"
            label="Görünen ad (kullanıcı seçilmediyse zorunlu)"
            class="mb-4"
          />
          <AppTextField v-model="manualForm.startingPoints" label="Başlangıç puanı" type="number" min="0" class="mb-4" />
          <AppTextField
            v-model="manualForm.manualGrowthRate"
            label="Dakikada otomatik artış (puan)"
            type="number"
            min="0"
          />
          <VAlert v-if="manualError" type="error" variant="tonal" class="mt-4">{{ manualError }}</VAlert>
        </VCardText>
        <VCardText class="d-flex justify-end gap-3">
          <VBtn variant="tonal" color="secondary" @click="isManualDialogOpen = false">{{ t('cancel') }}</VBtn>
          <VBtn color="primary" :loading="manualSubmitting" @click="submitManualEntry">Ekle</VBtn>
        </VCardText>
      </VCard>
    </VDialog>
  </section>
</template>

<style scoped>
.scrollable-content { max-block-size: 100vh; }
</style>
