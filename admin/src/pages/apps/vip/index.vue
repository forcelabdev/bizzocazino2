<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const isVIPDrawerOpen = ref(false)
const vips = ref([])

const vipToEdit = ref({
  level: '',
  levelName: '',
  requiredXp: '',
  requiredWager: '',
  requiredDeposit: '',
  dailyCashback: '',
  weeklyCashback: '',
  monthlyCashback: '',
  upgradeReward: '',
  dailyVipReward: '',
  weeklyVipReward: '',
  vipDayReward: '',
  vipDay: 'Friday',
  withdrawLimit: '',
  vipSupportInfo: '',
  vipBadgeImage: null,
  vipBadgeImageUrl: '',
  vipHeaderImage: null,
  vipHeaderImageUrl: '',
})

const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const fetchVIPs = async () => {
  try {
    const res = await axios.get('/admin/vip')
    vips.value = res.data.data || []
  } catch (err) {
    console.error('Failed to fetch VIPs:', err)
  }
}

const openDrawer = (vip = null) => {
  vipToEdit.value = vip
    ? {
        _id: vip._id,
        level: vip.level,
        levelName: vip.levelName,
        requiredXp: vip.requiredXp,
        requiredWager: vip.requiredWager,
        requiredDeposit: vip.requiredDeposit,
        dailyCashback: vip.dailyCashback,
        weeklyCashback: vip.weeklyCashback,
        monthlyCashback: vip.monthlyCashback,
        upgradeReward: vip.upgradeReward,
        dailyVipReward: vip.dailyVipReward,
        weeklyVipReward: vip.weeklyVipReward,
        vipDayReward: vip.vipDayReward,
        vipDay: vip.vipDay,
        withdrawLimit: vip.withdrawLimit,
        vipSupportInfo: vip.vipSupportInfo,
        vipBadgeImageUrl: vip.vipBadgeImage,
        vipBadgeImage: null,
        vipHeaderImageUrl: vip.vipHeaderImage,
        vipHeaderImage: null,
      }
    : { level: '', levelName: '', requiredXp: '', requiredWager: '', requiredDeposit: '', dailyCashback: '', weeklyCashback: '', monthlyCashback: '', upgradeReward: '', dailyVipReward: '', weeklyVipReward: '', vipDayReward: '', vipDay: 'Friday', withdrawLimit: '', vipSupportInfo: '', vipBadgeImage: null, vipBadgeImageUrl: '', vipHeaderImage: null, vipHeaderImageUrl: '' }
  isVIPDrawerOpen.value = true
}

const closeDrawer = () => {
  isVIPDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    const formData = new FormData()
    for (const key in vipToEdit.value) {
      if (vipToEdit.value[key] !== null && !(vipToEdit.value[key] instanceof File)) {
        formData.append(key, vipToEdit.value[key])
      }
    }
    if (vipToEdit.value.vipBadgeImage instanceof File) {
      formData.append('vipBadgeImage', vipToEdit.value.vipBadgeImage)
    }
    if (vipToEdit.value.vipHeaderImage instanceof File) {
      formData.append('vipHeaderImage', vipToEdit.value.vipHeaderImage)
    }

    try {
      if (vipToEdit.value._id) {
        await axios.put(`/admin/vip/${vipToEdit.value._id}`, formData)
      } else {
        await axios.post('/admin/vip', formData)
      }
      closeDrawer()
      fetchVIPs()
    } catch (err) {
      console.error('Save error:', err)
    }
  })
}

const deleteVIP = async id => {
  if (!id) return console.error('Delete error: id undefined')
  try {
    await axios.delete(`/admin/vip/${id}`)
    fetchVIPs()
  } catch (err) {
    console.error('Delete error:', err)
  }
}

const filteredVIPs = computed(() => {
  return vips.value.filter(v =>
    !searchQuery.value || v.levelName.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(fetchVIPs)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('vip.management') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('vip.addNew') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField v-model="searchQuery" :label="t('vip.search')" clearable />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredVIPs"
        :headers="[
          { title: t('vip.badge'), key: 'vipBadgeImage' },
          { title: t('vip.level'), key: 'level' },
          { title: t('vip.levelName'), key: 'levelName' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.vipBadgeImage="{ item }">
          <VImg
            v-if="item.raw.vipBadgeImage"
            :src="item.raw.vipBadgeImage.startsWith('/') ? `${BASE_URL}${item.raw.vipBadgeImage}` : item.raw.vipBadgeImage"
            max-width="80"
            max-height="40"
            cover
          />
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteVIP(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer Form -->
    <VNavigationDrawer v-model="isVIPDrawerOpen" temporary location="end" width="480" class="scrollable-content">
      <AppDrawerHeaderSection :title="t('vip.addOrEdit')" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.level" :label="t('vip.level')" :rules="[requiredValidator]" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.levelName" :label="t('vip.levelName')" :rules="[requiredValidator]" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.requiredXp" :label="t('vip.requiredXp')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.requiredWager" :label="t('vip.requiredWager')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.requiredDeposit" :label="t('vip.requiredDeposit')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.dailyCashback" :label="t('vip.dailyCashback')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.weeklyCashback" :label="t('vip.weeklyCashback')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.monthlyCashback" :label="t('vip.monthlyCashback')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.upgradeReward" :label="t('vip.upgradeReward')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.dailyVipReward" :label="t('vip.dailyVipReward')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.weeklyVipReward" :label="t('vip.weeklyVipReward')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.vipDayReward" :label="t('vip.vipDayReward')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.vipDay" :label="t('vip.vipDay')" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.withdrawLimit" :label="t('vip.withdrawLimit')" type="number" />
                </VCol>
                <VCol cols="12">
                  <AppTextField v-model="vipToEdit.vipSupportInfo" :label="t('vip.vipSupportInfo')" />
                </VCol>
                <VCol cols="12">
                  <VFileInput :label="t('vip.badgeImage')" accept="image/*" @change="e => vipToEdit.vipBadgeImage = e.target.files[0]" />
                </VCol>
                <VCol cols="12">
                  <VFileInput :label="t('vip.headerImage')" accept="image/*" @change="e => vipToEdit.vipHeaderImage = e.target.files[0]" />
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">{{ t('save') }}</VBtn>
                  <VBtn variant="tonal" color="secondary" @click="closeDrawer">
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
