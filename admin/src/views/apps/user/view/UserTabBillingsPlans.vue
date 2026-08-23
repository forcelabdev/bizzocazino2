<script setup>
import axios from "@axios"
import { formatCoinType } from "@/utils/currency"
import { autoColumnWidths, exportToXlsx } from "@/utils/exportXlsx"
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
const deposits = ref([])
const withdrawals = ref([])
const manualBonuses = ref([])
const shopPurchases = ref([])
const activeTab = ref("deposits")
const route = useRoute()
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const snackbar = ref(false)
const snackbarText = ref("")

// 🗓️ Tarih aralığı filtresi (client-side; API tüm kayıtları tek seferde döndürüyor)
const dateFrom = ref(null)
const dateTo = ref(null)

const isWithinDateRange = createdAt => {
  if (!dateFrom.value && !dateTo.value) return true
  if (!createdAt) return false

  const time = new Date(createdAt).getTime()
  if (Number.isNaN(time)) return false

  if (dateFrom.value) {
    const from = new Date(dateFrom.value)
    from.setHours(0, 0, 0, 0)
    if (time < from.getTime()) return false
  }

  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    if (time > to.getTime()) return false
  }

  return true
}

const resetDateFilter = () => {
  dateFrom.value = null
  dateTo.value = null
  methodFilter.value = []
}

// 🎯 Yöntem filtresi (client-side; sekme değiştikçe seçim sıfırlanır)
// Her sekmede "yöntem" farklı bir alana karşılık gelir: yatırım/çekimde
// ödeme yöntemi, bonus geçmişinde bonus adı, mağazada ürün adı.
const methodFilter = ref([])

const getMethodValue = (tab, item) => {
  if (tab === "deposits" || tab === "withdrawals") return item.methodName || item.method || "-"
  if (tab === "bonus-history") return item.bonusName || item.category || "-"
  if (tab === "shop") return item.title || "-"

  return "-"
}

const rawListForTab = tab => {
  if (tab === "deposits") return deposits.value
  if (tab === "withdrawals") return withdrawals.value
  if (tab === "bonus-history") return manualBonuses.value
  if (tab === "shop") return shopPurchases.value

  return []
}

// 🎯 Aktif sekmedeki verilerden benzersiz yöntem listesi (tarih filtresinden
// bağımsız olarak tüm kayıtlar üzerinden hesaplanır, seçenekler küçülmesin)
const availableMethods = computed(() => {
  const values = rawListForTab(activeTab.value).map(item => getMethodValue(activeTab.value, item))

  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, "tr"))
})

const methodLabel = computed(() => {
  if (activeTab.value === "bonus-history") return t("manualAdjustments.bonusName")
  if (activeTab.value === "shop") return t("title")

  return t("methodOrAddress")
})

const isMethodMatch = item => {
  if (!methodFilter.value.length) return true

  return methodFilter.value.includes(getMethodValue(activeTab.value, item))
}

const resetMethodFilter = () => {
  methodFilter.value = []
}

// Sekme değişince yöntem seçenekleri de değiştiği için seçimi sıfırla
watch(activeTab, resetMethodFilter)

const filteredDeposits = computed(() => deposits.value.filter(item => isWithinDateRange(item.createdAt) && isMethodMatch(item)))
const filteredWithdrawals = computed(() => withdrawals.value.filter(item => isWithinDateRange(item.createdAt) && isMethodMatch(item)))
const filteredManualBonuses = computed(() => manualBonuses.value.filter(item => isWithinDateRange(item.createdAt) && isMethodMatch(item)))
const filteredShopPurchases = computed(() => shopPurchases.value.filter(item => isWithinDateRange(item.createdAt) && isMethodMatch(item)))

// 📤 Aktif alt sekmenin (yatırım/çekim/bonus/mağaza) filtrelenmiş verisini xlsx olarak dışa aktar
const isExporting = ref(false)

const exportActiveTab = async () => {
  if (isExporting.value) return
  isExporting.value = true

  try {
    let rows = []
    let fileName = "finans"
    let sheetName = "Finans"

    if (activeTab.value === "deposits") {
      fileName = "yatirimlar"
      sheetName = t("deposits")
      rows = filteredDeposits.value.map(item => ({
        [t("amount")]: Number(item.amount || 0),
        [t("currency")]: item.currency || "-",
        [t("methodOrAddress")]: item.methodName || item.method || "-",
        [t("status")]: item.status || item.state || "-",
        [t("createdAt")]: formatDate(item.createdAt),
      }))
    } else if (activeTab.value === "withdrawals") {
      fileName = "cekimler"
      sheetName = t("withdrawals")
      rows = filteredWithdrawals.value.map(item => ({
        [t("amount")]: Number(item.amount || 0),
        [t("currency")]: item.currency || "-",
        [t("method")]: item.methodName || item.method || "-",
        [t("transaction")]: item.transaction || "-",
        [t("status")]: item.status || item.state || "-",
        [t("createdAt")]: formatDate(item.createdAt),
      }))
    } else if (activeTab.value === "bonus-history") {
      fileName = "bonus-gecmisi"
      sheetName = t("bonusHistory")
      rows = filteredManualBonuses.value.map(item => ({
        [t("manualAdjustments.bonusName")]: item.bonusName || item.category || "-",
        [t("amount")]: Number(item.amount || 0),
        [t("manualAdjustments.wallet")]: formatWallet(item.wallet),
        [t("manualAdjustments.actor")]: formatActor(item.actor),
        [t("manualAdjustments.note")]: item.note || "-",
        [t("manualAdjustments.balanceBefore")]: Number(item.balanceBefore || 0),
        [t("manualAdjustments.balanceAfter")]: Number(item.balanceAfter || 0),
        [t("manualAdjustments.date")]: formatDate(item.createdAt),
      }))
    } else if (activeTab.value === "shop") {
      fileName = "magaza-satin-alimlari"
      sheetName = t("platform.shop")
      rows = filteredShopPurchases.value.map(item => ({
        [t("title")]: item.title || "-",
        [t("shop.coinCost")]: Number(item.coinCost ?? 0),
        [t("shop.rewardAmount")]: Number(item.rewardAmount ?? 0),
        [t("wallets")]: formatWallet(item.wallet),
        [t("status")]: item.state || "-",
        [t("createdAt")]: formatDate(item.createdAt),
      }))
    }

    if (!rows.length) return

    await exportToXlsx({
      rows,
      fileName,
      sheetName,
      columnWidths: autoColumnWidths(rows),
    })
  } catch (err) {
    console.error("❌ Finans verisi dışa aktarılamadı:", err)
  } finally {
    isExporting.value = false
  }
}

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

      <!-- 🗓️ Tarih Aralığı Filtresi -->
      <VRow class="mt-2 align-center">
        <VCol
          cols="12"
          sm="4"
        >
          <AppTextField
            v-model="dateFrom"
            type="date"
            :label="t('startDate')"
            density="comfortable"
            clearable
          />
        </VCol>
        <VCol
          cols="12"
          sm="4"
        >
          <AppTextField
            v-model="dateTo"
            type="date"
            :label="t('endDate')"
            density="comfortable"
            clearable
          />
        </VCol>
        <VCol
          cols="12"
          sm="4"
        >
          <!-- 🎯 Yöntem filtresi: aktif sekmedeki kayıtlardan çıkarılan
               benzersiz değerler arasından çoklu seçim yapılabilir -->
          <VSelect
            v-model="methodFilter"
            :items="availableMethods"
            :label="methodLabel"
            multiple
            chips
            closable-chips
            clearable
            density="comfortable"
          />
        </VCol>
        <VCol
          cols="12"
          sm="8"
          class="d-flex gap-2 flex-wrap align-center"
        >
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-restore"
            @click="resetDateFilter"
          >
            {{ t("gameHistory.reset") }}
          </VBtn>
          <VBtn
            color="success"
            variant="tonal"
            prepend-icon="tabler-file-spreadsheet"
            :loading="isExporting"
            @click="exportActiveTab"
          >
            Excel&apos;e Aktar
          </VBtn>
        </VCol>
      </VRow>

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
                v-for="(item, index) in filteredDeposits"
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
                v-for="(item, index) in filteredWithdrawals"
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
                v-for="(item, index) in filteredManualBonuses"
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
              <tr v-if="!filteredManualBonuses.length">
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
                v-for="(item, index) in filteredShopPurchases"
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
              <tr v-if="!filteredShopPurchases.length">
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
