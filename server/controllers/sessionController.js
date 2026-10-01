// sessionController.js
const {
  getSessionById,
  getTeacherSessions,
  getJoinedSessions,
  endSession,
  goLive,
  endLive,
  addParticipant,
  isParticipant,
  getParticipants,
  getAllParticipantsForReport,
  wasParticipant,
  leaveSession,
  getRosterForSession,
  resolveDisplayInfo,
  createSession,
} = require("../models/sessionModel");
const { getClassById, isClassMember } = require("../models/classModel");
const { recordTap } = require("../models/PresenceTap");
const { getTranscriptsBySession } = require("../models/transcriptModel");
const { generateSessionReport } = require("../utils/generateSessionReport");
const { getIO } = require("../utils/ioRegistry");

// A student can open a session if they belong to its class
// (or, for any session without a class, if they're a participant).
async function studentCanAccess(session, userId) {
  if (session.class_id) return isClassMember(session.class_id, userId);
  return isParticipant(session.id, userId);
}

// POST /api/sessions  { classId, title? }  (teacher)
async function createSessionController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can create sessions." });
    }

    const { classId, title, description } = req.body;
    if (!classId) {
      return res
        .status(400)
        .json({ message: "Sessions are now created inside a class." });
    }

    const cls = await getClassById(classId);
    if (!cls || cls.teacher_id !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const session = await createSession(
      userId,
      (title || "").trim() || "Session",
      description || cls.description || "",
      { classId: cls.id },
    );

    res.status(201).json({
      message: "Session created successfully.",
      session: {
        id: session.id,
        code: session.session_code,
        title: session.title,
        description: session.description,
        status: session.status,
        createdAt: session.created_at,
        teacherName: session.teacher_name,
      },
    });
  } catch (err) {
    console.error("createSession error:", err);
    res.status(500).json({ message: "Server error while creating session." });
  }
}

async function getMySessions(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let sessions;
    if (userRole === "teacher") {
      sessions = await getTeacherSessions(userId);
    } else if (userRole === "student") {
      sessions = await getJoinedSessions(userId);
    } else {
      return res.status(403).json({ message: "Unauthorized role." });
    }

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        code: s.session_code,
        title: s.title,
        description: s.description,
        status: s.status,
        isLive: !!s.is_live,
        createdAt: s.created_at,
        endedAt: s.ended_at,
        participantCount: s.participant_count || 0,
      })),
    });
  } catch (err) {
    console.error("getMySessions error:", err);
    res.status(500).json({ message: "Server error while fetching sessions." });
  }
}

async function getSessionByIdController(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (userRole === "teacher") {
      if (session.teacher_id !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    if (userRole === "student") {
      if (!(await studentCanAccess(session, userId))) {
        return res
          .status(403)
          .json({ message: "You are not a member of this class." });
      }
    }

    let participants;
    if (userRole === "student") {
      // Students never receive classmates' real names or emails.
      const roster = await getRosterForSession(sessionId, "student");
      participants = roster.map((r) => ({
        id: r.id,
        name: r.displayName,
        email: "",
        joined_at: r.joinedAt,
      }));
    } else {
      participants = await getParticipants(sessionId);
    }

    res.json({
      session: {
        id: session.id,
        code: session.session_code,
        title: session.title,
        description: session.description,
        status: session.status,
        isLive: !!session.is_live,
        liveEndedAt: session.live_ended_at,
        currentLiveRunId: session.current_live_run_id,
        createdAt: session.created_at,
        endedAt: session.ended_at,
        classId: session.class_id,
        classTitle: session.class_title,
        scheduledStart: session.scheduled_start,
        scheduledEnd: session.scheduled_end,
        participants,
      },
    });
  } catch (err) {
    console.error("getSessionByIdController error:", err);
    res.status(500).json({ message: "Server error while fetching session." });
  }
}

async function getSessionRoster(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (userRole === "teacher") {
      if (session.teacher_id !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (userRole === "student") {
      if (!(await studentCanAccess(session, userId))) {
        return res
          .status(403)
          .json({ message: "You are not a member of this class." });
      }
    } else if (userRole !== "guidance" && userRole !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const roster = await getRosterForSession(sessionId, userRole);

    res.json({ participants: roster });
  } catch (err) {
    console.error("getSessionRoster error:", err);
    res.status(500).json({ message: "Server error while fetching roster." });
  }
}

// GET /api/sessions/:id/report
async function downloadSessionReport(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (userRole === "teacher") {
      if (session.teacher_id !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    } else if (userRole === "student") {
      const wasInSession = await wasParticipant(sessionId, userId);
      if (!wasInSession) {
        return res
          .status(403)
          .json({ message: "You were not part of this session." });
      }
    } else {
      return res.status(403).json({ message: "Access denied." });
    }

    const [participants, transcripts] = await Promise.all([
      getAllParticipantsForReport(sessionId),
      getTranscriptsBySession(sessionId),
    ]);

    generateSessionReport(res, { session, participants, transcripts });
  } catch (err) {
    console.error("downloadSessionReport error:", err);
    res.status(500).json({ message: "Server error while generating report." });
  }
}

// POST /api/sessions/:id/enter — a student walks into a session.
// Joining marks them present (replaces the old "I'm here" button).
async function enterSessionController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can join sessions." });
    }

    const sessionId = req.params.id;
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (!(await studentCanAccess(session, userId))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this class." });
    }
    if (session.status !== "active") {
      return res.status(400).json({ message: "This session has been closed." });
    }

    await addParticipant(sessionId, userId);

    // Count as "present" for the current live run (keeps the teacher's
    // quiet-student summary working until Week 5 reworks it).
    if (session.is_live) {
      recordTap(sessionId, userId).catch((err) =>
        console.error("❌ Failed to record presence:", err.message),
      );
    }

    const io = getIO();
    if (io) {
      const present = await getParticipants(sessionId);
      const me = present.find((p) => p.id === userId);
      const { initials } = resolveDisplayInfo(me || {}, "student");
      io.to(`session-${sessionId}`).emit("presence-update", {
        userId,
        initials,
        timestamp: Date.now(),
      });
    }

    res.json({ message: "Joined session." });
  } catch (err) {
    console.error("enterSessionController error:", err);
    res.status(500).json({ message: "Server error while joining session." });
  }
}

async function goLiveController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can go live." });
    }

    const sessionId = req.params.id;
    const runId = await goLive(sessionId, userId);

    if (!runId) {
      return res
        .status(400)
        .json({ message: "This session is not available to go live in." });
    }

    // Everyone already in the room when live starts counts as present.
    try {
      const present = await getParticipants(sessionId);
      await Promise.all(present.map((p) => recordTap(sessionId, p.id)));
    } catch (e) {
      console.error("❌ Failed to record presence at go-live:", e.message);
    }

    const io = getIO();
    if (io) {
      io.to(`session-${sessionId}`).emit("live-started", {
        sessionId: Number(sessionId),
      });
    }

    res.json({ message: "You're live." });
  } catch (err) {
    console.error("goLiveController error:", err);
    res.status(500).json({ message: "Server error while going live." });
  }
}

async function endLiveController(req, res) {
  try {
    const userId = req.user.id;

    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can end the live session." });
    }

    const sessionId = req.params.id;
    const ok = await endLive(sessionId, userId);

    if (!ok) {
      return res
        .status(400)
        .json({ message: "There is no live session to end right now." });
    }

    const io = getIO();
    if (io) {
      io.to(`session-${sessionId}`).emit("live-ended", {
        sessionId: Number(sessionId),
      });
    }

    res.json({ message: "Live session ended." });
  } catch (err) {
    console.error("endLiveController error:", err);
    res
      .status(500)
      .json({ message: "Server error while ending the live session." });
  }
}

async function endSessionController(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (session.teacher_id !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (session.status === "ended") {
      return res
        .status(400)
        .json({ message: "This session is already closed." });
    }

    if (session.is_live) {
      await endLive(sessionId, userId);
    }

    await endSession(sessionId, userId);

    const io = getIO();
    if (io) {
      io.to(`session-${sessionId}`).emit("live-ended", {
        sessionId: Number(sessionId),
      });
      io.to(`session-${sessionId}`).emit("session-ended", {
        sessionId: Number(sessionId),
      });
    }

    res.json({ message: "Session closed successfully." });
  } catch (err) {
    console.error("endSessionController error:", err);
    res
      .status(500)
      .json({ message: "Server error while closing the session." });
  }
}

async function leaveSessionController(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.id;

    if (userRole !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can leave sessions." });
    }

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    const isUserParticipant = await isParticipant(sessionId, userId);

    if (!isUserParticipant) {
      return res.status(400).json({ message: "You are not in this session." });
    }

    await leaveSession(sessionId, userId);

    res.json({ message: "Left session successfully." });
  } catch (err) {
    console.error("leaveSessionController error:", err);
    res.status(500).json({ message: "Server error while leaving session." });
  }
}

module.exports = {
  createSessionController,
  getMySessions,
  getSessionByIdController,
  getSessionRoster,
  enterSessionController,
  goLiveController,
  endLiveController,
  endSessionController,
  leaveSessionController,
  downloadSessionReport,
};
