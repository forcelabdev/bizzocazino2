<script setup>
import axios from '@/plugins/axios'
import { requiredValidator } from '@validators'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { VDataTable } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const BASE_URL = import.meta.env.VITE_API_BASE_URL
const isCategoryDrawerOpen = ref(false)
const categories = ref([])
const categoryToEdit = ref({ name: '', slug: '', img: null, imgUrl: '' })
const formValid = ref(false)
const refForm = ref()
const searchQuery = ref('')

const fetchCategories = async () => {
  try {
    const res = await axios.get('/admin/categories')
    categories.value = res.data.data || []
  } catch (err) {
    console.error('❌ Category fetch error:', err)
  }
}

const openDrawer = (category = null) => {
  categoryToEdit.value = category
    ? {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        imgUrl: category.img,
        img: null,
      }
    : { name: '', slug: '', img: null, imgUrl: '' }
  isCategoryDrawerOpen.value = true
}

const closeDrawer = () => {
  isCategoryDrawerOpen.value = false
  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(async ({ valid }) => {
    if (!valid) return

    const formData = new FormData()
    formData.append('name', categoryToEdit.value.name)
    formData.append('slug', categoryToEdit.value.slug)
    if (categoryToEdit.value.img instanceof File) {
      formData.append('img', categoryToEdit.value.img)
    }

    try {
      if (categoryToEdit.value._id) {
        await axios.put(`/admin/categories/${categoryToEdit.value._id}`, formData)
      } else {
        await axios.post('/admin/categories', formData)
      }
      closeDrawer()
      fetchCategories()
    } catch (err) {
      console.error('❌ Save error:', err)
    }
  })
}

const deleteCategory = async id => {
  if (!id) return console.error('❌ Delete error: id undefined')
  try {
    await axios.delete(`/admin/categories/${id}`)
    fetchCategories()
  } catch (err) {
    console.error('❌ Delete error:', err)
  }
}

const filteredCategories = computed(() => {
  return categories.value.filter(c =>
    !searchQuery.value || c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

onMounted(fetchCategories)
</script>

<template>
  <section>
    <!-- Üst Kart -->
    <VCard class="mb-6">
      <VCardTitle class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t('categoryManagement') }}</span>
        <VBtn color="primary" @click="() => openDrawer()">
          {{ t('addCategory') }}
        </VBtn>
      </VCardTitle>
      <VCardText>
        <AppTextField v-model="searchQuery" :label="t('searchCategory')" clearable />
      </VCardText>
    </VCard>

    <!-- Tablo -->
    <VCard>
      <VDataTable
        :items="filteredCategories"
        :headers="[
          { title: t('image'), key: 'img' },
          { title: t('name'), key: 'name' },
          { title: t('slug'), key: 'slug' },
          { title: t('actions'), key: 'actions', sortable: false },
        ]"
      >
        <template #item.img="{ item }">
          <VImg
            v-if="item.raw.img"
            :src="item.raw.img.startsWith('/') ? `${BASE_URL}${item.raw.img}` : item.raw.img"
            max-width="140"
            max-height="60"
            cover
          />
        </template>

        <template #item.actions="{ item }">
          <IconBtn @click="() => openDrawer(item.raw)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="() => deleteCategory(item.raw._id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>

    <!-- Drawer -->
    <VNavigationDrawer
      v-model="isCategoryDrawerOpen"
      temporary
      location="end"
      width="420"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection :title="t('addEditCategory')" @cancel="closeDrawer" />
      <PerfectScrollbar :options="{ wheelPropagation: false }">
        <VCard flat>
          <VCardText>
            <VForm ref="refForm" v-model="formValid" @submit.prevent="onSubmit">
              <VRow>
                <VCol cols="12">
                  <AppTextField
                    v-model="categoryToEdit.name"
                    :label="t('categoryName')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <AppTextField
                    v-model="categoryToEdit.slug"
                    :label="t('slug')"
                    :rules="[requiredValidator]"
                  />
                </VCol>
                <VCol cols="12">
                  <VFileInput
                    :label="t('categoryImage')"
                    accept="image/*"
                    @change="e => categoryToEdit.img = e.target.files[0]"
                  />
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
