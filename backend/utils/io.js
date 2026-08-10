let io

module.exports = {
  init: function(serverIO) {
    io = serverIO
  },
  getIO: function() {
    if (!io) throw new Error("Socket.io instance not initialized")
    return io
  }
}
