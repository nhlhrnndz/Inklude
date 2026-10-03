// server/controllers/classController.js
const {
  createClass,
  getClassById,
  getClassByCode,
  getTeacherClasses,
  getStudentClasses,
  joinClass,
  leaveClass,
  isClassMember,
  getClassSessions,
  getClassMembers,
  createClassSession,
} = require("../models/classModel");

// includeAccommodations: only the class's teacher gets the pending-request
// count. Students always get 0.
function mapClass(c, includeAccommodations = false) {
  return {
    id: c.id,
    code: c.class_code,
    title: c.title,
    description: c.description || "",
    status: c.status,
    createdAt: c.created_at,
    teacherName: c.teacher_name,
    memberCount: Number(c.member_count) || 0,
    sessionCount: Number(c.session_count) || 0,
    isLive: Number(c.live_count) > 0,
    accommodationCount: includeAccommodations
      ? Number(c.accommodation_count) || 0
      : 0,
  };
}

function mapSession(s) {
  return {
    id: s.id,
    code: s.session_code,
    title: s.title,
    status: s.status,
    isLive: !!s.is_live,
    scheduledStart: s.scheduled_start,
    scheduledEnd: s.scheduled_end,
    createdAt: s.created_at,
    endedAt: s.ended_at,
    participantCount: Number(s.participant_count) || 0,
  };
}

// Accepts "YYYY-MM-DD HH:MM[:SS]" (or with "T"); returns normalized string
// or null if empty. Throws on bad format.
function parseDateTime(value) {
  if (value === undefined || value === null || value === "") return null;
  const m = String(value)
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error("Invalid date/time format.");
  return `${m[1]} ${m[2]}:${m[3] || "00"}`;
}

async function createClassController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can schedule classes." });
    }
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Class title is required." });
    }

    const cls = await createClass(
      req.user.id,
      title.trim(),
      (description || "").trim(),
    );
    res
      .status(201)
      .json({ message: "Class created.", class: mapClass(cls, true) });
  } catch (err) {
    console.error("createClass error:", err);
    res.status(500).json({ message: "Server error while creating class." });
  }
}

async function listMyClasses(req, res) {
  try {
    let rows;
    const isTeacher = req.user.role === "teacher";
    if (isTeacher) rows = await getTeacherClasses(req.user.id);
    else if (req.user.role === "student")
      rows = await getStudentClasses(req.user.id);
    else return res.status(403).json({ message: "Unauthorized role." });

    res.json({ classes: rows.map((c) => mapClass(c, isTeacher)) });
  } catch (err) {
    console.error("listMyClasses error:", err);
    res.status(500).json({ message: "Server error while fetching classes." });
  }
}

async function joinClassController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can join classes." });
    }
    const code = String(req.body.code || "")
      .trim()
      .toUpperCase();
    if (!code)
      return res.status(400).json({ message: "Class code is required." });

    const cls = await getClassByCode(code);
    if (!cls) {
      return res.status(404).json({ message: "Invalid class code." });
    }

    await joinClass(cls.id, req.user.id);
    res.json({ message: "Joined class.", class: mapClass(cls, false) });
  } catch (err) {
    console.error("joinClass error:", err);
    res.status(500).json({ message: "Server error while joining class." });
  }
}

async function loadClassWithAccess(req, res) {
  const cls = await getClassById(req.params.id);
  if (!cls) {
    res.status(404).json({ message: "Class not found." });
    return null;
  }
  if (req.user.role === "teacher") {
    if (cls.teacher_id !== req.user.id) {
      res.status(403).json({ message: "Access denied." });
      return null;
    }
  } else if (req.user.role === "student") {
    if (!(await isClassMember(cls.id, req.user.id))) {
      res.status(403).json({ message: "You are not a member of this class." });
      return null;
    }
  } else {
    res.status(403).json({ message: "Access denied." });
    return null;
  }
  return cls;
}

async function getClassController(req, res) {
  try {
    const cls = await loadClassWithAccess(req, res);
    if (!cls) return;
    const isTeacher = req.user.role === "teacher";
    const sessions = await getClassSessions(cls.id);
    res.json({
      class: { ...mapClass(cls, isTeacher), isOwner: isTeacher },
      sessions: sessions.map(mapSession),
    });
  } catch (err) {
    console.error("getClass error:", err);
    res.status(500).json({ message: "Server error while fetching class." });
  }
}

async function getClassMembersController(req, res) {
  try {
    const cls = await loadClassWithAccess(req, res);
    if (!cls) return;
    const members = await getClassMembers(cls.id, req.user.role);
    res.json({ members });
  } catch (err) {
    console.error("getClassMembers error:", err);
    res.status(500).json({ message: "Server error while fetching members." });
  }
}

async function createClassSessionController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can add sessions." });
    }
    const cls = await getClassById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found." });
    if (cls.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (cls.status !== "active") {
      return res.status(400).json({ message: "This class is archived." });
    }

    let scheduledStart, scheduledEnd;
    try {
      scheduledStart = parseDateTime(req.body.scheduledStart);
      scheduledEnd = parseDateTime(req.body.scheduledEnd);
    } catch (e) {
      return res
        .status(400)
        .json({ message: "Use date YYYY-MM-DD and time HH:MM (24-hour)." });
    }
    if (scheduledEnd && !scheduledStart) {
      return res
        .status(400)
        .json({ message: "An end time needs a start time." });
    }
    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
      return res
        .status(400)
        .json({ message: "End time must be after start time." });
    }

    const session = await createClassSession(cls, {
      title: req.body.title,
      scheduledStart,
      scheduledEnd,
    });

    res.status(201).json({
      message: "Session added.",
      session: mapSession({ ...session, participant_count: 0 }),
    });
  } catch (err) {
    console.error("createClassSession error:", err);
    res.status(500).json({ message: "Server error while adding session." });
  }
}

async function leaveClassController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can leave classes." });
    }
    const ok = await leaveClass(req.params.id, req.user.id);
    if (!ok)
      return res.status(400).json({ message: "You are not in this class." });
    res.json({ message: "Left class." });
  } catch (err) {
    console.error("leaveClass error:", err);
    res.status(500).json({ message: "Server error while leaving class." });
  }
}

module.exports = {
  createClassController,
  listMyClasses,
  joinClassController,
  getClassController,
  getClassMembersController,
  createClassSessionController,
  leaveClassController,
};
