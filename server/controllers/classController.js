// server/controllers/classController.js
const {
  createClass,
  generateClassSessions,
  getOrCreateTodaySession,
  getClassDocuments,
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
  getTeacherStudents,
} = require("../models/classModel");
const {
  resolveDisplayInfo,
  avatarColorForId,
} = require("../models/sessionModel");
const {
  syncSessionForMembers,
  syncClassForUser,
  removeClassForUser,
} = require("../services/calendarSyncService");

// Calendar sync must never break joining, leaving or scheduling.
async function safeCalendar(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`Calendar sync (${label}) failed:`, err.message);
  }
}

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
    liveSessionId: c.live_session_id ? Number(c.live_session_id) : null,
    accommodationCount: includeAccommodations
      ? Number(c.accommodation_count) || 0
      : 0,
    schedule:
      c.start_date_str && c.start_time_str && c.end_time_str
        ? {
            days: c.meeting_days
              ? String(c.meeting_days).split(",").map(Number)
              : [],
            startTime: c.start_time_str,
            endTime: c.end_time_str,
            startDate: c.start_date_str,
            endDate: c.end_date_str || c.start_date_str,
          }
        : null,
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

function mapDoc(d) {
  return {
    id: d.id,
    filename: d.filename,
    mimeType: d.mime_type,
    sessionId: d.session_id,
    sessionTitle: null,
    teacherName: null,
    createdAt: d.created_at,
    textLength: d.text_length ?? null,
  };
}

const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validates the single date + time sent by Schedule Class.
// Returns the shape classModel already stores (one meeting = one day,
// first date and last date the same).
function parseSchedule(s) {
  if (!DATE_RE.test(s.startDate || "")) {
    throw new Error("Pick the class date.");
  }
  if (!TIME_RE.test(s.startTime || "") || !TIME_RE.test(s.endTime || "")) {
    throw new Error("Pick a start and end time.");
  }
  if (s.endTime <= s.startTime) {
    throw new Error("End time must be after the start time.");
  }
  const [y, m, d] = s.startDate.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return {
    days: [day],
    startTime: s.startTime,
    endTime: s.endTime,
    startDate: s.startDate,
    endDate: s.startDate,
  };
}

async function createClassController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can schedule classes." });
    }
    const { title, description, schedule } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Class title is required." });
    }

    let parsed = null;
    if (schedule) {
      try {
        parsed = parseSchedule(schedule);
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
    }

    const cls = await createClass(
      req.user.id,
      title.trim(),
      (description || "").trim(),
      parsed,
    );

    let sessionCount = 0;
    if (parsed) {
      sessionCount = await generateClassSessions(cls, parsed, [
        parsed.startDate,
      ]);
    }

    const fresh = await getClassById(cls.id);
    res.status(201).json({
      message: "Class created.",
      class: mapClass(fresh, true),
      sessionCount,
    });
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

    // Put the class's upcoming sessions, exams and assignments on their calendar.
    await safeCalendar("join", () => syncClassForUser(cls.id, req.user.id));

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

// POST /api/classes/:id/open-session  (teacher) -> { sessionId }
// The Go Live button on the class front.
async function openClassSessionController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can go live." });
    }
    const cls = await getClassById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found." });
    if (cls.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (cls.status !== "active") {
      return res.status(400).json({ message: "This class is archived." });
    }
    const sessionId = await getOrCreateTodaySession(cls);
    res.json({ sessionId });
  } catch (err) {
    console.error("openClassSession error:", err);
    res.status(500).json({ message: "Server error while opening the class." });
  }
}

// GET /api/classes/:id/documents
async function getClassDocumentsController(req, res) {
  try {
    const cls = await loadClassWithAccess(req, res);
    if (!cls) return;
    const rows = await getClassDocuments(cls.id);
    res.json({ documents: rows.map(mapDoc) });
  } catch (err) {
    console.error("getClassDocuments error:", err);
    res.status(500).json({ message: "Server error while loading documents." });
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

    const parse = (value) => {
      if (value === undefined || value === null || value === "") return null;
      const m = String(value)
        .trim()
        .match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
      if (!m) throw new Error("Invalid date/time format.");
      return `${m[1]} ${m[2]}:${m[3] || "00"}`;
    };

    let scheduledStart, scheduledEnd;
    try {
      scheduledStart = parse(req.body.scheduledStart);
      scheduledEnd = parse(req.body.scheduledEnd);
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

    if (scheduledStart) {
      await safeCalendar("session", () => syncSessionForMembers(session.id));
    }

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

    await safeCalendar("leave", () =>
      removeClassForUser(Number(req.params.id), req.user.id),
    );

    res.json({ message: "Left class." });
  } catch (err) {
    console.error("leaveClass error:", err);
    res.status(500).json({ message: "Server error while leaving class." });
  }
}

// GET /api/classes/my-students  (teacher)
// Students enrolled in this teacher's classes, grouped per student.
async function listMyStudentsController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view this." });
    }

    const rows = await getTeacherStudents(req.user.id);
    const byStudent = new Map();

    rows.forEach((r) => {
      if (!byStudent.has(r.id)) {
        const { displayName, initials } = resolveDisplayInfo(
          { name: r.name, display_username: r.display_username },
          "teacher",
        );
        byStudent.set(r.id, {
          id: r.id,
          displayName,
          initials,
          avatarColor: avatarColorForId(r.id),
          classes: [],
          openRequestCount: 0,
        });
      }
      const s = byStudent.get(r.id);
      s.classes.push({ id: r.class_id, title: r.class_title });
      s.openRequestCount += Number(r.open_requests) || 0;
    });

    const students = [...byStudent.values()].map((s) => ({
      ...s,
      hasAccommodationRequest: s.openRequestCount > 0,
    }));

    res.json({ students });
  } catch (err) {
    console.error("listMyStudents error:", err);
    res.status(500).json({ message: "Server error while loading students." });
  }
}

module.exports = {
  createClassController,
  listMyClasses,
  joinClassController,
  getClassController,
  getClassMembersController,
  openClassSessionController,
  getClassDocumentsController,
  createClassSessionController,
  leaveClassController,
  listMyStudentsController,
};
