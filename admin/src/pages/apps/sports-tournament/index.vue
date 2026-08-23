<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

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
  description: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
  minOdds: 1.5,
  minBetAmount: 0,
  prizes: [{ rank: 1, amount: 0 }],
  prizePoolDescription: '',
  autoDistribute: true,
  note: '',
})
const tournamentToEdit = ref(emptyTournament())

const dateRangeValidator = () => {
  const { startsAt, endsAt } = tournamentToEdit.value
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) return 'Bitiş tarihi başlangıçtan sonra olmalıdır.'
  return true
}
const minOddsValidator = value => Number(value) >= 1 || 'Minimum oran 1 veya üzeri olmalıdır.'
const minBetValidator = value => Number(value) >= 0 || 'Minimum bet tutarı sıfır veya üzeri olmalıdır.'

const fetchData = async () => {
  try {
    const res = await axios.get('/admin/sports-tournaments')

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

const onSubmit = () => refForm.value?.validate().then(async ({ valid }) => {
  if (!valid) return
  saveError.value = ''
  try {
    const item = tournamentToEdit.value

    if (item._id) await axios.put(`/admin/sports-tournaments/${item._id}`, item)
    else await axios.post('/admin/sports-tournaments', item)
    closeDrawer(); await fetchData()
  } catch (err) {
    console.error('Kayıt hatası:', err)
    saveError.value = err?.response?.data?.message || 'Turnuva kaydedilemedi.'
  }
})

const deleteTournament = async id => {
  if (!id) return
  await axios.delete(`/admin/sports-tournaments/${id}`)
  await fetchData()
}

const settlingId = ref(null)
const settleTournament = async id => {
  settlingId.value = id
  try {
    await axios.post(`/admin/sports-tournaments/${id}/settle`)
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
    const res = await axios.get(`/admin/sports-tournaments/${activeTournament.value._id}/leaderboard`)

    leaderboard.value = res.data.data || []
  } catch (err) { console.error('Sıralama alınamadı:', err) } finally { leaderboardLoading.value = false }
}
const openLeaderboardDrawer = tournamentItem => { activeTournament.value = tournamentItem; isLeaderboardDrawerOpen.value = true; fetchLeaderboard() }

onMounted(fetchData)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('platform.sportsTournaments') }}</span>
        <VBtn color="primary" @click="openDrawer()">Yeni Turnuva</VBtn>
      </VCardTitle>
      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Belirli bir tarih aralığında, tanımlı minimum oran ve minimum bet tutarı şartını karşılayan spor
          bahislerinin toplam tutarına göre sıralama oluşturan manuel turnuvaları yönetin. Sıralama canlı hesaplanır;
          turnuva süresi dolduğunda otomatik sonuçlandırılır ve ödüller — ayarlandıysa — bakiyeye eklenir.
        </p>
        <AppTextField v-model="searchQuery" label="Turnuva ara" clearable />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredTournaments"
        :headers="[
          { title: 'Turnuva', key: 'name' },
          { title: 'Min. Oran', key: 'minOdds' },
          { title: 'Min. Bet Tutarı', key: 'minBetAmount' },
          { title: 'Durum', key: 'state' },
          { title: 'İşlemler', key: 'actions', sortable: false },
        ]"
      >
        <template #item.minOdds="{ item }">{{ item.raw.minOdds }}x</template>
        <template #item.minBetAmount="{ item }">{{ item.raw.minBetAmount }} ₺</template>
        <template #item.state="{ item }">
          <VChip :color="STATE_COLORS[item.raw.state] || 'secondary'" size="small">{{ STATE_LABELS[item.raw.state] || item.raw.state }}</VChip>
          <VChip v-if="!item.raw.isActive" color="secondary" size="small" class="ml-1">Pasif</VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="openLeaderboardDrawer(item.raw)"><VIcon icon="tabler-trophy" /></IconBtn>
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
                <VCol cols="12"><AppTextField v-model="tournamentToEdit.description" label="Açıklama (opsiyonel)" /></VCol>
                <VCol cols="12" md="6"><VSwitch v-model="tournamentToEdit.isActive" label="Turnuva aktif" color="primary" /></VCol>
                <VCol cols="12" md="6"><VSwitch v-model="tournamentToEdit.autoDistribute" label="Ödülleri otomatik dağıt" color="primary" /></VCol>
                <VCol cols="12" md="6"><AppTextField v-model="tournamentToEdit.startsAt" label="Başlangıç tarihi" type="datetime-local" /></VCol>
                <VCol cols="12" md="6"><AppTextField v-model="tournamentToEdit.endsAt" label="Bitiş tarihi" type="datetime-local" :rules="[dateRangeValidator]" /></VCol>
                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="tournamentToEdit.minOdds"
                    label="Minimum Oran"
                    type="number"
                    min="1"
                    step="0.1"
                    hint="Bilet toplam oranı bu değerin üzerinde olmalıdır."
                    persistent-hint
                    :rules="[requiredValidator, minOddsValidator]"
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <AppTextField
                    v-model="tournamentToEdit.minBetAmount"
                    label="Minimum Bet Tutarı (₺)"
                    type="number"
                    min="0"
                    :rules="[requiredValidator, minBetValidator]"
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

                <VCol cols="12"><AppTextField v-model="tournamentToEdit.prizePoolDescription" label="Ödül havuzu açıklaması (opsiyonel)" /></VCol>
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
            <p class="text-body-2 text-medium-emphasis mb-4">
              Sıralama, turnuva şartlarını (min. oran / min. bet tutarı) karşılayan bahislerin toplam tutarına göre
              canlı hesaplanır. Turnuva sonuçlandırıldığında bu sıralama sabitlenir.
            </p>
            <VDataTable
              :items="leaderboard"
              :loading="leaderboardLoading"
              :headers="[
                { title: 'Sıra', key: 'rank' },
                { title: 'Katılımcı', key: 'name' },
                { title: 'Toplam Bahis', key: 'totalStake' },
                { title: 'Bilet Sayısı', key: 'betCount' },
                { title: 'Ödül', key: 'prizeAmount' },
              ]"
            >
              <template #item.rank="{ item }">{{ item.raw.rank }}</template>
              <template #item.name="{ item }">{{ item.raw.user?.username || '—' }}</template>
              <template #item.totalStake="{ item }">{{ Math.floor(item.raw.totalStake) }} ₺</template>
              <template #item.prizeAmount="{ item }">
                <span v-if="item.raw.prizeAmount > 0">{{ item.raw.prizeAmount }} ₺ <VIcon v-if="item.raw.prizeAwarded" icon="tabler-check" color="success" size="16" /></span>
                <span v-else class="text-medium-emphasis">—</span>
              </template>
            </VDataTable>
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VNavigationDrawer>
  </section>
</template>

<style scoped>
.scrollable-content { max-block-size: 100vh; }
</style>
