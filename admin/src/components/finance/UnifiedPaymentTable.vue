<script setup>
import axios from "@axios"
import ability from "@/plugins/casl/ability"
import { avatarText } from "@core/utils/formatters"
import { useI18n } from "vue-i18n"
import { VDataTableServer } from "vuetify/labs/VDataTable"

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: value => ["deposit", "withdraw"].includes(value),
  },
})

const { t } = useI18n()
const searchQuery = ref("")
const statusFilter = ref(null)
const dateRange = ref("")
const transactions = ref([])
const totalTransactions = ref(0)
const stats = ref({ totalAmount: 0, last24hAmount: 0, monthlyAmount: 0 })
const isLoading = ref(false)
const errorMessage = ref("")
const requestSequence = ref(0)
const options = ref({ page: 1, itemsPerPage: 10, sortBy: [] })
const selectedTransaction = ref(null)
const showDetailsDialog = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref("")
const pendingRejectTransaction = ref(null)
const actionLoading = ref("")
const snackbar = ref({ show: false, color: "success", message: "" })

const canManageFinanceWithdraws = computed(
  () =>
    ability.can("manage", "finance.withdraws") ||
    ability.can("manage", "finance"),
)

const headers = [
  { title: t("finance.user"), key: "user", sortable: false },
  { title: "Payment", key: "provider", sortable: false },
  { title: t("finance.txId"), key: "transactionId", sortable: false },
  { title: t("finance.currency"), key: "currency", sortable: false },
  { title: t("finance.amount"), key: "amount", sortable: false },
  { title: t("finance.state"), key: "status", sortable: false },
  { title: t("finance.date"), key: "createdAt", sortable: false },
  { title: "İşlemler", key: "actions", sortable: false },
]

const statusItems = [
  { title: "Bekliyor", value: "pending" },
  { title: "İşleniyor", value: "processing" },
  { title: "Onaylandı", value: "approved" },
  { title: "Tamamlandı", value: "completed" },
  { title: "Başarılı", value: "success" },
  { title: "Reddedildi", value: "rejected" },
  { title: "İptal Edildi", value: "cancelled" },
  { title: "İptal Edildi", value: "canceled" },
  { title: "Süresi Doldu", value: "expired" },
  { title: "Başarısız", value: "failed" },
]

const pageCount = computed(() =>
  Math.max(1, Math.ceil(totalTransactions.value / options.value.itemsPerPage)),
)

const paginationText = computed(() => {
  if (!totalTransactions.value) return "0 kayıt"

  const start = (options.value.page - 1) * options.value.itemsPerPage + 1

  const end = Math.min(
    options.value.page * options.value.itemsPerPage,
    totalTransactions.value,
  )

  return `${start}-${end} / ${totalTransactions.value} kayıt`
})

const parseDateRange = () => {
  const [startDate, endDate] = String(dateRange.value || "")
    .split("to")
    .map(value => value.trim())

  return { startDate: startDate || undefined, endDate: endDate || undefined }
}

const fetchTransactions = async () => {
  const currentRequest = ++requestSequence.value

  isLoading.value = true
  errorMessage.value = ""

  try {
    const { startDate, endDate } = parseDateRange()

    const response = await axios.get(
      `/admin/payment-transactions/${props.type}`,
      {
        params: {
          q: searchQuery.value || undefined,
          status: statusFilter.value || undefined,
          startDate,
          endDate,
          page: options.value.page,
          itemsPerPage: options.value.itemsPerPage,
        },
      },
    )

    if (currentRequest !== requestSequence.value) return

    const data = response?.data?.data || {}

    transactions.value = data.transactions || []
    totalTransactions.value = Number(data.total || 0)
    options.value.page = Number(data.page || 1)
    stats.value = data.stats || {
      totalAmount: 0,
      last24hAmount: 0,
      monthlyAmount: 0,
    }
  } catch (error) {
    if (currentRequest === requestSequence.value) {
      console.error(`Tüm ${props.type} işlemleri alınamadı:`, error)
      transactions.value = []
      totalTransactions.value = 0
      errorMessage.value = "İşlemler alınamadı. Lütfen tekrar deneyin."
    }
  } finally {
    if (currentRequest === requestSequence.value) isLoading.value = false
  }
}

watch([searchQuery, statusFilter, dateRange], () => {
  if (options.value.page === 1) fetchTransactions()
  else options.value.page = 1
})

watch(
  () => [options.value.page, options.value.itemsPerPage],
  fetchTransactions,
  { immediate: true },
)

const formatTRY = value =>
  `${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`

const formatDateTime = value =>
  value ? new Date(value).toLocaleString("tr-TR") : "—"

const statusColor = status => {
  if (["approved", "completed", "success"].includes(status)) return "success"
  if (status === "pending") return "warning"
  if (status === "processing") return "info"
  if (["rejected", "failed"].includes(status)) return "error"
  if (["cancelled", "canceled", "expired"].includes(status)) return "secondary"

  return "default"
}

const statusLabel = status =>
  statusItems.find(item => item.value === status)?.title || status || "—"

const copyToClipboard = async value => {
  try {
    await navigator.clipboard.writeText(String(value || ""))
  } catch (error) {
    console.error("Clipboard copy failed:", error)
  }
}

const hasValue = value =>
  value !== null && value !== undefined && value !== ""

const formatDetailValue = (value, kind) => {
  if (!hasValue(value)) return "—"
  if (kind === "date") return formatDateTime(value)
  if (kind === "money") return formatTRY(value)
  if (typeof value === "boolean") return value ? "Evet" : "Hayır"

  return String(value)
}

const detailDefinitions = {
  crypto: [
    ["Sağlayıcı ID", "providerId"],
    ["Gönderen", "sender"],
    ["Alıcı", "receiver"],
    ["Kripto para", "cryptoCurrency"],
    ["Fiat para", "fiatCurrency"],
    ["Kripto miktarı", "cryptoAmount"],
    ["Bonus miktarı", "bonusAmount"],
    ["Bonus tipi", "bonusType"],
  ],
  forcelab: [
    ["UUID", "uuid"],
    ["Provider slug", "providerSlug"],
    ["Provider tutarı", "providerAmount", "money"],
    ["Eski bakiye", "oldBalance", "money"],
    ["Yeni bakiye", "newBalance", "money"],
    ["Red nedeni", "rejectionReason"],
    ["Onay zamanı", "approvedAt", "date"],
    ["Red zamanı", "rejectedAt", "date"],
    ["İşlenme zamanı", "processedAt", "date"],
  ],
  meeldev: [
    ["Process no", "processNo"],
    ["Ödeme tipi", "paymentType"],
    ["Ödeme linki", "paymentUrl"],
    ["Hesap sahibi", "accountInfo.accountHolder"],
    ["Hesap IBAN", "accountInfo.iban"],
    ["Banka", "accountInfo.bankName"],
    ["Çekim hesabı sahibi", "bankInfo.accountHolder"],
    ["Çekim IBAN", "bankInfo.iban"],
    ["Çekim bankası", "bankInfo.bankName"],
    ["Eski bakiye", "oldBalance", "money"],
    ["Yeni bakiye", "newBalance", "money"],
    ["Red nedeni", "rejectionReason"],
    ["Onay zamanı", "approvedAt", "date"],
    ["Red zamanı", "rejectedAt", "date"],
  ],
  galaxypay: [
    ["Yöntem", "method"],
    ["Payment ID", "paymentId"],
    ["Banka", "bankInfo.bankName"],
    ["Hesap sahibi", "bankInfo.accountHolder"],
    ["IBAN", "bankInfo.iban"],
    ["Hesap no", "bankInfo.accountNumber"],
    ["Papara hesap sahibi", "paparaInfo.accountHolder"],
    ["Papara hesap no", "paparaInfo.accountNumber"],
    ["Eski bakiye", "oldBalance", "money"],
    ["Yeni bakiye", "newBalance", "money"],
    ["Red nedeni", "rejectionReason"],
    ["Onay zamanı", "approvedAt", "date"],
    ["Red zamanı", "rejectedAt", "date"],
  ],
  fluxkripto: [
    ["Order ID", "orderId"],
    ["Finance ID", "financeId"],
    ["Talep edilen tutar", "requestedAmount", "money"],
    ["Provider tutarı", "providerAmount", "money"],
    ["Kripto miktarı", "cryptoAmount"],
    ["Kur", "rate"],
    ["Cüzdan", "walletAddress"],
    ["Alıcı cüzdan", "receiverWallet"],
    ["Provider durumu", "providerStatus"],
    ["Red nedeni", "rejectionReason"],
    ["Onay zamanı", "approvedAt", "date"],
    ["Red zamanı", "rejectedAt", "date"],
    ["İşlenme zamanı", "processedAt", "date"],
  ],
  xpayments: [
    ["Finance ID", "financeId"],
    ["Talep edilen tutar", "requestedAmount", "money"],
    ["Provider tutarı", "providerAmount", "money"],
    ["Provider durumu", "providerStatus"],
    ["İşleniyor", "isProcessing"],
    ["Gönderim durumu", "submissionState"],
    ["Banka", "account.bankName"],
    ["Hesap sahibi", "account.accountHolderName"],
    ["Hesap IBAN", "account.iban"],
    ["Yöntem", "account.methodType"],
    ["Çekim hesap sahibi", "withdrawal.accountHolder"],
    ["Çekim IBAN", "withdrawal.iban"],
    ["Red nedeni", "rejectionReason"],
    ["Onay zamanı", "approvedAt", "date"],
    ["Red zamanı", "rejectedAt", "date"],
    ["İptal zamanı", "cancelledAt", "date"],
    ["Gönderim zamanı", "submittedAt", "date"],
  ],
}

const getNestedValue = (object, path) =>
  path.split(".").reduce((value, key) => value?.[key], object)

const detailRows = computed(() => {
  const transaction = selectedTransaction.value
  if (!transaction) return []

  const commonRows = [
    ["Payment", transaction.provider],
    ["Kullanıcı", transaction.user?.username],
    ["E-posta", transaction.user?.local?.email],
    ["Telefon", transaction.user?.phone],
    ["İşlem ID", transaction.transactionId],
    ["Para birimi", transaction.currency],
    ["Tutar", transaction.amount, "money"],
    ["Durum", statusLabel(transaction.status)],
    ["Oluşturulma", transaction.createdAt, "date"],
    ["Güncellenme", transaction.updatedAt, "date"],
  ]

  const providerRows = (detailDefinitions[transaction.source] || []).map(
    ([label, path, kind]) => [
      label,
      getNestedValue(transaction.details, path),
      kind,
    ],
  )

  return [...commonRows, ...providerRows]
    .filter(([, value]) => hasValue(value))
    .map(([label, value, kind]) => ({
      label,
      value: formatDetailValue(value, kind),
    }))
})

const openDetails = transaction => {
  selectedTransaction.value = transaction
  showDetailsDialog.value = true
}

const canApproveOrReject = transaction => {
  if (
    props.type !== "withdraw" ||
    !canManageFinanceWithdraws.value ||
    !transaction ||
    transaction.source === "crypto"
  ) {
    return false
  }

  if (transaction.source === "xpayments") {
    return (
      transaction.status === "pending" &&
      ["not_submitted", "failed"].includes(
        transaction.details?.submissionState,
      )
    )
  }

  return transaction.status === "pending"
}

const canCancel = transaction =>
  props.type === "withdraw" &&
  canManageFinanceWithdraws.value &&
  transaction?.source === "xpayments" &&
  transaction.status === "processing" &&
  transaction.details?.isProcessing !== true

const actionEndpoint = (transaction, action) => {
  const prefixes = {
    forcelab: "forcelab-finance",
    meeldev: "meeldev",
    galaxypay: "galaxypay",
    fluxkripto: "fluxkripto",
    xpayments: "xpayments",
  }

  const prefix = prefixes[transaction?.source]

  return prefix
    ? `/admin/${prefix}/withdraw/${transaction._id}/${action}`
    : null
}

const notify = (message, color = "success") => {
  snackbar.value = { show: true, color, message }
}

const runAction = async (transaction, action, reason) => {
  const endpoint = actionEndpoint(transaction, action)
  if (!endpoint || !canManageFinanceWithdraws.value) return

  if (action !== "reject") {
    const actionLabel = action === "approve" ? "onaylamak" : "iptal etmek"
    if (!confirm(`Bu çekim talebini ${actionLabel} istediğinize emin misiniz?`)) {
      return
    }
  }

  const key = `${transaction.source}:${transaction._id}:${action}`

  actionLoading.value = key

  try {
    await axios.post(
      endpoint,
      action === "reject" ? { reason: reason || undefined } : undefined,
    )
    showRejectDialog.value = false
    showDetailsDialog.value = false
    pendingRejectTransaction.value = null
    rejectReason.value = ""
    await fetchTransactions()
    notify(
      action === "approve"
        ? "Çekim talebi onaylandı."
        : action === "reject"
          ? "Çekim talebi reddedildi."
          : "Çekim talebi iptal edildi.",
    )
  } catch (error) {
    notify(
      error?.response?.data?.error ||
        error?.response?.data?.message ||
        "İşlem tamamlanamadı.",
      "error",
    )
  } finally {
    actionLoading.value = ""
  }
}

const openReject = transaction => {
  pendingRejectTransaction.value = transaction
  rejectReason.value = ""
  showRejectDialog.value = true
}

const confirmReject = () => {
  if (pendingRejectTransaction.value) {
    runAction(pendingRejectTransaction.value, "reject", rejectReason.value)
  }
}
</script>

<template>
  <section>
    <VRow class="mb-4">
      <VCol
        cols="12"
        sm="4"
      >
        <VCard>
          <VCardText class="d-flex justify-space-between align-center">
            <div>
              <h6 class="text-h6">
                {{ t(`finance.${type}.total`) }}
              </h6>
              <h4>{{ formatTRY(stats.totalAmount) }}</h4>
            </div>
            <VAvatar
              color="primary"
              variant="tonal"
              icon="tabler-cash"
            />
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="4"
      >
        <VCard>
          <VCardText class="d-flex justify-space-between align-center">
            <div>
              <h6 class="text-h6">
                {{ t(`finance.${type}.daily`) }}
              </h6>
              <h4>{{ formatTRY(stats.last24hAmount) }}</h4>
            </div>
            <VAvatar
              color="success"
              variant="tonal"
              icon="tabler-clock"
            />
          </VCardText>
        </VCard>
      </VCol>
      <VCol
        cols="12"
        sm="4"
      >
        <VCard>
          <VCardText class="d-flex justify-space-between align-center">
            <div>
              <h6 class="text-h6">
                {{ t(`finance.${type}.monthly`) }}
              </h6>
              <h4>{{ formatTRY(stats.monthlyAmount) }}</h4>
            </div>
            <VAvatar
              color="info"
              variant="tonal"
              icon="tabler-calendar"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard>
      <VCardTitle>
        {{ type === "deposit" ? "Tüm Yatırım İşlemleri" : "Tüm Çekim İşlemleri" }}
      </VCardTitle>
      <VCardText>
        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ errorMessage }}
        </VAlert>

        <VRow class="mb-4">
          <VCol
            cols="12"
            md="5"
          >
            <AppTextField
              v-model="searchQuery"
              label="Kullanıcı, işlem no veya payment ara"
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <AppSelect
              v-model="statusFilter"
              :items="statusItems"
              label="Durum"
              clearable
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <AppTextField
              v-model="dateRange"
              :label="t('finance.dateRange')"
              density="compact"
            />
          </VCol>
        </VRow>

        <VDataTableServer
          v-model:items-per-page="options.itemsPerPage"
          v-model:page="options.page"
          :items="transactions"
          :items-length="totalTransactions"
          :headers="headers"
          :loading="isLoading"
          class="text-no-wrap"
        >
          <template #item.user="{ item }">
            <div class="d-flex align-center">
              <VAvatar
                size="32"
                class="me-2"
              >
                <span>{{ avatarText(item.raw.user?.username || "U") }}</span>
              </VAvatar>
              <div>
                <div class="font-weight-medium">
                  {{ item.raw.user?.username || "-" }}
                </div>
                <small>ID: {{ item.raw.user?._id || "—" }}</small>
              </div>
            </div>
          </template>

          <template #item.provider="{ item }">
            <VChip
              color="primary"
              variant="tonal"
              label
            >
              {{ item.raw.provider }}
            </VChip>
          </template>

          <template #item.transactionId="{ item }">
            <div class="d-flex align-center">
              <span class="me-2">{{ item.raw.transactionId || "—" }}</span>
              <IconBtn
                v-if="item.raw.transactionId"
                size="small"
                @click="copyToClipboard(item.raw.transactionId)"
              >
                <VIcon
                  size="16"
                  icon="tabler-copy"
                />
              </IconBtn>
            </div>
          </template>

          <template #item.amount="{ item }">
            {{ formatTRY(item.raw.amount) }}
          </template>

          <template #item.status="{ item }">
            <VChip
              :color="statusColor(item.raw.status)"
              label
            >
              {{ statusLabel(item.raw.status) }}
            </VChip>
          </template>

          <template #item.createdAt="{ item }">
            {{ formatDateTime(item.raw.createdAt) }}
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex align-center gap-1">
              <IconBtn
                size="small"
                title="Detay"
                @click="openDetails(item.raw)"
              >
                <VIcon icon="tabler-eye" />
              </IconBtn>

              <IconBtn
                v-if="canApproveOrReject(item.raw)"
                color="success"
                size="small"
                title="Onayla"
                :disabled="Boolean(actionLoading)"
                :loading="actionLoading === `${item.raw.source}:${item.raw._id}:approve`"
                @click="runAction(item.raw, 'approve')"
              >
                <VIcon icon="tabler-check" />
              </IconBtn>

              <IconBtn
                v-if="canApproveOrReject(item.raw)"
                color="error"
                size="small"
                title="Reddet"
                :disabled="Boolean(actionLoading)"
                @click="openReject(item.raw)"
              >
                <VIcon icon="tabler-x" />
              </IconBtn>

              <IconBtn
                v-if="canCancel(item.raw)"
                color="warning"
                size="small"
                title="İptal et"
                :disabled="Boolean(actionLoading)"
                :loading="actionLoading === `${item.raw.source}:${item.raw._id}:cancel`"
                @click="runAction(item.raw, 'cancel')"
              >
                <VIcon icon="tabler-ban" />
              </IconBtn>
            </div>
          </template>

          <template #bottom>
            <VDivider />
            <div class="d-flex align-center justify-sm-space-between justify-center flex-wrap gap-3 pa-5 pt-3">
              <p class="text-sm text-disabled mb-0">
                {{ paginationText }}
              </p>
              <VPagination
                v-model="options.page"
                :length="pageCount"
                :total-visible="5"
              />
            </div>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <VDialog
      v-model="showDetailsDialog"
      max-width="720"
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          İşlem Detayı
          <IconBtn @click="showDetailsDialog = false">
            <VIcon icon="tabler-x" />
          </IconBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VList lines="two">
            <VListItem
              v-for="row in detailRows"
              :key="row.label"
              :title="row.label"
            >
              <template #subtitle>
                <span class="text-wrap">{{ row.value }}</span>
              </template>
              <template #append>
                <IconBtn
                  size="small"
                  title="Kopyala"
                  @click="copyToClipboard(row.value)"
                >
                  <VIcon
                    size="16"
                    icon="tabler-copy"
                  />
                </IconBtn>
              </template>
            </VListItem>
          </VList>
        </VCardText>
        <VDivider />
        <VCardActions class="justify-end">
          <VBtn
            v-if="canApproveOrReject(selectedTransaction)"
            color="success"
            :disabled="Boolean(actionLoading)"
            :loading="actionLoading === `${selectedTransaction.source}:${selectedTransaction._id}:approve`"
            @click="runAction(selectedTransaction, 'approve')"
          >
            Onayla
          </VBtn>
          <VBtn
            v-if="canApproveOrReject(selectedTransaction)"
            color="error"
            variant="tonal"
            :disabled="Boolean(actionLoading)"
            @click="openReject(selectedTransaction)"
          >
            Reddet
          </VBtn>
          <VBtn
            v-if="canCancel(selectedTransaction)"
            color="warning"
            variant="tonal"
            :disabled="Boolean(actionLoading)"
            :loading="actionLoading === `${selectedTransaction.source}:${selectedTransaction._id}:cancel`"
            @click="runAction(selectedTransaction, 'cancel')"
          >
            İptal Et
          </VBtn>
          <VBtn
            color="secondary"
            variant="text"
            @click="showDetailsDialog = false"
          >
            Kapat
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="showRejectDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>Çekim Talebini Reddet</VCardTitle>
        <VCardText>
          <AppTextarea
            v-model="rejectReason"
            label="Red nedeni (opsiyonel)"
            rows="3"
            autofocus
          />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            color="secondary"
            variant="text"
            :disabled="Boolean(actionLoading)"
            @click="showRejectDialog = false"
          >
            Vazgeç
          </VBtn>
          <VBtn
            color="error"
            :loading="actionLoading.endsWith(':reject')"
            @click="confirmReject"
          >
            Reddet
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>
