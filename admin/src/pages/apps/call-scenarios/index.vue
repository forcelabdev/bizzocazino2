<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const { t } = useI18n()
const userStore = useUserListStore()

const snackbar = ref({ show: false, text: "", color: "success" })

const formatMoney = value => {
  const number = Number(value || 0)

  return `${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

const formatDate = value => {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/* --------------------------------------------------------------------- */
/* Senaryo Şablonları                                                    */
/* --------------------------------------------------------------------- */

const templatesLoading = ref(false)
const templates = ref([])
const templateFormOpen = ref(false)
const templateSaving = ref(false)
const editingTemplateId = ref(null)

const emptyTemplateForm = () => ({
  name: "",
  bonusAmount: 0,
  requiredDepositAmount: 0,
  wageringMultiplier: 1,
  minWithdrawalAmount: 0,
  maxWithdrawalAmount: 0,
  allowedProviders: "",
  excludedCategories: "",
  rulesText: "",
  preventDuplicatePerUser: true,
  active: true,
})

const templateForm = ref(emptyTemplateForm())

const fetchTemplates = async () => {
  templatesLoading.value = true
  try {
    templates.value = await userStore.fetchCallScenarioTemplates()
  } catch (error) {
    console.error("Senaryo şablonları alınamadı:", error)
  } finally {
    templatesLoading.value = false
  }
}

const openNewTemplateForm = () => {
  editingTemplateId.value = null
  templateForm.value = emptyTemplateForm()
  templateFormOpen.value = true
}

const openEditTemplateForm = template => {
  editingTemplateId.value = template._id
  templateForm.value = {
    name: template.name,
    bonusAmount: template.bonusAmount,
    requiredDepositAmount: template.requiredDepositAmount,
    wageringMultiplier: template.wageringMultiplier,
    minWithdrawalAmount: template.minWithdrawalAmount,
    maxWithdrawalAmount: template.maxWithdrawalAmount,
    allowedProviders: template.allowedProviders,
    excludedCategories: template.excludedCategories,
    rulesText: template.rulesText,
    preventDuplicatePerUser: template.preventDuplicatePerUser,
    active: template.active,
  }
  templateFormOpen.value = true
}

const saveTemplate = async () => {
  if (!templateForm.value.name?.trim()) return

  templateSaving.value = true
  try {
    const payload = {
      ...templateForm.value,
      bonusAmount: Number(templateForm.value.bonusAmount),
      requiredDepositAmount: Number(templateForm.value.requiredDepositAmount),
      wageringMultiplier: Number(templateForm.value.wageringMultiplier),
      minWithdrawalAmount: Number(templateForm.value.minWithdrawalAmount),
      maxWithdrawalAmount: Number(templateForm.value.maxWithdrawalAmount),
    }

    if (editingTemplateId.value) {
      await userStore.updateCallScenarioTemplate(editingTemplateId.value, payload)
    } else {
      await userStore.createCallScenarioTemplate(payload)
    }

    snackbar.value = { show: true, text: t("callScenariosAdmin.saveTemplateSuccess"), color: "success" }
    templateFormOpen.value = false
    await fetchTemplates()
  } catch (error) {
    console.error("Şablon kaydedilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("callScenariosAdmin.saveTemplateFailed"), color: "error" }
  } finally {
    templateSaving.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Üyeye Senaryo Ata                                                     */
/* --------------------------------------------------------------------- */

const userSearch = ref("")
const userOptions = ref([])
const userSearchLoading = ref(false)
const selectedUser = ref(null)
const selectedTemplateId = ref(null)
const assignNote = ref("")

let userSearchTimeout = null

watch(userSearch, value => {
  clearTimeout(userSearchTimeout)
  if (!value || value.length < 2) {
    userOptions.value = selectedUser.value ? [selectedUser.value] : []

    return
  }
  userSearchTimeout = setTimeout(async () => {
    userSearchLoading.value = true
    try {
      const res = await userStore.fetchUsers({ search: value, limit: 15 })

      userOptions.value = res.users || []
    } catch (error) {
      console.error("Kullanıcı arama hatası:", error)
    } finally {
      userSearchLoading.value = false
    }
  }, 300)
})

const userOptionTitle = user => {
  const email = user?.local?.email || ""

  return `${user?.username || user?.name || "—"}${email ? ` (${email})` : ""}`
}

const templateOptions = computed(() => templates.value.map(template => ({
  value: template._id,
  title: template.name,
})))

const selectedTemplate = computed(() => templates.value.find(item => item._id === selectedTemplateId.value) || null)

const duplicateCheck = ref(null)
const duplicateChecking = ref(false)
let duplicateCheckTimeout = null

watch([selectedUser, selectedTemplateId], () => {
  clearTimeout(duplicateCheckTimeout)
  duplicateCheck.value = null

  if (!selectedUser.value?._id || !selectedTemplateId.value) return

  duplicateCheckTimeout = setTimeout(async () => {
    duplicateChecking.value = true
    try {
      duplicateCheck.value = await userStore.checkCallScenarioDuplicate(selectedUser.value._id, selectedTemplateId.value)
    } catch (error) {
      console.error("Mükerrer kontrolü yapılamadı:", error)
    } finally {
      duplicateChecking.value = false
    }
  }, 250)
})

const isBlockedByDuplicate = computed(() => Boolean(duplicateCheck.value?.blocked))

const assigning = ref(false)

const createAssignment = async () => {
  if (!selectedUser.value || !selectedTemplateId.value || isBlockedByDuplicate.value) return

  assigning.value = true
  try {
    await userStore.createUserCallScenarioAssignment(selectedUser.value._id, {
      templateId: selectedTemplateId.value,
      note: assignNote.value,
    })
    snackbar.value = { show: true, text: t("callScenariosAdmin.assignSuccess"), color: "success" }
    selectedUser.value = null
    userSearch.value = ""
    userOptions.value = []
    selectedTemplateId.value = null
    assignNote.value = ""
    duplicateCheck.value = null
    await fetchAssignments()
  } catch (error) {
    console.error("Senaryo ataması oluşturulamadı:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("callScenariosAdmin.assignFailed"), color: "error" }
  } finally {
    assigning.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Atama Geçmişi                                                         */
/* --------------------------------------------------------------------- */

const assignmentsLoading = ref(false)
const assignments = ref([])
const totalAssignments = ref(0)
const options = ref({ page: 1, itemsPerPage: 10 })
const statusFilter = ref(null)
const templateFilter = ref(null)
const actionId = ref(null)

const statusOptions = [
  { value: "active", title: t("callScenariosAdmin.statusActive") },
  { value: "completed", title: t("callScenariosAdmin.statusCompleted") },
  { value: "cancelled", title: t("callScenariosAdmin.statusCancelled") },
  { value: "violated", title: t("callScenariosAdmin.statusViolated") },
]

const assignmentHeaders = [
  { title: t("callScenariosAdmin.user"), key: "user" },
  { title: t("callScenariosAdmin.scenario"), key: "scenario" },
  { title: t("callScenariosAdmin.bonusAmountAssignedCol"), key: "bonusAmount" },
  { title: t("callScenariosAdmin.status"), key: "status" },
  { title: t("callScenariosAdmin.date"), key: "date" },
  { title: t("callScenariosAdmin.actions"), key: "actions", sortable: false },
]

const statusColor = status => {
  if (status === "active") return "info"
  if (status === "completed") return "success"
  if (status === "violated") return "error"

  return "warning"
}

const statusLabel = status => {
  if (status === "active") return t("callScenariosAdmin.statusActive")
  if (status === "completed") return t("callScenariosAdmin.statusCompleted")
  if (status === "violated") return t("callScenariosAdmin.statusViolated")

  return t("callScenariosAdmin.statusCancelled")
}

const fetchAssignments = async () => {
  assignmentsLoading.value = true
  try {
    const res = await userStore.fetchCallScenarioAssignments({
      page: options.value.page,
      itemsPerPage: options.value.itemsPerPage,
      status: statusFilter.value || undefined,
      templateId: templateFilter.value || undefined,
    })

    assignments.value = res.assignments
    totalAssignments.value = res.total
  } catch (error) {
    console.error("Senaryo atamaları alınamadı:", error)
  } finally {
    assignmentsLoading.value = false
  }
}

watch([statusFilter, templateFilter, () => options.value.page, () => options.value.itemsPerPage], fetchAssignments)

const cancelAssignment = async assignmentItem => {
  if (!confirm(t("callScenariosAdmin.cancelConfirm"))) return

  const reason = prompt(t("callScenariosAdmin.cancelReasonPrompt")) || ""

  actionId.value = assignmentItem._id
  try {
    await userStore.cancelCallScenarioAssignment(assignmentItem._id, reason)
    await fetchAssignments()
  } catch (error) {
    console.error("Atama iptal edilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("callScenariosAdmin.cancelFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const violateAssignment = async assignmentItem => {
  if (!confirm(t("callScenariosAdmin.violateConfirm"))) return

  const reason = prompt(t("callScenariosAdmin.violateReasonPrompt")) || ""

  actionId.value = assignmentItem._id
  try {
    await userStore.violateCallScenarioAssignment(assignmentItem._id, reason)
    await fetchAssignments()
  } catch (error) {
    console.error("İşlem gerçekleştirilemedi:", error)
    snackbar.value = { show: true, text: error.response?.data?.message || t("callScenariosAdmin.violateFailed"), color: "error" }
  } finally {
    actionId.value = null
  }
}

const completeAssignment = async assignmentItem => {
  actionId.value = assignmentItem._id
  try {
    await userStore.completeCallScenarioAssignment(assignmentItem._id)
    await fetchAssignments()
  } catch (error) {
    console.error("İşlem gerçekleştirilemedi:", error)
  } finally {
    actionId.value = null
  }
}

onMounted(() => {
  fetchTemplates()
  fetchAssignments()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <div class="d-flex flex-column mb-2">
        <h4 class="text-h4">
          {{ t("callScenariosAdmin.title") }}
        </h4>
        <span class="text-body-2 text-disabled">{{ t("callScenariosAdmin.description") }}</span>
      </div>
    </VCol>

    <!-- Senaryo Şablonları -->
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <h5 class="text-h5">
            {{ t("callScenariosAdmin.templatesTitle") }}
          </h5>
          <VBtn
            color="primary"
            prepend-icon="tabler-plus"
            @click="openNewTemplateForm"
          >
            {{ t("callScenariosAdmin.newTemplate") }}
          </VBtn>
        </VCardText>

        <VProgressLinear
          v-if="templatesLoading"
          indeterminate
          color="primary"
        />

        <VTable v-if="templates.length">
          <thead>
            <tr>
              <th>{{ t("callScenariosAdmin.templateNameCol") }}</th>
              <th>{{ t("callScenariosAdmin.bonusAmountCol") }}</th>
              <th>{{ t("callScenariosAdmin.duplicateRuleCol") }}</th>
              <th>{{ t("callScenariosAdmin.activeCol") }}</th>
              <th>{{ t("callScenariosAdmin.actionsCol") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in templates" :key="template._id">
              <td>
                <div class="d-flex flex-column py-2">
                  <span class="font-weight-medium">{{ template.name }}</span>
                  <span class="text-caption text-disabled">{{ template.allowedProviders }}</span>
                </div>
              </td>
              <td class="font-weight-medium text-success">
                {{ formatMoney(template.bonusAmount) }}
              </td>
              <td>
                <VChip
                  :color="template.preventDuplicatePerUser ? 'error' : 'secondary'"
                  size="small"
                  variant="tonal"
                >
                  {{ template.preventDuplicatePerUser ? t("callScenariosAdmin.yes") : t("callScenariosAdmin.no") }}
                </VChip>
              </td>
              <td>
                <VChip
                  :color="template.active ? 'success' : 'secondary'"
                  size="small"
                >
                  {{ template.active ? t("callScenariosAdmin.yes") : t("callScenariosAdmin.no") }}
                </VChip>
              </td>
              <td>
                <VBtn
                  size="small"
                  variant="text"
                  @click="openEditTemplateForm(template)"
                >
                  {{ t("callScenariosAdmin.edit") }}
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <VCardText v-else-if="!templatesLoading">
          <span class="text-body-2 text-disabled">{{ t("callScenariosAdmin.noTemplates") }}</span>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Üyeye Senaryo Ata -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("callScenariosAdmin.assignTitle") }}
          </h5>

          <VForm @submit.prevent="createAssignment">
            <VRow>
              <VCol cols="12" md="6">
                <VAutocomplete
                  v-model="selectedUser"
                  v-model:search="userSearch"
                  :items="userOptions"
                  :loading="userSearchLoading"
                  :item-title="userOptionTitle"
                  return-object
                  :label="t('callScenariosAdmin.selectUser')"
                  :hint="t('callScenariosAdmin.selectUserHint')"
                  persistent-hint
                  no-filter
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppSelect
                  v-model="selectedTemplateId"
                  :items="templateOptions"
                  :label="t('callScenariosAdmin.selectTemplate')"
                />
              </VCol>

              <VCol cols="12">
                <AppTextField
                  v-model="assignNote"
                  :label="t('callScenariosAdmin.note')"
                />
              </VCol>

              <VCol v-if="duplicateChecking" cols="12">
                <span class="text-caption text-disabled">{{ t("callScenariosAdmin.checkingDuplicate") }}</span>
              </VCol>

              <VCol v-else-if="isBlockedByDuplicate" cols="12">
                <VAlert color="error" variant="tonal" density="compact">
                  {{ t("callScenariosAdmin.alreadyAssignedWarning") }}
                </VAlert>
              </VCol>

              <VCol v-if="selectedTemplate?.rulesText" cols="12">
                <VAlert color="info" variant="tonal" density="compact">
                  <span class="font-weight-medium">{{ t("callScenariosAdmin.rulesPreviewTitle") }}:</span>
                  <div class="text-body-2 mt-1" style="white-space: pre-line;">
                    {{ selectedTemplate.rulesText }}
                  </div>
                </VAlert>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  color="primary"
                  :disabled="!selectedUser || !selectedTemplateId || isBlockedByDuplicate"
                  :loading="assigning"
                >
                  {{ t("callScenariosAdmin.assign") }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Atama Geçmişi -->
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <h5 class="text-h5">
            {{ t("callScenariosAdmin.assignmentsTitle") }}
          </h5>

          <div class="d-flex flex-wrap gap-4">
            <AppSelect
              v-model="templateFilter"
              density="compact"
              clearable
              style="min-width: 200px;"
              :items="templateOptions"
              :label="t('callScenariosAdmin.filterTemplate')"
            />
            <AppSelect
              v-model="statusFilter"
              density="compact"
              clearable
              style="min-width: 180px;"
              :items="statusOptions"
              :label="t('callScenariosAdmin.filterStatus')"
            />
          </div>
        </VCardText>

        <VDataTableServer
          v-model:page="options.page"
          v-model:items-per-page="options.itemsPerPage"
          :headers="assignmentHeaders"
          :items="assignments"
          :items-length="totalAssignments"
          :loading="assignmentsLoading"
        >
          <template #item.user="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">{{ item.raw.userSnapshot?.username || item.raw.userSnapshot?.name }}</span>
              <span class="text-caption text-disabled">{{ item.raw.userSnapshot?.email }}</span>
            </div>
          </template>

          <template #item.scenario="{ item }">
            <span>{{ item.raw.templateNameSnapshot || item.raw.template?.name }}</span>
          </template>

          <template #item.bonusAmount="{ item }">
            <span class="font-weight-medium text-success">{{ formatMoney(item.raw.bonusAmount) }}</span>
          </template>

          <template #item.status="{ item }">
            <VChip :color="statusColor(item.raw.status)" size="small">
              {{ statusLabel(item.raw.status) }}
            </VChip>
          </template>

          <template #item.date="{ item }">
            <span class="text-caption">{{ formatDate(item.raw.createdAt) }}</span>
          </template>

          <template #item.actions="{ item }">
            <div v-if="item.raw.status === 'active'" class="d-flex gap-2">
              <VBtn
                size="small"
                color="success"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="completeAssignment(item.raw)"
              >
                {{ t("callScenariosAdmin.complete") }}
              </VBtn>
              <VBtn
                size="small"
                color="error"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="violateAssignment(item.raw)"
              >
                {{ t("callScenariosAdmin.violate") }}
              </VBtn>
              <VBtn
                size="small"
                color="secondary"
                variant="tonal"
                :loading="actionId === item.raw._id"
                @click="cancelAssignment(item.raw)"
              >
                {{ t("callScenariosAdmin.cancel") }}
              </VBtn>
            </div>
            <span v-else class="text-caption text-disabled">—</span>
          </template>

          <template #no-data>
            <span class="text-body-2 text-disabled">{{ t("callScenariosAdmin.empty") }}</span>
          </template>
        </VDataTableServer>
      </VCard>
    </VCol>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom end"
    >
      {{ snackbar.text }}
    </VSnackbar>

    <!-- Şablon Formu -->
    <VDialog v-model="templateFormOpen" max-width="700">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ editingTemplateId ? t("callScenariosAdmin.editTemplate") : t("callScenariosAdmin.newTemplate") }}
          </h5>

          <VForm @submit.prevent="saveTemplate">
            <VRow>
              <VCol cols="12">
                <AppTextField
                  v-model="templateForm.name"
                  :label="t('callScenariosAdmin.name')"
                  :placeholder="t('callScenariosAdmin.namePlaceholder')"
                />
              </VCol>

              <VCol cols="12" md="4">
                <AppTextField
                  v-model="templateForm.bonusAmount"
                  type="number"
                  min="0"
                  :label="t('callScenariosAdmin.bonusAmount')"
                />
              </VCol>

              <VCol cols="12" md="4">
                <AppTextField
                  v-model="templateForm.requiredDepositAmount"
                  type="number"
                  min="0"
                  :label="t('callScenariosAdmin.requiredDepositAmount')"
                />
              </VCol>

              <VCol cols="12" md="4">
                <AppTextField
                  v-model="templateForm.wageringMultiplier"
                  type="number"
                  min="0"
                  step="0.1"
                  :label="t('callScenariosAdmin.wageringMultiplier')"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="templateForm.minWithdrawalAmount"
                  type="number"
                  min="0"
                  :label="t('callScenariosAdmin.minWithdrawalAmount')"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="templateForm.maxWithdrawalAmount"
                  type="number"
                  min="0"
                  :label="t('callScenariosAdmin.maxWithdrawalAmount')"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="templateForm.allowedProviders"
                  :label="t('callScenariosAdmin.allowedProviders')"
                  :placeholder="t('callScenariosAdmin.allowedProvidersPlaceholder')"
                />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField
                  v-model="templateForm.excludedCategories"
                  :label="t('callScenariosAdmin.excludedCategories')"
                  :placeholder="t('callScenariosAdmin.excludedCategoriesPlaceholder')"
                />
              </VCol>

              <VCol cols="12">
                <AppTextarea
                  v-model="templateForm.rulesText"
                  rows="4"
                  :label="t('callScenariosAdmin.rulesText')"
                  :placeholder="t('callScenariosAdmin.rulesTextPlaceholder')"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch
                  v-model="templateForm.preventDuplicatePerUser"
                  :label="t('callScenariosAdmin.preventDuplicatePerUser')"
                />
                <span class="text-caption text-disabled">{{ t("callScenariosAdmin.preventDuplicatePerUserHint") }}</span>
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch
                  v-model="templateForm.active"
                  :label="t('callScenariosAdmin.active')"
                />
              </VCol>

              <VCol cols="12" class="d-flex gap-4">
                <VBtn
                  type="submit"
                  color="primary"
                  :loading="templateSaving"
                >
                  {{ t("callScenariosAdmin.save") }}
                </VBtn>
                <VBtn
                  variant="tonal"
                  color="secondary"
                  @click="templateFormOpen = false"
                >
                  {{ t("common.cancel") || "İptal" }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>
  </VRow>
</template>

<route lang="yaml">
meta:
  action: read
  subject: callScenarios
</route>
