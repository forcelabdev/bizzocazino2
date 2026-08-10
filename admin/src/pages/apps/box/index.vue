<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const isBoxDrawerOpen = ref(false)
const boxes = ref([])
const availableItems = ref([])

const boxToEdit = ref({
  name: '',
  slug: '',
  amount: 0,
  levelMin: 0,
  type: '',
  state: '',
  categories: [],
  image: null,
  imageUrl: '',
  items: [],
})

const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const fetchBoxes = async () => {
  try {
    const res = await axios.get('/admin/boxes')
    boxes.value = res.data.data || []
  } catch (err) {
    console.error('Box verisi alınamadı:', err)
  }
}

const fetchItems = async () => {
  try {
    const res = await axios.get('/admin/items')
    availableItems.value = res.data.data || []
  } catch (err) {
    console.error('Itemlar alınamadı:', err)
  }
}

const openDrawer = (box = null) => {
  boxToEdit.value = box
    ? {
      _id: box._id,
      name: box.name,
      slug: box.slug,
      amount: box.amount,
      levelMin: box.levelMin,
      type: box.type,
      state: box.state,
      categories: box.categories,
      image: null,
      imageUrl: box.image,
      items: box.items.map(i => ({ ...i.item, ticket: i.tickets })),
    }
    : {
      name: '',
      slug: '',
      amount: 0,
      levelMin: 0,
      type: '',
      state: '',
      categories: [],
      image: null,
      imageUrl: '',
      items: [],
    }
  isBoxDrawerOpen.value = true
}

const closeDrawer = () => {
  isBoxDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    const formData = new FormData()
    formData.append('name', boxToEdit.value.name)
    formData.append('slug', boxToEdit.value.slug)
    formData.append('amount', boxToEdit.value.amount)
    formData.append('levelMin', boxToEdit.value.levelMin)
    formData.append('type', boxToEdit.value.type)
    formData.append('state', boxToEdit.value.state)
    formData.append('categories', JSON.stringify(boxToEdit.value.categories))
    if (boxToEdit.value.image instanceof File) {
      formData.append('image', boxToEdit.value.image)
    }
    formData.append(
      'items',
      JSON.stringify(
        boxToEdit.value.items.map(item => ({ item: item._id, tickets: item.ticket || 0 })),
      ),
    )

    try {
      if (boxToEdit.value._id) {
        await axios.put(`/admin/boxes/${boxToEdit.value._id}`, formData)
      } else {
        await axios.post('/admin/boxes', formData)
      }
      closeDrawer()
      fetchBoxes()
    } catch (err) {
      console.error('Kayıt hatası:', err)
    }
  })
}

const deleteBox = async id => {
  if (!id) return console.error('Silme hatası: id undefined')
  try {
    await axios.delete(`/admin/boxes/${id}`)
    fetchBoxes()
  } catch (err) {
    console.error('Silme hatası:', err)
  }
}

const filteredBoxes = computed(() => {
  return boxes.value.filter(b =>
    !searchQuery.value || b.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

onMounted(() => {
  fetchBoxes()
  fetchItems()
})
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('boxes.management') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('boxes.addNew') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField
          v-model="searchQuery"
          :label="t('boxes.search')"
          clearable
        />
      </VCardText>
    </VCard>

    <VCard>
      <VDataTable
        :items="filteredBoxes"
        :headers="[
          { title: t('boxes.title'), key: 'name' },
          { title: t('boxes.slug'), key: 'slug' },
          { title: t('boxes.amount'), key: 'amount' },
          { title: t('boxes.minLevel'), key: 'levelMin' },
          { title: t('boxes.type'), key: 'type' },
          { title: t('boxes.state'), key: 'state' },
          { title: t('boxes.categories'), key: 'categories' },
          { title: t('boxes.actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.categories="{ item }">
          {{ item.raw.categories.join(', ') }}
        </template>
        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteBox(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <VNavigationDrawer
      v-model="isBoxDrawerOpen"
      temporary
      location="end"
      width="420"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        :title="t('boxes.drawerTitle')"
        @cancel="closeDrawer"
      />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.name"
                    :label="t('boxes.name')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.slug"
                    :label="t('boxes.slug')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.amount"
                    :label="t('boxes.amount')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.levelMin"
                    :label="t('boxes.minLevel')"
                    type="number"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.type"
                    :label="t('boxes.type')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.state"
                    :label="t('boxes.state')"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="boxToEdit.categories"
                    :label="t('boxes.categories') + ' (virgülle ayrılmış)'"
                    @blur="boxToEdit.categories = typeof boxToEdit.categories === 'string' ? boxToEdit.categories.split(',').map(x => x.trim()) : boxToEdit.categories"
                  />
                </VCol>
                <VCol cols="12">
                  <VFileInput
                    :label="t('boxes.image')"
                    accept="image/*"
                    @change="e => boxToEdit.image = e.target.files[0]"
                  />
                </VCol>
                <VCol cols="12">
                  <VSelect
                    v-model="boxToEdit.items"
                    :items="availableItems"
                    item-title="name"
                    item-value="_id"
                    :label="t('boxes.items')"
                    chips
                    multiple
                    return-object
                    :menu-props="{ maxHeight: 300 }"
                  />
                </VCol>
                <VCol v-if="boxToEdit.items.length" cols="12">
                  <div
                    v-for="(item, index) in boxToEdit.items"
                    :key="item._id"
                    class="d-flex align-center mb-3"
                  >
                    <span class="mr-2">{{ item.name }}</span>
                    <VTextField
                      v-model.number="item.ticket"
                      :label="t('boxes.ticket')"
                      type="number"
                      density="compact"
                      style="max-width: 120px;"
                      :rules="[v => v > 0 || 'Pozitif olmalı']"
                    />
                  </div>
                </VCol>
                <VCol cols="12" class="d-flex justify-end gap-3">
                  <VBtn type="submit">
                    {{ t('boxes.save') }}
                  </VBtn>
                  <VBtn variant="tonal" color="secondary" @click="closeDrawer">
                    {{ t('boxes.cancel') }}
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
