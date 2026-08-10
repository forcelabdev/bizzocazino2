import { computed, ref } from 'vue'
import { io } from 'socket.io-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/tr'
import axios from '@axios'
import { useNotify } from '@/composables/useNotify'

dayjs.extend(relativeTime)
dayjs.locale('tr')

// Modül seviyesinde tutulan, tüm bileşenler arasında paylaşılan tekil state.
// Böylece hem Vertical hem Horizontal layout aynı listeyi ve aynı socket
// bağlantısını kullanır.
const rawNotifications = ref([])
const isInitialized = ref(false)
let socketInstance = null

const TYPE_META = {
  withdraw: { icon: 'tabler-cash-banknote', color: 'warning' },
  new_user: { icon: 'tabler-user-plus', color: 'info' },
  sanction: { icon: 'tabler-shield-exclamation', color: 'error' },
}

const getAccessToken = () => {
  const raw = localStorage.getItem('accessToken')
  if (!raw)
    return null

  try {
    return JSON.parse(raw)
  } catch (e) {
    return raw
  }
}

// `VITE_API_BASE_URL` .env dosyalarında tanımlı değilse (örn. yerel geliştirme
// ortamında) socket.io'ya "undefined/admin-panel" gibi geçersiz bir adres
// verilir ve bağlantı asla kurulmaz. Vite proxy'si sadece HTTP isteklerini
// backend'e yönlendirir, WebSocket için gerçek backend origin'i gerekir.
const resolveSocketBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl)
    return envUrl.replace(/\/$/, '')

  if (import.meta.env.DEV)
    return `${window.location.protocol}//${window.location.hostname}:5000`

  return window.location.origin
}

const getCurrentAdminId = () => {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || 'null')

    return userData?._id || userData?.id || null
  } catch (e) {
    return null
  }
}

const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.wav')
    audio.volume = 0.6
    audio.play().catch(() => {})
  } catch (e) {
    // Tarayıcı sesi engelleyebilir (autoplay policy) — sessizce yut.
  }
}

const mapToBellItem = notification => {
  const adminId = getCurrentAdminId()
  const meta = TYPE_META[notification.type] || { icon: 'tabler-bell', color: 'primary' }

  return {
    id: notification._id,
    icon: meta.icon,
    color: meta.color,
    title: notification.title,
    subtitle: notification.message,
    time: dayjs(notification.createdAt).fromNow(),
    isSeen: Array.isArray(notification.readBy) && adminId
      ? notification.readBy.includes(adminId)
      : false,
    link: notification.link,
    type: notification.type,
  }
}

export function useAdminNotifications() {
  const { push } = useNotify()

  const bellNotifications = computed(() => rawNotifications.value.map(mapToBellItem))

  const unreadCount = computed(() => bellNotifications.value.filter(n => !n.isSeen).length)

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get('/admin/notifications')
      if (data?.success) {
        rawNotifications.value = data.data || []
      }
    } catch (error) {
      console.error('❌ Bildirimler alınamadı:', error)
    }
  }

  const markRead = async ids => {
    const idList = Array.isArray(ids) ? ids : [ids]
    const adminId = getCurrentAdminId()

    rawNotifications.value.forEach(n => {
      if (idList.includes(n._id) && adminId && !n.readBy?.includes(adminId)) {
        n.readBy = [...(n.readBy || []), adminId]
      }
    })

    try {
      await Promise.all(idList.map(id => axios.post(`/admin/notifications/${id}/read`)))
    } catch (error) {
      console.error('❌ Bildirim okundu işaretlenemedi:', error)
    }
  }

  const markUnread = ids => {
    const idList = Array.isArray(ids) ? ids : [ids]
    const adminId = getCurrentAdminId()

    rawNotifications.value.forEach(n => {
      if (idList.includes(n._id) && adminId) {
        n.readBy = (n.readBy || []).filter(id => id !== adminId)
      }
    })
  }

  const markAllRead = async () => {
    const adminId = getCurrentAdminId()

    rawNotifications.value.forEach(n => {
      if (adminId && !n.readBy?.includes(adminId)) {
        n.readBy = [...(n.readBy || []), adminId]
      }
    })

    try {
      await axios.post('/admin/notifications/read-all')
    } catch (error) {
      console.error('❌ Bildirimler okundu işaretlenemedi:', error)
    }
  }

  const removeNotification = id => {
    rawNotifications.value = rawNotifications.value.filter(n => n._id !== id)
  }

  const connectSocket = () => {
    if (socketInstance)
      return

    const token = getAccessToken()
    if (!token)
      return

    socketInstance = io(`${resolveSocketBaseUrl()}/admin-panel`, {
      transports: ['websocket'],
      auth: { token },
    })

    socketInstance.on('connect_error', error => {
      console.error('❌ Admin panel socket bağlantı hatası:', error.message)
    })

    socketInstance.on('admin:notification', notification => {
      rawNotifications.value = [notification, ...rawNotifications.value].slice(0, 50)

      const toastType = notification.type === 'sanction' ? 'error' : 'info'
      push(toastType, `${notification.title}: ${notification.message}`)

      if (notification.type === 'withdraw') {
        playNotificationSound()
      }
    })
  }

  const init = () => {
    if (isInitialized.value)
      return
    isInitialized.value = true

    fetchNotifications()
    connectSocket()
  }

  return {
    notifications: bellNotifications,
    unreadCount,
    init,
    fetchNotifications,
    markRead,
    markUnread,
    markAllRead,
    removeNotification,
  }
}
