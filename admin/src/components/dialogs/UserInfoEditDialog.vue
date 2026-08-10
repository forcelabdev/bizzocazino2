<script setup>
import axios from "@axios"
import socket from "@/libs/socket"
import { useI18n } from "vue-i18n"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(["submit", "update:isDialogVisible"])

const { t } = useI18n()

const cloneUserData = value => structuredClone(toRaw(value || {}))

const originalUserData = ref(cloneUserData(props.userData))
const userData = ref(cloneUserData(props.userData))
const activeTab = ref("general")
const currentAdminData = JSON.parse(localStorage.getItem("userData") || "{}")
const isSuperAdmin = computed(() => currentAdminData.isSuperAdmin === true)

const createEmptyBalanceAction = () => ({
  action: "add",
  amount: null,
  note: "",
})

const createEmptyBonusAction = () => ({
  amount: null,
  category: "",
  note: "",
})

const balanceAction = reactive(createEmptyBalanceAction())
const bonusAction = reactive(createEmptyBonusAction())
const manualAdjustmentPreview = ref(null)
const manualAdjustmentError = ref("")
const manualBonusCategories = ref([])
const manualBonusCategoriesLoading = ref(false)

const rivoWallet = computed(
  () =>
    (userData.value.wallets || []).find(
      wallet =>
        wallet.coinType === "Rivo" &&
        wallet.chain === "TRON" &&
        wallet.type === "trc-20",
    ) ||
    (userData.value.wallets || []).find(wallet => wallet.coinType === "Rivo") ||
    null,
)

const primaryWallet = computed(() => rivoWallet.value || userData.value.wallets?.[0] || null)

const fetchManualBonusCategories = async () => {
  if (manualBonusCategoriesLoading.value || manualBonusCategories.value.length) {
    return
  }

  manualBonusCategoriesLoading.value = true
  try {
    const response = await axios.get("/admin/manual-bonus-categories")

    manualBonusCategories.value = response.data.data || []
  } catch (error) {
    console.error("Manual bonus categories error:", error)
    manualAdjustmentError.value = t("manualAdjustments.loadBonusCategoriesFailed")
    manualBonusCategories.value = []
  } finally {
    manualBonusCategoriesLoading.value = false
  }
}

const resetManualAdjustmentState = () => {
  Object.assign(balanceAction, createEmptyBalanceAction())
  Object.assign(bonusAction, createEmptyBonusAction())
  manualAdjustmentPreview.value = null
  manualAdjustmentError.value = ""
}

watch(
  () => props.userData,
  newValue => {
    originalUserData.value = cloneUserData(newValue)
    userData.value = cloneUserData(newValue)
    resetManualAdjustmentState()
  },
  { deep: true, immediate: true },
)

watch(
  balanceAction,
  () => {
    manualAdjustmentPreview.value = null
    manualAdjustmentError.value = ""
  },
  { deep: true },
)

watch(
  bonusAction,
  () => {
    manualAdjustmentPreview.value = null
    manualAdjustmentError.value = ""
  },
  { deep: true },
)

watch(
  [() => props.isDialogVisible, activeTab],
  ([isDialogVisible, tab]) => {
    if (isDialogVisible && tab === "bonus") {
      fetchManualBonusCategories()
    }
  },
  { immediate: true },
)

const dialogModelValueUpdate = val => {
  emit("update:isDialogVisible", val)
}

const fiatCurrencies = [
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "EUR",
  "TRY",
  "BRL",
  "MXN",
  "INR",
  "JPY",
  "KRW",
  "PHP",
  "ZAR",
  "RUB",
  "SEK",
  "NOK",
  "DKK",
  "SGD",
  "MYR",
  "THB",
  "VND",
  "ARS",
  "COP",
  "CLP",
  "CNY",
]

// ✅ Socket update
const sendValueToServer = (setting, value) => {
  socket.emit(
    "sendUserValue",
    { userId: userData.value._id, setting, value },
    res => {
      if (!res.success) {
        console.error(`Error updating ${setting}`, res.error?.message)
      }
    },
  )
}

const hasBalanceAdjustmentInput = () =>
  balanceAction.amount !== null && balanceAction.amount !== "" ||
  String(balanceAction.note || "").trim().length > 0

const hasBonusAdjustmentInput = () =>
  bonusAction.amount !== null && bonusAction.amount !== "" ||
  String(bonusAction.category || "").trim().length > 0 ||
  String(bonusAction.note || "").trim().length > 0

const buildBalanceAdjustmentPayload = () => {
  const wallet = primaryWallet.value
  const rawAmount = balanceAction.amount
  const hasAmountValue = rawAmount !== null && rawAmount !== ""
  const amount = hasAmountValue ? Number(rawAmount) : Number.NaN

  if (!wallet || !hasAmountValue || !Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const direction = balanceAction.action === "remove" ? "debit" : "credit"
  const balanceBefore = Number(wallet.balance || 0)

  const balanceAfter =
    direction === "credit"
      ? balanceBefore + amount
      : Math.max(0, balanceBefore - amount)

  return {
    wallet: {
      coinType: wallet.coinType,
      chain: wallet.chain,
      type: wallet.type,
    },
    kind: "balance",
    direction,
    note: String(balanceAction.note || "").trim(),
    amount,
    balanceBefore,
    balanceAfter,
  }
}

const buildBonusAdjustmentPayload = () => {
  const wallet = rivoWallet.value
  const rawAmount = bonusAction.amount
  const hasAmountValue = rawAmount !== null && rawAmount !== ""
  const amount = hasAmountValue ? Number(rawAmount) : Number.NaN
  const category = String(bonusAction.category || "").trim()

  if (!wallet || !hasAmountValue || !Number.isFinite(amount) || amount < 0 || !category) {
    return null
  }

  if (!manualBonusCategories.value.includes(category)) {
    return null
  }

  const balanceBefore = Number(wallet.balance || 0)
  const balanceAfter = balanceBefore + amount

  return {
    wallet: {
      coinType: wallet.coinType,
      chain: wallet.chain,
      type: wallet.type,
    },
    kind: "bonus",
    direction: "credit",
    category,
    note: String(bonusAction.note || "").trim(),
    amount,
    balanceBefore,
    balanceAfter,
  }
}

const resolveManualAdjustmentForSubmit = () => {
  const hasBalanceInput = hasBalanceAdjustmentInput()
  const hasBonusInput = hasBonusAdjustmentInput()
  const balanceAdjustment = buildBalanceAdjustmentPayload()
  const bonusAdjustment = buildBonusAdjustmentPayload()

  if (hasBalanceInput && hasBonusInput) {
    return {
      error: t("manualAdjustments.singleAdjustmentOnly"),
      tab: "wallets",
    }
  }

  if (hasBalanceInput && !balanceAdjustment) {
    return {
      error: t("manualAdjustments.completeForm"),
      tab: "wallets",
    }
  }

  if (hasBonusInput && !bonusAdjustment) {
    return {
      error: rivoWallet.value
        ? t("manualAdjustments.completeBonusForm")
        : t("manualAdjustments.rivoWalletMissing"),
      tab: "bonus",
    }
  }

  return {
    manualAdjustment: balanceAdjustment || bonusAdjustment,
  }
}

const onFormSubmit = () => {
  const payload = {
    name: userData.value.name,
    username: userData.value.username,
    phone: userData.value.phone,
    local: {
      email: userData.value.local?.email || "",
    },
    currency: {
      ...(userData.value.currency || {}),
      fiatCurrency: userData.value.currency?.fiatCurrency || "USD",
    },
    stats: { ...(userData.value.stats || {}) },
    limits: { ...(userData.value.limits || {}) },
    affiliates: { ...(userData.value.affiliates || {}) },
    identity: { ...(userData.value.identity || {}) },
  }

  const { error, tab, manualAdjustment } = resolveManualAdjustmentForSubmit()

  if (error) {
    manualAdjustmentError.value = error
    activeTab.value = tab

    return
  }

  if (manualAdjustment) {
    payload.manualAdjustment = {
      wallet: manualAdjustment.wallet,
      kind: manualAdjustment.kind,
      direction: manualAdjustment.direction,
      category: manualAdjustment.category,
      note: manualAdjustment.note,
      amount: manualAdjustment.amount,
    }
  }

  if (isSuperAdmin.value) {
    payload.rank = userData.value.rank
    payload.local.emailVerified = Boolean(userData.value.local?.emailVerified)
  }

  emit("update:isDialogVisible", false)
  emit("submit", payload)
}

const onFormReset = () => {
  userData.value = cloneUserData(props.userData)
  resetManualAdjustmentState()
  emit("update:isDialogVisible", false)
}

const updateBalancePreview = () => {
  manualAdjustmentPreview.value = buildBalanceAdjustmentPayload()
  manualAdjustmentError.value = manualAdjustmentPreview.value
    ? ""
    : t("manualAdjustments.completeForm")
}

const updateBonusPreview = () => {
  manualAdjustmentPreview.value = buildBonusAdjustmentPayload()
  manualAdjustmentError.value = manualAdjustmentPreview.value
    ? ""
    : rivoWallet.value
      ? t("manualAdjustments.completeBonusForm")
      : t("manualAdjustments.rivoWalletMissing")
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="props.isDialogVisible"
    @update:model-value="dialogModelValueUpdate"
  >
    <DialogCloseBtn @click="dialogModelValueUpdate(false)" />

    <VCard>
      <VCardTitle class="pa-5">
        {{ t("editUserInfo") }}
      </VCardTitle>

      <VCardText>
        <VTabs
          v-model="activeTab"
          grow
        >
          <VTab value="general">
            {{ t("tabs.general") }}
          </VTab>
          <VTab value="wallets">
            {{ t("balance") }}
          </VTab>
          <VTab value="bonus">
            {{ t("tabs.bonus") }}
          </VTab>
          <VTab value="stats">
            {{ t("tabs.stats") }}
          </VTab>
          <VTab value="limits">
            {{ t("tabs.limits") }}
          </VTab>
          <VTab value="affiliates">
            {{ t("tabs.affiliates") }}
          </VTab>
          <VTab value="security">
            {{ t("tabs.security") }}
          </VTab>
          <VTab value="system">
            {{ t("tabs.system") }}
          </VTab>
        </VTabs>

        <VWindow
          v-model="activeTab"
          class="mt-4"
        >
          <!-- General -->
          <VWindowItem value="general">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.name"
                  :label="t('fields.fullName')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.username"
                  :label="t('fields.username')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.local.email"
                  :label="t('fields.email')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.phone"
                  :label="t('fields.phone')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="userData.currency.fiatCurrency"
                  :items="
                    fiatCurrencies.map((c) => ({
                      title: c,
                      value: c,
                    }))
                  "
                  :label="t('fields.fiatCurrency')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.rank"
                  :label="t('fields.rank')"
                  :disabled="!isSuperAdmin"
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- Wallets -->
          <VWindowItem value="wallets">
            <div class="d-flex align-center gap-3">
              <VRow class="mt-1">
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="balanceAction.action"
                    :items="[
                      { title: t('wallets.add'), value: 'add' },
                      { title: t('wallets.remove'), value: 'remove' },
                    ]"
                    :label="t('manualAdjustments.direction')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="balanceAction.amount"
                    type="number"
                    :label="t('wallets.amount')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="12"
                >
                  <AppTextField
                    v-model="balanceAction.note"
                    :label="t('manualAdjustments.note')"
                  />
                </VCol>
                <VCol
                  cols="12"
                  class="d-flex justify-end"
                >
                  <VBtn @click="updateBalancePreview">
                    {{
                      t('manualAdjustments.preview')
                    }}
                  </VBtn>
                </VCol>
                <VCol
                  v-if="manualAdjustmentError && activeTab === 'wallets'"
                  cols="12"
                >
                  <VAlert
                    color="warning"
                    density="compact"
                    variant="tonal"
                  >
                    {{ manualAdjustmentError }}
                  </VAlert>
                </VCol>
                <VCol
                  v-if="manualAdjustmentPreview && activeTab === 'wallets'"
                  cols="12"
                >
                  <VAlert
                    color="info"
                    density="compact"
                    variant="tonal"
                  >
                    {{
                      t('manualAdjustments.readyMessage', {
                        kind: t(`manualAdjustments.kinds.${manualAdjustmentPreview.kind}`),
                        direction: t(`manualAdjustments.directions.${manualAdjustmentPreview.direction}`),
                        amount: manualAdjustmentPreview.amount,
                      })
                    }}
                    <br>
                    {{ t('manualAdjustments.balanceBefore') }}:
                    {{ manualAdjustmentPreview.balanceBefore }}
                    |
                    {{ t('manualAdjustments.balanceAfter') }}:
                    {{ manualAdjustmentPreview.balanceAfter }}
                  </VAlert>
                </VCol>
              </VRow>
            </div>
          </VWindowItem>

          <VWindowItem value="bonus">
            <VRow class="mt-1">
              <VCol
                v-if="!rivoWallet"
                cols="12"
              >
                <VAlert
                  color="warning"
                  density="compact"
                  variant="tonal"
                >
                  {{ t("manualAdjustments.rivoWalletMissing") }}
                </VAlert>
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="bonusAction.amount"
                  type="number"
                  :label="t('wallets.amount')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSelect
                  v-model="bonusAction.category"
                  :items="manualBonusCategories.map(category => ({ title: category, value: category }))"
                  :label="t('manualAdjustments.bonusName')"
                  :loading="manualBonusCategoriesLoading"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField
                  v-model="bonusAction.note"
                  :label="t('manualAdjustments.note')"
                />
              </VCol>
              <VCol
                cols="12"
                class="d-flex justify-end"
              >
                <VBtn @click="updateBonusPreview">
                  {{
                    t('manualAdjustments.preview')
                  }}
                </VBtn>
              </VCol>
              <VCol
                v-if="manualAdjustmentError && activeTab === 'bonus'"
                cols="12"
              >
                <VAlert
                  color="warning"
                  density="compact"
                  variant="tonal"
                >
                  {{ manualAdjustmentError }}
                </VAlert>
              </VCol>
              <VCol
                v-if="manualAdjustmentPreview && activeTab === 'bonus'"
                cols="12"
              >
                <VAlert
                  color="info"
                  density="compact"
                  variant="tonal"
                >
                  {{
                    t('manualAdjustments.readyMessage', {
                      kind: t(`manualAdjustments.kinds.${manualAdjustmentPreview.kind}`),
                      direction: t(`manualAdjustments.directions.${manualAdjustmentPreview.direction}`),
                      amount: manualAdjustmentPreview.amount,
                    })
                  }}
                  <br>
                  {{ t('manualAdjustments.balanceBefore') }}:
                  {{ manualAdjustmentPreview.balanceBefore }}
                  |
                  {{ t('manualAdjustments.balanceAfter') }}:
                  {{ manualAdjustmentPreview.balanceAfter }}
                </VAlert>
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- Stats -->
          <VWindowItem value="stats">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.stats.bet"
                  :label="t('fields.totalBet')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.stats.won"
                  :label="t('fields.totalWon')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.stats.deposit"
                  :label="t('fields.totalDeposit')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.stats.withdraw"
                  :label="t('fields.totalWithdraw')"
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- Limits -->
          <VWindowItem value="limits">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.limits.betToWithdraw"
                  :label="t('limits.betToWithdraw')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.limits.betToRain"
                  :label="t('limits.betToRain')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.limits.limitTip"
                  :label="t('limits.limitTip')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VSwitch
                  v-model="userData.limits.blockAffiliate"
                  :label="t('limits.blockAffiliate')"
                  inset
                />
                <VSwitch
                  v-model="userData.limits.blockRain"
                  :label="t('limits.blockRain')"
                  inset
                />
                <VSwitch
                  v-model="userData.limits.blockTip"
                  :label="t('limits.blockTip')"
                  inset
                />
                <VSwitch
                  v-model="userData.limits.blockSponsor"
                  :label="t('limits.blockSponsor')"
                  inset
                />
                <VSwitch
                  v-model="userData.limits.blockLeaderboard"
                  :label="t('limits.blockLeaderboard')"
                  inset
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- Affiliates -->
          <VWindowItem value="affiliates">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.affiliates.code"
                  :label="t('affiliates.code')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.affiliates.referred"
                  :label="t('affiliates.referred')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.affiliates.deposit"
                  :label="t('affiliates.deposit')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.affiliates.earned"
                  :label="t('affiliates.earned')"
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- Security -->
          <VWindowItem value="security">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.identity.idNumber"
                  :label="t('fields.identityNumber')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSwitch
                  v-model="userData.identity.verified"
                  :label="t('fields.identityVerified')"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppSwitch
                  v-model="userData.local.emailVerified"
                  :label="t('fields.emailVerified')"
                  :disabled="!isSuperAdmin"
                />
              </VCol>
            </VRow>
          </VWindowItem>

          <!-- System -->
          <VWindowItem value="system">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.createdAt"
                  :label="t('system.createdAt')"
                  disabled
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <AppTextField
                  v-model="userData.updatedAt"
                  :label="t('system.updatedAt')"
                  disabled
                />
              </VCol>
            </VRow>
          </VWindowItem>
        </VWindow>

        <!-- Submit / Cancel -->
        <div class="d-flex justify-center gap-3 mt-6">
          <VBtn
            color="primary"
            @click="onFormSubmit"
          >
            {{
              t("actions.submit")
            }}
          </VBtn>
          <VBtn
            color="secondary"
            variant="tonal"
            @click="onFormReset"
          >
            {{ t("actions.cancel") }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
