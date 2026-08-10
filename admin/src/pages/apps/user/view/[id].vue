<script setup>
import { ref, watch } from "vue"
import { useRoute } from "vue-router"
import { useUserListStore } from "@/views/apps/user/useUserListStore"
import UserBioPanel from "@/views/apps/user/view/UserBioPanel.vue"
import UserTabAccount from "@/views/apps/user/view/UserTabAccount.vue"
import UserTabBillingsPlans from "@/views/apps/user/view/UserTabBillingsPlans.vue"
import UserTabManualAdjustments from "@/views/apps/user/view/UserTabManualAdjustments.vue"
import UserTabMfaCodes from "@/views/apps/user/view/UserTabMfaCodes.vue"

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
  { icon: "tabler-user-check", title: t("account") },
  { icon: "tabler-lock", title: t("security") },
  { icon: "tabler-shield-check", title: t("mfaCodes.title") },
  { icon: "tabler-currency-dollar", title: t("transactions.transactions") },
  { icon: "tabler-history", title: t("manualAdjustments.title") },
  { icon: "tabler-bell", title: t("notifications") },

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
    <VRow v-else-if="userData">
      <VCol
        cols="12"
        md="5"
        lg="4"
      >
        <UserBioPanel :user-data="userData" />
      </VCol>

      <VCol
        cols="12"
        md="7"
        lg="8"
      >
        <VTabs
          v-model="userTab"
          class="v-tabs-pill"
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
            <UserTabAccount :selected-user-id="userData._id" />
          </VWindowItem>
          <VWindowItem>
            <UserTabSecurity :user-data="userData" />
          </VWindowItem>
          <VWindowItem>
            <UserTabMfaCodes
              :selected-user-id="userData._id"
              @updated="fetchUserData(userData._id)"
            />
          </VWindowItem>
          <VWindowItem>
            <UserTabBillingsPlans :selected-user-id="userData._id" />
          </VWindowItem>
          <VWindowItem>
            <UserTabManualAdjustments :selected-user-id="userData._id" />
          </VWindowItem>
          <VWindowItem>
            <UserTabNotifications :selected-user-id="userData._id" />
          </VWindowItem>
        </VWindow>
      </VCol>
    </VRow>

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
