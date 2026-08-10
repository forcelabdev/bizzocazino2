<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const isBannerDrawerOpen = ref(false)
const banners = ref([])
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const bannerToEdit = ref({
  title: '',
  subtitle: '',
  link: '',
  position: '',
  type: 'both',
  image: null,
  imageUrl: '',
})

const formValid = ref(false)
const refForm = ref()
const selectedPosition = ref('')
const searchQuery = ref('')

const positionOptions = [
  'HomeAlt',
  'HomeAlt2',
  'HomeTop',
  'HomeTop2',
  'HomePromo',
  'slots',
  'casino',
  'sport',
  'vip',
  'affiliate',
]

const typeOptions = computed(() => [
  { title: t('bannerTypeBoth'), value: 'both' },
  { title: t('bannerTypeMobile'), value: 'mobile' },
  { title: t('bannerTypeDesktop'), value: 'desktop' },
])

const typeLabels = computed(() => Object.fromEntries(
  typeOptions.value.map(option => [option.value, option.title]),
))

const fetchBanners = async () => {
  try {
    const res = await axios.get('/admin/banners')

    banners.value = res.data.data || []
  } catch (err) {
    console.error('❌ Banner fetch error:', err)
  }
}

const openDrawer = (banner = null) => {
  bannerToEdit.value = banner
    ? {
      _id: banner._id,
      title: banner.title,
      subtitle: banner.subtitle,
      link: banner.link,
      position: banner.position,
      type: banner.type || 'both',
      imageUrl: banner.imageUrl,
      image: null,
    }
    : { title: '', subtitle: '', link: '', position: '', type: 'both', image: null, imageUrl: '' }
  isBannerDrawerOpen.value = true
}

const closeDrawer = () => {
  isBannerDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    const formData = new FormData()

    formData.append('title', bannerToEdit.value.title)
    formData.append('subtitle', bannerToEdit.value.subtitle)
    formData.append('link', bannerToEdit.value.link)
    formData.append('position', bannerToEdit.value.position)
    formData.append('type', bannerToEdit.value.type || 'both')
    if (bannerToEdit.value.image instanceof File) {
      formData.append('image', bannerToEdit.value.image)
    }

    try {
      if (bannerToEdit.value._id) {
        await axios.put(`/admin/banners/${bannerToEdit.value._id}`, formData)
      } else {
        await axios.post('/admin/banners', formData)
      }
      closeDrawer()
      fetchBanners()
    } catch (err) {
      console.error('❌ Save error:', err)
    }
  })
}

const deleteBanner = async id => {
  if (!id) return console.error('❌ Delete error: id undefined')
  try {
    await axios.delete(`/admin/banners/${id}`)
    fetchBanners()
  } catch (err) {
    console.error('❌ Delete error:', err)
  }
}

const filteredBanners = computed(() => {
  return banners.value.filter(b =>
    (!selectedPosition.value || b.position === selectedPosition.value) &&
    (!searchQuery.value || b.title.toLowerCase().includes(searchQuery.value.toLowerCase())),
  )
})

onMounted(fetchBanners)
</script>

<template>
  <section>
    <!-- Üst Kart -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('bannerManagement') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('addBanner') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" sm="4">
            <AppSelect
              v-model="selectedPosition"
              :label="t('filterByPosition')"
              :items="positionOptions"
              clearable
            />
          </VCol>
          <VCol cols="12" sm="4">
            <AppTextField
              v-model="searchQuery"
              :label="t('searchByTitle')"
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Tablo -->
    <VCard>
      <VDataTable
        :items="filteredBanners"
        :headers="[
          { title: t('image'), key: 'imageUrl' },
          { title: t('title'), key: 'title' },
          { title: t('subtitle'), key: 'subtitle' },
          { title: t('position'), key: 'position' },
          { title: t('bannerType'), key: 'type' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.imageUrl="{ item }">
          <VImg
            v-if="item.raw.imageUrl"
            :src="item.raw.imageUrl.startsWith('/') ? `${BASE_URL}${item.raw.imageUrl}` : item.raw.imageUrl"
            max-width="140"
            max-height="60"
            cover
          />
        </template>
        <template #item.type="{ item }">
          <VChip
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ typeLabels[item.raw.type || 'both'] || typeLabels.both }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteBanner(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer -->
    <VNavigationDrawer
      v-model="isBannerDrawerOpen"
      temporary
      location="end"
      width="420"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection :title="t('addEditBanner')" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="bannerToEdit.title"
                    :label="t('title')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="bannerToEdit.subtitle"
                    :label="t('subtitle')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="bannerToEdit.link"
                    :label="t('link')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppSelect
                    v-model="bannerToEdit.position"
                    :label="t('position')"
                    :rules="[requiredValidator]"
                    :items="positionOptions"
                  />
                </VCol>
                <VCol cols="12">
                  <AppSelect
                    v-model="bannerToEdit.type"
                    :label="t('bannerType')"
                    :rules="[requiredValidator]"
                    :items="typeOptions"
                  />
                </VCol>
                <VCol cols="12">
                  <VFileInput
                    :label="t('bannerImage')"
                    accept="image/*"
                    @change="e => bannerToEdit.image = e.target.files[0]"
                  />
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">{{ t('save') }}</VBtn>
                  <VBtn type="reset" variant="tonal" color="secondary" @click="closeDrawer">
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
