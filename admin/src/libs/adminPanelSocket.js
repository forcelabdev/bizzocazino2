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

const adminPanelSocket = io(`${import.meta.env.VITE_API_BASE_URL}/admin-panel`, {
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
