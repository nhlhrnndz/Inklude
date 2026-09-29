// server/controllers/classPulseController.js
const { getSessionById } = require("../models/sessionModel");
const { wasParticipant } = require("../models/Checkin");
const {
  recordMood,
  hasSubmitted,
  getLiveRunMoodSummary,
} = require("../models/ClassPulse");

// POST /api/class-pulse  { sessionId, mood } — always answers for the
// classroom's CURRENT live run.
async function submitPulseController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can answer the class pulse." });
    }

    const sessionId = Number(req.body.sessionId);
    const mood = Number(req.body.mood);

    if (!sessionId || ![1, 2, 3].includes(mood)) {
      return res
        .status(400)
        .json({ message: "sessionId and a mood of 1, 2 or 3 are required." });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (!session.current_live_run_id || !session.live_ended_at) {
      return res
        .status(400)
        .json({ message: "The pulse opens after the session ends." });
    }
    if (!(await wasParticipant(sessionId, req.user.id))) {
      return res.status(403).json({ message: "You were not in this session." });
    }

    const saved = await recordMood(
      sessionId,
      session.current_live_run_id,
      req.user.id,
      mood,
    );
    if (!saved) {
      return res
        .status(409)
        .json({ message: "You already answered for this session." });
    }

    res.status(201).json({ message: "Thanks for sharing." });
  } catch (err) {
    console.error("submitPulseController error:", err);
    res.status(500).json({ message: "Server error while saving your answer." });
  }
}

// GET /api/class-pulse/:sessionId/mine → { submitted: boolean } — status
// for the classroom's CURRENT live run.
async function myPulseStatusController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this." });
    }
    const sessionId = Number(req.params.sessionId);
    const session = await getSessionById(sessionId);

    if (!session || !session.current_live_run_id) {
      return res.json({ submitted: false });
    }

    const submitted = await hasSubmitted(
      session.current_live_run_id,
      req.user.id,
    );
    res.json({ submitted });
  } catch (err) {
    console.error("myPulseStatusController error:", err);
    res.status(500).json({ message: "Server error." });
  }
}

// GET /api/class-pulse/:sessionId/summary  — summary for the CURRENT run.
async function pulseSummaryController(req, res) {
  try {
    const role = req.user.role;
    const sessionId = Number(req.params.sessionId);

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    const isOwnerTeacher =
      role === "teacher" && session.teacher_id === req.user.id;
    const isGuidance = role === "guidance" || role === "admin";

    if (!isOwnerTeacher && !isGuidance) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (!session.current_live_run_id) {
      return res.json({
        summary: { responded: 0, hidden: true, counts: null },
      });
    }

    const summary = await getLiveRunMoodSummary(session.current_live_run_id);
    res.json({ summary });
  } catch (err) {
    console.error("pulseSummaryController error:", err);
    res.status(500).json({ message: "Server error while loading the pulse." });
  }
}

module.exports = {
  submitPulseController,
  myPulseStatusController,
  pulseSummaryController,
};
