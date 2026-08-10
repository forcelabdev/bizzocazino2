<script setup>
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import { formatCoinType } from "@/utils/currency"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps({
  selectedUserId: {
    type: String,
    required: true,
  },
})

const { t } = useI18n()

const userStore = useUserListStore()
const adjustments = ref([])
const total = ref(0)
const loading = ref(false)

const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const totalPages = computed(() => {
  const pageCount = Math.ceil(total.value / options.value.itemsPerPage)

  return pageCount > 0 ? pageCount : 1
})

const headers = computed(() => [
  { title: t("manualAdjustments.actor"), key: "actor" },
  { title: t("manualAdjustments.activity"), key: "activity" },
  { title: t("manualAdjustments.details"), key: "details" },
  { title: t("manualAdjustments.date"), key: "createdAt" },
])

const fieldLabels = computed(() => ({
  name: t("fields.fullName"),
  username: t("fields.username"),
  phone: t("fields.phone"),
  rank: t("fields.rank"),
  adminRole: t("manualAdjustments.adminRole"),
  "local.email": t("fields.email"),
  "local.password": t("manualAdjustments.password"),
  "currency.fiatCurrency": t("fields.fiatCurrency"),
  "stats.bet": t("fields.totalBet"),
  "stats.won": t("fields.totalWon"),
  "stats.deposit": t("fields.totalDeposit"),
  "stats.withdraw": t("fields.totalWithdraw"),
  "limits.betToWithdraw": t("limits.betToWithdraw"),
  "limits.betToRain": t("limits.betToRain"),
  "limits.limitTip": t("limits.limitTip"),
  "limits.blockAffiliate": t("limits.blockAffiliate"),
  "limits.blockRain": t("limits.blockRain"),
  "limits.blockTip": t("limits.blockTip"),
  "limits.blockSponsor": t("limits.blockSponsor"),
  "limits.blockLeaderboard": t("limits.blockLeaderboard"),
  "affiliates.code": t("affiliates.code"),
  "affiliates.referred": t("affiliates.referred"),
  "affiliates.deposit": t("affiliates.deposit"),
  "affiliates.earned": t("affiliates.earned"),
}))

const formatWallet = wallet => {
  if (!wallet) return "-"

  return [formatCoinType(wallet.coinType), wallet.chain, wallet.type]
    .filter(Boolean)
    .join(" / ")
}

const formatValue = value => {
  if (value === null || value === undefined || value === "") {
    return t("manualAdjustments.emptyValue")
  }

  if (Array.isArray(value) || (value && typeof value === "object")) {
    return JSON.stringify(value)
  }

  if (typeof value === "boolean") {
    return value ? t("manualAdjustments.yes") : t("manualAdjustments.no")
  }

  return String(value)
}

const resolveFieldLabel = field => fieldLabels.value[field] || field

const resolveActivityLabel = item => {
  if (item.entryType === "userAudit") {
    if (item.action === "profile_update") {
      return t("manualAdjustments.activityTypes.profileUpdate")
    }

    if (item.action === "role_update") {
      return t("manualAdjustments.activityTypes.roleUpdate")
    }

    return item.summary || item.action || "-"
  }

  return [
    t(`manualAdjustments.kinds.${item.kind}`),
    t(`manualAdjustments.directions.${item.direction}`),
    item.category,
  ]
    .filter(Boolean)
    .join(" / ")
}

const resolveActivityColor = item => {
  if (item.entryType === "userAudit") {
    return item.action === "role_update" ? "warning" : "info"
  }

  return item.direction === "debit" ? "error" : "primary"
}

const resolveDetails = item => {
  if (item.entryType === "userAudit") {
    return (item.changes || []).map(change => {
      return `${resolveFieldLabel(change.field)}: ${formatValue(change.from)} -> ${formatValue(change.to)}`
    })
  }

  return [
    `${t("manualAdjustments.wallet")}: ${formatWallet(item.wallet)}`,
    `${t("manualAdjustments.requestedAmount")}: ${Number(item.requestedAmount || 0).toFixed(2)}`,
    `${t("manualAdjustments.appliedAmount")}: ${Number(item.appliedAmount || 0).toFixed(2)}`,
    `${t("manualAdjustments.balanceBefore")}: ${Number(item.balanceBefore || 0).toFixed(2)}`,
    `${t("manualAdjustments.balanceAfter")}: ${Number(item.balanceAfter || 0).toFixed(2)}`,
    item.note ? `${t("manualAdjustments.note")}: ${item.note}` : null,
  ].filter(Boolean)
}

const fetchAdjustments = async () => {
  if (!props.selectedUserId) return

  loading.value = true
  try {
    const response = await userStore.fetchUserManualAdjustments(
      props.selectedUserId,
      {
        page: options.value.page,
        itemsPerPage: options.value.itemsPerPage,
      },
    )

    adjustments.value = response.adjustments || []
    total.value = response.total || 0
  } catch (error) {
    console.error("Manual adjustments fetch error:", error)
    adjustments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch([() => props.selectedUserId, options], fetchAdjustments, {
  immediate: true,
  deep: true,
})
</script>

<template>
  <VCard :title="t('manualAdjustments.listTitle')">
    <VCardText>
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-4"
      />

      <VTable
        v-if="adjustments.length"
        class="text-no-wrap"
      >
        <thead>
          <tr>
            <th
              v-for="header in headers"
              :key="header.key"
            >
              {{ header.title }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in adjustments"
            :key="item._id"
          >
            <td>
              <div>
                <div class="font-weight-medium">
                  {{ item.actorSnapshot?.name || item.actorSnapshot?.username || "-" }}
                </div>
                <small>{{ item.actorSnapshot?.email || item.actorSnapshot?.username || "-" }}</small>
              </div>
            </td>

            <td>
              <VChip
                :color="resolveActivityColor(item)"
                size="small"
                variant="tonal"
              >
                {{ resolveActivityLabel(item) }}
              </VChip>
            </td>

            <td>
              <div class="d-flex flex-column gap-1 py-2">
                <div
                  v-for="(line, index) in resolveDetails(item)"
                  :key="`${item._id}-${index}`"
                  class="text-body-2"
                >
                  {{ line }}
                </div>
              </div>
            </td>

            <td>
              {{ item.createdAt ? new Date(item.createdAt).toLocaleString() : "-" }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <div
        v-else-if="!loading"
        class="text-center text-disabled py-6"
      >
        {{ t("manualAdjustments.empty") }}
      </div>

      <div
        v-if="totalPages > 1"
        class="d-flex justify-center mt-4"
      >
        <VPagination
          v-model="options.page"
          :length="totalPages"
        />
      </div>
    </VCardText>
  </VCard>
</template>
