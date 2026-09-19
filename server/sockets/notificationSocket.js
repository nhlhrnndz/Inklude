// server/sockets/notificationSocket.js
const jwt = require("jsonwebtoken");

function initNotificationSocket(io) {
  io.on("connection", (socket) => {
    // Client sends its JWT; the server decides which user room to join
    socket.on("register-user", ({ token } = {}) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If this socket was registered as someone else, leave that room first
        if (
          socket.data.notifyUserId &&
          socket.data.notifyUserId !== decoded.id
        ) {
          socket.leave(`user-${socket.data.notifyUserId}`);
        }

        socket.join(`user-${decoded.id}`);
        socket.data.notifyUserId = decoded.id;
        console.log(`🔔 Socket ${socket.id} registered for user ${decoded.id}`);
      } catch (err) {
        console.log("⚠️ register-user rejected:", err.message);
      }
    });

    // Called on logout so the next login on this device doesn't inherit the room
    socket.on("unregister-user", () => {
      if (socket.data.notifyUserId) {
        socket.leave(`user-${socket.data.notifyUserId}`);
        socket.data.notifyUserId = null;
      }
    });
  });
}

module.exports = initNotificationSocket;
