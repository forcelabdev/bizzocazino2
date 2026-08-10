<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const API_BASE = import.meta.env.VITE_API_BASE_URL

const isDrawerOpen = ref(false)
const notices = ref([])
const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const noticeToCreate = ref({
  title: '',
  message: '',
  image: null,
})

const fetchNotices = async () => {
  try {
    const res = await axios.get('/admin/notices')
    notices.value = res.data.data || []
  } catch (err) {
    console.error('Veri alınamadı:', err)
  }
}

const openDrawer = () => {
  noticeToCreate.value = { title: '', message: '', image: null }
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

    const formData = new FormData()
    formData.append('title', noticeToCreate.value.title)
    formData.append('message', noticeToCreate.value.message)
    if (noticeToCreate.value.image instanceof File) {
      formData.append('image', noticeToCreate.value.image)
    }

    try {
      await axios.post('/admin/notices', formData)
      closeDrawer()
      fetchNotices()
    } catch (err) {
      console.error('Kayıt hatası:', err)
    }
  })
}

const deleteNotice = async id => {
  if (!id) return console.error('Silme hatası: id undefined')
  try {
    await axios.delete(`/admin/notices/${id}`)
    fetchNotices()
  } catch (err) {
    console.error('Silme hatası:', err)
  }
}

const filteredNotices = computed(() => {
  return notices.value.filter(n =>
    !searchQuery.value || n.title.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(fetchNotices)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('noticeManagement') }}</span>
        <VBtn color="primary" @click="openDrawer">
          {{ t('newNotice') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField
          v-model="searchQuery"
          :label="t('searchTitle')"
          clearable
        />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredNotices"
        :headers="[
          { title: t('title'), key: 'title' },
          { title: t('message'), key: 'message' },
          { title: t('image'), key: 'image' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.image="{ item }">
          <VImg
            v-if="item.raw.image"
            :src="item.raw.image.startsWith('/') ? `${API_BASE}${item.raw.image}` : item.raw.image"
            max-width="100"
            max-height="50"
            cover
          />
        </template>

        <template #item.actions="{ item }">
          <IconBtn @click="() => deleteNotice(item.raw._id)">
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
        :title="t('sendNewNotice')"
        @cancel="closeDrawer"
      />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="noticeToCreate.title"
                    :label="t('title')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextarea
                    v-model="noticeToCreate.message"
                    :label="t('message')"
                    :rules="[requiredValidator]"
                    rows="4"
                  />
                </VCol>
                <VCol cols="12">
                  <VFileInput
                    :label="t('imageOptional')"
                    accept="image/*"
                    @change="e => noticeToCreate.image = e.target.files[0]"
                  />
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">
                    {{ t('send') }}
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
