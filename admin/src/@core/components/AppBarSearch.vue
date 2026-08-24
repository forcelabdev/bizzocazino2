<script setup>
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import {
  VList,
  VListItem,
  VListSubheader,
} from 'vuetify/components/VList'

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  searchQuery: {
    type: String,
    required: true,
  },
  searchResults: {
    type: Array,
    required: true,
  },
  suggestions: {
    type: Array,
    required: false,
  },
  noDataSuggestion: {
    type: Array,
    required: false,
  },
  // 👉 Canlı kullanıcı arama sonuçları (kart görünümü). Her öğe zaten
  // ekranda gösterilecek şekilde biçimlendirilmiş gelir (bkz. NavSearchBar.vue).
  userResults: {
    type: Array,
    required: false,
    default: () => [],
  },
  userResultsLoading: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits([
  'update:isDialogVisible',
  'update:searchQuery',
  'itemSelected',
  'userSelected',
])

const { ctrl_k, meta_k } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 'k' && e.type === 'keydown')
      e.preventDefault()
  },
})

const refSearchList = ref()
const searchQuery = ref(structuredClone(toRaw(props.searchQuery)))
const refSearchInput = ref()
const isLocalDialogVisible = ref(structuredClone(toRaw(props.isDialogVisible)))
const searchResults = ref(structuredClone(toRaw(props.searchResults)))

// 👉 Watching props change
watch(props, () => {
  isLocalDialogVisible.value = structuredClone(toRaw(props.isDialogVisible))
  searchResults.value = structuredClone(toRaw(props.searchResults))
  searchQuery.value = structuredClone(toRaw(props.searchQuery))
})
watch([
  ctrl_k,
  meta_k,
], () => {
  isLocalDialogVisible.value = true
  emit('update:isDialogVisible', true)
})

// 👉 clear search result and close the dialog
const clearSearchAndCloseDialog = () => {
  emit('update:isDialogVisible', false)
  emit('update:searchQuery', '')
}

watchEffect(() => {
  if (!searchQuery.value.length)
    searchResults.value = []
})

const getFocusOnSearchList = e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    refSearchList.value?.focus('next')
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    refSearchList.value?.focus('prev')
  }
}

const dialogModelValueUpdate = val => {
  emit('update:isDialogVisible', val)
  emit('update:searchQuery', '')
}

// Category headers are now real, already-localized section names
// (e.g. "Kullanıcılar", "Finans") coming straight from the app's
// navigation config, so we just display them as-is.
const resolveCategories = val => val
</script>

<template>
  <VDialog
    max-width="600"
    :model-value="isLocalDialogVisible"
    :height="$vuetify.display.smAndUp ? '550' : '100%'"
    :fullscreen="$vuetify.display.width < 600"
    class="app-bar-search-dialog"
    @update:model-value="dialogModelValueUpdate"
    @keyup.esc="clearSearchAndCloseDialog"
  >
    <VCard
      height="100%"
      width="100%"
      class="position-relative"
    >
      <VCardText
        class="pt-1"
        style="min-block-size: 65px;"
      >
        <!-- 👉 Search Input -->
        <VTextField
          ref="refSearchInput"
          v-model="searchQuery"
          autofocus
          density="comfortable"
          variant="plain"
          class="app-bar-autocomplete-box"
          @keyup.esc="clearSearchAndCloseDialog"
          @keydown="getFocusOnSearchList"
          @update:model-value="$emit('update:searchQuery', searchQuery)"
        >
          <!-- 👉 Prepend Inner -->
          <template #prepend-inner>
            <div class="d-flex align-center text-high-emphasis me-1">
              <VIcon
                size="22"
                icon="tabler-search"
                class="mt-1"
                style="opacity: 1;"
              />
            </div>
          </template>

          <!-- 👉 Append Inner -->
          <template #append-inner>
            <div class="d-flex align-center">
              <div
                class="text-base text-disabled cursor-pointer me-1"
                @click="clearSearchAndCloseDialog"
              >
                [esc]
              </div>

              <IconBtn
                size="small"
                @click="clearSearchAndCloseDialog"
              >
                <VIcon icon="tabler-x" />
              </IconBtn>
            </div>
          </template>
        </VTextField>
      </VCardText>

      <!-- 👉 Divider -->
      <VDivider />

      <!-- 👉 Perfect Scrollbar -->
      <PerfectScrollbar
        :options="{ wheelPropagation: false, suppressScrollX: true }"
        class="h-100"
      >
        <!-- 👉 Canlı Kullanıcı Arama Sonuçları (kart görünümü) -->
        <div
          v-show="searchQuery.length && (userResultsLoading || !!userResults.length)"
          class="pa-2"
        >
          <VListSubheader class="text-disabled">
            Kullanıcılar
          </VListSubheader>

          <div
            v-if="userResultsLoading"
            class="d-flex align-center gap-2 px-4 py-3"
          >
            <VProgressCircular
              size="18"
              width="2"
              indeterminate
              color="primary"
            />
            <span class="text-caption text-disabled">Kullanıcılar aranıyor...</span>
          </div>

          <VList
            v-else
            density="compact"
            class="app-bar-user-search-list"
          >
            <VListItem
              v-for="user in userResults"
              :key="user._id"
              link
              rounded="lg"
              class="app-bar-user-result border mb-2"
              lines="two"
              @click="$emit('userSelected', user)"
            >
              <template #prepend>
                <VAvatar
                  size="38"
                  :variant="!user.avatar ? 'tonal' : undefined"
                  :color="!user.avatar ? 'primary' : undefined"
                  class="me-3"
                >
                  <VImg
                    v-if="user.avatar"
                    :src="user.avatar"
                  />
                  <span
                    v-else
                    class="text-caption font-weight-medium"
                  >{{ user.initials }}</span>
                </VAvatar>
              </template>

              <VListItemTitle class="d-flex align-center flex-wrap gap-2">
                <span class="font-weight-medium">{{ user.username }}</span>
                <VChip
                  size="x-small"
                  :color="user.rankColor"
                  variant="tonal"
                  class="text-capitalize"
                >
                  {{ user.rank }}
                </VChip>
              </VListItemTitle>

              <VListItemSubtitle class="d-flex flex-wrap align-center gap-x-3 gap-y-1 text-caption mt-1">
                <span v-if="user.numericId">Hesap No: {{ user.numericId }}</span>
                <span v-if="user.email">{{ user.email }}</span>
                <span v-if="user.phone">{{ user.phone }}</span>
              </VListItemSubtitle>

              <template #append>
                <div class="d-flex flex-column align-end gap-1">
                  <VChip
                    size="x-small"
                    color="primary"
                    label
                  >
                    {{ user.balanceLabel }}
                  </VChip>
                  <VIcon
                    size="16"
                    icon="tabler-corner-down-left"
                    class="enter-icon text-disabled"
                  />
                </div>
              </template>
            </VListItem>
          </VList>
        </div>

        <VDivider v-show="searchQuery.length && (userResultsLoading || !!userResults.length)" />

        <!-- 👉 Search List -->
        <VList
          v-show="searchQuery.length && !!searchResults.length"
          ref="refSearchList"
          density="compact"
          class="app-bar-search-list"
        >
          <!-- 👉 list Item /List Sub header -->
          <template
            v-for="item in searchResults"
            :key="item.title"
          >
            <VListSubheader
              v-if="'header' in item"
              class="text-disabled"
            >
              {{ resolveCategories(item.title) }}
            </VListSubheader>

            <template v-else>
              <slot
                name="searchResult"
                :item="item"
              >
                <VListItem
                  link
                  @click="$emit('itemSelected', item)"
                >
                  <template #prepend>
                    <VIcon
                      size="20"
                      :icon="item.icon"
                      class="me-3"
                    />
                  </template>

                  <template #append>
                    <VIcon
                      size="20"
                      icon="tabler-corner-down-left"
                      class="enter-icon text-disabled"
                    />
                  </template>

                  <VListItemTitle>
                    {{ item.title }}
                  </VListItemTitle>
                </VListItem>
              </slot>
            </template>
          </template>
        </VList>

        <!-- 👉 Suggestions -->
        <div
          v-show="!!searchResults && !searchQuery"
          class="h-100"
        >
          <slot name="suggestions">
            <VCardText class="app-bar-search-suggestions h-100 pa-10">
              <VRow
                v-if="props.suggestions"
                class="gap-y-4"
              >
                <VCol
                  v-for="suggestion in props.suggestions"
                  :key="suggestion.title"
                  cols="12"
                  sm="6"
                  class="ps-6"
                >
                  <p class="text-xs text-disabled text-uppercase">
                    {{ suggestion.title }}
                  </p>

                  <VList class="card-list">
                    <VListItem
                      v-for="item in suggestion.content"
                      :key="item.title"
                      link
                      :title="item.title"
                      class="app-bar-search-suggestion"
                      @click="$emit('itemSelected', item)"
                    >
                      <template #prepend>
                        <VIcon
                          :icon="item.icon"
                          size="20"
                          class="me-2"
                        />
                      </template>
                    </VListItem>
                  </VList>
                </VCol>
              </VRow>
            </VCardText>
          </slot>
        </div>

        <!-- 👉 No Data found -->
        <div
          v-show="!searchResults.length && !userResults.length && !userResultsLoading && searchQuery.length"
          class="h-100"
        >
          <slot name="noData">
            <VCardText class="h-100">
              <div class="app-bar-search-suggestions d-flex flex-column align-center justify-center text-high-emphasis h-100">
                <VIcon
                  size="75"
                  icon="tabler-file-x"
                />
                <div class="d-flex align-center flex-wrap justify-center gap-2 text-h6 my-3">
                  <span>Sonuç bulunamadı: </span>
                  <span>"{{ searchQuery }}"</span>
                </div>
                <div
                  v-if="props.noDataSuggestion"
                  class="mt-8"
                >
                  <span class="d-flex justify-center text-disabled">Bunları deneyebilirsiniz</span>
                  <h6
                    v-for="suggestion in props.noDataSuggestion"
                    :key="suggestion.title"
                    class="app-bar-search-suggestion text-sm font-weight-regular cursor-pointer mt-3"
                    @click="$emit('itemSelected', suggestion)"
                  >
                    <VIcon
                      size="20"
                      :icon="suggestion.icon"
                      class="me-3"
                    />
                    <span class="text-sm">{{ suggestion.title }}</span>
                  </h6>
                </div>
              </div>
            </VCardText>
          </slot>
        </div>
      </PerfectScrollbar>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.app-bar-search-suggestions {
  .app-bar-search-suggestion {
    &:hover {
      color: rgb(var(--v-theme-primary));
    }
  }
}

.app-bar-autocomplete-box {
  .v-field__input {
    padding-block-end: 0.425rem;
    padding-block-start: 1.16rem;
  }

  .v-field__append-inner,
  .v-field__prepend-inner {
    padding-block-start: 0.95rem;
  }

  .v-field__field input {
    text-align: start !important;
  }
}

.app-bar-search-dialog {
  .v-overlay__scrim {
    backdrop-filter: blur(4px);
  }

  .v-list-item-title {
    font-size: 0.875rem !important;
  }

  .app-bar-search-list {
    .v-list-item,
    .v-list-subheader {
      font-size: 0.75rem;
      padding-inline: 1.5rem !important;
    }

    .v-list-item {
      .v-list-item__append {
        .enter-icon {
          visibility: hidden;
        }
      }

      &:hover,
      &:active,
      &:focus {
        .v-list-item__append {
          .enter-icon {
            visibility: visible;
          }
        }
      }
    }

    .v-list-subheader {
      line-height: 1;
      min-block-size: auto;
      padding-block: 0.6875rem 0.3125rem;
      text-transform: uppercase;
    }
  }

  .app-bar-user-search-list {
    .app-bar-user-result {
      border-color: rgba(var(--v-border-color), var(--v-border-opacity)) !important;
      transition: border-color 0.2s ease, background-color 0.2s ease;

      .v-list-item__append {
        .enter-icon {
          visibility: hidden;
        }
      }

      &:hover,
      &:focus {
        border-color: rgb(var(--v-theme-primary)) !important;
        background-color: rgba(var(--v-theme-primary), 0.04);

        .v-list-item__append {
          .enter-icon {
            visibility: visible;
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 16px;
}
</style>
