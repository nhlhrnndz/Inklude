const pool = require("../config/db");
const { getSessionById, isParticipant } = require("../models/sessionModel");
const {
  setBreak,
  isOnBreak,
  getOnBreakUserIds,
} = require("../models/breakModel");
const { notifyUsers } = require("../services/notificationService");
const { getIO } = require("../utils/ioRegistry");

// POST /api/breaks/:sessionId   body: { onBreak: true | false }
async function setMyBreakController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can take a break." });
    }

    const sessionId = Number(req.params.sessionId);
    const onBreak = !!req.body?.onBreak;
    const userId = req.user.id;

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (session.status !== "active") {
      return res.status(400).json({ message: "This classroom is closed." });
    }
    if (!(await isParticipant(sessionId, userId))) {
      return res
        .status(403)
        .json({ message: "You are not a participant in this session." });
    }

    const wasOnBreak = await isOnBreak(sessionId, userId);
    await setBreak(sessionId, userId, onBreak);

    // Only the teacher hears about this live — classmates never see it.
    const io = getIO();
    if (io) {
      io.to(`user-${session.teacher_id}`).emit("break-update", {
        sessionId,
        userId,
        onBreak,
      });
    }

    // One quiet notification when a break starts (not when it ends, and
    // not again if they tap twice).
    if (onBreak && !wasOnBreak) {
      const [me] = await pool.query("SELECT name FROM users WHERE id = ?", [
        userId,
      ]);
      const [guidance] = await pool.query(
        "SELECT id FROM users WHERE role = 'guidance'",
      );
      const name = me[0]?.name || "A student";

      await notifyUsers([session.teacher_id, ...guidance.map((g) => g.id)], {
        type: "break_request",
        title: `${name} needs a break.`,
        body: `From "${session.title}". No reply needed.`,
        sourceType: "session",
        sourceId: sessionId,
        senderId: userId,
      });
    }

    res.json({ onBreak });
  } catch (err) {
    console.error("setMyBreakController error:", err);
    res.status(500).json({ message: "Server error while updating break." });
  }
}

// GET /api/breaks/:sessionId/me
async function getMyBreakController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.json({ onBreak: false });
    }
    const onBreak = await isOnBreak(Number(req.params.sessionId), req.user.id);
    res.json({ onBreak });
  } catch (err) {
    console.error("getMyBreakController error:", err);
    res.status(500).json({ message: "Server error while loading break." });
  }
}

// GET /api/breaks/:sessionId — teacher who owns it, or guidance/admin
async function getSessionBreaksController(req, res) {
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    const role = req.user.role;
    const isOwnerTeacher =
      role === "teacher" && session.teacher_id === req.user.id;
    if (!isOwnerTeacher && role !== "guidance" && role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const onBreakUserIds = await getOnBreakUserIds(sessionId);
    res.json({ onBreakUserIds });
  } catch (err) {
    console.error("getSessionBreaksController error:", err);
    res.status(500).json({ message: "Server error while loading breaks." });
  }
}

module.exports = {
  setMyBreakController,
  getMyBreakController,
  getSessionBreaksController,
};
