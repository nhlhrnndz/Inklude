const {
  createSession,
  getSessionById,
  getSessionByCode,
  getTeacherSessions,
  endSession,
  addParticipant,
  isParticipant,
  getParticipants,
  leaveSession,
} = require("../models/sessionModel");

// POST /api/sessions - Create a new session (Teacher only)
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

// GET /api/sessions - Get all sessions for the teacher
async function getMySessions(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can view sessions." });
    }

    const sessions = await getTeacherSessions(userId);

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        code: s.session_code,
        title: s.title,
        description: s.description,
        status: s.status,
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

// GET /api/sessions/:id - Get session details by ID
async function getSessionByIdController(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    // If user is teacher, verify they own this session
    if (userRole === "teacher") {
      if (session.teacher_id !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    // If user is student, check if they are a participant
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
      return res
        .status(404)
        .json({ message: "Invalid session code or session has ended." });
    }

    // Add participant
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
        participants,
      },
    });
  } catch (err) {
    console.error("joinSessionByCode error:", err);
    res.status(500).json({ message: "Server error while joining session." });
  }
}

// DELETE /api/sessions/:id - End a session (Teacher only)
async function endSessionController(req, res) {
  try {
    console.log("1. endSessionController called");
    console.log("2. Session ID:", req.params.id);
    console.log("3. User ID:", req.user.id);
    console.log("4. User Role:", req.user.role);

    const userId = req.user.id;
    const sessionId = req.params.id;

    const session = await getSessionById(sessionId);
    console.log("5. Session found:", session ? "Yes" : "No");

    if (!session) {
      console.log("6. Session not found");
      return res.status(404).json({ message: "Session not found." });
    }

    console.log("7. Session teacher_id:", session.teacher_id);
    console.log("8. User ID:", userId);
    console.log("9. Session status:", session.status);

    if (session.teacher_id !== userId) {
      console.log("10. Access denied - not the teacher");
      return res.status(403).json({ message: "Access denied." });
    }

    if (session.status === "ended") {
      console.log("11. Session already ended");
      return res.status(400).json({ message: "Session is already ended." });
    }

    console.log("12. Attempting to end session...");
    await endSession(sessionId, userId);
    console.log("13. Session ended successfully");

    res.json({ message: "Session ended successfully." });
  } catch (err) {
    console.error("endSessionController error:", err);
    res.status(500).json({ message: "Server error while ending session." });
  }
}

// POST /api/sessions/:id/leave - Leave a session (Student only)
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
  joinSessionByCode,
  endSessionController,
  leaveSessionController,
};
