let io

// 🌍 Site genelinde aktif (online) kullanıcı takibi (bkz. backend/index.js).
// Notice segmentasyonu (audience: "online" / "offline") bu seti okur.
//
// pm2 CLUSTER MODE'A GEÇİŞ NEDENİYLE DEĞİŞTİ: Önceden bu bir process-local
// (in-memory) Set idi. Cluster mode'da her worker'ın kendi belleği ayrı
// olduğundan, bir kullanıcı hangi worker'a bağlıysa SADECE o worker'ın Set'inde
// görünürdü — admin panelinden "online" segmentine mesaj gönderildiğinde diğer
// worker'lara bağlı kullanıcılar "offline" sayılıp mesajı kaçırırdı, ya da
// "kaç kullanıcı online" sayacı her worker'da farklı (yanlış) bir sayı gösterirdi.
// Çözüm: tek, TÜM worker'ların paylaştığı bir Redis Set (bkz. utils/redisClient.js).
const redis = require("./redisClient").getClient()
const ONLINE_SET_KEY = "bizzo:onlineUsers"

module.exports = {
  init: function(serverIO) {
    io = serverIO
  },
  getIO: function() {
    if (!io) throw new Error("Socket.io instance not initialized")
    return io
  },
  addOnlineUser: async function(userId) {
    if (!userId) return
    try {
      await redis.sadd(ONLINE_SET_KEY, String(userId))
    } catch (err) {
      console.error("[io] addOnlineUser Redis hatası:", err.message)
    }
  },
  removeOnlineUser: async function(userId) {
    if (!userId) return
    try {
      await redis.srem(ONLINE_SET_KEY, String(userId))
    } catch (err) {
      console.error("[io] removeOnlineUser Redis hatası:", err.message)
    }
  },
  getOnlineUserIds: async function() {
    try {
      return await redis.smembers(ONLINE_SET_KEY)
    } catch (err) {
      console.error("[io] getOnlineUserIds Redis hatası:", err.message)
      return []
    }
  },
  isUserOnline: async function(userId) {
    try {
      return Boolean(await redis.sismember(ONLINE_SET_KEY, String(userId)))
    } catch (err) {
      console.error("[io] isUserOnline Redis hatası:", err.message)
      return false
    }
  },
  getOnlineCount: async function() {
    try {
      return await redis.scard(ONLINE_SET_KEY)
    } catch (err) {
      console.error("[io] getOnlineCount Redis hatası:", err.message)
      return 0
    }
  },
}
