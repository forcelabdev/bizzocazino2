<script setup>
import axios from '@/plugins/axios'
import ability from '@/plugins/casl/ability'
import { avatarText } from '@core/utils/formatters'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const canManage = computed(() => ability.can('manage', 'users'))

const COLOR_SWATCHES = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#64748B', // slate
]

const CATEGORY_OPTIONS = computed(() => [
  { title: t('crm.tags.categories.general'), value: 'general' },
  { title: t('crm.tags.categories.risk'), value: 'risk' },
  { title: t('crm.tags.categories.bonus_abuse'), value: 'bonus_abuse' },
])

const categoryColor = category => {
  if (category === 'risk') return 'error'
  if (category === 'bonus_abuse') return 'warning'

  return 'secondary'
}

const loading = ref(false)
const tags = ref([])

const fetchTags = async () => {
  loading.value = true
  try {
    const res = await axios.get('/admin/tags')

    tags.value = res.data?.data || []
  } catch (err) {
    console.error('Tag listesi alınamadı:', err)
  } finally {
    loading.value = false
  }
}

// Create / Edit dialog
const dialogOpen = ref(false)
const editingTag = ref(null)
const defaultForm = { name: '', color: COLOR_SWATCHES[0], category: 'general', description: '' }
const form = ref({ ...defaultForm })
const saving = ref(false)

const openCreateDialog = () => {
  if (!canManage.value) return
  editingTag.value = null
  form.value = { ...defaultForm }
  dialogOpen.value = true
}

const openEditDialog = tag => {
  if (!canManage.value) return
  editingTag.value = tag
  form.value = {
    name: tag.name,
    color: tag.color,
    category: tag.category,
    description: tag.description || '',
  }
  dialogOpen.value = true
}

const saveTag = async () => {
  if (!canManage.value || !form.value.name.trim() || saving.value) return
  saving.value = true
  try {
    if (editingTag.value) {
      await axios.put(`/admin/tags/${editingTag.value._id}`, form.value)
    } else {
      await axios.post('/admin/tags', form.value)
    }
    dialogOpen.value = false
    await fetchTags()
  } catch (err) {
    console.error('Tag kaydedilemedi:', err)
  } finally {
    saving.value = false
  }
}

// Delete dialog
const deleteDialogOpen = ref(false)
const selectedTag = ref(null)

const openDeleteDialog = tag => {
  if (!canManage.value) return
  selectedTag.value = tag
  deleteDialogOpen.value = true
}

const deleteTag = async () => {
  if (!canManage.value || !selectedTag.value) return
  try {
    await axios.delete(`/admin/tags/${selectedTag.value._id}`)
    deleteDialogOpen.value = false
    selectedTag.value = null
    await fetchTags()
  } catch (err) {
    console.error('Tag silinemedi:', err)
  }
}

// Assign players drawer
const drawerOpen = ref(false)
const activeTag = ref(null)
const drawerLoading = ref(false)
const assignedUsers = ref([])
const assignedTotal = ref(0)

const addSearch = ref('')
const addResults = ref([])
const addSearching = ref(false)
let addSearchTimeout = null

const openAssignDrawer = async tag => {
  activeTag.value = tag
  drawerOpen.value = true
  addSearch.value = ''
  addResults.value = []
  await fetchAssignedUsers()
}

const fetchAssignedUsers = async () => {
  if (!activeTag.value) return
  drawerLoading.value = true
  try {
    const res = await axios.get(`/admin/tags/${activeTag.value._id}/users`, {
      params: { limit: 100 },
    })
    const data = res.data?.data || {}

    assignedUsers.value = data.users || []
    assignedTotal.value = data.total || 0
  } catch (err) {
    console.error('Atanmış oyuncular alınamadı:', err)
  } finally {
    drawerLoading.value = false
  }
}

const searchUsersToAdd = async () => {
  if (!addSearch.value || addSearch.value.trim().length < 2) {
    addResults.value = []

    return
  }
  addSearching.value = true
  try {
    const res = await axios.get('/admin/users', {
      params: { search: addSearch.value, limit: 10, searchMode: 'smart' },
    })
    const results = res.data?.data || []
    const assignedIds = new Set(assignedUsers.value.map(u => u._id))

    addResults.value = results.filter(u => !assignedIds.has(u._id))
  } catch (err) {
    console.error('Oyuncu araması başarısız:', err)
  } finally {
    addSearching.value = false
  }
}

watch(addSearch, () => {
  clearTimeout(addSearchTimeout)
  addSearchTimeout = setTimeout(searchUsersToAdd, 350)
})

const assignUser = async user => {
  if (!activeTag.value) return
  try {
    await axios.post(`/admin/tags/${activeTag.value._id}/assign`, { userIds: [user._id] })
    addSearch.value = ''
    addResults.value = []
    await Promise.all([fetchAssignedUsers(), fetchTags()])
  } catch (err) {
    console.error('Oyuncu tag\'e eklenemedi:', err)
  }
}

const unassignUser = async user => {
  if (!activeTag.value) return
  try {
    await axios.post(`/admin/tags/${activeTag.value._id}/unassign`, { userIds: [user._id] })
    await Promise.all([fetchAssignedUsers(), fetchTags()])
  } catch (err) {
    console.error('Oyuncu tag\'den kaldırılamadı:', err)
  }
}

onMounted(fetchTags)
</script>

<template>
  <section>
    <VCard class="mb-6">
      <VCardTitle class="d-flex flex-wrap align-center justify-space-between gap-3">
        <div>
          <span>{{ t('crm.tags.title') }}</span>
          <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
            {{ t('crm.tags.subtitle') }}
          </p>
        </div>
        <VBtn
          v-if="canManage"
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
        >
          {{ t('crm.tags.createTag') }}
        </VBtn>
      </VCardTitle>
    </VCard>

    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <VRow v-if="tags.length">
      <VCol
        v-for="tag in tags"
        :key="tag._id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <VCard class="h-100">
          <VCardText class="d-flex flex-column gap-3">
            <div class="d-flex align-center justify-space-between">
              <VChip
                :style="{ backgroundColor: tag.color, color: '#fff' }"
                size="small"
                label
              >
                {{ tag.name }}
              </VChip>
              <VChip
                :color="categoryColor(tag.category)"
                size="x-small"
                variant="tonal"
              >
                {{ t(`crm.tags.categories.${tag.category}`) }}
              </VChip>
            </div>

            <p
              v-if="tag.description"
              class="text-body-2 text-medium-emphasis mb-0"
            >
              {{ tag.description }}
            </p>

            <div class="d-flex align-center justify-space-between mt-auto">
              <span class="text-caption text-medium-emphasis">
                {{ t('crm.tags.usageCount', { count: tag.usageCount || 0 }) }}
              </span>
              <div class="d-flex gap-1">
                <IconBtn
                  size="small"
                  @click="openAssignDrawer(tag)"
                >
                  <VIcon icon="tabler-users" />
                  <VTooltip activator="parent">
                    {{ t('crm.tags.assignedPlayers') }}
                  </VTooltip>
                </IconBtn>
                <IconBtn
                  v-if="canManage"
                  size="small"
                  @click="openEditDialog(tag)"
                >
                  <VIcon icon="tabler-edit" />
                </IconBtn>
                <IconBtn
                  v-if="canManage"
                  size="small"
                  @click="openDeleteDialog(tag)"
                >
                  <VIcon
                    icon="tabler-trash"
                    color="error"
                  />
                </IconBtn>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard v-else-if="!loading">
      <VCardText class="d-flex flex-column align-center justify-center text-medium-emphasis pa-10">
        <VIcon
          icon="tabler-tags"
          size="40"
          class="mb-2"
        />
        {{ t('crm.tags.noTags') }}
      </VCardText>
    </VCard>

    <!-- Create/Edit Dialog -->
    <VDialog
      v-model="dialogOpen"
      max-width="520"
      persistent
    >
      <VCard>
        <VCardTitle>
          {{ editingTag ? t('crm.tags.editTag') : t('crm.tags.createTag') }}
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12">
              <AppTextField
                v-model="form.name"
                :label="t('crm.tags.name') + ' *'"
              />
            </VCol>
            <VCol cols="12">
              <AppSelect
                v-model="form.category"
                :label="t('crm.tags.category')"
                :items="CATEGORY_OPTIONS"
              />
            </VCol>
            <VCol cols="12">
              <label class="text-body-2 mb-2 d-block">{{ t('crm.tags.color') }}</label>
              <div class="d-flex flex-wrap gap-2">
                <button
                  v-for="swatch in COLOR_SWATCHES"
                  :key="swatch"
                  type="button"
                  class="color-swatch"
                  :class="{ 'color-swatch--active': form.color === swatch }"
                  :style="{ backgroundColor: swatch }"
                  :aria-label="swatch"
                  @click="form.color = swatch"
                />
              </div>
            </VCol>
            <VCol cols="12">
              <AppTextField
                v-model="form.description"
                :label="t('crm.tags.description')"
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
            {{ t('crm.tags.cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            :disabled="!form.name.trim()"
            @click="saveTag"
          >
            {{ t('crm.tags.save') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirmation -->
    <VDialog
      v-model="deleteDialogOpen"
      max-width="400"
    >
      <VCard>
        <VCardTitle>{{ t('crm.tags.confirmDelete') }}</VCardTitle>
        <VCardText>
          {{ selectedTag?.name }}
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialogOpen = false"
          >
            {{ t('crm.tags.cancel') }}
          </VBtn>
          <VBtn
            color="error"
            @click="deleteTag"
          >
            {{ t('crm.tags.delete') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Assign Players Drawer -->
    <VNavigationDrawer
      v-model="drawerOpen"
      location="end"
      temporary
      width="440"
    >
      <div
        v-if="activeTag"
        class="d-flex flex-column h-100"
      >
        <div class="d-flex align-center justify-space-between pa-4 border-b">
          <div class="d-flex align-center gap-3">
            <VChip
              :style="{ backgroundColor: activeTag.color, color: '#fff' }"
              size="small"
              label
            >
              {{ activeTag.name }}
            </VChip>
            <span class="text-caption text-medium-emphasis">
              {{ t('crm.playersCount', { count: assignedTotal }) }}
            </span>
          </div>
          <IconBtn @click="drawerOpen = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </div>

        <div
          v-if="canManage"
          class="pa-4"
        >
          <AppTextField
            v-model="addSearch"
            :placeholder="t('crm.tags.searchPlayer')"
            prepend-inner-icon="tabler-search"
            density="compact"
            clearable
          />

          <VList
            v-if="addResults.length"
            class="mt-2 border rounded"
            density="compact"
          >
            <VListItem
              v-for="user in addResults"
              :key="user._id"
              @click="assignUser(user)"
            >
              <template #prepend>
                <VAvatar
                  size="30"
                  :variant="!user.avatar ? 'tonal' : undefined"
                  :color="!user.avatar ? 'primary' : undefined"
                >
                  <VImg
                    v-if="user.avatar"
                    :src="user.avatar"
                  />
                  <span v-else class="text-caption">{{ avatarText(user.username) }}</span>
                </VAvatar>
              </template>
              <VListItemTitle>{{ user.username }}</VListItemTitle>
              <template #append>
                <VIcon
                  icon="tabler-plus"
                  size="18"
                  color="primary"
                />
              </template>
            </VListItem>
          </VList>
        </div>

        <VDivider />

        <div class="flex-grow-1 overflow-y-auto">
          <VProgressLinear
            v-if="drawerLoading"
            indeterminate
            color="primary"
          />

          <VList v-if="assignedUsers.length">
            <VListItem
              v-for="user in assignedUsers"
              :key="user._id"
            >
              <template #prepend>
                <VAvatar
                  size="34"
                  :variant="!user.avatar ? 'tonal' : undefined"
                  :color="!user.avatar ? 'primary' : undefined"
                >
                  <VImg
                    v-if="user.avatar"
                    :src="user.avatar"
                  />
                  <span v-else>{{ avatarText(user.username) }}</span>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-medium">
                {{ user.username }}
              </VListItemTitle>
              <VListItemSubtitle>
                {{ user.email || '-' }}
              </VListItemSubtitle>
              <template #append>
                <IconBtn
                  v-if="canManage"
                  size="small"
                  @click="unassignUser(user)"
                >
                  <VIcon
                    icon="tabler-x"
                    size="18"
                  />
                  <VTooltip activator="parent">
                    {{ t('crm.tags.remove') }}
                  </VTooltip>
                </IconBtn>
              </template>
            </VListItem>
          </VList>

          <div
            v-else-if="!drawerLoading"
            class="d-flex flex-column align-center justify-center text-medium-emphasis pa-10"
          >
            <VIcon
              icon="tabler-users-group"
              size="40"
              class="mb-2"
            />
            {{ t('crm.noResults') }}
          </div>
        </div>
      </div>
    </VNavigationDrawer>
  </section>
</template>

<style lang="scss" scoped>
.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: scale(1.1);
  }

  &--active {
    border-color: rgba(var(--v-theme-on-surface), 0.6);
    box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 1);
  }
}
</style>

<route lang="yaml">
meta:
  action: read
  subject: users
</route>
