let io

// 🌍 Site genelinde aktif (online) kullanıcı takibi (bkz. backend/index.js).
// Notice segmentasyonu (audience: "online" / "offline") bu seti okur, bu
// yüzden merkezi bir modülde tutulup dışa aktarılıyor.
const onlineUserIds = new Set()

module.exports = {
  init: function(serverIO) {
    io = serverIO
  },
  getIO: function() {
    if (!io) throw new Error("Socket.io instance not initialized")
    return io
  },
  addOnlineUser: function(userId) {
    if (userId) onlineUserIds.add(String(userId))
  },
  removeOnlineUser: function(userId) {
    if (userId) onlineUserIds.delete(String(userId))
  },
  getOnlineUserIds: function() {
    return Array.from(onlineUserIds)
  },
  isUserOnline: function(userId) {
    return onlineUserIds.has(String(userId))
  },
}
