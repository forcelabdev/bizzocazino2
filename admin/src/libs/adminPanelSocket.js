import { io } from "socket.io-client"

// "/admin-panel" namespace'ine bağlanan, staff admin oturumuna özel socket
// istemcisi. ControlGame gibi gerçek zamanlı (anlık) veri akışı gerektiren
// ekranlar bu istemciyi kullanır. Token localStorage'da JSON string veya ham
// string olarak saklanabildiği için axios.js'deki aynı parse mantığı kullanılır.
const resolveAccessToken = () => {
	const raw = localStorage.getItem("accessToken")
	if (!raw) return null

	try {
		return JSON.parse(raw)
	} catch {
		return raw
	}
}

// `VITE_API_BASE_URL` .env dosyalarında tanımlı değilse (örn. yerel geliştirme
// ortamında) socket.io'ya "undefined/admin-panel" gibi geçersiz bir adres
// verilir ve bağlantı asla kurulmaz. Vite proxy'si sadece HTTP isteklerini
// backend'e yönlendirir, WebSocket için gerçek backend origin'i gerekir.
// (useAdminNotifications.js'deki resolveSocketBaseUrl ile aynı mantık.)
const resolveSocketBaseUrl = () => {
	const envUrl = import.meta.env.VITE_API_BASE_URL
	if (envUrl) return envUrl.replace(/\/$/, "")

	if (import.meta.env.DEV) return `${window.location.protocol}//${window.location.hostname}:5000`

	return window.location.origin
}

const adminPanelSocket = io(`${resolveSocketBaseUrl()}/admin-panel`, {
	transports: ["websocket"],
	withCredentials: true,
	autoConnect: false,
	auth: cb => {
		cb({ token: resolveAccessToken() })
	},
})

export const connectAdminPanelSocket = () => {
	if (!adminPanelSocket.connected) {
		adminPanelSocket.connect()
	}

	return adminPanelSocket
}

export default adminPanelSocket
