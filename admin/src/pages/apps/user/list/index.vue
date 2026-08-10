<script setup>
import { paginationMeta } from '@/@fake-db/utils'
import AddNewUserDrawer from '@/views/apps/user/list/AddNewUserDrawer.vue'
import { useUserListStore } from '@/views/apps/user/useUserListStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { avatarText } from '@core/utils/formatters'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { VDataTableServer } from 'vuetify/labs/VDataTable'

const { t } = useI18n()
const userListStore = useUserListStore()
const permissionStore = usePermissionStore()
const searchQuery = ref('')
const selectedRank = ref()
const selectedStatus = ref()
const totalPage = ref(1)
const totalUsers = ref(0)
const users = ref([])
const router = useRouter()
const searchPlaceholder = 'Ara: kullanıcı adı, isim, soyisim, TC veya telefon'
const isExporting = ref(false)
const includeSimilar = ref(false)
const searchMeta = ref(null)
let fetchRequestId = 0

const snackbar = reactive({
  visible: false,
  message: '',
  color: 'success',
})

const options = ref({
  page: 1,
  itemsPerPage: 10,
  sortBy: [],
  groupBy: [],
  search: undefined,
})

// Headers (i18n destekli)
const canViewListDetails = computed(() => permissionStore.can('users.listDetails.read'))

const headers = computed(() => [
  { title: t('user'), key: 'user' },
  ...(canViewListDetails.value
    ? [
      { title: t('email'), key: 'email', sortable: false },
      { title: t('phone'), key: 'phone', sortable: false },
    ]
    : []),
  { title: t('rank'), key: 'rank' },
  { title: t('balance'), key: 'balance' },
  ...(canViewListDetails.value
    ? [
      { title: t('analytics.totalDeposits'), key: 'totalDeposit', sortable: false },
      { title: t('analytics.totalWithdrawals'), key: 'totalWithdrawal', sortable: false },
    ]
    : []),
  { title: t('status'), key: 'status' },
  { title: t('actions'), key: 'actions', sortable: false },
])

const totalPages = computed(() => options.value.itemsPerPage > 0
  ? Math.max(1, Math.ceil(totalUsers.value / options.value.itemsPerPage))
  : 1)

const hasExactMatch = computed(() => searchMeta.value?.resolvedMode === 'exact')
const hasHiddenSimilarMatches = computed(() => hasExactMatch.value && searchMeta.value.similarMatchCount > 0)

const isShowingSimilarMatches = computed(() => searchMeta.value?.resolvedMode === 'all')

const formatTry = value => `${new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)} ₺`

const resolveUserRankColor = rank => {
  switch (rank) {
  case 'admin': return 'secondary'
  case 'partner': return 'warning'
  case 'user': return 'primary'
  default: return 'default'
  }
}

const resolveUserRankIcon = rank => {
  switch (rank) {
  case 'admin': return 'tabler-shield'
  case 'partner': return 'tabler-user-star'
  case 'user': return 'tabler-user'
  default: return 'tabler-user-question'
  }
}

const getSortParam = () => {
  if (!options.value.sortBy.length)
    return undefined

  return JSON.stringify({
    key: options.value.sortBy[0].key,
    order: options.value.sortBy[0].order === 'desc' ? -1 : 1,
  })
}

// 👉 Fetching users
const fetchUsers = () => {
  const requestId = ++fetchRequestId

  userListStore.fetchUsers({
    search: searchQuery.value,
    status: selectedStatus.value,
    rank: selectedRank.value,
    page: options.value.page,
    limit: options.value.itemsPerPage,
    sort: getSortParam(),
    searchMode: 'smart',
    includeSimilar: includeSimilar.value,
  }).then(res => {
    if (requestId !== fetchRequestId)
      return

    const data = res?.data || res
    if (!data.users) {
      console.error('Beklenen kullanıcı verisi gelmedi:', data)

      return
    }
    users.value = data.users
    totalUsers.value = data.totalUsers
    totalPage.value = data.totalPage
    options.value.page = data.page
    searchMeta.value = data.searchMeta
  })
}

watch(options, fetchUsers, { deep: true, immediate: true })
watch([selectedRank, selectedStatus, searchQuery], () => {
  if (includeSimilar.value) {
    includeSimilar.value = false
  } else if (options.value.page === 1) {
    fetchUsers()
  } else {
    options.value.page = 1
  }
})
watch(includeSimilar, () => {
  if (options.value.page === 1)
    fetchUsers()
  else
    options.value.page = 1
})

// i18n için filtreler
const ranks = [
  { title: t('admin'), value: 'admin' },
  { title: t('partner'), value: 'partner' },
  { title: t('user'), value: 'user' },
]

const status = [
  { title: t('active'), value: 'active' },
  { title: t('suspended'), value: 'banned' },
  { title: t('muted'), value: 'muted' },
]

const isAddNewUserDrawerVisible = ref(false)

const addNewUser = userData => {
  userListStore.addUser(userData)
  fetchUsers()
}

const editUser = id => {
  router.push({ name: 'apps-user-view-id', params: { id } })
}

const showMessage = (message, color) => {
  snackbar.message = message
  snackbar.color = color
  snackbar.visible = true
}

const copyAccountNumber = async numericId => {
  if (numericId === null || numericId === undefined)
    return

  try {
    await navigator.clipboard.writeText(String(numericId))
    showMessage(t('accountNumberCopied'), 'success')
  } catch (error) {
    console.error('Hesap numarası panoya kopyalanamadı:', error)
    showMessage(t('copyFailed'), 'error')
  }
}

const exportUsers = async () => {
  if (!canViewListDetails.value || isExporting.value)
    return

  isExporting.value = true

  try {
    const XLSXModule = await import('xlsx')
    const XLSX = XLSXModule.default || XLSXModule

    const result = await userListStore.fetchUsers({
      search: searchQuery.value,
      status: selectedStatus.value,
      rank: selectedRank.value,
      page: 1,
      limit: -1,
      sort: getSortParam(),
      searchMode: 'smart',
      includeSimilar: includeSimilar.value,
    })

    const rows = result.users.map(user => ({
      [t('username')]: user.username || '',
      [t('email')]: user.local?.email || '',
      [t('phone')]: user.phone || '',
      [t('rank')]: user.rank || '',
      [t('balance')]: Number(user.activeWallet?.balance) || 0,
      [t('fiatCurrency')]: user.fiatCurrency || 'TRY',
      [t('analytics.totalDeposits')]: Number(user.totalDeposit) || 0,
      [t('analytics.totalWithdrawals')]: Number(user.totalWithdrawal) || 0,
      [t('status')]: user.ban ? t('suspended') : t('active'),
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)

    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
    ]

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, t('users.list'))
    XLSX.writeFile(workbook, `kullanici-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`, {
      compression: true,
    })
    showMessage(t('userExportSuccess'), 'success')
  } catch (error) {
    console.error('Kullanıcı listesi dışa aktarılamadı:', error)
    showMessage(t('userExportError'), 'error')
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard :title="t('searchFilter')">
          <!-- 👉 Filters -->
          <VCardText>
            <VRow>
              <!-- 👉 Select Role -->
              <VCol
                cols="12"
                sm="4"
              >
                <AppSelect
                  v-model="selectedRank"
                  :label="t('selectRank')"
                  :items="ranks"
                  clearable
                  clear-icon="tabler-x"
                />
              </VCol>
             
              <!-- 👉 Select Status -->
              <VCol
                cols="12"
                sm="4"
              >
                <AppSelect
                  v-model="selectedStatus"
                  :label="t('selectStatus')"
                  :items="status"
                  clearable
                  clear-icon="tabler-x"
                />
              </VCol>

              <VCol
                cols="12"
                sm="4"
                class="d-flex align-end justify-sm-end"
              >
                <VBtn
                  v-if="canViewListDetails"
                  color="success"
                  prepend-icon="tabler-file-spreadsheet"
                  :loading="isExporting"
                  @click="exportUsers"
                >
                  {{ t('exportXlsx') }}
                </VBtn>
              </VCol>
            </VRow>
          </VCardText>

          <VDivider />

          <VCardText class="d-flex flex-wrap py-4 gap-4">
            <div class="me-3 d-flex gap-3">
              <AppSelect
                :model-value="options.itemsPerPage"
                :items="[
                  { value: 10, title: '10' },
                  { value: 25, title: '25' },
                  { value: 50, title: '50' },
                  { value: 100, title: '100' },
                  { value: -1, title: t('all') },
                ]"
                style="width: 6.25rem;"
                @update:model-value="options.itemsPerPage = parseInt($event, 10)"
              />
            </div>
            <VSpacer />

            <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
              <!-- 👉 Search  -->
              <div style="inline-size: 18rem;">
                <AppTextField
                  v-model="searchQuery"
                  :placeholder="searchPlaceholder"
                  density="compact"
                />
              </div>

              <!-- 👉 Add user button -->
              <VBtn
                prepend-icon="tabler-plus"
                @click="isAddNewUserDrawerVisible = true"
              >
                {{ t('addNewUser') }}
              </VBtn>
            </div>
          </VCardText>

          <VDivider />

          <VAlert
            v-if="hasExactMatch"
            type="success"
            variant="tonal"
            class="ma-4 mb-0"
          >
            <div class="d-flex flex-wrap align-center justify-space-between gap-3">
              <span>
                {{ hasHiddenSimilarMatches
                  ? t('exactUserMatchFound', { count: searchMeta.similarMatchCount })
                  : t('exactUserMatchOnly') }}
              </span>
              <VBtn
                v-if="hasHiddenSimilarMatches"
                size="small"
                variant="tonal"
                @click="includeSimilar = true"
              >
                {{ t('showSimilarUsers', { count: searchMeta.similarMatchCount }) }}
              </VBtn>
            </div>
          </VAlert>

          <VAlert
            v-else-if="isShowingSimilarMatches"
            type="info"
            variant="tonal"
            class="ma-4 mb-0"
          >
            <div class="d-flex flex-wrap align-center justify-space-between gap-3">
              <span>
                {{ t('similarUsersShown', { count: searchMeta.similarMatchCount }) }}
              </span>
              <VBtn
                size="small"
                variant="tonal"
                @click="includeSimilar = false"
              >
                {{ t('hideSimilarUsers') }}
              </VBtn>
            </div>
          </VAlert>

          <!-- SECTION datatable -->
          <VDataTableServer
            v-model:items-per-page="options.itemsPerPage"
            v-model:page="options.page"
            :items="users"
            :items-length="totalUsers"
            :headers="headers"
            class="text-no-wrap"
            @update:options="options = $event"
          >
            <!-- User -->
            <template #item.user="{ item }">
              <div class="d-flex align-center">
                <VAvatar
                  size="34"
                  :variant="!item.raw.avatar ? 'tonal' : undefined"
                  :color="!item.raw.avatar ? 'primary' : undefined"
                  class="me-3"
                >
                  <VImg
                    v-if="item.raw.avatar"
                    :src="item.raw.avatar"
                  />
                  <span v-else>{{ avatarText(item.raw.username) }}</span>
                </VAvatar>

                <div class="d-flex flex-column">
                  <div class="d-flex align-center gap-2">
                    <RouterLink
                      v-if="item.raw._id"
                      :to="{ name: 'apps-user-view-id', params: { id: item.raw._id } }"
                    >
                      {{ item.raw.username }}
                    </RouterLink>
                    <span
                      v-else
                      class="text-error"
                    >ID {{ t('missing') }}</span>
                    <VChip
                      v-if="item.raw.isExactMatch && isShowingSimilarMatches"
                      color="success"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ t('exactMatch') }}
                    </VChip>
                  </div>
                  <button
                    v-if="item.raw.numericId !== null && item.raw.numericId !== undefined"
                    type="button"
                    class="d-flex align-center text-caption text-medium-emphasis account-number-copy"
                    :title="t('copyAccountNumber')"
                    :aria-label="t('copyAccountNumber')"
                    @click.stop="copyAccountNumber(item.raw.numericId)"
                  >
                    <span>{{ t('accountNumber') }}: {{ item.raw.numericId }}</span>
                    <VIcon
                      icon="tabler-copy"
                      size="14"
                      class="ms-1"
                    />
                  </button>
                </div>
              </div>
            </template>

            <template #item.email="{ item }">
              {{ item.raw.local?.email || '-' }}
            </template>

            <template #item.phone="{ item }">
              {{ item.raw.phone || '-' }}
            </template>

            <!-- 👉 Rank -->
            <template #item.rank="{ item }">
              <div class="d-flex align-center gap-4">
                <VAvatar
                  :size="30"
                  :color="resolveUserRankColor(item.raw.rank)"
                  variant="tonal"
                >
                  <VIcon
                    :size="20"
                    :icon="resolveUserRankIcon(item.raw.rank)"
                  />
                </VAvatar>
                <span class="text-capitalize font-weight-medium">{{ item.raw.rank }}</span>
              </div>
            </template>

            <!-- 👉 Balance (Active + Dropdown) -->
            <template #item.balance="{ item }">
              <VMenu>
                <template #activator="{ props }">
                  <VChip
                    v-bind="props"
                    color="primary"
                    size="small"
                    label
                    class="cursor-pointer"
                  >
                    {{ item.raw.activeWallet.coinType }}: {{ item.raw.activeWallet.balance }}
                  </VChip>
                </template>

                <VList>
                  <VListSubheader>{{ t('allWallets') }}</VListSubheader>
                  <VListItem
                    v-for="wallet in item.raw.wallets"
                    :key="wallet.coinType + wallet.chain + wallet.type"
                  >
                    <VListItemTitle>
                      {{ wallet.coinType }} ({{ wallet.chain }} - {{ wallet.type }}): {{ wallet.balance }}
                    </VListItemTitle>
                  </VListItem>
                </VList>
              </VMenu>

              <div class="text-sm text-medium-emphasis mt-1">
                {{ t('fiat') }}: {{ item.raw.fiatCurrency }}
              </div>
            </template>

            <template #item.totalDeposit="{ item }">
              <span class="font-weight-medium text-success">{{ formatTry(item.raw.totalDeposit) }}</span>
            </template>

            <template #item.totalWithdrawal="{ item }">
              <span class="font-weight-medium text-error">{{ formatTry(item.raw.totalWithdrawal) }}</span>
            </template>


            <!-- 👉 Status -->
            <template #item.status="{ item }">
              <VChip
                :color="item.raw.ban ? 'error' : 'success'"
                size="small"
                label
                class="text-capitalize"
              >
                {{ item.raw.ban ? t('suspended') : t('active') }}
              </VChip>
            </template>

            <!-- 👉 Actions -->
            <template #item.actions="{ item }">
              <IconBtn @click="editUser(item.raw._id)">
                <VIcon icon="tabler-edit" />
              </IconBtn>
            </template>

            <!-- pagination -->
            <template #bottom>
              <VDivider />
              <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
                <p class="text-sm text-disabled mb-0">
                  {{ paginationMeta(options, totalUsers) }}
                </p>
                <VPagination
                  v-model="options.page"
                  :length="totalPages"
                  :total-visible="$vuetify.display.xs ? 1 : totalPages"
                />
              </div>
            </template>
          </VDataTableServer>
        </VCard>

        <!-- 👉 Add New User -->
        <AddNewUserDrawer
          v-model:isDrawerOpen="isAddNewUserDrawerVisible"
          @user-data="addNewUser"
        />

        <VSnackbar
          v-model="snackbar.visible"
          :color="snackbar.color"
          :timeout="3000"
        >
          {{ snackbar.message }}
        </VSnackbar>
      </VCol>
    </VRow>
  </section>
</template>

<style lang="scss">
.app-user-search-filter {
  inline-size: 31.6rem;
}
.text-capitalize {
  text-transform: capitalize;
}
.user-list-name:not(:hover) {
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
}
.account-number-copy {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
</style>
