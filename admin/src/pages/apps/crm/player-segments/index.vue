<script setup>
import axios from '@/plugins/axios'
import { avatarText } from '@core/utils/formatters'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const SEGMENT_ICONS = {
  noDeposit: 'tabler-user-question',
  newSignups: 'tabler-user-plus',
  birthdaySoon: 'tabler-cake',
  firstDepositors: 'tabler-coin',
  vipPlayers: 'tabler-crown',
  activePlayers: 'tabler-activity',
  regularPlayers: 'tabler-repeat',
  highRollers: 'tabler-trending-up',
  whales: 'tabler-fish',
  riskyPlayers: 'tabler-alert-triangle',
  lossStreak: 'tabler-trending-down',
  dormantPlayers: 'tabler-moon',
  bonusAbusers: 'tabler-shield-x',
  churned: 'tabler-user-off',
}

const SEGMENT_COLORS = {
  noDeposit: 'secondary',
  newSignups: 'info',
  birthdaySoon: 'info',
  firstDepositors: 'success',
  vipPlayers: 'warning',
  activePlayers: 'success',
  regularPlayers: 'primary',
  highRollers: 'primary',
  whales: 'primary',
  riskyPlayers: 'error',
  lossStreak: 'error',
  dormantPlayers: 'secondary',
  bonusAbusers: 'error',
  churned: 'secondary',
}

const loading = ref(false)
const summary = ref([])

const fetchSummary = async () => {
  loading.value = true
  try {
    const res = await axios.get('/admin/player-segments/summary')

    summary.value = res.data?.data || []
  } catch (err) {
    console.error('Oyuncu segmentleri alınamadı:', err)
  } finally {
    loading.value = false
  }
}

const segmentCards = computed(() => summary.value.map(item => ({
  ...item,
  title: t(`crm.segments.${item.key}.title`),
  description: t(`crm.segments.${item.key}.description`),
  icon: SEGMENT_ICONS[item.key] || 'tabler-users',
  color: SEGMENT_COLORS[item.key] || 'primary',
})))

// Drawer state
const drawerOpen = ref(false)
const activeSegment = ref(null)
const drawerLoading = ref(false)
const drawerUsers = ref([])
const drawerSearch = ref('')
const drawerPage = ref(1)
const drawerTotalPages = ref(1)
const drawerTotal = ref(0)

const formatTry = value => `${new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)} ₺`

const fetchSegmentUsers = async () => {
  if (!activeSegment.value) return
  drawerLoading.value = true
  try {
    const res = await axios.get(`/admin/player-segments/${activeSegment.value.key}/users`, {
      params: {
        page: drawerPage.value,
        limit: 20,
        search: drawerSearch.value || undefined,
      },
    })
    const data = res.data?.data || {}

    drawerUsers.value = data.users || []
    drawerTotalPages.value = data.totalPages || 1
    drawerTotal.value = data.total || 0
  } catch (err) {
    console.error('Segment oyuncuları alınamadı:', err)
    drawerUsers.value = []
  } finally {
    drawerLoading.value = false
  }
}

const openSegment = segment => {
  activeSegment.value = segment
  drawerSearch.value = ''
  drawerPage.value = 1
  drawerOpen.value = true
  fetchSegmentUsers()
}

const exportingSegment = ref(false)

const exportSegmentUsers = async () => {
  if (!activeSegment.value || exportingSegment.value) return
  exportingSegment.value = true
  try {
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule

    const res = await axios.get(`/admin/player-segments/${activeSegment.value.key}/users`, {
      params: {
        search: drawerSearch.value || undefined,
        limit: -1,
      },
    })
    const users = res.data?.data?.users || []

    const rows = users.map(u => ({
      'Kullanıcı Adı': u.username || '',
      'E-posta': u.email || '',
      'VIP Seviyesi': u.vipLevel || 'VIP 0',
      'Toplam Yatırım': u.totalDeposit || 0,
      'Toplam Çekim': u.totalWithdrawal || 0,
      'Net Değer': u.netValue || 0,
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)

    worksheet['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ]

    const workbook = XLSX.utils.book_new()
    const sheetName = t(`crm.segments.${activeSegment.value.key}.title`).slice(0, 31)

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Segment')
    XLSX.writeFile(workbook, `segment-${activeSegment.value.key}-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      compression: true,
    })
  } catch (err) {
    console.error('Segment oyuncuları dışa aktarılamadı:', err)
  } finally {
    exportingSegment.value = false
  }
}

watch(drawerPage, fetchSegmentUsers)

let searchTimeout = null

watch(drawerSearch, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    drawerPage.value = 1
    fetchSegmentUsers()
  }, 350)
})

onMounted(fetchSummary)
</script>

<template>
  <section>
    <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          {{ t('crm.playerSegments') }}
        </h4>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('crm.playerSegmentsSubtitle') }}
        </p>
      </div>
      <VBtn
        variant="tonal"
        prepend-icon="tabler-refresh"
        :loading="loading"
        @click="fetchSummary"
      >
        {{ t('crm.refresh') }}
      </VBtn>
    </div>

    <VRow>
      <VCol
        v-for="segment in segmentCards"
        :key="segment.key"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <VCard
          class="segment-card cursor-pointer h-100"
          :loading="loading"
          @click="openSegment(segment)"
        >
          <VCardText class="d-flex flex-column gap-3">
            <div class="d-flex align-center justify-space-between">
              <VAvatar
                :color="segment.color"
                variant="tonal"
                size="42"
              >
                <VIcon
                  :icon="segment.icon"
                  size="22"
                />
              </VAvatar>
              <div class="text-h4 font-weight-medium">
                {{ segment.count ?? 0 }}
              </div>
            </div>
            <div>
              <h6 class="text-h6 mb-1">
                {{ segment.title }}
              </h6>
              <p class="text-body-2 text-medium-emphasis mb-0">
                {{ segment.description }}
              </p>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Segment Detail Drawer -->
    <VNavigationDrawer
      v-model="drawerOpen"
      location="end"
      temporary
      width="480"
      class="segment-drawer"
    >
      <div
        v-if="activeSegment"
        class="d-flex flex-column h-100"
      >
        <div class="d-flex align-center justify-space-between pa-4 border-b">
          <div class="d-flex align-center gap-3">
            <VAvatar
              :color="SEGMENT_COLORS[activeSegment.key] || 'primary'"
              variant="tonal"
              size="38"
            >
              <VIcon :icon="SEGMENT_ICONS[activeSegment.key] || 'tabler-users'" />
            </VAvatar>
            <div>
              <h6 class="text-h6 mb-0">
                {{ t(`crm.segments.${activeSegment.key}.title`) }}
              </h6>
              <span class="text-caption text-medium-emphasis">
                {{ t('crm.playersCount', { count: drawerTotal }) }}
              </span>
            </div>
          </div>
          <IconBtn @click="drawerOpen = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </div>

        <div class="d-flex align-center gap-3 pa-4">
          <AppTextField
            v-model="drawerSearch"
            :placeholder="t('crm.searchPlaceholder')"
            prepend-inner-icon="tabler-search"
            density="compact"
            clearable
            class="flex-grow-1"
          />
          <VBtn
            variant="tonal"
            size="small"
            prepend-icon="tabler-file-export"
            :loading="exportingSegment"
            :disabled="!drawerTotal"
            @click="exportSegmentUsers"
          >
            Excel
          </VBtn>
        </div>

        <VDivider />

        <div class="flex-grow-1 overflow-y-auto">
          <VProgressLinear
            v-if="drawerLoading"
            indeterminate
            color="primary"
          />

          <VList v-if="drawerUsers.length">
            <VListItem
              v-for="user in drawerUsers"
              :key="user._id"
              :to="{ name: 'apps-user-view-id', params: { id: user._id } }"
            >
              <template #prepend>
                <VAvatar
                  size="38"
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
                <div class="d-flex flex-column align-end">
                  <VChip
                    size="x-small"
                    color="warning"
                    variant="tonal"
                    class="mb-1"
                  >
                    {{ user.vipLevel || 'VIP 0' }}
                  </VChip>
                  <span class="text-caption font-weight-medium text-success">
                    {{ formatTry(user.totalDeposit) }}
                  </span>
                </div>
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

        <VDivider />

        <div
          v-if="drawerTotalPages > 1"
          class="d-flex justify-center pa-3"
        >
          <VPagination
            v-model="drawerPage"
            :length="drawerTotalPages"
            :total-visible="5"
            density="compact"
          />
        </div>
      </div>
    </VNavigationDrawer>
  </section>
</template>

<style lang="scss" scoped>
.segment-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 6px 20px 0 rgba(var(--v-shadow-key-umbra-color), 0.16);
    transform: translateY(-2px);
  }
}
</style>

<route lang="yaml">
meta:
  action: read
  subject: users
</route>
