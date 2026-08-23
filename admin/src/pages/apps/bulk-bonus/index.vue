<script setup>
import axios from "@/plugins/axios"
import ability from "@/plugins/casl/ability"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const canManage = computed(
  () =>
    ability.can("manage", "finance.manualAdjustments") ||
    ability.can("manage", "finance.promo") ||
    ability.can("manage", "finance"),
)

// ------- Bonus adı (kategori) seçimi -------
const categories = ref([])
const categoriesLoading = ref(false)

const fetchCategories = async () => {
  categoriesLoading.value = true
  try {
    const res = await axios.get("/admin/manual-bonus-categories")

    categories.value = res.data.data || []
  } catch (err) {
    console.error("Bonus adları alınamadı:", err)
  } finally {
    categoriesLoading.value = false
  }
}

// ------- Affiliate kodu filtresi seçenekleri -------
const affiliateCodes = ref([])
const affiliateCodesLoading = ref(false)

const fetchAffiliateCodes = async () => {
  affiliateCodesLoading.value = true
  try {
    const res = await axios.get("/admin/bulk-bonus/affiliate-codes")

    affiliateCodes.value = res.data.data || []
  } catch (err) {
    console.error("Affiliate kod listesi alınamadı:", err)
  } finally {
    affiliateCodesLoading.value = false
  }
}

const affiliateOptions = computed(() => [
  { title: t("bulkBonus.affiliateNone"), value: "" },
  ...affiliateCodes.value.map(item => ({
    title: t("bulkBonus.affiliateOption", {
      code: item.code,
      owner: item.ownerUsername || "—",
      count: item.referredCount,
    }),
    value: item.code,
  })),
])

// ------- Form durumu -------
const defaultForm = {
  usernamesRaw: "",
  category: null,
  amount: null,
  note: "",
  affiliateCode: "",
  applyWageringLock: false,
  wageringMultiplier: 1,
  minDeposit: 0,
  minWithdraw: 0,
}

const form = ref({ ...defaultForm })
const submitting = ref(false)
const formError = ref("")
const results = ref(null)

const parsedUsernames = computed(() => {
  const list = String(form.value.usernamesRaw || "")
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(Boolean)

  const seen = new Set()
  const unique = []

  for (const value of list) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
  }

  return unique
})

const resetResults = () => {
  results.value = null
  formError.value = ""
}

const clearForm = () => {
  form.value = { ...defaultForm }
  resetResults()
}

const validate = () => {
  if (parsedUsernames.value.length === 0) {
    return t("bulkBonus.validationNoUsernames")
  }
  if (parsedUsernames.value.length > 500) {
    return t("bulkBonus.validationTooMany")
  }
  if (!form.value.category) {
    return t("bulkBonus.validationNoCategory")
  }
  const amount = Number(form.value.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return t("bulkBonus.validationNoAmount")
  }

  return ""
}

const submit = async () => {
  if (!canManage.value || submitting.value) return

  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    results.value = null

    return
  }

  submitting.value = true
  formError.value = ""
  results.value = null

  try {
    const res = await axios.post("/admin/bulk-bonus", {
      usernames: parsedUsernames.value,
      category: form.value.category,
      amount: Number(form.value.amount),
      note: form.value.note,
      affiliateCode: form.value.affiliateCode || "",
      applyWithdrawalLock: form.value.applyWageringLock,
      wageringMultiplier: form.value.applyWageringLock ? Number(form.value.wageringMultiplier) || 0 : 0,
      minDeposit: Number(form.value.minDeposit) || 0,
      minWithdraw: Number(form.value.minWithdraw) || 0,
    })

    results.value = res.data.data
  } catch (err) {
    formError.value =
      err.response?.data?.message || err.message || t("bulkBonus.validationNoAmount")
  } finally {
    submitting.value = false
  }
}

const statusMeta = status => {
  const map = {
    success: { color: "success", label: t("bulkBonus.statusSuccess"), icon: "tabler-check" },
    not_found: { color: "secondary", label: t("bulkBonus.statusNotFound"), icon: "tabler-user-question" },
    no_wallet: { color: "warning", label: t("bulkBonus.statusNoWallet"), icon: "tabler-wallet-off" },
    affiliate_mismatch: { color: "warning", label: t("bulkBonus.statusAffiliateMismatch"), icon: "tabler-filter-off" },
    error: { color: "error", label: t("bulkBonus.statusError"), icon: "tabler-alert-triangle" },
  }

  return map[status] || map.error
}

onMounted(() => {
  fetchCategories()
  fetchAffiliateCodes()
})
</script>

<template>
  <div>
    <VCard class="mb-6">
      <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <span>{{ t("bulkBonus.title") }}</span>
          <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
            {{ t("bulkBonus.description") }}
          </p>
        </div>
      </VCardTitle>

      <VCardText>
        <VAlert
          v-if="formError"
          type="error"
          variant="tonal"
          closable
          class="mb-4"
          @click:close="formError = ''"
        >
          {{ formError }}
        </VAlert>

        <VRow>
          <VCol cols="12">
            <VTextarea
              v-model="form.usernamesRaw"
              :label="t('bulkBonus.usernames') + ' *'"
              :hint="t('bulkBonus.usernamesHint')"
              persistent-hint
              rows="6"
              placeholder="kullanici1&#10;kullanici2&#10;kullanici3"
              :disabled="!canManage"
            />
            <p class="text-caption text-medium-emphasis mt-1 mb-0">
              {{ t("bulkBonus.usernamesCount", { count: parsedUsernames.length }) }}
            </p>
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VAutocomplete
              v-model="form.category"
              :items="categories"
              :loading="categoriesLoading"
              :label="t('bulkBonus.category') + ' *'"
              :placeholder="t('bulkBonus.categoryPlaceholder')"
              clearable
              :disabled="!canManage"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.amount"
              type="number"
              min="0"
              step="0.01"
              :label="t('bulkBonus.amount') + ' *'"
              :disabled="!canManage"
            />
          </VCol>

          <VCol cols="12">
            <VTextField
              v-model="form.note"
              :label="t('bulkBonus.note')"
              :disabled="!canManage"
            />
          </VCol>

          <VCol cols="12">
            <VDivider class="mb-2" />
          </VCol>

          <VCol cols="12">
            <VAutocomplete
              v-model="form.affiliateCode"
              :items="affiliateOptions"
              :loading="affiliateCodesLoading"
              :label="t('bulkBonus.affiliateFilter')"
              :hint="t('bulkBonus.affiliateFilterHint')"
              persistent-hint
              :disabled="!canManage"
            />
          </VCol>

          <VCol cols="12">
            <VDivider class="mb-2" />
            <p class="text-subtitle-2 mb-2">
              {{ t("bulkBonus.withdrawalRequirements") }}
            </p>
          </VCol>

          <VCol cols="12">
            <VSwitch
              v-model="form.applyWageringLock"
              :label="t('bulkBonus.applyWageringLock')"
              :hint="t('bulkBonus.applyWageringLockHint')"
              persistent-hint
              :disabled="!canManage"
            />
          </VCol>

          <template v-if="form.applyWageringLock">
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model.number="form.wageringMultiplier"
                type="number"
                min="0"
                step="0.1"
                :label="t('bulkBonus.wageringMultiplier')"
                :hint="t('bulkBonus.wageringMultiplierHint')"
                persistent-hint
                :disabled="!canManage"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model.number="form.minDeposit"
                type="number"
                min="0"
                step="0.01"
                :label="t('bulkBonus.minDeposit')"
                :disabled="!canManage"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model.number="form.minWithdraw"
                type="number"
                min="0"
                step="0.01"
                :label="t('bulkBonus.minWithdraw')"
                :disabled="!canManage"
              />
            </VCol>
          </template>
        </VRow>
      </VCardText>

      <VCardActions class="px-4 pb-4">
        <VSpacer />
        <VBtn
          variant="text"
          :disabled="submitting"
          @click="clearForm"
        >
          {{ t("bulkBonus.clear") }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="submitting"
          :disabled="!canManage || submitting"
          @click="submit"
        >
          {{ submitting ? t("bulkBonus.submitting") : t("bulkBonus.submit") }}
        </VBtn>
      </VCardActions>
    </VCard>

    <VCard v-if="results">
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ t("bulkBonus.resultsTitle") }}</span>
        <VChip color="primary">
          {{ t("bulkBonus.resultsSummary", { success: results.successCount, total: results.total }) }}
        </VChip>
      </VCardTitle>
      <VCardText>
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>{{ t("fields.username") }}</th>
              <th>{{ t("status") }}</th>
              <th>{{ t("bulkBonus.amount") }}</th>
              <th>{{ t("details") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in results.results"
              :key="row.username"
            >
              <td>{{ row.username }}</td>
              <td>
                <VChip
                  size="small"
                  :color="statusMeta(row.status).color"
                >
                  <VIcon
                    :icon="statusMeta(row.status).icon"
                    size="14"
                    class="me-1"
                  />
                  {{ statusMeta(row.status).label }}
                </VChip>
              </td>
              <td>{{ row.amount ?? "—" }}</td>
              <td class="text-medium-emphasis">
                {{ row.message || "—" }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>
  </div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: finance.manualAdjustments
</route>
