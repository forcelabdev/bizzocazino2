<script setup>
import axios from "@axios"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

const props = defineProps({
  selectedUserId: {
    type: String,
    default: null,
  },
})

const { t } = useI18n()
const route = useRoute()

const effectiveUserId = computed(() => props.selectedUserId || route.params.id)

const bonuses = ref([])
const loading = ref(false)
const total = ref(0)
const totalBonusAmount = ref(0)
const errorMessage = ref("")

const options = ref({
  page: 1,
  itemsPerPage: 10,
})

const headers = computed(() => [
  { title: t("bonus.source"), key: "source" },
  { title: t("bonus.type"), key: "type" },
  { title: t("bonus.amount"), key: "amount" },
  { title: t("bonus.details"), key: "details" },
  { title: t("bonus.date"), key: "createdAt" },
])

const sourceLabels = {
  vip: "VIP",
  campaign: "Kampanya",
  deposit: "Yatırım Bonusu",
  balance: "Bakiye Bonusu",
  manual: "Manuel",
}

const typeLabels = {
  upgradeReward: "VIP Yükselme",
  dailyVipReward: "Günlük VIP",
  weeklyVipReward: "Haftalık VIP",
  monthlyVipReward: "Aylık VIP",
  vipDayReward: "VIP Gün Ödülü",
  campaign: "Kampanya",
  depositBonus: "Yatırım Bonusu",
  first_deposit: "İlk Yatırım Bonusu",
  second_deposit: "İkinci Yatırım Bonusu",
  third_deposit: "Üçüncü Yatırım Bonusu",
  fourth_deposit: "Dördüncü Yatırım Bonusu",
  regular_deposit: "Düzenli Yatırım Bonusu",
  affiliateCommission: "Affiliate Komisyon",
  affiliateCodeClaim: "Affiliate Kod Bonusu",
  affiliateEarningClaim: "Affiliate Kazanç",
  promoCodeClaim: "Promosyon Kodu",
  rakebackClaim: "Rakeback",
  rainTip: "Rain Bahşiş",
  adminAdjust: "Admin Düzenleme",
  manualBonus: "Manuel Bonus",
}

const fetchBonusHistory = async () => {
  if (!effectiveUserId.value) return

  loading.value = true
  errorMessage.value = ""
  try {
    const res = await axios.get(
      `/admin/users/${effectiveUserId.value}/bonus-history`,
      {
        params: {
          page: options.value.page,
          limit: options.value.itemsPerPage,
        },
      },
    )

    bonuses.value = res.data.data
    total.value = res.data.total
    totalBonusAmount.value = res.data.totalBonusAmount
  } catch (err) {
    console.error("Bonus history error:", err)
    bonuses.value = []
    total.value = 0
    totalBonusAmount.value = 0
    errorMessage.value = err.response?.data?.message || t("updateFailed")
  } finally {
    loading.value = false
  }
}

const getSourceColor = source => {
  const colors = {
    vip: "primary",
    campaign: "success",
    deposit: "info",
    balance: "warning",
    manual: "secondary",
  }

  return colors[source] || "secondary"
}

const getTypeColor = type => {
  const normalizedType = String(type || "")

  if (normalizedType.includes("vip") || normalizedType.includes("Reward")) {
    return "primary"
  }
  if (normalizedType === "campaign") return "success"
  if (
    normalizedType.includes("deposit") ||
		normalizedType.includes("Bonus")
  ) {
    return "info"
  }
  if (normalizedType.includes("affiliate") || normalizedType.includes("promo")) {
    return "warning"
  }
  if (normalizedType === "rakebackClaim") return "purple"
  if (normalizedType === "adminAdjust") return "error"
  
  return "secondary"
}

const formatAmount = item => {
  const rawAmount = Number(item.amount || 0)
  const isDebit = item.direction === "debit" || rawAmount < 0
  const prefix = isDebit ? "-" : "+"

  return `${prefix}${Math.abs(rawAmount).toFixed(2)}`
}

const getAmountClass = item =>
  item.direction === "debit" || Number(item.amount || 0) < 0
    ? "text-error"
    : "text-success"

const formatDetails = item => {
  if (item.source === "campaign") {
    return item.campaignTitle || "-"
  }
  if (item.source === "vip" && item.level) {
    return `Level ${item.level}`
  }
  if (item.source === "deposit") {
    return `${item.depositAmount} ${item.currency || ""}`
  }
  if (item.source === "manual") {
    return [item.category, item.note].filter(Boolean).join(" / ") || "-"
  }
  
  return "-"
}

watch([() => props.selectedUserId, options], fetchBonusHistory, {
  immediate: true,
  deep: true,
})
</script>

<template>
  <VCard>
    <VCardTitle class="d-flex align-center justify-space-between">
      <span>{{ t("bonus.history") }}</span>
      <VChip
        color="success"
        variant="tonal"
        size="small"
      >
        {{ t("bonus.totalAmount") }}: {{ totalBonusAmount.toFixed(2) }}
      </VChip>
    </VCardTitle>

    <VCardText>
      <VAlert
        v-if="errorMessage"
        color="error"
        density="compact"
        variant="tonal"
        class="mb-4"
      >
        {{ errorMessage }}
      </VAlert>

      <VDataTableServer
        v-model:page="options.page"
        v-model:items-per-page="options.itemsPerPage"
        :headers="headers"
        :items="bonuses"
        :items-length="total"
        :loading="loading"
        class="text-no-wrap"
      >
        <!-- Source -->
        <template #item.source="{ item }">
          <VChip
            :color="getSourceColor(item.source)"
            size="small"
            variant="tonal"
          >
            {{ sourceLabels[item.source] || item.source }}
          </VChip>
        </template>

        <!-- Type -->
        <template #item.type="{ item }">
          <VChip
            :color="getTypeColor(item.type)"
            size="small"
            variant="outlined"
          >
            {{ typeLabels[item.type] || item.type }}
          </VChip>
        </template>

        <!-- Amount -->
        <template #item.amount="{ item }">
          <span :class="`${getAmountClass(item)} font-weight-bold`">
            {{ formatAmount(item) }}
          </span>
        </template>

        <!-- Details -->
        <template #item.details="{ item }">
          {{ formatDetails(item) }}
        </template>

        <!-- Date -->
        <template #item.createdAt="{ item }">
          {{
            item.createdAt
              ? new Date(item.createdAt).toLocaleString()
              : "-"
          }}
        </template>
      </VDataTableServer>
    </VCardText>
  </VCard>
</template>
