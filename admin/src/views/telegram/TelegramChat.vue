<template>
  <VCard flat class="telegram-chat">
    <!-- HEADER -->
    <VToolbar color="primary" dark flat>
      <VToolbarTitle class="font-semibold text-h6">💬 Telegram Canlı Sohbet</VToolbarTitle>
      <VSpacer />
      <VBtn icon variant="text" @click="fetchUsers"><VIcon icon="tabler-refresh" /></VBtn>
    </VToolbar>

    <div class="chat-layout">
      <!-- SOL: Kullanıcı listesi -->
      <aside class="user-list">
        <!-- 🔍 Arama -->
        <div class="search-bar p-2">
          <VTextField
            v-model="searchQuery"
            placeholder="Kullanıcı ara..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="tabler-search"
          />
        </div>

        <!-- 👥 Kullanıcılar -->
        <PerfectScrollbar class="user-scroll">
          <VList nav dense>
            <VListItem
              v-for="user in filteredUsers"
              :key="user.telegram_id"
              class="user-item"
              :class="{ active: selectedUser?.telegram_id === user.telegram_id }"
              @click="selectUser(user)"
            >
              <template #prepend>
                <div class="relative">
                  <VAvatar size="36" color="primary" variant="tonal">
                    {{ user.first_name?.[0] || user.username?.[0] || 'U' }}
                  </VAvatar>
                  <span v-if="user.unreadCount > 0" class="unread-badge">{{ user.unreadCount }}</span>
                </div>
              </template>

              <VListItemTitle>
                {{ user.username || user.first_name || 'Kullanıcı ' + user.telegram_id }}
              </VListItemTitle>

              <VListItemSubtitle class="text-xs text-disabled">
                {{ formatDate(user.last_active) }}
              </VListItemSubtitle>
            </VListItem>
          </VList>
        </PerfectScrollbar>
      </aside>

      <!-- SAĞ: Chat alanı -->
      <section class="chat-section" v-if="selectedUser">
        <!-- Kullanıcı başlığı -->
        <header class="chat-header">
          <div class="user-info">
            <VAvatar size="42" color="primary" variant="tonal">
              {{ selectedUser.first_name?.[0] || selectedUser.username?.[0] || 'U' }}
            </VAvatar>
            <div>
              <h6 class="mb-0 font-semibold">{{ selectedUser.username || selectedUser.first_name }}</h6>
            </div>
          </div>
        </header>

        <!-- Mesajlar -->
        <div class="chat-messages" ref="chatBox">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.from === 'admin' ? 'outgoing' : 'incoming']"
          >
            <div class="bubble">
              <p class="text-sm mb-1">{{ msg.text }}</p>
            </div>
          </div>
        </div>

        <!-- Mesaj gönderme -->
        <footer class="chat-input">
          <VTextField
            v-model="newMessage"
            placeholder="Mesaj yaz..."
            density="comfortable"
            variant="outlined"
            class="flex-grow-1"
            hide-details
            @keyup.enter="sendMessage"
          />
          <VBtn color="primary" icon class="ml-2" @click="sendMessage">
            <VIcon icon="tabler-send" />
          </VBtn>
        </footer>
      </section>

      <section
        v-else
        class="chat-empty d-flex flex-column align-center justify-center text-disabled text-medium"
      >
        <VIcon icon="tabler-message-circle" size="64" class="mb-2" />
        <p>Kullanıcı seçerek sohbete başlayın</p>
      </section>
    </div>
  </VCard>
</template>

<script setup>
import { useNotify } from '@/composables/useNotify'
import axios from '@/plugins/axios'
import dayjs from 'dayjs'
import { io } from 'socket.io-client'
import { computed, nextTick, onMounted, ref } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

const notify = useNotify()
const users = ref([])
const messages = ref([])
const selectedUser = ref(null)
const newMessage = ref('')
const chatBox = ref(null)
const searchQuery = ref('')

// ✅ Socket bağlantısı
const socket = io('http://localhost:5000', { transports: ['websocket'] })

socket.on('connect', () => console.log('✅ Socket bağlı'))
socket.on('connect_error', err => console.error('Socket Hatası:', err))

// 🧭 Yeni kullanıcı mesajı geldiğinde
socket.on('telegram:new_message', msg => {
  const userIndex = users.value.findIndex(u => String(u.telegram_id) === String(msg.telegram_id))
  if (userIndex !== -1) {
    const user = users.value[userIndex]

    // Eğer aktif kullanıcı değilse unreadCount artır
    if (!selectedUser.value || String(selectedUser.value.telegram_id) !== String(msg.telegram_id)) {
      user.unreadCount = (user.unreadCount || 0) + 1
    } else {
      messages.value.push(msg)
      scrollToBottom()
    }

    // ✅ Kullanıcıyı listenin en üstüne taşı
    users.value.splice(userIndex, 1)
    users.value.unshift(user)
  }

  notify.info(`💬 Yeni mesaj: ${msg.text.slice(0, 40)}...`)
})

// 🧭 Admin mesajı geldiğinde (geri onay)
socket.on('telegram:admin_message', msg => {
  const userIndex = users.value.findIndex(u => String(u.telegram_id) === String(msg.telegram_id))
  if (userIndex !== -1) {
    const user = users.value[userIndex]
    // ✅ Admin mesajı da kullanıcıyı en üste taşır
    users.value.splice(userIndex, 1)
    users.value.unshift(user)
  }

  if (selectedUser.value && String(selectedUser.value.telegram_id) === String(msg.telegram_id)) {
    messages.value.push(msg)
    scrollToBottom()
  }
})

// 📥 Kullanıcı listesi
const fetchUsers = async () => {
  try {
    const { data } = await axios.get('/telegram/users')
    users.value = (data.data || []).map(u => ({ ...u, unreadCount: 0 }))
  } catch {
    notify.error('Kullanıcılar yüklenemedi ❌')
  }
}

// 🔍 Filtrelenmiş kullanıcı listesi
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u =>
    (u.username || u.first_name || '').toLowerCase().includes(q)
  )
})

// 👤 Kullanıcı seçimi
const selectUser = async user => {
  selectedUser.value = user
  user.unreadCount = 0
  try {
    const { data } = await axios.get(`/telegram/messages/${user.telegram_id}`)
    messages.value = data.data || []
    scrollToBottom()
  } catch {
    notify.error('Mesajlar yüklenemedi ❌')
  }
}

// ✉️ Mesaj gönderme
const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedUser.value) return
  const text = newMessage.value.trim()
  const tempMsg = {
    from: 'admin',
    text,
    createdAt: new Date().toISOString(),
  }
  messages.value.push(tempMsg)
  newMessage.value = ''
  scrollToBottom()

  try {
    await axios.post('/telegram/send', {
      telegram_id: selectedUser.value.telegram_id,
      text,
    })

    // ✅ Admin mesaj gönderdiğinde kullanıcıyı en üste al
    const userIndex = users.value.findIndex(u => String(u.telegram_id) === String(selectedUser.value.telegram_id))
    if (userIndex !== -1) {
      const user = users.value[userIndex]
      users.value.splice(userIndex, 1)
      users.value.unshift(user)
    }
  } catch {
    notify.error('Mesaj gönderilemedi ❌')
  }
}

const scrollToBottom = () =>
  nextTick(() => {
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  })

const formatDate = d => (d ? dayjs(d).format('DD MMM HH:mm') : '-')

onMounted(fetchUsers)
</script>


<style scoped>
.telegram-chat {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.chat-layout {
  display: flex;
  flex: 1;
  background: var(--v-theme-surface);
  min-height: 0;
}

/* Kullanıcı listesi */
.user-list {
  width: 30%;
  min-width: 260px;
  border-right: 1px solid rgba(var(--v-border-color), 0.15);
  display: flex;
  flex-direction: column;
}

.search-bar {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  background: var(--v-theme-surface);
}

.user-scroll {
  flex: 1;
  max-height: calc(100vh - 180px);
}

.user-item {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  transition: background 0.2s;
  position: relative;
}
.user-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
.user-item.active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: var(--v-theme-primary);
}

/* 🔴 Unread Badge */
.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: red;
  color: white;
  font-size: 10px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
}

/* Sohbet alanı */
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--v-theme-background);
}

/* Üst kısım */
.chat-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  background: var(--v-theme-surface);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Mesaj alanı */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  background: var(--v-theme-background);
}

/* Mesaj balonları */
.message {
  margin-bottom: 0.75rem;
  display: flex;
  max-width: 80%;
}
.message.incoming {
  justify-content: flex-start;
}
.message.outgoing {
  justify-content: flex-end;
  align-self: flex-end;
}
.bubble {
  padding: 10px 14px;
  border-radius: 16px;
  background: var(--v-theme-surface-variant);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.message.outgoing .bubble {
  background: var(--v-theme-primary);
  color: #fff;
}

/* Mesaj yazma alanı */
.chat-input {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
  background: var(--v-theme-surface);
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.05);
}
</style>
