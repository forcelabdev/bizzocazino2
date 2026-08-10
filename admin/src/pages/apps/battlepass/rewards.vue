<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const isDrawerOpen = ref(false)
const rewards = ref([])

const rewardToEdit = ref({
  seasonId: '',
  level: 1,
  isPremium: false,
  rewardType: '',
  amount: 0,
  assetId: '',
  description: '',
  claimable: true,
  image: null,
  imageUrl: '',
})

const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const fetchRewards = async () => {
  const res = await axios.get('/admin/reward')
  rewards.value = res.data.data || []
}

const openDrawer = (reward = null) => {
  rewardToEdit.value = reward
    ? {
        ...reward,
        imageUrl: reward.image || '',
        image: null,
      }
    : {
        seasonId: '',
        level: 1,
        isPremium: false,
        rewardType: '',
        amount: 0,
        assetId: '',
        description: '',
        claimable: true,
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

  const formData = new FormData()
  for (const key in rewardToEdit.value) {
    if (rewardToEdit.value[key] !== null && !(rewardToEdit.value[key] instanceof File)) {
      formData.append(key, rewardToEdit.value[key])
    }
  }
  if (rewardToEdit.value.image instanceof File) {
    formData.append('image', rewardToEdit.value.image)
  }

  try {
    if (rewardToEdit.value._id) {
      await axios.put(`/admin/reward/${rewardToEdit.value._id}`, formData)
    } else {
      await axios.post('/admin/reward', formData)
    }
    closeDrawer()
    fetchRewards()
  } catch (err) {
    console.error('❌ Save error:', err)
  }
}

const deleteReward = async id => {
  try {
    await axios.delete(`/admin/reward/${id}`)
    fetchRewards()
  } catch (err) {
    console.error('❌ Delete error:', err)
  }
}

const filteredRewards = computed(() =>
  rewards.value.filter(r =>
    !searchQuery.value || r.description.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
)

onMounted(fetchRewards)
</script>

<template>
  <section>
    <!-- Üst Başlık -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('rewardManagement') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('newReward') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField v-model="searchQuery" :label="t('searchByDescription')" clearable />
      </VCardText>
    </VCard>

    <!-- Tablo -->
    <VCard>
      <VDataTable
        :items="filteredRewards"
        :headers="[
          { title: t('image'), key: 'image' },
          { title: t('season'), key: 'seasonId' },
          { title: t('level'), key: 'level' },
          { title: t('type'), key: 'rewardType' },
          { title: t('amount'), key: 'amount' },
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
          <IconBtn @click="() => deleteReward(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer -->
    <VNavigationDrawer v-model="isDrawerOpen" temporary location="end" width="480">
      <AppDrawerHeaderSection :title="t('editReward')" @cancel="closeDrawer" />
      <VCard flat>
        <VCardText>
          <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
            <VRow>
              <VCol cols="12">
                <AppTextField v-model="rewardToEdit.seasonId" :label="t('seasonId')" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="6">
                <AppTextField v-model.number="rewardToEdit.level" :label="t('level')" type="number" />
              </VCol>
              <VCol cols="6">
                <VCheckbox v-model="rewardToEdit.isPremium" :label="t('isPremium')" />
              </VCol>
              <VCol cols="12">
                <VSelect
                  v-model="rewardToEdit.rewardType"
                  :label="t('rewardType')"
                  :items="['TOKEN', 'FREE_SPINS', 'VIP_TICKET', 'NFT', 'BONUS']"
                  :rules="[requiredValidator]"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model.number="rewardToEdit.amount" :label="t('amount')" type="number" />
              </VCol>
              <VCol v-if="['VIP_TICKET', 'NFT'].includes(rewardToEdit.rewardType)" cols="12">
                <AppTextField v-model="rewardToEdit.assetId" :label="t('assetId')" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="rewardToEdit.description" :label="t('description')" :rules="[requiredValidator]" />
              </VCol>
              <VCol cols="12">
                <VCheckbox v-model="rewardToEdit.claimable" :label="t('isClaimable')" />
              </VCol>
              <VCol cols="12">
                <VFileInput :label="t('uploadImage')" accept="image/*" @change="e => rewardToEdit.image = e.target.files[0]" />
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
