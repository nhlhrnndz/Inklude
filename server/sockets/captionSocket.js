const jwt = require("jsonwebtoken");
const { saveTranscript } = require("../models/transcriptModel");
const { getSessionById } = require("../models/sessionModel");

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

    // Classroom Viewboard joins the same room as a silent, listen-only
    // viewer. Verified server-side: a valid JWT belonging to the
    // teacher who owns this session — never trusted from the client.
    socket.on("join-viewboard", async ({ sessionId, token }) => {
      if (!sessionId || !token) {
        socket.emit("viewboard-denied", {
          message: "Missing session or token.",
        });
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        socket.emit("viewboard-denied", {
          message: "Invalid or expired token.",
        });
        return;
      }

      try {
        const session = await getSessionById(sessionId);

        if (!session) {
          socket.emit("viewboard-denied", { message: "Session not found." });
          return;
        }

        if (decoded.role !== "teacher" || session.teacher_id !== decoded.id) {
          socket.emit("viewboard-denied", {
            message: "Only the session's teacher can open the Viewboard.",
          });
          return;
        }

        const room = `session-${sessionId}`;
        socket.join(room);
        socket.data.sessionId = sessionId;
        socket.data.userId = decoded.id;
        socket.data.role = "viewboard";

        console.log(
          `🖥️ Viewboard for teacher ${decoded.id} joined room ${room}`,
        );

        broadcastViewboardStatus(io, sessionId);
      } catch (err) {
        console.error("❌ join-viewboard error:", err.message);
        socket.emit("viewboard-denied", {
          message: "Server error while joining.",
        });
      }
    });

    // Client leaves a session room
    socket.on("leave-session", ({ sessionId }) => {
      const room = `session-${sessionId}`;
      const wasViewboard = socket.data.role === "viewboard";
      socket.leave(room);
      console.log(`👋 Socket ${socket.id} left room ${room}`);

      if (wasViewboard) {
        broadcastViewboardStatus(io, sessionId);
      }
    });

    // Teacher's transcribed caption gets broadcast to the room AND saved to DB
    socket.on("send-caption", async ({ sessionId, text, timestamp }) => {
      // Viewboard sockets are listen-only and should never reach this,
      // but guard against it anyway.
      if (socket.data.role === "viewboard") return;

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

      if (socket.data.role === "viewboard" && socket.data.sessionId) {
        broadcastViewboardStatus(io, socket.data.sessionId);
      }
    });
  });
}

// Lets the teacher's session screen show "Viewboard connected"
function broadcastViewboardStatus(io, sessionId) {
  const room = `session-${sessionId}`;
  const roomSockets = io.sockets.adapter.rooms.get(room);

  let viewerCount = 0;
  if (roomSockets) {
    for (const socketId of roomSockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s?.data.role === "viewboard") viewerCount++;
    }
  }

  io.to(room).emit("viewboard-status", {
    connected: viewerCount > 0,
    count: viewerCount,
  });
}

module.exports = initCaptionSocket;
