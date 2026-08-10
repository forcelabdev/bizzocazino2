<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const isDrawerOpen = ref(false)
const leaderboards = ref([])
const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const leaderboardToEdit = ref({
  duration: '',
  type: '',
  state: '',
  winners: [],
})

const fetchLeaderboards = async () => {
  try {
    const res = await axios.get('/admin/leaderboards')

    leaderboards.value = res.data.data || []
  } catch (err) {
    console.error('Veri alınamadı:', err)
  }
}

const openDrawer = (item = null) => {
  leaderboardToEdit.value = item
    ? { ...item, winners: item.winners || [] }
    : { duration: '', type: '', state: '', winners: [] }
  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const addWinner = () => {
  leaderboardToEdit.value.winners.push({ prize: 0 })
}

const removeWinner = index => {
  leaderboardToEdit.value.winners.splice(index, 1)
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    try {
      if (leaderboardToEdit.value._id) {
        await axios.put(`/admin/leaderboards/${leaderboardToEdit.value._id}`, leaderboardToEdit.value)
      } else {
        await axios.post('/admin/leaderboards', leaderboardToEdit.value)
      }
      closeDrawer()
      fetchLeaderboards()
    } catch (err) {
      console.error('Kayıt hatası:', err)
    }
  })
}

const deleteLeaderboard = async id => {
  if (!id) return console.error('Silme hatası: id undefined')
  try {
    await axios.delete(`/admin/leaderboards/${id}`)
    fetchLeaderboards()
  } catch (err) {
    console.error('Silme hatası:', err)
  }
}

const filteredLeaderboards = computed(() => {
  return leaderboards.value.filter(b =>
    !searchQuery.value || b.type.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(fetchLeaderboards)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('leaderboardManagement') }}</span>
        <VBtn
          color="primary"
          @click="() => openDrawer()"
        >
          {{ t('addNew') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField
          v-model="searchQuery"
          :label="t('searchType')"
          clearable
        />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredLeaderboards"
        :headers="[
          { title: t('type'), key: 'type' },
          { title: t('state'), key: 'state' },
          { title: t('durationDays'), key: 'duration' },
          { title: t('winnersCount'), key: 'winners.length' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteLeaderboard(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <VNavigationDrawer
      v-model="isDrawerOpen"
      temporary
      location="end"
      width="420"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        :title="t('addEditLeaderboard')"
        @cancel="closeDrawer"
      />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm
              ref="refForm"
              v-model="formValid"
              @submit.prevent="onSubmit"
            >
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="leaderboardToEdit.duration"
                    :label="t('durationDays')"
                    type="number"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppSelect
                    v-model="leaderboardToEdit.type"
                    :label="t('type')"
                    :rules="[requiredValidator]"
                    :items="['wager', 'deposit']"
                  />
                </VCol>
                <VCol cols="12">
                  <AppSelect
                    v-model="leaderboardToEdit.state"
                    :label="t('state')"
                    :rules="[requiredValidator]"
                    :items="['running', 'completed']"
                  />
                </VCol>
                <VCol cols="12">
                  <VLabel class="text-subtitle-2">
                    {{ t('winners') }}
                  </VLabel>
                  <div
                    v-for="(winner, index) in leaderboardToEdit.winners"
                    :key="index"
                    class="d-flex align-center mb-2 gap-2"
                  >
                    <AppTextField
                      v-model="winner.prize"
                      :label="t('prize')"
                      type="number"
                      hide-details
                    />
                    <VBtn
                      icon
                      color="error"
                      variant="text"
                      @click="removeWinner(index)"
                    >
                      <VIcon icon="tabler-x" />
                    </VBtn>
                  </div>
                  <VBtn
                    size="small"
                    variant="tonal"
                    @click="addWinner"
                  >
                    {{ t('addPrize') }}
                  </VBtn>
                </VCol>
                <VCol
                  cols="12"
                  class="d-flex justify-end gap-3"
                >
                  <VBtn type="submit">
                    {{ t('save') }}
                  </VBtn>
                  <VBtn
                    variant="tonal"
                    color="secondary"
                    @click="closeDrawer"
                  >
                    {{ t('cancel') }}
                  </VBtn>
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </PerfectScrollbar>
    </VNavigationDrawer>
  </section>
</template>

<style scoped>
.scrollable-content {
  max-block-size: 100vh;
}
</style>
