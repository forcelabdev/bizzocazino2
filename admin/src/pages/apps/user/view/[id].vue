<script setup>
import { ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import UserProfileHeader from "@/views/apps/user/view/UserProfileHeader.vue"
import UserStatsCards from "@/views/apps/user/view/UserStatsCards.vue"
import UserTabProfile from "@/views/apps/user/view/UserTabProfile.vue"
import UserTabAccount from "@/views/apps/user/view/UserTabAccount.vue"
import UserTabBillingsPlans from "@/views/apps/user/view/UserTabBillingsPlans.vue"
import UserTabManualAdjustments from "@/views/apps/user/view/UserTabManualAdjustments.vue"
import UserTabSportsBetHistory from "@/views/apps/user/view/UserTabSportsBetHistory.vue"
import UserTabControls from "@/views/apps/user/view/UserTabControls.vue"
import UserTabReloadBonus from "@/views/apps/user/view/UserTabReloadBonus.vue"

// import UserTabConnections from "@/views/apps/user/view/UserTabConnections.vue";
import UserTabNotifications from "@/views/apps/user/view/UserTabNotifications.vue"
import UserTabSecurity from "@/views/apps/user/view/UserTabSecurity.vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const userListStore = useUserListStore()
const route = useRoute()
const userData = ref(null)
const userTab = ref(0)
const loading = ref(true)

const tabs = [
  { icon: "tabler-user-circle", title: t("userDetail.tabs.profile") },
  { icon: "tabler-wallet", title: t("userDetail.tabs.finance") },
  { icon: "tabler-device-gamepad-2", title: t("userDetail.tabs.gameHistory") },
  { icon: "tabler-ball-football", title: t("userDetail.tabs.sportsBetHistory") },
  { icon: "tabler-history", title: t("userDetail.tabs.balanceAdjustment") },
  { icon: "tabler-adjustments", title: t("userDetail.tabs.controls") },
  { icon: "tabler-gift", title: t("userDetail.tabs.bonuses") },
  { icon: "tabler-lock", title: t("userDetail.tabs.security") },
  { icon: "tabler-bell", title: t("userDetail.tabs.notifications") },

  //   { icon: 'tabler-link', title: t('connections') },
]

const fetchUserData = async userId => {
  if (!userId) return

  loading.value = true
  userData.value = null
  userTab.value = 0

  try {
    const response = await userListStore.fetchUser(userId)

    userData.value = response?.data?.data || null
  } catch (err) {
    console.error("❌ Kullanıcı verisi alınırken hata:", err)
    userData.value = null
  } finally {
    loading.value = false
  }
}

// Route params değişikliğini izle
watch(
  () => route.params.id,
  newId => {
    fetchUserData(newId)
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <!-- Yükleniyor -->
    <VRow v-if="loading">
      <VCol
        cols="12"
        class="d-flex justify-center"
      >
        <VProgressCircular
          indeterminate
          color="primary"
          size="40"
        />
      </VCol>
    </VRow>

    <!-- Kullanıcı Bulundu -->
    <template v-else-if="userData">
      <UserProfileHeader
        :user-data="userData"
        class="mb-6"
        @updated="userData = $event"
      />

      <UserStatsCards
        :user-data="userData"
        class="mb-6"
      />

      <VTabs
        v-model="userTab"
        grow
      >
        <VTab
          v-for="(tab, index) in tabs"
          :key="index"
        >
          <VIcon
            :size="18"
            :icon="tab.icon"
            class="me-1"
          />
          <span>{{ tab.title }}</span>
        </VTab>
      </VTabs>

      <VWindow
        v-model="userTab"
        class="mt-6 disable-tab-transition"
        :touch="false"
      >
        <VWindowItem>
          <UserTabProfile
            :user-data="userData"
            @updated="userData = { ...userData, ...$event }"
          />
        </VWindowItem>
        <VWindowItem>
          <UserTabBillingsPlans :selected-user-id="userData._id" />
        </VWindowItem>
        <VWindowItem>
          <UserTabAccount :selected-user-id="userData._id" />
        </VWindowItem>
        <VWindowItem>
          <UserTabSportsBetHistory :selected-user-id="userData._id" />
        </VWindowItem>
        <VWindowItem>
          <UserTabManualAdjustments :selected-user-id="userData._id" />
        </VWindowItem>
        <VWindowItem>
          <UserTabControls
            :user-data="userData"
            @updated="userData = { ...userData, ...$event }"
          />
        </VWindowItem>
        <VWindowItem>
          <UserTabReloadBonus :selected-user-id="userData._id" />
        </VWindowItem>
        <VWindowItem>
          <UserTabSecurity :user-data="userData" />
        </VWindowItem>
        <VWindowItem>
          <UserTabNotifications :selected-user-id="userData._id" />
        </VWindowItem>
      </VWindow>
    </template>

    <!-- Kullanıcı Bulunamadı -->
    <VRow v-else>
      <VCol cols="12">
        <VAlert
          type="error"
          variant="tonal"
          prominent
        >
          {{ t("userNotFound") }}
        </VAlert>
      </VCol>
    </VRow>
  </div>
</template>

<route lang="yaml">
meta:
  action: read
  subject: users
</route>
