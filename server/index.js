//IncluEd/server/index.js
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const messageRoutes = require("./routes/message");

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const sessionRoutes = require("./routes/session");
const classRoutes = require("./routes/classRoutes"); // ⬅️ Phase 4 Week 3
const accommodationRoutes = require("./routes/accommodationRoutes"); // ⬅️ Phase 4 Week 5A
const transcribeRoutes = require("./routes/transcribe");
const transcriptRoutes = require("./routes/transcript");
const guidanceRoutes = require("./routes/guidance");
const notificationRoutes = require("./routes/notification");
const announcementRoutes = require("./routes/announcement");
const initCaptionSocket = require("./sockets/captionSocket");
const initNotificationSocket = require("./sockets/notificationSocket");
const { setIO } = require("./services/notificationService");
const { setIO: setIOForSockets } = require("./utils/ioRegistry");
const sisRoutes = require("./routes/sis");
const basicInfoRoutes = require("./routes/basicInfo");
const checkinRoutes = require("./routes/checkinRoutes");
const classPulseRoutes = require("./routes/classPulseRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const sensoryRoutes = require("./routes/sensoryRoutes");
const breakRoutes = require("./routes/breakRoutes");
const documentRoutes = require("./routes/documentRoutes");
const accessibilityProfileRoutes = require("./routes/accessibilityProfile");
const {
  startScheduleReminders,
} = require("./services/scheduleReminderService");
const appointmentRoutes = require("./routes/appointments"); // Phase 4 Week 6
const referralRoutes = require("./routes/referrals");

// Models required here so startup fails fast on any syntax error.
require("./models/PeerShare");
require("./models/Checkin");
require("./models/ClassPulse");
require("./models/Document");
require("./models/ScheduleItem");
require("./models/SensorySettings");
require("./models/MotorSettings");
require("./models/PresenceTap");
require("./models/accessibilityProfileModel");
require("./models/classModel"); // ⬅️ Phase 4 Week 3
require("./models/accommodationModel"); // ⬅️ Phase 4 Week 5A
require("./models/appointmentModel"); // Phase 4 Week 6

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/messages", messageRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/classes", classRoutes); // ⬅️ Phase 4 Week 3
app.use("/api/accommodations", accommodationRoutes); // ⬅️ Phase 4 Week 5A
app.use("/api/transcribe", transcribeRoutes);
app.use("/api/transcripts", transcriptRoutes);
app.use("/api/guidance", guidanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/sis", sisRoutes);
app.use("/api/basic-info", basicInfoRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/class-pulse", classPulseRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/sensory", sensoryRoutes);
app.use("/api/breaks", breakRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/accessibility", accessibilityProfileRoutes);
app.use("/api/appointments", appointmentRoutes); // Phase 4 Week 6
app.use("/api/referrals", referralRoutes);

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

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initCaptionSocket(io);
initNotificationSocket(io);
setIO(io);
setIOForSockets(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 IncluEd server + Socket.IO running on port ${PORT}`);
  startScheduleReminders();
});
