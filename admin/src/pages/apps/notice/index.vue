<script setup>
import ConditionBuilder from '@/components/ConditionBuilder.vue'
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

// 🎯 Hedef kitle seçenekleri (bkz. backend/database/models/Notice.js audience alanı)
const AUDIENCE_TYPE_OPTIONS = [
  { title: 'Tüm Üyeler', value: 'all' },
  { title: 'Sadece Online Üyeler', value: 'online' },
  { title: 'Sadece Offline Üyeler', value: 'offline' },
  { title: 'Segment (Koşullara Göre)', value: 'segment' },
]

const noticeToCreate = ref({
  title: '',
  message: '',
  image: null,
  audienceType: 'all',
  conditions: [],
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
  noticeToCreate.value = { title: '', message: '', image: null, audienceType: 'all', conditions: [] }
  isDrawerOpen.value = true
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const sendError = ref('')
const matchedCount = ref(null)

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return
    sendError.value = ''

    const formData = new FormData()
    formData.append('title', noticeToCreate.value.title)
    formData.append('message', noticeToCreate.value.message)
    if (noticeToCreate.value.image instanceof File) {
      formData.append('image', noticeToCreate.value.image)
    }

    // 🎯 Hedef kitle: "all" ise gönderilmez (backend varsayılanı "all" kabul eder).
    if (noticeToCreate.value.audienceType !== 'all') {
      formData.append('audience', JSON.stringify({
        type: noticeToCreate.value.audienceType,
        conditions: noticeToCreate.value.audienceType === 'segment'
          ? noticeToCreate.value.conditions.map(({ metric, operator, value, dateFrom, dateTo }) => ({ metric, operator, value: Number(value), dateFrom: dateFrom || null, dateTo: dateTo || null }))
          : [],
      }))
    }

    try {
      const res = await axios.post('/admin/notices', formData)

      matchedCount.value = res.data?.matchedCount ?? null
      closeDrawer()
      fetchNotices()
    } catch (err) {
      console.error('Kayıt hatası:', err)
      sendError.value = err?.response?.data?.message || 'Bildirim gönderilemedi.'
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
        <VAlert
          v-if="matchedCount !== null"
          type="success"
          variant="tonal"
          density="compact"
          closable
          class="mb-4"
          @click:close="matchedCount = null"
        >
          Bildirim {{ matchedCount }} kullanıcıya gönderildi.
        </VAlert>
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
          { title: 'Hedef Kitle', key: 'audience' },
          { title: 'Okundu', key: 'readCount' },
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

        <template #item.audience="{ item }">
          <VChip
            v-if="item.raw.recipientId"
            color="secondary"
            size="small"
          >
            Tekil
          </VChip>
          <VChip
            v-else-if="item.raw.audience?.type && item.raw.audience.type !== 'all'"
            :color="item.raw.audience.type === 'segment' ? 'info' : 'primary'"
            size="small"
          >
            {{ AUDIENCE_TYPE_OPTIONS.find(o => o.value === item.raw.audience.type)?.title }}
            <template v-if="item.raw.recipientsCount !== null"> ({{ item.raw.recipientsCount }})</template>
          </VChip>
          <VChip
            v-else
            color="success"
            size="small"
          >
            Tüm Üyeler
          </VChip>
        </template>

        <template #item.readCount="{ item }">
          {{ item.raw.readCount ?? 0 }}
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

                <VCol cols="12">
                  <VDivider class="mb-4" />
                  <VSelect
                    v-model="noticeToCreate.audienceType"
                    :items="AUDIENCE_TYPE_OPTIONS"
                    label="Hedef Kitle"
                    hint="Bildirim kimlere gönderilsin?"
                    persistent-hint
                  />
                </VCol>

                <VCol
                  v-if="noticeToCreate.audienceType === 'segment'"
                  cols="12"
                >
                  <VDivider class="my-4" />
                  <ConditionBuilder
                    v-model="noticeToCreate.conditions"
                    title="Segment Koşulları"
                  />
                </VCol>

                <VCol
                  v-if="sendError"
                  cols="12"
                >
                  <VAlert
                    type="error"
                    variant="tonal"
                    density="compact"
                  >
                    {{ sendError }}
                  </VAlert>
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
