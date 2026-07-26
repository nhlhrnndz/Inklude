require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const sessionRoutes = require("./routes/session");
const transcribeRoutes = require("./routes/transcribe");
const transcriptRoutes = require("./routes/transcript");
const initCaptionSocket = require("./sockets/captionSocket");
const guidanceRoutes = require("./routes/guidance");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/transcribe", transcribeRoutes);
app.use("/api/transcripts", transcriptRoutes);
app.use("/api/guidance", guidanceRoutes);

app.get("/", (req, res) => {
  res.json({ message: "IncluEd Backend is running ✅" });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    res.json({ message: "Database connected ✅", result: rows[0].result });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Database connection failed ❌", error: err.message });
  }
});

// Create raw HTTP server from Express app (needed for Socket.IO)
const server = http.createServer(app);

// Attach Socket.IO with CORS open for Expo Go / web testing
const io = new Server(server, {
  cors: {
    origin: "*", // fine for thesis/dev — tighten later if needed
    methods: ["GET", "POST"],
  },
});

initCaptionSocket(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 IncluEd server + Socket.IO running on port ${PORT}`);
});
