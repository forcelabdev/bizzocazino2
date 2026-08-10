<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const isDrawerOpen = ref(false)
const promocodes = ref([])
const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const promoToEdit = ref({
  code: '',
  reward: 0,
  levelMin: 0,
  redeemptionsMax: 0,
})

const fetchPromocodes = async () => {
  try {
    const res = await axios.get('/admin/promocodes')
    promocodes.value = res.data.data || []
  } catch (err) {
    console.error('Veri alınamadı:', err)
  }
}

const openDrawer = (item = null) => {
  promoToEdit.value = item
    ? { ...item }
    : { code: '', reward: 0, levelMin: 0, redeemptionsMax: 0 }
  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    try {
      if (promoToEdit.value._id) {
        await axios.put(`/admin/promocodes/${promoToEdit.value._id}`, promoToEdit.value)
      } else {
        await axios.post('/admin/promocodes', promoToEdit.value)
      }
      closeDrawer()
      fetchPromocodes()
    } catch (err) {
      console.error('Kayıt hatası:', err)
    }
  })
}

const deletePromocode = async id => {
  if (!id) return console.error('Silme hatası: id undefined')
  try {
    await axios.delete(`/admin/promocodes/${id}`)
    fetchPromocodes()
  } catch (err) {
    console.error('Silme hatası:', err)
  }
}

const filteredPromocodes = computed(() => {
  return promocodes.value.filter(p =>
    !searchQuery.value || p.code.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(fetchPromocodes)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('promocodeManagement') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('newPromocode') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField
          v-model="searchQuery"
          :label="t('searchCode')"
          clearable
        />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredPromocodes"
        :headers="[
          { title: t('code'), key: 'code' },
          { title: t('reward'), key: 'reward' },
          { title: t('minLevel'), key: 'levelMin' },
          { title: t('maxUsage'), key: 'redeemptionsMax' },
          { title: t('totalUsage'), key: 'redeemptionsTotal' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deletePromocode(item.raw._id)">
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
        :title="t('addEditPromocode')"
        @cancel="closeDrawer"
      />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="promoToEdit.code"
                    :label="t('code')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="promoToEdit.reward"
                    :label="t('rewardAmount')"
                    type="number"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="promoToEdit.levelMin"
                    :label="t('minVipLevel')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="promoToEdit.redeemptionsMax"
                    :label="t('maxUsage')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
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
