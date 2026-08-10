<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const missions = ref([])
const isDrawerOpen = ref(false)
const refForm = ref()
const searchQuery = ref('')

const missionToEdit = ref({
  seasonId: '',
  name: '',
  description: '',
  missionType: '',
  targetValue: 1,
  xpReward: 0,
  tokenReward: 0,
  resetInterval: '',
  isRepeatable: false,
  gameSpecific: '',
  startDate: '',
  endDate: '',
  image: null,
  imageUrl: '',
})

const missionTypes = ['DAILY', 'WEEKLY', 'SEASONAL', 'SPECIAL', 'GAME_SPECIFIC']

const fetchMissions = async () => {
  const res = await axios.get('/admin/mission')
  missions.value = res.data.data || []
}

const openDrawer = (mission = null) => {
  missionToEdit.value = mission
    ? {
        ...mission,
        imageUrl: mission.image || '',
        image: null,
        startDate: mission.startDate?.slice(0, 10),
        endDate: mission.endDate?.slice(0, 10),
      }
    : {
        seasonId: '',
        name: '',
        description: '',
        missionType: '',
        targetValue: 1,
        xpReward: 0,
        tokenReward: 0,
        resetInterval: '',
        isRepeatable: false,
        gameSpecific: '',
        startDate: '',
        endDate: '',
        image: null,
        imageUrl: '',
      }

  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = async () => {
  const { valid } = await refForm.value?.validate()
  if (!valid) return

  const fd = new FormData()
  for (const key in missionToEdit.value) {
    if (missionToEdit.value[key] && !(missionToEdit.value[key] instanceof File)) {
      fd.append(key, missionToEdit.value[key])
    }
  }
  if (missionToEdit.value.image instanceof File) {
    fd.append('image', missionToEdit.value.image)
  }

  try {
    if (missionToEdit.value._id) {
      await axios.put(`/admin/mission/${missionToEdit.value._id}`, fd)
    } else {
      await axios.post('/admin/mission', fd)
    }
    fetchMissions()
    closeDrawer()
  } catch (err) {
    console.error('❌ Save error:', err)
  }
}

const deleteMission = async id => {
  try {
    await axios.delete(`/admin/mission/${id}`)
    fetchMissions()
  } catch (err) {
    console.error('❌ Delete error:', err)
  }
}

const filteredMissions = computed(() =>
  missions.value.filter(m =>
    !searchQuery.value || m.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
)

onMounted(fetchMissions)
</script>

<template>
  <section>
    <!-- Üst Başlık -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('missionManagement') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('newMission') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField v-model="searchQuery" :label="t('searchMission')" clearable />
      </VCardText>
    </VCard>

    <!-- Tablo -->
    <VCard>
      <VDataTable
        :items="filteredMissions"
        :headers="[
          { title: t('image'), key: 'image' },
          { title: t('name'), key: 'name' },
          { title: t('type'), key: 'missionType' },
          { title: t('xpReward'), key: 'xpReward' },
          { title: t('tokenReward'), key: 'tokenReward' },
          { title: t('actions'), key: 'actions', sortable: false }
        ]"
      >
        <template #item.image="{ item }">
          <VImg
            v-if="item.raw.image"
            :src="item.raw.image.startsWith('/') ? `${BASE_URL}${item.raw.image}` : item.raw.image"
            max-width="80"
            max-height="40"
            cover
          />
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteMission(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer -->
    <VNavigationDrawer v-model="isDrawerOpen" temporary location="end" width="480">
      <AppDrawerHeaderSection :title="t('editMission')" @cancel="closeDrawer" />
      <VCard flat>
        <VCardText>
          <VForm ref="refForm" @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="missionToEdit.seasonId"
                  :label="t('seasonId')"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="missionToEdit.name"
                  :label="t('missionName')"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="missionToEdit.description"
                  :label="t('description')"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="12">
                <VSelect
                  v-model="missionToEdit.missionType"
                  :items="missionTypes"
                  :label="t('missionType')"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol v-if="missionToEdit.missionType === 'GAME_SPECIFIC'" cols="12">
                <AppTextField
                  v-model="missionToEdit.gameSpecific"
                  :label="t('gameId')"
                />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  v-model.number="missionToEdit.targetValue"
                  :label="t('targetValue')"
                  type="number"
                  :rules="[requiredValidator]"
                />
              </VCol>

              <VCol cols="6">
                <VCheckbox
                  v-model="missionToEdit.isRepeatable"
                  :label="t('isRepeatable')"
                />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  v-model.number="missionToEdit.xpReward"
                  :label="t('xpReward')"
                  type="number"
                />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  v-model.number="missionToEdit.tokenReward"
                  :label="t('tokenReward')"
                  type="number"
                />
              </VCol>

              <VCol v-if="['DAILY', 'WEEKLY'].includes(missionToEdit.missionType)" cols="12">
                <AppTextField
                  v-model="missionToEdit.resetInterval"
                  :label="t('resetInterval')"
                />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  v-model="missionToEdit.startDate"
                  :label="t('startDate')"
                  type="date"
                />
              </VCol>

              <VCol cols="6">
                <AppTextField
                  v-model="missionToEdit.endDate"
                  :label="t('endDate')"
                  type="date"
                />
              </VCol>

              <VCol cols="12">
                <VFileInput
                  :label="t('uploadImage')"
                  accept="image/*"
                  @change="e => missionToEdit.image = e.target.files[0]"
                />
              </VCol>

              <VCol cols="12" class="d-flex justify-end gap-3">
                <VBtn type="submit" color="primary">{{ t('save') }}</VBtn>
                <VBtn variant="tonal" color="secondary" @click="closeDrawer">
                  {{ t('cancel') }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VNavigationDrawer>
  </section>
</template>
