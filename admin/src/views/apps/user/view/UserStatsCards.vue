<script setup>
import { kFormatter } from "@core/utils/formatters"
import { formatCoinType } from "@/utils/currency"
import { useI18n } from "vue-i18n"

const props = defineProps({
  userData: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()

const copied = ref(false)

const copyLastIp = async address => {
  if (!address) return

  try {
    await navigator.clipboard.writeText(String(address))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (error) {
    console.error("IP adresi panoya kopyalanamadı:", error)
  }
}

const lastIp = computed(() => props.userData?.ips?.[0]?.address || "-")
const totalIpCount = computed(() => props.userData?.ips?.length || 0)
</script>

<template>
  <VRow>
    <!-- Balance -->
    <VCol
      cols="12"
      sm="6"
      md="3"
    >
      <VCard class="ma-2">
        <VCardText class="d-flex align-center gap-4">
          <VAvatar
            size="46"
            rounded
            color="primary"
            variant="tonal"
          >
            <VIcon
              icon="tabler-wallet"
              size="24"
            />
          </VAvatar>
          <div>
            <h5 class="text-h5">
              {{ userData.activeWallet?.balance ?? 0 }}
              <span class="text-body-2 text-disabled">{{ formatCoinType(userData.activeWallet?.coinType) }}</span>
            </h5>
            <span class="text-body-2 text-disabled">{{ t("userDetail.stats.balance") }}</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- VIP Level -->
    <VCol
      cols="12"
      sm="6"
      md="3"
    >
      <VCard class="ma-2">
        <VCardText class="d-flex align-center gap-4">
          <VAvatar
            size="46"
            rounded
            color="warning"
            variant="tonal"
          >
            <VIcon
              icon="tabler-crown"
              size="24"
            />
          </VAvatar>
          <div>
            <h5 class="text-h5 text-capitalize">
              {{ userData.rank || "-" }}
            </h5>
            <span class="text-body-2 text-disabled">{{ t("userDetail.stats.vipLevel") }}</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Total Wagered -->
    <VCol
      cols="12"
      sm="6"
      md="3"
    >
      <VCard class="ma-2">
        <VCardText class="d-flex align-center gap-4">
          <VAvatar
            size="46"
            rounded
            color="info"
            variant="tonal"
          >
            <VIcon
              icon="tabler-repeat"
              size="24"
            />
          </VAvatar>
          <div>
            <h5 class="text-h5">
              {{ kFormatter(userData.stats?.bet || 0) }}
              <span class="text-body-2 text-disabled">{{ userData.fiatCurrency }}</span>
            </h5>
            <span class="text-body-2 text-disabled">{{ t("userDetail.stats.totalWagered") }}</span>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Last IP -->
    <VCol
      cols="12"
      sm="6"
      md="3"
    >
      <VCard class="ma-2">
        <VCardText class="d-flex align-center gap-4">
          <VAvatar
            size="46"
            rounded
            color="secondary"
            variant="tonal"
          >
            <VIcon
              icon="tabler-map-pin"
              size="24"
            />
          </VAvatar>
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-1">
              <h5 class="text-h5 text-truncate">
                {{ lastIp }}
              </h5>
              <VBtn
                v-if="lastIp !== '-'"
                icon
                size="x-small"
                variant="text"
                :title="t('copyIp')"
                @click="copyLastIp(lastIp)"
              >
                <VIcon
                  :icon="copied ? 'tabler-check' : 'tabler-copy'"
                  size="14"
                />
              </VBtn>
            </div>
            <span class="text-body-2 text-disabled">
              {{ t("userDetail.stats.lastIp") }}
              <template v-if="totalIpCount > 1">
                &middot; {{ t("userDetail.stats.totalIps", { count: totalIpCount }) }}
              </template>
            </span>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
