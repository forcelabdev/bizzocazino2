<script setup>
import axios from "@/plugins/axios"
import ability from "@/plugins/casl/ability"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTable } from "vuetify/labs/VDataTable"

const { t } = useI18n()

const categories = ref([])
const loading = ref(false)

const canManage = computed(
  () =>
    ability.can("manage", "finance.manualAdjustments") ||
    ability.can("manage", "finance.promo") ||
    ability.can("manage", "finance"),
)

const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const editingCategory = ref(null)
const selectedCategory = ref(null)

// 🎯 Toplu Bonus Raporu (bkz. backend/controllers/admin/manualBonusCategoryController.js)
const reportDialogOpen = ref(false)
const reportLoading = ref(false)
const reportExporting = ref(false)
const reportCategory = ref(null)
const reportData = ref(null)
const reportDateFrom = ref('')
const reportDateTo = ref('')

const defaultForm = { name: "", order: 0, active: true }
const form = ref({ ...defaultForm })

const headers = computed(() => [
  { title: t("bonusNames.order"), key: "order", width: 100 },
  { title: t("bonusNames.name"), key: "name" },
  { title: t("bonusNames.status"), key: "active", width: 140 },
  { title: t("actions"), key: "actions", sortable: false, width: 140 },
])

const fetchCategories = async () => {
  loading.value = true
  try {
    const res = await axios.get("/admin/manual-bonus-categories/manage")

    categories.value = res.data.data || []
  } catch (err) {
    console.error("Bonus adları alınamadı:", err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  if (!canManage.value) return
  editingCategory.value = null
  form.value = { ...defaultForm, order: categories.value.length }
  dialogOpen.value = true
}

const openEditDialog = category => {
  if (!canManage.value) return
  editingCategory.value = category
  form.value = {
    name: category.name,
    order: category.order || 0,
    active: category.active,
  }
  dialogOpen.value = true
}

const openDeleteDialog = category => {
  if (!canManage.value) return
  selectedCategory.value = category
  deleteDialogOpen.value = true
}

const fetchCategoryReport = async () => {
  if (!reportCategory.value) return
  reportLoading.value = true
  try {
    const params = {}
    if (reportDateFrom.value) params.dateFrom = reportDateFrom.value
    if (reportDateTo.value) params.dateTo = reportDateTo.value
    const res = await axios.get(`/admin/manual-bonus-categories/${encodeURIComponent(reportCategory.value.name)}/report`, { params })
    reportData.value = res.data.data
  } catch (err) {
    console.error('Bonus raporu alınamadı:', err)
    reportData.value = null
  } finally {
    reportLoading.value = false
  }
}

const openReportDialog = category => {
  reportCategory.value = category
  reportDateFrom.value = ''
  reportDateTo.value = ''
  reportData.value = null
  reportDialogOpen.value = true
  fetchCategoryReport()
}

const exportCategoryReport = async () => {
  if (!reportData.value?.rows?.length) return
  reportExporting.value = true
  try {
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule
    const rows = reportData.value.rows.map(row => ({
      [t('fields.username')]: row.username,
      Ad: row.name,
      Tutar: row.amount,
      Not: row.note,
      'İşlemi Yapan': row.actorUsername,
      Tarih: row.createdAt ? new Date(row.createdAt).toLocaleString('tr-TR') : '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 20 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bonus Raporu')
    XLSX.writeFile(workbook, `bonus-raporu-${reportCategory.value.name}-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true })
  } catch (err) {
    console.error('Bonus raporu dışa aktarılamadı:', err)
  } finally {
    reportExporting.value = false
  }
}

const saveCategory = async () => {
  if (!canManage.value || !form.value.name.trim()) return
  try {
    if (editingCategory.value) {
      await axios.put(`/admin/manual-bonus-categories/${editingCategory.value._id}`, form.value)
    } else {
      await axios.post("/admin/manual-bonus-categories", form.value)
    }
    dialogOpen.value = false
    await fetchCategories()
  } catch (err) {
    console.error("Bonus adı kaydedilemedi:", err)
  }
}

const deleteCategory = async () => {
  if (!canManage.value || !selectedCategory.value) return
  try {
    await axios.delete(`/admin/manual-bonus-categories/${selectedCategory.value._id}`)
    deleteDialogOpen.value = false
    selectedCategory.value = null
    await fetchCategories()
  } catch (err) {
    console.error("Bonus adı silinemedi:", err)
  }
}

onMounted(fetchCategories)
</script>

<template>
  <div>
    <VCard class="mb-6">
      <VCardTitle class="d-flex align-center justify-space-between">
        <div>
          <span>{{ t("bonusNames.title") }}</span>
          <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
            {{ t("bonusNames.description") }}
          </p>
        </div>
        <VBtn
          v-if="canManage"
          color="primary"
          @click="openCreateDialog"
        >
          <VIcon
            icon="tabler-plus"
            class="me-2"
          />
          {{ t("bonusNames.add") }}
        </VBtn>
      </VCardTitle>
    </VCard>

    <VCard>
      <VDataTable
        :items="categories"
        :headers="headers"
        :loading="loading"
        :items-per-page="-1"
      >
        <template #item.order="{ item }">
          <VChip
            size="small"
            color="secondary"
            label
          >
            {{ item.raw.order || 0 }}
          </VChip>
        </template>

        <template #item.active="{ item }">
          <VChip
            :color="item.raw.active ? 'success' : 'secondary'"
            size="small"
          >
            {{ item.raw.active ? t("bonusNames.active") : t("bonusNames.inactive") }}
          </VChip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <VBtn
              icon
              size="small"
              variant="text"
              color="info"
              @click="openReportDialog(item.raw)"
            >
              <VIcon icon="tabler-report" />
            </VBtn>
            <template v-if="canManage">
              <VBtn
                icon
                size="small"
                variant="text"
                color="primary"
                @click="openEditDialog(item.raw)"
              >
                <VIcon icon="tabler-edit" />
              </VBtn>
              <VBtn
                icon
                size="small"
                variant="text"
                color="error"
                @click="openDeleteDialog(item.raw)"
              >
                <VIcon icon="tabler-trash" />
              </VBtn>
            </template>
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Create/Edit Dialog -->
    <VDialog
      v-model="dialogOpen"
      max-width="500"
      persistent
    >
      <VCard>
        <VCardTitle>
          {{ editingCategory ? t("bonusNames.edit") : t("bonusNames.add") }}
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="form.name"
                :label="t('bonusNames.name') + ' *'"
                placeholder="ÖRN: CALL DAVET"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model.number="form.order"
                :label="t('bonusNames.order')"
                type="number"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
              class="d-flex align-center"
            >
              <VSwitch
                v-model="form.active"
                :label="t('bonusNames.active')"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="dialogOpen = false"
          >
            {{ t("cancel") }}
          </VBtn>
          <VBtn
            color="primary"
            :disabled="!canManage || !form.name.trim()"
            @click="saveCategory"
          >
            {{ editingCategory ? t("save") : t("create") }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="deleteDialogOpen"
      max-width="400"
    >
      <VCard>
        <VCardTitle>{{ t("bonusNames.deleteConfirm") }}</VCardTitle>
        <VCardText>
          {{ t("bonusNames.deleteMessage", { name: selectedCategory?.name }) }}
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialogOpen = false"
          >
            {{ t("cancel") }}
          </VBtn>
          <VBtn
            color="error"
            :disabled="!canManage"
            @click="deleteCategory"
          >
            {{ t("delete") }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.manualAdjustments
</route>
