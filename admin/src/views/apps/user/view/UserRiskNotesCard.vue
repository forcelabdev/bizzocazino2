<script setup>
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ability from "@/plugins/casl/ability"
import { useUserListStore } from "@/views/apps/user/useUserListStore"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const { t } = useI18n()
const userStore = useUserListStore()

const canManage = computed(() => ability.can("update", "users"))

const snackbar = ref({ visible: false, message: "", color: "success" })

function showSnackbar(message, color = "success") {
  snackbar.value.message = message
  snackbar.value.color = color
  snackbar.value.visible = true
}

/* --------------------------------------------------------------------- */
/* Etiketler                                                              */
/* --------------------------------------------------------------------- */

const allTags = ref([])
const tagActionInProgress = ref(null)
const selectedNewTagId = ref(null)

const assignedTags = computed(() => {
  const rawTags = Array.isArray(props.userData?.tags) ? props.userData.tags : []

  // Sadece populate edilmiş (obje) etiketleri gösterebiliriz; ham ObjectId
  // gelirse (nadiren) allTags listesinden eşleştirilir.
  return rawTags
    .map(tag => {
      if (typeof tag === "object" && tag?._id) return tag

      return allTags.value.find(t => t._id === tag) || null
    })
    .filter(Boolean)
})

const assignedTagIds = computed(() => new Set(assignedTags.value.map(tag => tag._id)))

const hasRiskTag = computed(() => assignedTags.value.some(tag => tag.category === "risk"))

const availableTagsToAdd = computed(() => allTags.value.filter(tag => !assignedTagIds.value.has(tag._id)))

const fetchAllTags = async () => {
  try {
    allTags.value = await userStore.fetchTags()
  } catch (error) {
    console.error("Etiketler alınamadı:", error)
  }
}

const emitUpdatedTags = updatedTagIds => {
  const tagObjects = allTags.value.filter(tag => updatedTagIds.has(tag._id))

  emit("updated", { ...props.userData, tags: tagObjects })
}

const addTag = async () => {
  if (!selectedNewTagId.value || !props.userData?._id) return

  const tagId = selectedNewTagId.value

  tagActionInProgress.value = tagId
  try {
    await userStore.assignTagToUser(tagId, props.userData._id)
    emitUpdatedTags(new Set([...assignedTagIds.value, tagId]))
    selectedNewTagId.value = null
  } catch (error) {
    console.error("Etiket eklenemedi:", error)
    showSnackbar(t("userNotes.noteAddFailed"), "error")
  } finally {
    tagActionInProgress.value = null
  }
}

const removeTag = async tag => {
  if (!props.userData?._id) return

  tagActionInProgress.value = tag._id
  try {
    await userStore.unassignTagFromUser(tag._id, props.userData._id)

    const remaining = new Set(assignedTagIds.value)

    remaining.delete(tag._id)
    emitUpdatedTags(remaining)
  } catch (error) {
    console.error("Etiket kaldırılamadı:", error)
  } finally {
    tagActionInProgress.value = null
  }
}

/* --------------------------------------------------------------------- */
/* Notlar                                                                 */
/* --------------------------------------------------------------------- */

const notes = ref([])
const notesLoading = ref(false)
const newNoteText = ref("")
const noteSubmitting = ref(false)
const noteDeletingId = ref(null)

const fetchNotes = async () => {
  if (!props.userData?._id) return

  notesLoading.value = true
  try {
    notes.value = await userStore.fetchUserNotes(props.userData._id)
  } catch (error) {
    console.error("Notlar alınamadı:", error)
  } finally {
    notesLoading.value = false
  }
}

const addNote = async () => {
  const text = newNoteText.value.trim()

  if (!text || !props.userData?._id) return

  noteSubmitting.value = true
  try {
    const response = await userStore.createUserNote(props.userData._id, text)

    notes.value = [response.data, ...notes.value]
    newNoteText.value = ""
    showSnackbar(t("userNotes.noteAdded"), "success")
  } catch (error) {
    console.error("Not eklenemedi:", error)
    showSnackbar(error.response?.data?.message || t("userNotes.noteAddFailed"), "error")
  } finally {
    noteSubmitting.value = false
  }
}

const removeNote = async noteId => {
  if (!props.userData?._id) return
  if (!confirm(t("userNotes.deleteNoteConfirm"))) return

  noteDeletingId.value = noteId
  try {
    await userStore.deleteUserNote(props.userData._id, noteId)
    notes.value = notes.value.filter(note => note._id !== noteId)
    showSnackbar(t("userNotes.noteDeleted"), "success")
  } catch (error) {
    console.error("Not silinemedi:", error)
    showSnackbar(error.response?.data?.message || t("userNotes.noteDeleteFailed"), "error")
  } finally {
    noteDeletingId.value = null
  }
}

const formatDate = value => {
  if (!value) return "-"

  return new Date(value).toLocaleString("tr-TR")
}

onMounted(() => {
  fetchAllTags()
  fetchNotes()
})
</script>

<template>
  <VCard>
    <VCardItem :title="t('userNotes.cardTitle')">
      <template #prepend>
        <VBadge
          :model-value="hasRiskTag"
          color="error"
          dot
          location="top end"
        >
          <VIcon
            icon="tabler-notes"
            size="22"
            class="me-2"
          />
        </VBadge>
      </template>
      <template
        v-if="hasRiskTag"
        #append
      >
        <VChip
          color="error"
          size="small"
          variant="elevated"
        >
          <VIcon
            icon="tabler-alert-triangle"
            size="14"
            class="me-1"
          />
          {{ t("userNotes.riskUser") }}
        </VChip>
      </template>
    </VCardItem>

    <VDivider />

    <VCardText>
      <!-- Etiketler -->
      <div class="mb-2 text-body-2 text-disabled">
        {{ t("userNotes.tagsTitle") }}
      </div>
      <div class="d-flex flex-wrap align-center gap-2 mb-4">
        <VChip
          v-for="tag in assignedTags"
          :key="tag._id"
          :color="tag.color || 'primary'"
          size="small"
          :closable="canManage"
          :disabled="tagActionInProgress === tag._id"
          @click:close="removeTag(tag)"
        >
          {{ tag.name }}
        </VChip>

        <span
          v-if="!assignedTags.length"
          class="text-body-2 text-disabled"
        >
          {{ t("userNotes.noTags") }}
        </span>

        <div
          v-if="canManage && availableTagsToAdd.length"
          class="d-flex align-center gap-2"
        >
          <VSelect
            v-model="selectedNewTagId"
            :items="availableTagsToAdd"
            item-title="name"
            item-value="_id"
            :placeholder="t('userNotes.addTag')"
            density="compact"
            hide-details
            style="min-inline-size: 180px;"
          >
            <template #item="{ props: itemProps, item }">
              <VListItem v-bind="itemProps">
                <template #prepend>
                  <VIcon
                    icon="tabler-tag"
                    :color="item.raw.color"
                    size="16"
                  />
                </template>
              </VListItem>
            </template>
          </VSelect>
          <VBtn
            icon
            size="small"
            variant="tonal"
            color="primary"
            :disabled="!selectedNewTagId"
            :loading="tagActionInProgress === selectedNewTagId"
            @click="addTag"
          >
            <VIcon icon="tabler-plus" />
          </VBtn>
        </div>
      </div>

      <VDivider class="mb-4" />

      <!-- Notlar -->
      <div class="mb-2 text-body-2 text-disabled">
        {{ t("userNotes.notesTitle") }}
      </div>

      <div
        v-if="canManage"
        class="d-flex flex-column gap-2 mb-4"
      >
        <VTextarea
          v-model="newNoteText"
          :placeholder="t('userNotes.notePlaceholder')"
          rows="2"
          auto-grow
          density="compact"
          hide-details
        />
        <div class="d-flex justify-end">
          <VBtn
            size="small"
            color="primary"
            :disabled="!newNoteText.trim()"
            :loading="noteSubmitting"
            @click="addNote"
          >
            <VIcon
              icon="tabler-plus"
              class="me-1"
              size="16"
            />
            {{ t("userNotes.addNote") }}
          </VBtn>
        </div>
      </div>

      <VProgressLinear
        v-if="notesLoading"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <div
        v-if="!notesLoading && !notes.length"
        class="text-body-2 text-disabled text-center py-4"
      >
        {{ t("userNotes.noNotes") }}
      </div>

      <div
        v-else
        class="d-flex flex-column gap-3"
        style="max-block-size: 320px; overflow-y: auto;"
      >
        <div
          v-for="note in notes"
          :key="note._id"
          class="d-flex align-start justify-space-between gap-3 pa-3 rounded"
          style="background: rgba(var(--v-theme-on-surface), 0.04);"
        >
          <div>
            <div class="d-flex align-center gap-2 mb-1">
              <span class="font-weight-medium text-body-2">
                {{ note.authorSnapshot?.username || "-" }}
              </span>
              <span class="text-caption text-disabled">
                {{ formatDate(note.createdAt) }}
              </span>
            </div>
            <div class="text-body-2" style="white-space: pre-wrap;">
              {{ note.text }}
            </div>
          </div>
          <VBtn
            v-if="canManage"
            icon
            size="x-small"
            variant="text"
            color="error"
            :loading="noteDeletingId === note._id"
            @click="removeNote(note._id)"
          >
            <VIcon
              icon="tabler-trash"
              size="16"
            />
          </VBtn>
        </div>
      </div>
    </VCardText>
  </VCard>

  <VSnackbar
    v-model="snackbar.visible"
    :timeout="3000"
    :color="snackbar.color"
    location="top"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
