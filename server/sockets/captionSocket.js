// server/sockets/captionSocket.js
const { saveTranscript } = require("../models/transcriptModel");

function initCaptionSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client joins a specific classroom session room
    socket.on("join-session", ({ sessionId, userId, role }) => {
      const room = `session-${sessionId}`;
      socket.join(room);
      socket.data.sessionId = sessionId;
      socket.data.userId = userId;
      socket.data.role = role;
      console.log(`✅ User ${userId} (${role}) joined room ${room}`);
    });

    // Client leaves a session room
    socket.on("leave-session", ({ sessionId }) => {
      const room = `session-${sessionId}`;
      socket.leave(room);
      console.log(`👋 Socket ${socket.id} left room ${room}`);
    });

    // Teacher's transcribed caption gets broadcast to the room AND saved to DB
    socket.on("send-caption", async ({ sessionId, text, timestamp }) => {
      const room = `session-${sessionId}`;

      // Broadcast immediately — don't make students wait on the DB write
      io.to(room).emit("new-caption", {
        text,
        timestamp: timestamp || Date.now(),
      });
      console.log(`📝 Caption broadcast to ${room}: "${text}"`);

      // Save to DB in the background
      try {
        const speakerId = socket.data.userId;
        if (speakerId) {
          await saveTranscript(sessionId, speakerId, text);
        }
      } catch (err) {
        console.error("❌ Failed to save transcript:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = initCaptionSocket;
