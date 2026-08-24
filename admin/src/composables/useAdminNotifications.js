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
let notificationAudio = null
let soundUnlockListenersAttached = false
let pendingNotificationSound = false
let notificationPollTimer = null
let initialNotificationsLoaded = false
const knownNotificationIds = new Set()

// Bildirim sesi aç/kapa tercihi — tarayıcı oturumları arasında kalıcı olsun
// diye localStorage'da saklanır, tüm bileşenler arasında paylaşılır.
const SOUND_MUTE_STORAGE_KEY = 'adminNotifSoundMuted'
const isSoundMuted = ref(localStorage.getItem(SOUND_MUTE_STORAGE_KEY) === 'true')

// Tarayıcının autoplay engeli aktifse (bu sekmede henüz hiç tıklama/tuş
// etkileşimi olmadıysa) true olur. Admin bunu görüp tek tıkla sesi
// etkinleştirebilsin diye arayüzde gösterilir — aksi halde bildirim gelir
// ama ses sessizce hiç çalmaz ve admin bunun neden olduğunu anlayamaz.
const isSoundBlocked = ref(false)

const toggleSound = () => {
  isSoundMuted.value = !isSoundMuted.value
  localStorage.setItem(SOUND_MUTE_STORAGE_KEY, String(isSoundMuted.value))
}

const PUBLIC_BASE_URL = import.meta.env.BASE_URL || '/'
const NOTIFICATION_SOUND_URL = `${PUBLIC_BASE_URL.replace(/\/?$/, '/')}sounds/notification.wav`
const NOTIFICATION_POLL_INTERVAL_MS = 5000

// Ses çalınması gereken bildirim tipleri: para hareketleri (yatırım/çekim)
// admin'in anında fark etmesi gereken olaylardır.
const FINANCE_NOTIFICATION_TYPES = new Set(['deposit', 'withdraw'])

const TYPE_META = {
  withdraw: { icon: 'tabler-cash-banknote', color: 'warning' },
  deposit: { icon: 'tabler-cash', color: 'success' },
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
  if (envUrl) {
    try {
      // Socket.IO namespace backend'de doğrudan `/admin-panel`. API URL'si
      // `/api` gibi bir path içeriyorsa bunu namespace'e taşımamak gerekir.
      return new URL(envUrl, window.location.origin).origin
    } catch {
      return envUrl.replace(/\/$/, '')
    }
  }

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

const getNotificationAudio = () => {
  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_URL)
    notificationAudio.preload = 'auto'
    notificationAudio.volume = 0.6
  }

  return notificationAudio
}

// Farklı giriş türlerinin tümü "gerçek kullanıcı etkileşimi" sayılır —
// sadece mouse click'e güvenmek, sadece klavyeyle veya dokunmatik ekranla
// kullanan adminlerde sesi hiç açmayabilir.
const UNLOCK_EVENTS = ['pointerdown', 'click', 'keydown', 'touchstart']

const removeSoundUnlockListeners = () => {
  if (!soundUnlockListenersAttached)
    return

  UNLOCK_EVENTS.forEach(evt => window.removeEventListener(evt, unlockNotificationSound, true))
  soundUnlockListenersAttached = false
}

const addSoundUnlockListeners = () => {
  if (soundUnlockListenersAttached)
    return

  UNLOCK_EVENTS.forEach(evt => window.addEventListener(evt, unlockNotificationSound, true))
  soundUnlockListenersAttached = true
}

const playNotificationSound = async ({ force = false } = {}) => {
  if (isSoundMuted.value && !force)
    return false

  try {
    const audio = getNotificationAudio()

    audio.pause()
    audio.currentTime = 0
    audio.volume = 0.6
    await audio.play()
    pendingNotificationSound = false
    isSoundBlocked.value = false
    removeSoundUnlockListeners()
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      pendingNotificationSound = true
      isSoundBlocked.value = true
      addSoundUnlockListeners()

      return false
    }

    console.warn('⚠️ Bildirim sesi oynatılamadı:', error)

    return false
  }

  return true
}

// Chrome/Safari, sayfa kullanıcı etkileşimi almadan ses başlatmayı engelleyebilir.
// Aynı Audio nesnesini ilk tıklama/tuş vuruşunda sessizce hazırlamak, sonraki
// finans bildirimlerinde oynatmayı güvenilir hale getirir. Engel sırasında bir
// bildirim geldiyse ilk etkileşim doğrudan bekleyen sesi çalar.
async function unlockNotificationSound() {
  if (pendingNotificationSound) {
    await playNotificationSound()

    return
  }

  try {
    const audio = getNotificationAudio()

    audio.volume = 0
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    audio.volume = 0.6
    isSoundBlocked.value = false
    removeSoundUnlockListeners()
  } catch {
    // Başka bir kullanıcı etkileşiminde yeniden denenecek.
  }
}

// Panel yüklenir yüklenmez sesin engellenip engellenmediğini sessizce
// (volume 0) test eder. Böylece admin bir bildirim kaçırmadan ÖNCE,
// panelde "sesi etkinleştirmek için tıklayın" uyarısını görür.
const detectSoundBlock = async () => {
  try {
    const audio = getNotificationAudio()

    audio.volume = 0
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    audio.volume = 0.6
    isSoundBlocked.value = false
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      isSoundBlocked.value = true
      addSoundUnlockListeners()
    }
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

const notificationId = notification => String(notification?._id || '')

export function useAdminNotifications() {
  const { push } = useNotify()

  const bellNotifications = computed(() => rawNotifications.value.map(mapToBellItem))

  const unreadCount = computed(() => bellNotifications.value.filter(n => !n.isSeen).length)

  const announceNotifications = notifications => {
    if (!notifications.length)
      return

    notifications.forEach(notification => {
      const toastType = notification.type === 'sanction' ? 'error' : 'info'

      push(toastType, `${notification.title}: ${notification.message}`)
    })

    if (notifications.some(notification => FINANCE_NOTIFICATION_TYPES.has(notification.type)))
      playNotificationSound()
  }

  const mergeSocketNotification = notification => {
    const id = notificationId(notification)

    if (!id || knownNotificationIds.has(id))
      return

    knownNotificationIds.add(id)
    rawNotifications.value = [
      notification,
      ...rawNotifications.value.filter(item => notificationId(item) !== id),
    ].slice(0, 50)
    announceNotifications([notification])
  }

  const fetchNotifications = async () => {
    try {
      const { data } = await axios.get('/admin/notifications')
      if (data?.success) {
        const notifications = data.data || []

        // Sadece daha önce görülmemiş bildirimleri "yeni" say — sayfa ilk
        // yüklendiğinde geçmiş bildirimler için ses/toast tetiklenmemeli.
        const newNotifications = initialNotificationsLoaded
          ? notifications.filter(notification => {
            const id = notificationId(notification)

            return id && !knownNotificationIds.has(id)
          })
          : []

        notifications.forEach(notification => {
          const id = notificationId(notification)

          if (id)
            knownNotificationIds.add(id)
        })

        rawNotifications.value = notifications
        initialNotificationsLoaded = true
        announceNotifications([...newNotifications].reverse())
      }
    } catch (error) {
      console.error('❌ Bildirimler alınamadı:', error)
    }
  }

  // Socket bağlantısı proxy/CDN arkasında kesilirse (upgrade engeli, ağ
  // sorunları vb.) bildirimler tamamen sessiz kalmasın diye periyodik
  // polling her zaman devrede kalır.
  const startNotificationPolling = () => {
    if (notificationPollTimer)
      return

    notificationPollTimer = window.setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS)
  }

  const testNotificationSound = async () => {
    pendingNotificationSound = false

    const played = await playNotificationSound({ force: true })

    push(
      played ? 'success' : 'error',
      played
        ? 'Bildirim sesi çalışıyor.'
        : 'Bildirim sesi oynatılamadı. Tarayıcı konsolundaki hata kontrol edilmeli.',
    )
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
    // Önceki bağlantı koptuysa (backend yeniden başladı, ağ kesildi vb.)
    // eski instance'ı temizleyip sıfırdan kurulmasına izin ver. Sadece
    // hâlâ bağlı/bağlanmakta olan bir socket varsa tekrar oluşturmayı atla.
    if (socketInstance && (socketInstance.connected || socketInstance.active))
      return

    const token = getAccessToken()
    if (!token)
      return

    if (socketInstance) {
      socketInstance.removeAllListeners()
      socketInstance.disconnect()
    }

    socketInstance = io(`${resolveSocketBaseUrl()}/admin-panel`, {
      // Socket.IO önce polling ile bağlanıp mümkünse WebSocket'e yükseltir.
      // Yalnızca WebSocket'e zorlamak, upgrade'i kapalı proxy/CDN arkasında
      // bildirim akışını tamamen kesiyordu.
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })

    socketInstance.on('connect', () => {
      // Yeniden bağlanınca kaçırılmış olabilecek bildirimleri de yakalamak
      // için listeyi tazele.
      fetchNotifications()
    })

    socketInstance.on('connect_error', error => {
      console.error('❌ Admin panel socket bağlantı hatası:', error.message)
    })

    socketInstance.on('disconnect', reason => {
      console.warn('⚠️ Admin panel socket bağlantısı kesildi:', reason)
    })

    socketInstance.on('admin:notification', notification => {
      mergeSocketNotification(notification)
    })
  }

  const init = () => {
    if (isInitialized.value) {
      // Composable zaten başlatılmış (örn. HMR sırasında modül state'i
      // korunmuş) ama socket bağlı değilse yeniden bağlanmayı dene.
      connectSocket()

      return
    }
    isInitialized.value = true

    addSoundUnlockListeners()
    detectSoundBlock()
    fetchNotifications()
    connectSocket()
    startNotificationPolling()
  }

  // Admin "Sesi Etkinleştir" uyarısına tıkladığında çağrılır — tıklamanın
  // kendisi zaten geçerli bir kullanıcı etkileşimi olduğu için ses burada
  // güvenle unlock edilebilir.
  const enableSound = () => unlockNotificationSound()

  return {
    notifications: bellNotifications,
    unreadCount,
    init,
    fetchNotifications,
    markRead,
    markUnread,
    markAllRead,
    removeNotification,
    isSoundMuted,
    toggleSound,
    testNotificationSound,
    isSoundBlocked,
    enableSound,
  }
}
