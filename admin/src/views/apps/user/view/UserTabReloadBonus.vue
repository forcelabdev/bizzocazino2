<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps({
  selectedUserId: {
    type: String,
    required: true,
  },
})

const { t } = useI18n()
const userStore = useUserListStore()

const loading = ref(false)
const status = ref({ hasActiveReload: false })
const referenceLoss = ref(null)
const pastAssignments = ref([])

// Deneme Bonusu — çevrim/hedef bakiye ilerlemesi ve inceleme kilidi
const trialBonus = ref(null)
const trialBonusLoading = ref(false)
const resolvingTrialReview = ref(false)

const intervalTypeOptions = [
  { value: "daily", title: t("reloadBonusAdmin.intervalDaily") },
  { value: "hourly", title: t("reloadBonusAdmin.intervalHourly") },
  { value: "minute", title: t("reloadBonusAdmin.intervalMinute") },
]

const form = ref({
  referenceLossAmount: 0,
  percentage: 10,
  intervalType: "daily",
  intervalMinutes: 1440,
  totalPeriods: 7,
  wageringMultiplier: 1,
  note: "",
})

const STANDARD_INTERVAL_MINUTES = { daily: 1440, hourly: 60, minute: 1 }

watch(() => form.value.intervalType, newType => {
  form.value.intervalMinutes = STANDARD_INTERVAL_MINUTES[newType] || 1440
})

const preview = ref(null)
const previewLoading = ref(false)
let previewTimeout = null

const canPreview = computed(() => Number(form.value.referenceLossAmount) > 0 && Number(form.value.percentage) > 0)

watch(form, () => {
  clearTimeout(previewTimeout)
  if (!canPreview.value) {
    preview.value = null
    
    return
  }
  previewTimeout = setTimeout(async () => {
    previewLoading.value = true
    try {
      preview.value = await userStore.previewReloadBonusAssignment({ ...form.value })
    } catch (error) {
      console.error("Önizleme hesaplanamadı:", error)
    } finally {
      previewLoading.value = false
    }
  }, 250)
}, { deep: true })

const assigning = ref(false)
const cancelling = ref(false)
const feedback = ref({ show: false, text: "", color: "success" })

const useReferenceLoss = () => {
  if (!referenceLoss.value) return
  form.value.referenceLossAmount = referenceLoss.value.netLoss
}

const formatMoney = value => {
  const number = Number(value || 0)

  return `${number.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

const formatDate = value => {
  if (!value) return "—"

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusColor = statusValue => {
  if (statusValue === "active") return "info"
  if (statusValue === "completed") return "success"
  if (statusValue === "cancelled") return "error"

  return "warning"
}

const statusLabel = statusValue => {
  if (statusValue === "active") return t("reloadBonusAdmin.statusActive")
  if (statusValue === "completed") return t("reloadBonusAdmin.statusCompleted")
  if (statusValue === "cancelled") return t("reloadBonusAdmin.statusCancelled")

  return t("reloadBonusAdmin.statusExpired")
}

const progressPercent = computed(() => {
  if (!status.value?.hasActiveReload || !status.value.totalAmount) return 0

  return Math.min(100, Math.round((status.value.claimedAmount / status.value.totalAmount) * 100))
})

const fetchSummary = async () => {
  if (!props.selectedUserId) return

  loading.value = true
  try {
    const data = await userStore.fetchUserReloadBonusSummary(props.selectedUserId)

    status.value = data?.status || { hasActiveReload: false }
    referenceLoss.value = data?.referenceLoss || null
    pastAssignments.value = (data?.assignments || []).filter(item => item.status !== "active")
  } catch (error) {
    console.error("Reload bonusu özeti alınamadı:", error)
  } finally {
    loading.value = false
  }
}

const createAssignment = async () => {
  if (!props.selectedUserId) return

  assigning.value = true
  try {
    await userStore.createUserReloadBonusAssignment(props.selectedUserId, { ...form.value })
    feedback.value = { show: true, text: t("userTabReloadBonus.assignSuccess"), color: "success" }
    form.value.referenceLossAmount = 0
    form.value.note = ""
    await fetchSummary()
  } catch (error) {
    console.error("Reload ataması oluşturulamadı:", error)
    feedback.value = { show: true, text: error.response?.data?.message || t("userTabReloadBonus.assignFailed"), color: "error" }
  } finally {
    assigning.value = false
  }
}

const cancelActiveAssignment = async () => {
  if (!status.value?.assignmentId) return
  if (!confirm(t("reloadBonusAdmin.cancelConfirm"))) return

  cancelling.value = true
  try {
    await userStore.cancelReloadBonusAssignment(status.value.assignmentId)
    await fetchSummary()
  } catch (error) {
    console.error("Reload ataması iptal edilemedi:", error)
    feedback.value = { show: true, text: error.response?.data?.message || t("reloadBonusAdmin.cancelFailed"), color: "error" }
  } finally {
    cancelling.value = false
  }
}

const fetchTrialBonus = async () => {
  if (!props.selectedUserId) return

  trialBonusLoading.value = true
  try {
    trialBonus.value = await userStore.fetchUserTrialBonusSummary(props.selectedUserId)
  } catch (error) {
    console.error("Deneme bonusu özeti alınamadı:", error)
  } finally {
    trialBonusLoading.value = false
  }
}

const trialWageringPercent = computed(() => {
  const progress = trialBonus.value?.wageringProgress
  if (!progress || !progress.required) return 0

  return Math.min(100, Math.round((progress.progress / progress.required) * 100))
})

const trialTargetBalancePercent = computed(() => {
  const progress = trialBonus.value?.targetBalanceProgress
  if (!progress || !progress.target) return 0

  return Math.min(100, Math.round((progress.current / progress.target) * 100))
})

const reviewReasonLabel = reason => {
  if (reason === "wagering_completed") return t("userTabReloadBonus.trialReviewReasonWagering")
  if (reason === "target_balance_reached") return t("userTabReloadBonus.trialReviewReasonTarget")

  return t("userTabReloadBonus.trialReviewReasonUnknown")
}

const resolveTrialReview = async () => {
  if (!props.selectedUserId) return
  if (!confirm(t("userTabReloadBonus.trialResolveConfirm"))) return

  resolvingTrialReview.value = true
  try {
    await userStore.resolveTrialBonusReview(props.selectedUserId)
    feedback.value = { show: true, text: t("userTabReloadBonus.trialResolveSuccess"), color: "success" }
    await fetchTrialBonus()
  } catch (error) {
    console.error("Deneme bonusu inceleme kilidi açılamadı:", error)
    feedback.value = { show: true, text: error.response?.data?.message || t("userTabReloadBonus.trialResolveFailed"), color: "error" }
  } finally {
    resolvingTrialReview.value = false
  }
}

watch(() => props.selectedUserId, () => {
  fetchSummary()
  fetchTrialBonus()
})

onMounted(() => {
  fetchSummary()
  fetchTrialBonus()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-2"
      />
    </VCol>

    <!-- Deneme Bonusu: çevrim/hedef bakiye ilerlemesi + inceleme kilidi -->
    <VCol
      v-if="trialBonus?.bonusLock"
      cols="12"
    >
      <VCard
        :color="trialBonus.reviewLock?.reviewRequired ? 'error' : undefined"
        :variant="trialBonus.reviewLock?.reviewRequired ? 'tonal' : 'outlined'"
      >
        <VCardText>
          <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-4">
            <h5 class="text-h5">
              {{ t("userTabReloadBonus.trialTitle") }}
            </h5>
            <VChip
              v-if="trialBonus.reviewLock?.reviewRequired"
              color="error"
              size="small"
            >
              {{ t("userTabReloadBonus.trialReviewLocked") }}
            </VChip>
            <VChip
              v-else
              color="success"
              size="small"
            >
              {{ t("userTabReloadBonus.trialOk") }}
            </VChip>
          </div>

          <VAlert
            v-if="trialBonus.reviewLock?.reviewRequired"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ t("userTabReloadBonus.trialReviewAlert", { reason: reviewReasonLabel(trialBonus.reviewLock.reviewReason) }) }}
            <span v-if="trialBonus.reviewLock.lockedForReviewAt">
              — {{ formatDate(trialBonus.reviewLock.lockedForReviewAt) }}
            </span>
          </VAlert>

          <VRow class="mb-2">
            <VCol
              v-if="trialBonus.wageringProgress"
              cols="12"
              md="6"
            >
              <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.trialWageringLabel") }}</span>
              <div class="d-flex align-center justify-space-between mt-1 mb-1">
                <span class="text-body-2">{{ formatMoney(trialBonus.wageringProgress.progress) }} / {{ formatMoney(trialBonus.wageringProgress.required) }}</span>
                <span class="text-caption text-disabled">{{ trialWageringPercent }}%</span>
              </div>
              <VProgressLinear
                :model-value="trialWageringPercent"
                :color="trialBonus.wageringProgress.completed ? 'success' : 'primary'"
                height="8"
                rounded
              />
            </VCol>

            <VCol
              v-if="trialBonus.targetBalanceProgress"
              cols="12"
              md="6"
            >
              <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.trialTargetLabel") }}</span>
              <div class="d-flex align-center justify-space-between mt-1 mb-1">
                <span class="text-body-2">{{ formatMoney(trialBonus.targetBalanceProgress.current) }} / {{ formatMoney(trialBonus.targetBalanceProgress.target) }}</span>
                <span class="text-caption text-disabled">{{ trialTargetBalancePercent }}%</span>
              </div>
              <VProgressLinear
                :model-value="trialTargetBalancePercent"
                :color="trialBonus.targetBalanceProgress.reached ? 'success' : 'primary'"
                height="8"
                rounded
              />
            </VCol>
          </VRow>

          <div
            v-if="trialBonus.reviewLock?.reviewRequired"
            class="d-flex justify-end mt-4"
          >
            <VBtn
              color="error"
              :loading="resolvingTrialReview"
              @click="resolveTrialReview"
            >
              {{ t("userTabReloadBonus.trialResolveButton") }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Referans dönem kaybı -->
    <VCol
      v-if="referenceLoss"
      cols="12"
    >
      <VCard variant="tonal">
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <div>
            <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.periodLoss") }}</span>
            <h5 class="text-h5 mt-1">
              {{ formatMoney(referenceLoss.netLoss) }}
            </h5>
            <span class="text-caption text-disabled">
              {{ formatDate(referenceLoss.periodStart) }} → {{ formatDate(referenceLoss.periodEnd) }}
            </span>
          </div>
          <VBtn
            v-if="!status.hasActiveReload"
            variant="tonal"
            size="small"
            @click="useReferenceLoss"
          >
            {{ t("userTabReloadBonus.useThisAmount") }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Aktif Reload durumu -->
    <VCol
      v-if="status.hasActiveReload"
      cols="12"
    >
      <VCard>
        <VCardText>
          <div class="d-flex flex-wrap align-center justify-space-between gap-4 mb-4">
            <h5 class="text-h5">
              {{ t("userTabReloadBonus.activeTitle") }}
            </h5>
            <VChip
              color="info"
              size="small"
            >
              {{ t("reloadBonusAdmin.statusActive") }}
            </VChip>
          </div>

          <VRow class="mb-4">
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <span class="text-body-2 text-disabled">{{ t("reloadBonusAdmin.totalAmount") }}</span>
              <h6 class="text-h6 mt-1">
                {{ formatMoney(status.totalAmount) }}
              </h6>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.claimedAmount") }}</span>
              <h6 class="text-h6 mt-1 text-success">
                {{ formatMoney(status.claimedAmount) }}
              </h6>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.periods") }}</span>
              <h6 class="text-h6 mt-1">
                {{ status.claimedPeriods }} / {{ status.totalPeriods }}
              </h6>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              md="3"
            >
              <span class="text-body-2 text-disabled">{{ t("userTabReloadBonus.nextClaim") }}</span>
              <h6 class="text-h6 mt-1">
                {{ status.canClaimNow ? t("userTabReloadBonus.claimableNow") : formatDate(status.nextClaimAt) }}
              </h6>
            </VCol>
          </VRow>

          <span class="text-caption text-disabled">{{ t("userTabReloadBonus.progress") }}: {{ progressPercent }}%</span>
          <VProgressLinear
            :model-value="progressPercent"
            color="success"
            height="8"
            rounded
            class="mb-4 mt-1"
          />

          <VBtn
            color="error"
            variant="tonal"
            size="small"
            :loading="cancelling"
            @click="cancelActiveAssignment"
          >
            {{ t("reloadBonusAdmin.cancel") }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Yeni atama formu -->
    <VCol
      v-else
      cols="12"
    >
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("userTabReloadBonus.newAssignmentTitle") }}
          </h5>

          <VForm @submit.prevent="createAssignment">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.referenceLossAmount"
                  type="number"
                  min="0"
                  :label="t('reloadBonusAdmin.referenceLossAmount')"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.percentage"
                  type="number"
                  min="0"
                  max="100"
                  :label="t('reloadBonusAdmin.percentage')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppSelect
                  v-model="form.intervalType"
                  :items="intervalTypeOptions"
                  :label="t('reloadBonusAdmin.intervalType')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="form.intervalMinutes"
                  type="number"
                  min="1"
                  :label="t('reloadBonusAdmin.intervalMinutes')"
                />
              </VCol>

              <VCol
                cols="12"
                md="4"
              >
                <AppTextField
                  v-model="form.totalPeriods"
                  type="number"
                  min="1"
                  :label="t('reloadBonusAdmin.totalPeriods')"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.wageringMultiplier"
                  type="number"
                  min="0"
                  step="0.1"
                  :label="t('reloadBonusAdmin.wageringMultiplier')"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="form.note"
                  :label="t('reloadBonusAdmin.note')"
                />
              </VCol>

              <VCol
                v-if="preview"
                cols="12"
              >
                <VAlert
                  color="info"
                  variant="tonal"
                  density="compact"
                >
                  <span class="font-weight-medium">{{ t("reloadBonusAdmin.previewTitle") }}:</span>
                  {{ t("reloadBonusAdmin.totalAmount") }} {{ formatMoney(preview.totalAmount) }}
                  &middot;
                  {{ t("reloadBonusAdmin.amountPerPeriod") }} {{ formatMoney(preview.amountPerPeriod) }}
                  &times; {{ preview.totalPeriods }}
                </VAlert>
              </VCol>

              <VCol cols="12">
                <VBtn
                  type="submit"
                  color="primary"
                  :disabled="!canPreview"
                  :loading="assigning"
                >
                  {{ t("reloadBonusAdmin.assign") }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Geçmiş atamalar -->
    <VCol
      v-if="pastAssignments.length"
      cols="12"
    >
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-4">
            {{ t("userTabReloadBonus.historyTitle") }}
          </h5>

          <VTable>
            <thead>
              <tr>
                <th>{{ t("reloadBonusAdmin.totalAmountCol") }}</th>
                <th>{{ t("reloadBonusAdmin.progress") }}</th>
                <th>{{ t("reloadBonusAdmin.status") }}</th>
                <th>{{ t("reloadBonusAdmin.date") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pastAssignments"
                :key="item._id"
              >
                <td class="font-weight-medium">
                  {{ formatMoney(item.totalAmount) }}
                </td>
                <td class="text-caption">
                  {{ item.claimedPeriods }}/{{ item.totalPeriods }} &middot; {{ formatMoney(item.claimedAmount) }}
                </td>
                <td>
                  <VChip
                    :color="statusColor(item.status)"
                    size="small"
                  >
                    {{ statusLabel(item.status) }}
                  </VChip>
                </td>
                <td class="text-caption">
                  {{ formatDate(item.createdAt) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VCol>

    <VSnackbar
      v-model="feedback.show"
      :color="feedback.color"
      location="bottom end"
    >
      {{ feedback.text }}
    </VSnackbar>
  </VRow>
</template>
