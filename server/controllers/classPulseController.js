// server/controllers/classPulseController.js
const { getSessionById, wasParticipant } = require("../models/sessionModel");
const { getClassById, isClassMember } = require("../models/classModel");
const {
  hasActiveFollowup,
  createFollowup,
} = require("../models/followupModel");
const {
  MOOD,
  DIFFICULT_MOODS,
  PHASES,
  MIN_RESPONSES,
  getTiming,
  getClassTimings,
  getParticipantSessionIds,
  getAnsweredMap,
  decidePhase,
  recordExperience,
  getSessionExperience,
  getClassExperience,
  hasLowMoodStreak,
} = require("../models/ClassPulse");

const VALID_MOODS = Object.values(MOOD);

// Matches one of the reasons in followupController's REASONS list.
const REPEATED_DIFFICULTY_REASON = "Repeated class difficulty";

// A student can use a session if they belong to its class (or, for a session
// with no class, if they joined it).
async function studentCanAccess(timing, userId) {
  if (timing.class_id) return isClassMember(timing.class_id, userId);
  return wasParticipant(timing.id, userId);
}

// When a student answers a "difficult" mood (Overwhelmed or Confused) after
// class and has done so after each of their last few finished classes, open
// one "Repeated class difficulty" follow-up for Guidance. It never blocks or
// fails the student's answer.
async function flagRepeatedDifficulty(studentId) {
  try {
    if (!(await hasLowMoodStreak(studentId))) return;
    if (await hasActiveFollowup(studentId, REPEATED_DIFFICULTY_REASON)) return;

    await createFollowup({
      studentId,
      createdBy: null,
      reason: REPEATED_DIFFICULTY_REASON,
      note: "Added automatically: the student answered Overwhelmed or Confused after each of their most recent classes.",
    });
  } catch (err) {
    console.error("flagRepeatedDifficulty error:", err);
  }
}

// GET /api/class-pulse/session/:sessionId/due  (student)
async function dueForSessionController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this." });
    }

    const sessionId = Number(req.params.sessionId);
    const timing = await getTiming(sessionId);
    if (!timing) return res.status(404).json({ message: "Session not found." });
    if (!(await studentCanAccess(timing, req.user.id))) {
      return res.status(403).json({ message: "Access denied." });
    }

    const [participants, answered] = await Promise.all([
      getParticipantSessionIds([sessionId], req.user.id),
      getAnsweredMap([sessionId], req.user.id),
    ]);

    const phase = decidePhase(
      timing,
      participants.has(sessionId),
      answered.get(sessionId),
    );

    res.json({
      due: phase ? { sessionId, sessionTitle: timing.title, phase } : null,
    });
  } catch (err) {
    console.error("dueForSessionController error:", err);
    res.status(500).json({ message: "Server error." });
  }
}

// GET /api/class-pulse/class/:classId/due  (student)
// The single most relevant check-in for this class right now.
async function dueForClassController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this." });
    }

    const classId = Number(req.params.classId);
    if (!(await isClassMember(classId, req.user.id))) {
      return res.status(403).json({ message: "Access denied." });
    }

    const timings = await getClassTimings(classId);
    const ids = timings.map((t) => t.id);
    const [participants, answered] = await Promise.all([
      getParticipantSessionIds(ids, req.user.id),
      getAnsweredMap(ids, req.user.id),
    ]);

    let best = null;
    for (const t of timings) {
      const phase = decidePhase(t, participants.has(t.id), answered.get(t.id));
      if (!phase) continue;
      if (phase === "after") {
        best = { timing: t, phase };
        break; // an after-class check-in beats a before-class one
      }
      if (!best) best = { timing: t, phase };
    }

    res.json({
      due: best
        ? {
            sessionId: best.timing.id,
            sessionTitle: best.timing.title,
            phase: best.phase,
          }
        : null,
    });
  } catch (err) {
    console.error("dueForClassController error:", err);
    res.status(500).json({ message: "Server error." });
  }
}

// POST /api/class-pulse  { sessionId, phase, mood }  (student)
async function submitExperienceController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can answer this." });
    }

    const sessionId = Number(req.body.sessionId);
    const phase = String(req.body.phase || "");
    const mood = Number(req.body.mood);

    if (!sessionId || !PHASES.includes(phase) || !VALID_MOODS.includes(mood)) {
      return res.status(400).json({
        message:
          "sessionId, a phase (before or after) and a mood are required.",
      });
    }

    const timing = await getTiming(sessionId);
    if (!timing) return res.status(404).json({ message: "Session not found." });
    if (!(await studentCanAccess(timing, req.user.id))) {
      return res.status(403).json({ message: "Access denied." });
    }

    const [participants, answered] = await Promise.all([
      getParticipantSessionIds([sessionId], req.user.id),
      getAnsweredMap([sessionId], req.user.id),
    ]);

    if (answered.get(sessionId)[phase]) {
      return res
        .status(409)
        .json({ message: "You already answered this one." });
    }

    const due = decidePhase(
      timing,
      participants.has(sessionId),
      answered.get(sessionId),
    );
    if (due !== phase) {
      return res
        .status(400)
        .json({ message: "This check-in isn't open right now." });
    }

    const saved = await recordExperience(sessionId, phase, req.user.id, mood);
    if (!saved) {
      return res
        .status(409)
        .json({ message: "You already answered this one." });
    }

    // Overwhelmed/Confused after class: check for a repeated pattern
    // (never blocks the answer)
    if (phase === "after" && DIFFICULT_MOODS.includes(mood)) {
      await flagRepeatedDifficulty(req.user.id);
    }

    res.status(201).json({ message: "Thanks for sharing." });
  } catch (err) {
    console.error("submitExperienceController error:", err);
    res.status(500).json({ message: "Server error while saving your answer." });
  }
}

// GET /api/class-pulse/session/:sessionId/summary  (owner teacher / guidance)
async function sessionSummaryController(req, res) {
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

    const phases = await getSessionExperience(sessionId);
    // `summary` is the after-class answer (what the session summary screen shows).
    res.json({ summary: phases.after, phases, minResponses: MIN_RESPONSES });
  } catch (err) {
    console.error("sessionSummaryController error:", err);
    res.status(500).json({ message: "Server error while loading the pulse." });
  }
}

// GET /api/class-pulse/class/:classId/insights  (owner teacher / guidance)
async function classInsightsController(req, res) {
  try {
    const role = req.user.role;
    const classId = Number(req.params.classId);

    const cls = await getClassById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found." });

    const isOwnerTeacher = role === "teacher" && cls.teacher_id === req.user.id;
    const isGuidance = role === "guidance" || role === "admin";
    if (!isOwnerTeacher && !isGuidance) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(await getClassExperience(classId));
  } catch (err) {
    console.error("classInsightsController error:", err);
    res.status(500).json({ message: "Server error while loading insights." });
  }
}

module.exports = {
  dueForSessionController,
  dueForClassController,
  submitExperienceController,
  sessionSummaryController,
  classInsightsController,
};
