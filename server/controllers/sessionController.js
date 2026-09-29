//sessionController.js
const {
  createSession,
  getSessionById,
  getSessionByCode,
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
} = require("../models/sessionModel");
const { getTranscriptsBySession } = require("../models/transcriptModel");
const { generateSessionReport } = require("../utils/generateSessionReport");
const { getIO } = require("../utils/ioRegistry");

async function createSessionController(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can create sessions." });
    }

    const { title, description } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Session title is required." });
    }

    const session = await createSession(
      userId,
      title.trim(),
      description || "",
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
      const isUserParticipant = await isParticipant(sessionId, userId);
      if (!isUserParticipant) {
        return res
          .status(403)
          .json({ message: "You are not a participant in this session." });
      }
    }

    const participants = await getParticipants(sessionId);

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
      const isUserParticipant = await isParticipant(sessionId, userId);
      if (!isUserParticipant) {
        return res
          .status(403)
          .json({ message: "You are not a participant in this session." });
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

// GET /api/sessions/:id/report - Download a PDF report of the session
// (teacher who owns it, or any student who was ever a participant)
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

// GET /api/sessions/join/:code - Join a session by code (Student only)
async function joinSessionByCode(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const code = req.params.code.toUpperCase();

    if (userRole !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can join sessions." });
    }

    const session = await getSessionByCode(code);

    if (!session) {
      return res.status(404).json({
        message: "Invalid session code or the classroom has been disabled.",
      });
    }

    await addParticipant(session.id, userId);

    const participants = await getParticipants(session.id);

    res.json({
      message: "Successfully joined session.",
      session: {
        id: session.id,
        code: session.session_code,
        title: session.title,
        description: session.description,
        teacherName: session.teacher_name,
        status: session.status,
        isLive: !!session.is_live,
        participants,
      },
    });
  } catch (err) {
    console.error("joinSessionByCode error:", err);
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
        .json({ message: "This classroom is not available to go live in." });
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
        .json({ message: "This classroom is already disabled." });
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

    res.json({ message: "Classroom disabled successfully." });
  } catch (err) {
    console.error("endSessionController error:", err);
    res
      .status(500)
      .json({ message: "Server error while disabling the classroom." });
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
  joinSessionByCode,
  goLiveController,
  endLiveController,
  endSessionController,
  leaveSessionController,
  downloadSessionReport,
};
