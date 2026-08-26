<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const { t } = useI18n()
const userStore = useUserListStore()

/* --------------------------------------------------------------------- */
/* Finansal rapor                                                        */
/* --------------------------------------------------------------------- */

const periods = [
  { value: "daily", label: t("userControls.periods.daily") },
  { value: "weekly", label: t("userControls.periods.weekly") },
  { value: "monthly", label: t("userControls.periods.monthly") },
  { value: "all", label: t("userControls.periods.all") },
  { value: "custom", label: t("userControls.periods.custom") },
]

const selectedPeriod = ref("monthly")
const customDateFrom = ref("")
const customDateTo = ref("")
const reportLoading = ref(false)
const report = ref({
  totalDeposit: 0,
  depositCount: 0,
  totalWithdrawal: 0,
  withdrawalCount: 0,
  netProfit: 0,
  manualReceivable: 0,
  manualDebt: 0,
  bonusTotal: 0,
  turnover: 0,
  ggr: 0,
})

const currencyCode = computed(() => props.userData?.fiatCurrency || "USD")

const formatMoney = value => {
  const number = Number(value || 0)

  return `${number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

const formatDate = value => {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const financialCards = computed(() => [
  {
    key: "deposits",
    label: t("userControls.report.deposits"),
    value: report.value.totalDeposit,
    count: report.value.depositCount,
    color: "success",
  },
  {
    key: "withdrawals",
    label: t("userControls.report.withdrawals"),
    value: report.value.totalWithdrawal,
    count: report.value.withdrawalCount,
    color: "error",
  },
  {
    key: "netProfit",
    label: t("userControls.report.netProfit"),
    value: report.value.netProfit,
  },
  {
    key: "manualReceivable",
    label: t("userControls.report.manualReceivable"),
    value: report.value.manualReceivable,
  },
  {
    key: "manualDebt",
    label: t("userControls.report.manualDebt"),
    value: report.value.manualDebt,
  },
  {
    key: "bonusTotal",
    label: t("userControls.report.bonusTotal"),
    value: report.value.bonusTotal,
  },
  {
    key: "turnover",
    label: t("userControls.report.turnover"),
    value: report.value.turnover,
  },
  {
    key: "ggr",
    label: t("userControls.report.ggr"),
    value: report.value.ggr,
  },
])

const fetchReport = async () => {
  if (!props.userData?._id) return
  if (selectedPeriod.value === "custom" && (!customDateFrom.value || !customDateTo.value)) return

  reportLoading.value = true
  try {
    const params = { period: selectedPeriod.value }
    if (selectedPeriod.value === "custom") {
      params.dateFrom = customDateFrom.value
      params.dateTo = customDateTo.value
    }

    const data = await userStore.fetchUserFinancialReport(props.userData._id, params)
    report.value = { ...report.value, ...data }
  } catch (error) {
    console.error("Finansal rapor alınamadı:", error)
  } finally {
    reportLoading.value = false
  }
}

watch(selectedPeriod, value => {
  if (value !== "custom") fetchReport()
})

/* --------------------------------------------------------------------- */
/* Kontroller (engelleme / kısıtlama / platform erişimi)                 */
/* --------------------------------------------------------------------- */

const savingControls = ref(false)

const controls = reactive({
  withdrawalBlocked: false,
  depositBlocked: false,
  gameBlocked: false,
  tipBlocked: false,
  categoryRestrictions: {
    slots: false,
    liveCasino: false,
    sportsBook: false,
    originals: false,
  },
  categoryBetLimits: {
    liveCasino: 0,
    casino: 0,
    sportsBook: 0,
  },
  platformAccess: {
    affiliatePanel: false,
    partnerAccess: false,
    contentEditor: false,
    chatModerator: false,
    streamer: false,
  },
})

const syncControlsFromUser = () => {
  const source = props.userData?.controls || {}
  controls.withdrawalBlocked = Boolean(source.withdrawalBlocked)
  controls.depositBlocked = Boolean(source.depositBlocked)
  controls.gameBlocked = Boolean(source.gameBlocked)
  controls.tipBlocked = Boolean(source.tipBlocked)
  controls.categoryRestrictions.slots = Boolean(source.categoryRestrictions?.slots)
  controls.categoryRestrictions.liveCasino = Boolean(source.categoryRestrictions?.liveCasino)
  controls.categoryRestrictions.sportsBook = Boolean(source.categoryRestrictions?.sportsBook)
  controls.categoryRestrictions.originals = Boolean(source.categoryRestrictions?.originals)
  controls.categoryBetLimits.liveCasino = Number(source.categoryBetLimits?.liveCasino || 0)
  controls.categoryBetLimits.casino = Number(source.categoryBetLimits?.casino || 0)
  controls.categoryBetLimits.sportsBook = Number(source.categoryBetLimits?.sportsBook || 0)
  syncBetLimitDrafts()
  controls.platformAccess.affiliatePanel = Boolean(source.platformAccess?.affiliatePanel)
  controls.platformAccess.partnerAccess = Boolean(source.platformAccess?.partnerAccess)
  controls.platformAccess.contentEditor = Boolean(source.platformAccess?.contentEditor)
  controls.platformAccess.chatModerator = Boolean(source.platformAccess?.chatModerator)
  controls.platformAccess.streamer = Boolean(source.platformAccess?.streamer)
}

const blockSwitches = computed(() => [
  {
    key: "withdrawalBlocked",
    icon: "tabler-adjustments",
    title: t("userControls.blocks.withdrawal.title"),
    subtitle: t("userControls.blocks.withdrawal.subtitle"),
  },
  {
    key: "depositBlocked",
    icon: "tabler-credit-card",
    title: t("userControls.blocks.deposit.title"),
    subtitle: t("userControls.blocks.deposit.subtitle"),
  },
  {
    key: "gameBlocked",
    icon: "tabler-adjustments",
    title: t("userControls.blocks.game.title"),
    subtitle: t("userControls.blocks.game.subtitle"),
  },
  {
    key: "tipBlocked",
    icon: "tabler-adjustments",
    title: t("userControls.blocks.tip.title"),
    subtitle: t("userControls.blocks.tip.subtitle"),
  },
])

const categoryChips = computed(() => [
  { key: "slots", label: t("userControls.categories.slots") },
  { key: "liveCasino", label: t("userControls.categories.liveCasino") },
  { key: "sportsBook", label: t("userControls.categories.sportsBook") },
  { key: "originals", label: t("userControls.categories.originals") },
])

const betLimitFields = computed(() => [
  { key: "casino", label: t("userControls.betLimits.casino") },
  { key: "liveCasino", label: t("userControls.betLimits.liveCasino") },
  { key: "sportsBook", label: t("userControls.betLimits.sportsBook") },
])

const platformSwitches = computed(() => [
  {
    key: "affiliatePanel",
    title: t("userControls.platform.affiliatePanel.title"),
    subtitle: t("userControls.platform.affiliatePanel.subtitle"),
  },
  {
    key: "partnerAccess",
    title: t("userControls.platform.partnerAccess.title"),
    subtitle: t("userControls.platform.partnerAccess.subtitle"),
  },
  {
    key: "contentEditor",
    title: t("userControls.platform.contentEditor.title"),
    subtitle: t("userControls.platform.contentEditor.subtitle"),
  },
  {
    key: "chatModerator",
    title: t("userControls.platform.chatModerator.title"),
    subtitle: t("userControls.platform.chatModerator.subtitle"),
  },
  {
    key: "streamer",
    title: t("userControls.platform.streamer.title"),
    subtitle: t("userControls.platform.streamer.subtitle"),
  },
])

const persistControls = async () => {
  if (!props.userData?._id) return

  savingControls.value = true
  try {
    const payload = {
      withdrawalBlocked: controls.withdrawalBlocked,
      depositBlocked: controls.depositBlocked,
      gameBlocked: controls.gameBlocked,
      tipBlocked: controls.tipBlocked,
      categoryRestrictions: { ...controls.categoryRestrictions },
      categoryBetLimits: { ...controls.categoryBetLimits },
      platformAccess: { ...controls.platformAccess },
    }
    const res = await userStore.updateUserControls(props.userData._id, payload)
    emit("updated", res.data)
  } catch (error) {
    console.error("Kontroller güncellenemedi:", error)
    syncControlsFromUser()
  } finally {
    savingControls.value = false
  }
}

const toggleBlockSwitch = key => {
  controls[key] = !controls[key]
  persistControls()
}

const toggleCategory = key => {
  controls.categoryRestrictions[key] = !controls.categoryRestrictions[key]
  persistControls()
}

const betLimitDrafts = reactive({
  liveCasino: 0,
  casino: 0,
  sportsBook: 0,
})

const syncBetLimitDrafts = () => {
  betLimitDrafts.liveCasino = controls.categoryBetLimits.liveCasino
  betLimitDrafts.casino = controls.categoryBetLimits.casino
  betLimitDrafts.sportsBook = controls.categoryBetLimits.sportsBook
}

const commitBetLimit = key => {
  const normalized = Math.max(0, Number(betLimitDrafts[key]) || 0)
  betLimitDrafts[key] = normalized
  if (controls.categoryBetLimits[key] === normalized) return
  controls.categoryBetLimits[key] = normalized
  persistControls()
}

const togglePlatformAccess = key => {
  controls.platformAccess[key] = !controls.platformAccess[key]
  persistControls()
}

/* --------------------------------------------------------------------- */
/* Partnere ata                                                          */
/* --------------------------------------------------------------------- */

const partnerIdentifier = ref("")
const assigningPartner = ref(false)
const removingPartner = ref(false)

const currentPartnerId = computed(() => {
  const referrer = props.userData?.affiliates?.referrer
  if (!referrer) return null

  return typeof referrer === "object" ? referrer._id : referrer
})

const assignPartner = async () => {
  if (!partnerIdentifier.value.trim() || !props.userData?._id) return

  assigningPartner.value = true
  try {
    const res = await userStore.assignUserPartner(props.userData._id, partnerIdentifier.value.trim())
    emit("updated", res.data)
    partnerIdentifier.value = ""
  } catch (error) {
    console.error("Partner atanamadı:", error)
    alert(error.response?.data?.message || t("userControls.partner.assignFailed"))
  } finally {
    assigningPartner.value = false
  }
}

const removePartner = async () => {
  if (!props.userData?._id) return

  removingPartner.value = true
  try {
    const res = await userStore.removeUserPartner(props.userData._id)
    emit("updated", res.data)
  } catch (error) {
    console.error("Partner bağlantısı kaldırılamadı:", error)
  } finally {
    removingPartner.value = false
  }
}

/* --------------------------------------------------------------------- */
/* Etiketler                                                              */
/* --------------------------------------------------------------------- */

const allTags = ref([])
const tagActionInProgress = ref(null)

const assignedTagIds = computed(() => {
  const rawTags = Array.isArray(props.userData?.tags) ? props.userData.tags : []

  return new Set(rawTags.map(tag => (typeof tag === "object" ? tag._id : tag)))
})

const fetchAllTags = async () => {
  try {
    allTags.value = await userStore.fetchTags()
  } catch (error) {
    console.error("Etiketler alınamadı:", error)
  }
}

const isTagAssigned = tagId => assignedTagIds.value.has(tagId)

const toggleTag = async tag => {
  if (!props.userData?._id) return

  tagActionInProgress.value = tag._id
  try {
    if (isTagAssigned(tag._id)) {
      await userStore.unassignTagFromUser(tag._id, props.userData._id)
      emit("updated", {
        ...props.userData,
        tags: [...assignedTagIds.value].filter(id => id !== tag._id),
      })
    } else {
      await userStore.assignTagToUser(tag._id, props.userData._id)
      emit("updated", {
        ...props.userData,
        tags: [...assignedTagIds.value, tag._id],
      })
    }
  } catch (error) {
    console.error("Etiket güncellenemedi:", error)
  } finally {
    tagActionInProgress.value = null
  }
}

/* --------------------------------------------------------------------- */
/* Kayıp Bonusu özeti                                                    */
/* --------------------------------------------------------------------- */

const lossBonusLoading = ref(false)
const lossBonusPotential = ref(null)
const lossBonusClaims = ref([])
const lossBonusActionId = ref(null)

const lossBonusStatusColor = status => {
  if (status === "approved") return "success"
  if (status === "rejected") return "error"
  return "warning"
}

const lossBonusStatusLabel = status => {
  if (status === "approved") return t("lossBonusAdmin.statusApproved")
  if (status === "rejected") return t("lossBonusAdmin.statusRejected")
  return t("lossBonusAdmin.statusPending")
}

const fetchLossBonusSummary = async () => {
  if (!props.userData?._id) return

  lossBonusLoading.value = true
  try {
    const data = await userStore.fetchUserLossBonusSummary(props.userData._id)
    lossBonusPotential.value = data?.potential || null
    lossBonusClaims.value = data?.claims || []
  } catch (error) {
    console.error("Kayıp bonusu özeti alınamadı:", error)
  } finally {
    lossBonusLoading.value = false
  }
}

const approveLossBonusClaim = async claim => {
  lossBonusActionId.value = claim._id
  try {
    await userStore.approveLossBonusClaim(claim._id)
    await fetchLossBonusSummary()
  } catch (error) {
    console.error("Kayıp bonusu talebi onaylanamadı:", error)
    alert(error.response?.data?.message || t("lossBonusAdmin.approveFailed"))
  } finally {
    lossBonusActionId.value = null
  }
}

const rejectLossBonusClaim = async claim => {
  if (!confirm(t("lossBonusAdmin.rejectConfirm"))) return

  lossBonusActionId.value = claim._id
  try {
    await userStore.rejectLossBonusClaim(claim._id)
    await fetchLossBonusSummary()
  } catch (error) {
    console.error("Kayıp bonusu talebi reddedilemedi:", error)
    alert(error.response?.data?.message || t("lossBonusAdmin.rejectFailed"))
  } finally {
    lossBonusActionId.value = null
  }
}

/* --------------------------------------------------------------------- */

watch(
  () => props.userData?._id,
  () => {
    syncControlsFromUser()
    fetchReport()
    fetchLossBonusSummary()
  },
)

onMounted(() => {
  syncControlsFromUser()
  fetchReport()
  fetchAllTags()
  fetchLossBonusSummary()
})
</script>

<template>
  <VRow>
    <!-- Finansal rapor -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-4">
            <div>
              <h5 class="text-h5">
                {{ t("userControls.report.title") }}
              </h5>
              <span class="text-body-2 text-disabled">{{ t("userControls.report.subtitle") }}</span>
            </div>

            <VChipGroup
              v-model="selectedPeriod"
              mandatory
              color="primary"
              filter
            >
              <VChip
                v-for="period in periods"
                :key="period.value"
                :value="period.value"
                variant="outlined"
                size="small"
              >
                {{ period.label }}
              </VChip>
            </VChipGroup>
          </div>

          <VRow
            v-if="selectedPeriod === 'custom'"
            class="mb-2"
          >
            <VCol
              cols="12"
              sm="4"
            >
              <AppTextField
                v-model="customDateFrom"
                type="date"
                :label="t('userControls.report.dateFrom')"
              />
            </VCol>
            <VCol
              cols="12"
              sm="4"
            >
              <AppTextField
                v-model="customDateTo"
                type="date"
                :label="t('userControls.report.dateTo')"
              />
            </VCol>
            <VCol
              cols="12"
              sm="4"
              class="d-flex align-end"
            >
              <VBtn
                block
                :loading="reportLoading"
                @click="fetchReport"
              >
                {{ t("userControls.report.apply") }}
              </VBtn>
            </VCol>
          </VRow>

          <VProgressLinear
            v-if="reportLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <VRow>
            <VCol
              v-for="card in financialCards"
              :key="card.key"
              cols="12"
              sm="6"
              md="3"
            >
              <VCard variant="tonal" :color="card.color">
                <VCardText>
                  <span class="text-body-2 text-disabled">{{ card.label }}</span>
                  <h5 class="text-h5 mt-1">
                    {{ formatMoney(card.value) }}
                  </h5>
                  <span
                    v-if="card.count !== undefined"
                    class="text-caption text-disabled"
                  >
                    {{ t("userControls.report.count", { count: card.count || 0 }) }}
                  </span>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Engelleme anahtarları -->
    <VCol
      v-for="item in blockSwitches"
      :key="item.key"
      cols="12"
      sm="6"
      md="3"
    >
      <VCard>
        <VCardText class="d-flex align-start justify-space-between gap-2">
          <div>
            <h6 class="text-body-1 font-weight-medium">
              {{ item.title }}
            </h6>
            <span class="text-body-2 text-disabled">{{ item.subtitle }}</span>
          </div>
          <VSwitch
            :model-value="controls[item.key]"
            :disabled="savingControls"
            @update:model-value="toggleBlockSwitch(item.key)"
          />
        </VCardText>
      </VCard>
    </VCol>

    <!-- Kategori kısıtlamaları -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5">
            {{ t("userControls.categories.title") }}
          </h5>
          <span class="text-body-2 text-disabled">{{ t("userControls.categories.subtitle") }}</span>

          <div class="d-flex flex-wrap gap-3 mt-4">
            <VChip
              v-for="chip in categoryChips"
              :key="chip.key"
              :color="controls.categoryRestrictions[chip.key] ? 'error' : undefined"
              :variant="controls.categoryRestrictions[chip.key] ? 'elevated' : 'outlined'"
              :disabled="savingControls"
              size="large"
              @click="toggleCategory(chip.key)"
            >
              <VIcon
                v-if="controls.categoryRestrictions[chip.key]"
                icon="tabler-ban"
                size="16"
                class="me-1"
              />
              {{ chip.label }}
            </VChip>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Bahis limitleri -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5">
            {{ t("userControls.betLimits.title") }}
          </h5>
          <span class="text-body-2 text-disabled">{{ t("userControls.betLimits.subtitle") }}</span>

          <VRow class="mt-4">
            <VCol
              v-for="field in betLimitFields"
              :key="field.key"
              cols="12"
              sm="6"
              md="4"
            >
              <AppTextField
                v-model="betLimitDrafts[field.key]"
                type="number"
                min="0"
                :label="field.label"
                :placeholder="t('userControls.betLimits.placeholder')"
                :disabled="savingControls"
                :prefix="currencyCode"
                @blur="commitBetLimit(field.key)"
                @keyup.enter="commitBetLimit(field.key)"
              />
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Platform erişimi -->
    <VCol cols="12">
      <h5 class="text-h5 mb-1">
        {{ t("userControls.platform.title") }}
      </h5>
      <span class="text-body-2 text-disabled">{{ t("userControls.platform.subtitle") }}</span>
    </VCol>

    <VCol
      v-for="item in platformSwitches"
      :key="item.key"
      cols="12"
      sm="6"
      md="3"
    >
      <VCard>
        <VCardText class="d-flex align-start justify-space-between gap-2">
          <div>
            <h6 class="text-body-1 font-weight-medium">
              {{ item.title }}
            </h6>
            <span class="text-body-2 text-disabled">{{ item.subtitle }}</span>
          </div>
          <VSwitch
            :model-value="controls.platformAccess[item.key]"
            :disabled="savingControls"
            @update:model-value="togglePlatformAccess(item.key)"
          />
        </VCardText>
      </VCard>
    </VCol>

    <!-- Partnere ata -->
    <VCol cols="12">
      <VCard :title="t('userControls.partner.title')">
        <template #subtitle>
          <span class="text-body-2">{{ t("userControls.partner.subtitle") }}</span>
        </template>
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="partnerIdentifier"
                :label="t('userControls.partner.inputLabel')"
                :placeholder="t('userControls.partner.inputPlaceholder')"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
              class="d-flex align-center gap-3"
            >
              <VBtn
                :loading="assigningPartner"
                :disabled="!partnerIdentifier.trim()"
                @click="assignPartner"
              >
                {{ t("userControls.partner.assign") }}
              </VBtn>
              <VBtn
                color="error"
                variant="outlined"
                :loading="removingPartner"
                :disabled="!currentPartnerId"
                @click="removePartner"
              >
                {{ t("userControls.partner.remove") }}
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Etiketler -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <h5 class="text-h5">
            {{ t("userControls.tags.title") }}
          </h5>
          <span class="text-body-2 text-disabled">{{ t("userControls.tags.subtitle") }}</span>

          <div class="d-flex flex-wrap gap-3 mt-4">
            <VChip
              v-for="tag in allTags"
              :key="tag._id"
              :color="isTagAssigned(tag._id) ? tag.color : undefined"
              :variant="isTagAssigned(tag._id) ? 'elevated' : 'outlined'"
              :disabled="tagActionInProgress === tag._id"
              size="large"
              @click="toggleTag(tag)"
            >
              {{ tag.name }}
            </VChip>

            <span
              v-if="!allTags.length"
              class="text-body-2 text-disabled"
            >
              {{ t("userControls.tags.empty") }}
            </span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Kayıp Bonusu -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-4">
            <div>
              <h5 class="text-h5">
                {{ t("lossBonusAdmin.title") }}
              </h5>
              <span class="text-body-2 text-disabled">{{ t("lossBonusAdmin.description") }}</span>
            </div>
          </div>

          <VProgressLinear
            v-if="lossBonusLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <VRow
            v-if="lossBonusPotential"
            class="mb-4"
          >
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <VCard variant="tonal">
                <VCardText>
                  <span class="text-body-2 text-disabled">{{ t("lossBonusAdmin.netLoss") }}</span>
                  <h5 class="text-h5 mt-1">
                    {{ formatMoney(lossBonusPotential.netLoss) }}
                  </h5>
                </VCardText>
              </VCard>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <VCard
                variant="tonal"
                :color="lossBonusPotential.eligible ? 'success' : undefined"
              >
                <VCardText>
                  <span class="text-body-2 text-disabled">{{ t("lossBonusAdmin.bonusAmount") }}</span>
                  <h5 class="text-h5 mt-1">
                    {{ formatMoney(lossBonusPotential.potentialBonus) }}
                  </h5>
                </VCardText>
              </VCard>
            </VCol>
            <VCol
              cols="12"
              md="6"
              class="d-flex align-center"
            >
              <span class="text-body-2">{{ lossBonusPotential.message }}</span>
            </VCol>
          </VRow>

          <VTable v-if="lossBonusClaims.length">
            <thead>
              <tr>
                <th>{{ t("lossBonusAdmin.period") }}</th>
                <th>{{ t("lossBonusAdmin.netLoss") }}</th>
                <th>{{ t("lossBonusAdmin.bonusAmount") }}</th>
                <th>{{ t("lossBonusAdmin.status") }}</th>
                <th>{{ t("lossBonusAdmin.date") }}</th>
                <th>{{ t("lossBonusAdmin.actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="claimItem in lossBonusClaims"
                :key="claimItem._id"
              >
                <td class="text-caption">
                  {{ formatDate(claimItem.periodStart) }} → {{ formatDate(claimItem.periodEnd) }}
                </td>
                <td>{{ formatMoney(claimItem.netLoss) }}</td>
                <td class="font-weight-medium text-success">
                  {{ formatMoney(claimItem.appliedAmount) }}
                </td>
                <td>
                  <VChip
                    :color="lossBonusStatusColor(claimItem.status)"
                    size="small"
                  >
                    {{ lossBonusStatusLabel(claimItem.status) }}
                  </VChip>
                </td>
                <td class="text-caption">
                  {{ formatDate(claimItem.createdAt) }}
                </td>
                <td>
                  <div
                    v-if="claimItem.status === 'pending'"
                    class="d-flex gap-1"
                  >
                    <VBtn
                      size="small"
                      color="success"
                      variant="tonal"
                      :loading="lossBonusActionId === claimItem._id"
                      @click="approveLossBonusClaim(claimItem)"
                    >
                      {{ t("lossBonusAdmin.approve") }}
                    </VBtn>
                    <VBtn
                      size="small"
                      color="error"
                      variant="tonal"
                      :loading="lossBonusActionId === claimItem._id"
                      @click="rejectLossBonusClaim(claimItem)"
                    >
                      {{ t("lossBonusAdmin.reject") }}
                    </VBtn>
                  </div>
                  <span
                    v-else
                    class="text-caption text-disabled"
                  >—</span>
                </td>
              </tr>
            </tbody>
          </VTable>

          <span
            v-else-if="!lossBonusLoading"
            class="text-body-2 text-disabled"
          >
            {{ t("lossBonusAdmin.empty") }}
          </span>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
