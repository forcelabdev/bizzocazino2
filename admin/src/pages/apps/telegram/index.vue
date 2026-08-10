<template>
  <VLayout class="telegram-dashboard">
    <!-- 👉 Sidebar -->
    <VNavigationDrawer
      v-model="isSidebarOpen"
      absolute
      touchless
      location="start"
      width="260"
      :temporary="$vuetify.display.mdAndDown"
    >
      <PerfectScrollbar class="h-100 p-4">
        <div class="text-lg font-semibold mb-4">🤖 Telegram Yönetimi</div>

        <VList density="compact" nav>
          <VListItem
            v-for="item in sidebarItems"
            :key="item.key"
            :value="item.key"
            @click="activeTab = item.key"
            :class="[
              'cursor-pointer rounded-lg mb-1',
              activeTab === item.key ? 'bg-primary text-white' : 'hover:bg-muted'
            ]"
          >
            <template #prepend>
              <VIcon :icon="item.icon" size="20" />
            </template>
            <VListItemTitle class="ml-2">{{ item.title }}</VListItemTitle>
          </VListItem>
        </VList>
      </PerfectScrollbar>
    </VNavigationDrawer>

    <!-- 👉 Main Content -->
    <VMain>
      <div class="p-6">
        <component :is="activeComponent" />
      </div>
    </VMain>
  </VLayout>
</template>

<script setup>
import TelegramBroadcast from '@/views/telegram/TelegramBroadcast.vue'
import TelegramChat from '@/views/telegram/TelegramChat.vue'
import TelegramSettings from '@/views/telegram/TelegramSettings.vue'
import { computed, ref } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const isSidebarOpen = ref(true)
const activeTab = ref('settings')

const sidebarItems = [
  { key: 'settings', title: 'Bot Ayarları', icon: 'tabler-settings' },
  { key: 'broadcast', title: 'Post Gönder', icon: 'tabler-send' },
  { key: 'chat', title: 'Canlı Sohbet', icon: 'tabler-message-circle' },
]

const activeComponent = computed(() => {
  if (activeTab.value === 'settings') return TelegramSettings
  if (activeTab.value === 'broadcast') return TelegramBroadcast
  if (activeTab.value === 'chat') return TelegramChat
})
</script>

<style scoped>
.telegram-dashboard {
  display: flex;
  height: 100vh;
  background: var(--v-theme-surface);
}
.v-navigation-drawer {
  height: 100%;
  min-height: 100vh;
}
.v-main {
  flex-grow: 1;
  overflow-y: auto;
  background: var(--v-theme-surface);
}

</style>
