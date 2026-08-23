<script setup>
import { kFormatter } from "@core/utils/formatters"
import { formatCoinType } from "@/utils/currency"
import { useI18n } from "vue-i18n"
import UserRiskNotesCard from "@/views/apps/user/view/UserRiskNotesCard.vue"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(["updated"])

const { t } = useI18n()

const snackbar = ref({
  visible: false,
  message: "",
  color: "success",
})

function showSnackbar(message, color = "success") {
  snackbar.value.message = message
  snackbar.value.color = color
  snackbar.value.visible = true
}

const copyToClipboard = async (value, messageKey) => {
  if (value === null || value === undefined || value === "") return

  try {
    await navigator.clipboard.writeText(String(value))
    showSnackbar(t(messageKey), "success")
  } catch (error) {
    console.error("Panoya kopyalanamadı:", error)
    showSnackbar(t("copyFailed"), "error")
  }
}
</script>

<template>
  <VRow>
    <!-- Notlar + Etiketler (risk göstergesi ile) -->
    <VCol cols="12">
      <UserRiskNotesCard
        :user-data="userData"
        @updated="emit('updated', $event)"
      />
    </VCol>

    <!-- Personal Information -->
    <VCol cols="12">
      <VCard>
        <VCardItem :title="t('userDetail.personalInfo')">
          <template #prepend>
            <VIcon
              icon="tabler-user-circle"
              size="22"
              class="me-2"
            />
          </template>
        </VCardItem>
        <VDivider />
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("username") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.username || "-" }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("accountNumber") }}
              </div>
              <button
                v-if="userData.numericId !== null && userData.numericId !== undefined"
                type="button"
                class="d-inline-flex align-center font-weight-medium account-number-copy"
                :title="t('copyAccountNumber')"
                @click="copyToClipboard(userData.numericId, 'accountNumberCopied')"
              >
                <span>{{ userData.numericId }}</span>
                <VIcon
                  icon="tabler-copy"
                  size="15"
                  class="ms-1"
                />
              </button>
              <div
                v-else
                class="font-weight-medium"
              >
                —
              </div>
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("email") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.local?.email || "-" }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("identity") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.identity?.idNumber || "-" }}
              </div>
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("phone") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.phone || "-" }}
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Financial Summary -->
    <VCol cols="12">
      <VCard>
        <VCardItem :title="t('userDetail.financialSummary')">
          <template #prepend>
            <VIcon
              icon="tabler-report-money"
              size="22"
              class="me-2"
            />
          </template>
        </VCardItem>
        <VDivider />
        <VCardText>
          <VRow class="text-center">
            <VCol
              cols="6"
              md="3"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("fiatCurrency") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.fiatCurrency || "-" }}
              </div>
            </VCol>
            <VCol
              cols="6"
              md="3"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("shop.coinBalance") }}
              </div>
              <div class="font-weight-medium">
                {{ userData.currency?.coins || 0 }}
              </div>
            </VCol>
            <VCol
              cols="6"
              md="3"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("userDetail.totalDeposit") }}
              </div>
              <div class="font-weight-medium text-success">
                {{ kFormatter(userData.stats?.deposit || 0) }} {{ userData.fiatCurrency }}
              </div>
            </VCol>
            <VCol
              cols="6"
              md="3"
            >
              <div class="text-body-2 text-disabled mb-1">
                {{ t("userDetail.totalWithdraw") }}
              </div>
              <div class="font-weight-medium text-error">
                {{ kFormatter(userData.stats?.withdraw || 0) }} {{ userData.fiatCurrency }}
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Wallets -->
    <VCol cols="12">
      <VCard>
        <VCardItem :title="t('userDetail.walletsSection')">
          <template #prepend>
            <VIcon
              icon="tabler-wallet"
              size="22"
              class="me-2"
            />
          </template>
        </VCardItem>
        <VDivider />
        <VTable v-if="userData.wallets?.length">
          <thead>
            <tr>
              <th>{{ t("wallets.wallets") }}</th>
              <th>Chain</th>
              <th>Type</th>
              <th>{{ t("balance") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="wallet in userData.wallets"
              :key="wallet.coinType + wallet.chain + wallet.type"
            >
              <td>{{ formatCoinType(wallet.coinType) }}</td>
              <td>{{ wallet.chain }}</td>
              <td>{{ wallet.type }}</td>
              <td>{{ wallet.balance }}</td>
            </tr>
          </tbody>
        </VTable>
        <VCardText
          v-else
          class="text-center text-disabled py-6"
        >
          {{ t("noIpRecords") }}
        </VCardText>
      </VCard>
    </VCol>

    <!-- IP Addresses -->
    <VCol
      cols="12"
      md="6"
    >
      <VCard>
        <VCardItem :title="t('userDetail.ipAddressesSection')">
          <template #prepend>
            <VIcon
              icon="tabler-map-pin"
              size="22"
              class="me-2"
            />
          </template>
        </VCardItem>
        <VDivider />
        <VList v-if="userData.ips?.length">
          <VListItem
            v-for="(ipRecord, index) in userData.ips"
            :key="ipRecord.address + index"
          >
            <VListItemTitle class="font-weight-medium">
              {{ ipRecord.address }}
            </VListItemTitle>
            <VListItemSubtitle v-if="ipRecord.createdAt">
              {{ new Date(ipRecord.createdAt).toLocaleString() }}
            </VListItemSubtitle>
            <template #append>
              <VBtn
                icon
                size="x-small"
                variant="text"
                :title="t('copyIp')"
                @click="copyToClipboard(ipRecord.address, 'ipCopied')"
              >
                <VIcon
                  icon="tabler-copy"
                  size="15"
                />
              </VBtn>
            </template>
          </VListItem>
        </VList>
        <VCardText
          v-else
          class="text-center text-disabled py-6"
        >
          {{ t("noIpRecords") }}
        </VCardText>
      </VCard>
    </VCol>

    <!-- Affiliate & Role -->
    <VCol
      cols="12"
      md="6"
    >
      <VCard>
        <VCardItem :title="t('userDetail.affiliateAndRole')">
          <template #prepend>
            <VIcon
              icon="tabler-users-group"
              size="22"
              class="me-2"
            />
          </template>
        </VCardItem>
        <VDivider />
        <VCardText class="d-flex flex-column gap-4">
          <div>
            <div class="text-body-2 text-disabled mb-1">
              {{ t("affiliates.redeemedCode") }}
            </div>
            <VChip
              v-if="userData.affiliates?.redeemedCode"
              color="info"
              size="small"
              label
            >
              {{ userData.affiliates.redeemedCode }}
            </VChip>
            <span v-else>-</span>
          </div>

          <div>
            <div class="text-body-2 text-disabled mb-1">
              {{ t("role") }}
            </div>
            <div class="d-flex align-center gap-2">
              <span class="font-weight-medium text-capitalize">{{ userData.rank }}</span>
              <VChip
                v-if="userData.rank === 'admin' && userData.adminRole"
                :color="userData.adminRole.color || 'primary'"
                size="x-small"
              >
                {{ userData.adminRole.displayName }}
              </VChip>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VSnackbar
    v-model="snackbar.visible"
    :timeout="3000"
    :color="snackbar.color"
    location="top"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>

<style scoped>
.account-number-copy {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>
