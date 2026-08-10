<script setup>
import axios from "@axios"
import { formatCoinType } from "@/utils/currency"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"

const props = defineProps({
  selectedUserId: {
    type: String,
    default: null,
  },
})

const { t } = useI18n()
const deposits = ref([])
const withdrawals = ref([])
const manualBonuses = ref([])
const shopPurchases = ref([])
const activeTab = ref("deposits")
const route = useRoute()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const snackbar = ref(false)
const snackbarText = ref("")

const fetchUserDepositWithdrawals = async userId => {
  try {
    const [transactionRes, shopPurchaseRes, manualBonusRes] = await Promise.all([
      axios.get(`/admin/users/${userId}/transactions/fiat-crypto`),
      axios.get(`/admin/users/${userId}/shop-purchases`),
      axios.get(`/admin/users/${userId}/manual-bonus-history`),
    ])

    deposits.value = transactionRes.data.deposits || []
    withdrawals.value = transactionRes.data.withdrawals || []
    manualBonuses.value = manualBonusRes.data.data || []
    shopPurchases.value = shopPurchaseRes.data.data || []
  } catch (err) {
    console.error("API error:", err)
    deposits.value = []
    withdrawals.value = []
    manualBonuses.value = []
    shopPurchases.value = []
  }
}

const resolveAssetUrl = value => {
  if (!value) return ""
  if (!value.startsWith("/")) return value

  return BASE_URL ? `${BASE_URL}${value}` : value
}

const formatDate = value => {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  const pad = number => String(number).padStart(2, "0")

  return [
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ")
}

const formatNumber = value => {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "-"
}

const formatSignedAmount = value => {
  const numericValue = Number(value || 0)
  const prefix = numericValue < 0 ? "-" : "+"

  return `${prefix}${Math.abs(numericValue).toFixed(2)}`
}

const getSignedAmountClass = value =>
  Number(value || 0) < 0 ? "text-error" : "text-success"

const formatWallet = wallet => {
  if (!wallet) return "-"

  return [formatCoinType(wallet.coinType), wallet.chain, wallet.type]
    .filter(Boolean)
    .join(" / ")
}

const formatActor = actor => {
  if (!actor) return "-"

  return actor.username || actor.name || actor.email || "-"
}

const copyToClipboard = (text, messageKey = "transactionIdCopied") => {
  if (!text || text === "-") return

  navigator.clipboard.writeText(String(text)).then(() => {
    snackbarText.value = t(messageKey)
    snackbar.value = true
  })
}

const copyDate = value => copyToClipboard(formatDate(value), "dateCopied")

watch(
  () => props.selectedUserId || route.params.id,
  userId => {
    if (userId) {
      fetchUserDepositWithdrawals(userId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <VCard :title="t('userTransactions')">
    <VCardText>
      <VTabs
        v-model="activeTab"
        background-color="grey lighten-4"
        grow
      >
        <VTab
          value="deposits"
          color="success"
        >
          <span class="text-success">{{ t("deposits") }}</span>
        </VTab>
        <VTab
          value="withdrawals"
          color="error"
        >
          <span class="text-error">{{ t("withdrawals") }}</span>
        </VTab>
        <VTab
          value="bonus-history"
          color="warning"
        >
          <span class="text-warning">{{ t("bonusHistory") }}</span>
        </VTab>
        <VTab
          value="shop"
          color="primary"
        >
          <span class="text-primary">{{ t("platform.shop") }}</span>
        </VTab>
      </VTabs>

      <VDivider class="my-2" />

      <VWindow v-model="activeTab">
        <!-- Deposits -->
        <VWindowItem value="deposits">
          <VTable>
            <thead>
              <tr>
                <th>{{ t("amount") }}</th>
                <th>{{ t("currency") }}</th>
                <th>{{ t("methodOrAddress") }}</th>
                <!-- <th>{{ t("transaction") }}</th> -->
                <th>{{ t("status") }}</th>
                <th>{{ t("createdAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in deposits"
                :key="index"
              >
                <td>{{ item.amount }}</td>
                <td>{{ item.currency || "-" }}</td>
                <td>{{ item.methodName || item.method || "-" }}</td>
                <!--
                  <td>
                  <span>{{
                  item.transaction?.slice(0, 6) || "-"
                  }}</span>
                  <VTooltip location="top">
                  <template #activator="{ on, attrs }">
                  <VBtn
                  v-if="item.transaction"
                  icon
                  size="x-small"
                  class="ms-2"
                  v-bind="attrs"
                  v-on="on"
                  @click="
                  copyToClipboard(
                  item.transaction
                  )
                  "
                  >
                  <VIcon icon="tabler-copy" />
                  </VBtn>
                  </template>
                  <span>{{ t("copy") }}</span>
                  </VTooltip>
                  </td> 
                -->
                <td>{{ item.status || item.state || "-" }}</td>
                <td>
                  <div class="d-flex align-center text-no-wrap">
                    <span>{{ formatDate(item.createdAt) }}</span>
                    <VTooltip
                      v-if="item.createdAt"
                      location="top"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <VBtn
                          v-bind="tooltipProps"
                          icon
                          size="x-small"
                          variant="text"
                          class="ms-1"
                          @click="copyDate(item.createdAt)"
                        >
                          <VIcon
                            icon="tabler-copy"
                            size="16"
                          />
                        </VBtn>
                      </template>
                      <span>{{ t("copy") }}</span>
                    </VTooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>

        <!-- Withdrawals -->
        <VWindowItem value="withdrawals">
          <VTable>
            <thead>
              <tr>
                <th>{{ t("amount") }}</th>
                <th>{{ t("currency") }}</th>
                <th>{{ t("method") }}</th>
                <th>{{ t("transaction") }}</th>
                <th>{{ t("status") }}</th>
                <th>{{ t("createdAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in withdrawals"
                :key="index"
              >
                <td>{{ item.amount }}</td>
                <td>{{ item.currency || "-" }}</td>
                <td>{{ item.methodName || item.method || "-" }}</td>
                <td>
                  <span>{{
                    item.transaction?.slice(0, 6) || "-"
                  }}</span>
                  <VTooltip location="top">
                    <template #activator="{ on, attrs }">
                      <VBtn
                        v-if="item.transaction"
                        icon
                        size="x-small"
                        class="ms-2"
                        v-bind="attrs"
                        v-on="on"
                        @click="
                          copyToClipboard(
                            item.transaction
                          )
                        "
                      >
                        <VIcon icon="tabler-copy" />
                      </VBtn>
                    </template>
                    <span>{{ t("copy") }}</span>
                  </VTooltip>
                </td>
                <td>{{ item.status || item.state || "-" }}</td>
                <td>
                  <div class="d-flex align-center text-no-wrap">
                    <span>{{ formatDate(item.createdAt) }}</span>
                    <VTooltip
                      v-if="item.createdAt"
                      location="top"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <VBtn
                          v-bind="tooltipProps"
                          icon
                          size="x-small"
                          variant="text"
                          class="ms-1"
                          @click="copyDate(item.createdAt)"
                        >
                          <VIcon
                            icon="tabler-copy"
                            size="16"
                          />
                        </VBtn>
                      </template>
                      <span>{{ t("copy") }}</span>
                    </VTooltip>
                  </div>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>

        <VWindowItem value="bonus-history">
          <VTable>
            <thead>
              <tr>
                <th>{{ t("manualAdjustments.bonusName") }}</th>
                <th>{{ t("amount") }}</th>
                <th>{{ t("manualAdjustments.wallet") }}</th>
                <th>{{ t("manualAdjustments.actor") }}</th>
                <th>{{ t("manualAdjustments.note") }}</th>
                <th>{{ t("manualAdjustments.balanceBefore") }}</th>
                <th>{{ t("manualAdjustments.balanceAfter") }}</th>
                <th>{{ t("manualAdjustments.date") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in manualBonuses"
                :key="item._id || index"
              >
                <td>{{ item.bonusName || item.category || "-" }}</td>
                <td>
                  <span :class="`${getSignedAmountClass(item.amount)} font-weight-bold`">
                    {{ formatSignedAmount(item.amount) }}
                  </span>
                </td>
                <td>{{ formatWallet(item.wallet) }}</td>
                <td>{{ formatActor(item.actor) }}</td>
                <td>{{ item.note || "-" }}</td>
                <td>{{ formatNumber(item.balanceBefore) }}</td>
                <td>{{ formatNumber(item.balanceAfter) }}</td>
                <td>
                  <div class="d-flex align-center text-no-wrap">
                    <span>{{ formatDate(item.createdAt) }}</span>
                    <VTooltip
                      v-if="item.createdAt"
                      location="top"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <VBtn
                          v-bind="tooltipProps"
                          icon
                          size="x-small"
                          variant="text"
                          class="ms-1"
                          @click="copyDate(item.createdAt)"
                        >
                          <VIcon
                            icon="tabler-copy"
                            size="16"
                          />
                        </VBtn>
                      </template>
                      <span>{{ t("copy") }}</span>
                    </VTooltip>
                  </div>
                </td>
              </tr>
              <tr v-if="!manualBonuses.length">
                <td
                  colspan="8"
                  class="text-center text-disabled py-6"
                >
                  {{ t("manualAdjustments.emptyBonusHistory") }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>

        <VWindowItem value="shop">
          <VTable>
            <thead>
              <tr>
                <th>{{ t("image") }}</th>
                <th>{{ t("title") }}</th>
                <th>{{ t("shop.coinCost") }}</th>
                <th>{{ t("shop.rewardAmount") }}</th>
                <th>{{ t("wallets") }}</th>
                <th>{{ t("status") }}</th>
                <th>{{ t("createdAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in shopPurchases"
                :key="item._id || index"
              >
                <td>
                  <VAvatar
                    size="44"
                    rounded="lg"
                    variant="tonal"
                  >
                    <VImg
                      v-if="item.banner"
                      :src="resolveAssetUrl(item.banner)"
                      cover
                    />
                    <span v-else>-</span>
                  </VAvatar>
                </td>
                <td>{{ item.title || "-" }}</td>
                <td>{{ item.coinCost ?? 0 }}</td>
                <td>{{ item.rewardAmount ?? 0 }}</td>
                <td>{{ formatWallet(item.wallet) }}</td>
                <td>{{ item.state || "-" }}</td>
                <td>
                  <div class="d-flex align-center text-no-wrap">
                    <span>{{ formatDate(item.createdAt) }}</span>
                    <VTooltip
                      v-if="item.createdAt"
                      location="top"
                    >
                      <template #activator="{ props: tooltipProps }">
                        <VBtn
                          v-bind="tooltipProps"
                          icon
                          size="x-small"
                          variant="text"
                          class="ms-1"
                          @click="copyDate(item.createdAt)"
                        >
                          <VIcon
                            icon="tabler-copy"
                            size="16"
                          />
                        </VBtn>
                      </template>
                      <span>{{ t("copy") }}</span>
                    </VTooltip>
                  </div>
                </td>
              </tr>
              <tr v-if="!shopPurchases.length">
                <td
                  colspan="7"
                  class="text-center text-disabled py-6"
                >
                  {{ t("missing") }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VWindowItem>
      </VWindow>
    </VCardText>
  </VCard>

  <!-- ✅ Copy success snackbar -->
  <VSnackbar
    v-model="snackbar"
    color="success"
    timeout="2000"
    location="top right"
  >
    {{ snackbarText }}
  </VSnackbar>
</template>
