<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const isItemDrawerOpen = ref(false)
const items = ref([])

const itemToEdit = ref({
  assetId: '',
  name: '',
  image: null,
  imageUrl: '',
  amount: 0,
  amountFixed: 0,
  accepted: false,
})

const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const fetchItems = async () => {
  try {
    const res = await axios.get('/admin/items')
    items.value = res.data.data || []
  } catch (err) {
    console.error('Item verisi alınamadı:', err)
  }
}

const openDrawer = (item = null) => {
  itemToEdit.value = item
    ? {
        _id: item._id,
        assetId: item.assetId,
        name: item.name,
        image: null,
        imageUrl: item.image,
        amount: item.amount,
        amountFixed: item.amountFixed,
        accepted: item.accepted,
      }
    : { assetId: '', name: '', image: null, imageUrl: '', amount: 0, amountFixed: 0, accepted: false }
  isItemDrawerOpen.value = true
}

const closeDrawer = () => {
  isItemDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    const formData = new FormData()
    formData.append('assetId', itemToEdit.value.assetId)
    formData.append('name', itemToEdit.value.name)
    formData.append('amount', itemToEdit.value.amount)
    formData.append('amountFixed', itemToEdit.value.amountFixed)
    formData.append('accepted', itemToEdit.value.accepted)
    if (itemToEdit.value.image instanceof File) {
      formData.append('image', itemToEdit.value.image)
    }

    try {
      if (itemToEdit.value._id) {
        await axios.put(`/admin/items/${itemToEdit.value._id}`, formData)
      } else {
        await axios.post('/admin/items', formData)
      }
      closeDrawer()
      fetchItems()
    } catch (err) {
      console.error('Kayıt hatası:', err)
    }
  })
}

const deleteItem = async id => {
  if (!id) return console.error('Silme hatası: id undefined')
  try {
    await axios.delete(`/admin/items/${id}`)
    fetchItems()
  } catch (err) {
    console.error('Silme hatası:', err)
  }
}

const filteredItems = computed(() => {
  return items.value.filter(b =>
    !searchQuery.value || b.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(fetchItems)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('items.management') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('items.addNew') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField
          v-model="searchQuery"
          :label="t('items.search')"
          clearable
        />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredItems"
        :headers="[
          { title: t('items.image'), key: 'image' },
          { title: t('items.name'), key: 'name' },
          { title: t('items.amount'), key: 'amount' },
          { title: t('items.amountFixed'), key: 'amountFixed' },
          { title: t('items.accepted'), key: 'accepted' },
          { title: t('items.actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.image="{ item }">
          <VImg
            v-if="item.raw.image"
            :src="item.raw.image.startsWith('/') ? `${BASE_URL}${item.raw.image}` : item.raw.image"
            max-width="100"
            max-height="60"
            cover
          />
        </template>
        <template #item.accepted="{ item }">
          <VChip :color="item.raw.accepted ? 'success' : 'error'">
            {{ item.raw.accepted ? t('items.yes') : t('items.no') }}
          </VChip>
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteItem(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer Form -->
    <VNavigationDrawer
      v-model="isItemDrawerOpen"
      temporary
      location="end"
      width="420"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        :title="t('items.drawerTitle')"
        @cancel="closeDrawer"
      />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="itemToEdit.assetId"
                    label="Asset ID"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="itemToEdit.name"
                    :label="t('items.name')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="itemToEdit.amount"
                    :label="t('items.amount')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="itemToEdit.amountFixed"
                    :label="t('items.amountFixed')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <AppSwitch
                    v-model="itemToEdit.accepted"
                    :label="t('items.accepted')"
                  />
                </VCol>
                <VCol cols="12">
                  <VFileInput
                    :label="t('items.image')"
                    accept="image/*"
                    @change="e => itemToEdit.image = e.target.files[0]"
                  />
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">
                    {{ t('items.save') }}
                  </VBtn>
                  <VBtn variant="tonal" color="secondary" @click="closeDrawer">
                    {{ t('items.cancel') }}
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
