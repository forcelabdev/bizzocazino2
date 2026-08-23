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
const affiliateOptions = ref([])
const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')
const emptyPromo = () => ({ code: '', reward: 0, levelMin: 0, isActive: true, startsAt: '', expiresAt: '', affiliateCodes: [], redeemptionsMax: 0, perUserLimit: 1, minLastDeposit: 0, applyWageringLock: false, wageringMultiplier: 0, minWithdraw: 0 })
const promoToEdit = ref(emptyPromo())

const fetchData = async () => {
  try {
    const [promoRes, affiliateRes] = await Promise.all([axios.get('/admin/promocodes'), axios.get('/admin/promocodes/affiliate-options')])
    promocodes.value = promoRes.data.data || []
    affiliateOptions.value = affiliateRes.data.data || []
  } catch (err) { console.error('Promosyon verileri alınamadı:', err) }
}
const localDate = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
const openDrawer = (item = null) => {
  promoToEdit.value = item ? { ...emptyPromo(), ...item, startsAt: localDate(item.startsAt), expiresAt: localDate(item.expiresAt), affiliateCodes: [...(item.affiliateCodes || [])] } : emptyPromo()
  isDrawerOpen.value = true
}
const closeDrawer = () => { isDrawerOpen.value = false; nextTick(() => { refForm.value?.reset(); refForm.value?.resetValidation() }) }
const onSubmit = () => refForm.value?.validate().then(async ({ valid }) => {
  if (!valid) return
  try {
    const item = promoToEdit.value
    if (item._id) await axios.put(`/admin/promocodes/${item._id}`, item)
    else await axios.post('/admin/promocodes', item)
    closeDrawer(); await fetchData()
  } catch (err) { console.error('Kayıt hatası:', err) }
})
const deletePromocode = async id => { if (!id) return; await axios.delete(`/admin/promocodes/${id}`); await fetchData() }
const filteredPromocodes = computed(() => promocodes.value.filter(p => !searchQuery.value || p.code.toLowerCase().includes(searchQuery.value.toLowerCase())))
onMounted(fetchData)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('promocodeManagement') }}</span>
        <VBtn color="primary" @click="openDrawer()">{{ t('newPromocode') }}</VBtn>
      </VCardTitle>
      <VCardText><AppTextField v-model="searchQuery" :label="t('searchCode')" clearable /></VCardText>
    </VCard>
    <VCard>
      <VDataTable :items="filteredPromocodes" :headers="[
        { title: t('code'), key: 'code' }, { title: t('reward'), key: 'reward' }, { title: 'Durum', key: 'isActive' },
        { title: 'Affiliate', key: 'affiliateCodes' }, { title: t('maxUsage'), key: 'redeemptionsMax' },
        { title: t('totalUsage'), key: 'redeemptionsTotal' }, { title: t('actions'), key: 'actions', sortable: false },
      ]">
        <template #item.isActive="{ item }"><VChip :color="item.raw.isActive ? 'success' : 'secondary'" size="small">{{ item.raw.isActive ? 'Aktif' : 'Pasif' }}</VChip></template>
        <template #item.affiliateCodes="{ item }">{{ item.raw.affiliateCodes?.length ? `${item.raw.affiliateCodes.length} kod` : 'Tümü' }}</template>
        <template #item.actions="{ item }">
          <IconBtn @click="openDrawer(item.raw)"><VIcon icon="tabler-edit" /></IconBtn>
          <IconBtn @click="deletePromocode(item.raw._id)"><VIcon icon="tabler-trash" /></IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <VNavigationDrawer v-model="isDrawerOpen" temporary location="end" width="620" class="scrollable-content">
      <AppDrawerHeaderSection :title="t('addEditPromocode')" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }"><VCard flat><VCardText>
        <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit"><VRow>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.code" :label="t('code')" :rules="[requiredValidator]" /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.reward" :label="t('rewardAmount')" type="number" :rules="[requiredValidator]" /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.levelMin" :label="t('minVipLevel')" type="number" min="0" /></VCol>
          <VCol cols="12" md="6"><VSwitch v-model="promoToEdit.isActive" label="Promosyon kodu aktif" color="primary" /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.startsAt" label="Başlangıç tarihi" type="datetime-local" /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.expiresAt" label="Bitiş tarihi" type="datetime-local" /></VCol>
          <VCol cols="12"><VAutocomplete v-model="promoToEdit.affiliateCodes" :items="affiliateOptions" item-title="title" item-value="code" label="İzin verilen affiliate kodları" hint="Boş bırakılırsa tüm üyeler kullanabilir." persistent-hint multiple chips closable-chips clearable /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.redeemptionsMax" label="Toplam kullanım limiti (0 = sınırsız)" type="number" min="0" /></VCol>
          <VCol cols="12" md="6"><AppTextField v-model="promoToEdit.perUserLimit" label="Kullanıcı başı limit" type="number" min="1" /></VCol>
          <VCol cols="12"><AppTextField v-model="promoToEdit.minLastDeposit" label="Minimum son onaylı yatırım (₺)" hint="0 girilirse yatırım şartı uygulanmaz." persistent-hint type="number" min="0" /></VCol>
          <VCol cols="12"><VDivider class="mb-4" /><VSwitch v-model="promoToEdit.applyWageringLock" label="Çevrim şartı uygula" color="primary" /></VCol>
          <VCol v-if="promoToEdit.applyWageringLock" cols="12" md="6"><AppTextField v-model="promoToEdit.wageringMultiplier" label="Çevrim katı" type="number" min="0" /></VCol>
          <VCol v-if="promoToEdit.applyWageringLock" cols="12" md="6"><AppTextField v-model="promoToEdit.minWithdraw" label="Minimum çekim (₺)" type="number" min="0" /></VCol>
          <VCol cols="12" class="d-flex justify-end gap-3"><VBtn type="submit">{{ t('save') }}</VBtn><VBtn variant="tonal" color="secondary" @click="closeDrawer">{{ t('cancel') }}</VBtn></VCol>
        </VRow></VForm>
      </VCardText></VCard></PerfectScrollbar>
    </VNavigationDrawer>
  </section>
</template>

<style scoped>
.scrollable-content { max-block-size: 100vh; }
</style>
