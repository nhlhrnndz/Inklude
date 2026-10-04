// server/controllers/announcementController.js
const announcementModel = require("../models/announcementModel");
const { getSessionById, isParticipant } = require("../models/sessionModel");
const { isClassMember } = require("../models/classModel");
const { notifyUsers } = require("../services/notificationService");
const { addAnnouncementDeadline } = require("../services/calendarSyncService");

const TITLE_MAX = 150;
const BODY_MAX = 2000;
const DEADLINE_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/;

// Same rule as sessionController: class members can open a session;
// sessions without a class fall back to "joined the session".
async function studentCanAccess(session, userId) {
  if (session.class_id) return isClassMember(session.class_id, userId);
  return isParticipant(session.id, userId);
}

// "YYYY-MM-DD HH:MM[:SS]" -> normalized string, or null when empty.
// Throws on a bad format.
function parseDeadline(value) {
  if (value === undefined || value === null || value === "") return null;
  const m = String(value).trim().match(DEADLINE_RE);
  if (!m) throw new Error("Invalid deadline.");
  return `${m[1]} ${m[2]}:${m[3] || "00"}`;
}

// Array of trimmed, unique, non-empty strings (bounded).
function cleanList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  const out = value
    .map((v) => String(v).trim().slice(0, maxLen))
    .filter(Boolean);
  return [...new Set(out)].slice(0, maxItems);
}

function fmtWhen(dt) {
  return new Date(dt.replace(" ", "T")).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDto(a) {
  return {
    id: a.id,
    audience: a.audience,
    audienceLabel: a.audience_label ?? null,
    sessionId: a.session_id,
    sessionTitle: a.session_title ?? null,
    title: a.title,
    body: a.body,
    deadline: a.deadline ?? null,
    createdAt: a.created_at,
  };
}

// POST /api/announcements
// Teacher:  { sessionId, title, body, deadline? }
//             -> students in that session's class
// Guidance: { title, body, deadline? }
//             -> all students
//           { audience: "college", colleges: ["CICS"], courses: [...], title, body }
//             -> students whose course is in `courses`
// deadline: "YYYY-MM-DD HH:MM". When set, it appears on each recipient's calendar.
async function postAnnouncement(req, res) {
  try {
    const { id: userId, role } = req.user;
    const { title, body, sessionId } = req.body;

    if (role !== "teacher" && role !== "guidance") {
      return res.status(403).json({
        message:
          "Only teachers and guidance counselors can post announcements.",
      });
    }

    if (typeof title !== "string" || title.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Announcement title is required." });
    }
    if (typeof body !== "string" || body.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Announcement message is required." });
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (cleanTitle.length > TITLE_MAX) {
      return res
        .status(400)
        .json({ message: `Title must be ${TITLE_MAX} characters or fewer.` });
    }
    if (cleanBody.length > BODY_MAX) {
      return res
        .status(400)
        .json({ message: `Message must be ${BODY_MAX} characters or fewer.` });
    }

    let deadline = null;
    try {
      deadline = parseDeadline(req.body.deadline);
    } catch (e) {
      return res.status(400).json({
        message: "Use date YYYY-MM-DD and time HH:MM for the deadline.",
      });
    }
    if (deadline && Date.parse(deadline.replace(" ", "T")) <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Choose a deadline in the future." });
    }

    let audience;
    let audienceLabel = null;
    let resolvedSessionId = null;
    let recipientIds;
    let notifTitle;
    let subjectLabel = "Guidance";
    // Where tapping the notification should go.
    let target = { sourceType: "announcement", sourceId: null };

    if (role === "teacher") {
      if (!sessionId) {
        return res
          .status(400)
          .json({ message: "Please select a session for this announcement." });
      }

      const session = await getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }
      if (session.teacher_id !== userId) {
        return res
          .status(403)
          .json({ message: "You can only post to your own sessions." });
      }

      audience = "session";
      resolvedSessionId = session.id;
      recipientIds = await announcementModel.getSessionStudentIds(session.id);
      notifTitle = `${session.title}: ${cleanTitle}`.slice(0, TITLE_MAX);
      subjectLabel = session.class_title || session.title;

      // Class announcement -> opens the class. Old sessions with no class
      // open the session instead.
      target = session.class_id
        ? { sourceType: "class", sourceId: session.class_id }
        : { sourceType: "session", sourceId: session.id };
    } else if (req.body.audience === "college") {
      const colleges = cleanList(req.body.colleges, 20, 30);
      const courses = cleanList(req.body.courses, 300, 150);

      if (colleges.length === 0 || courses.length === 0) {
        return res
          .status(400)
          .json({ message: "Choose at least one college." });
      }

      audience = "college";
      audienceLabel = colleges.join(", ").slice(0, 255);
      recipientIds = await announcementModel.getStudentIdsByCourses(courses);
      notifTitle = `Guidance: ${cleanTitle}`.slice(0, TITLE_MAX);
    } else {
      audience = "all_students";
      recipientIds = await announcementModel.getAllStudentIds();
      notifTitle = `Guidance: ${cleanTitle}`.slice(0, TITLE_MAX);
    }

    const announcement = await announcementModel.createAnnouncement({
      authorId: userId,
      audience,
      audienceLabel,
      sessionId: resolvedSessionId,
      title: cleanTitle,
      body: cleanBody,
      deadline,
    });

    // Guidance announcements have no screen of their own, so they keep
    // pointing at the announcement (the notification expands to show it).
    if (target.sourceType === "announcement") {
      target.sourceId = announcement.id;
    }

    const recipientCount = await notifyUsers(recipientIds, {
      type: "announcement",
      title: notifTitle,
      body: deadline
        ? `Deadline: ${fmtWhen(deadline)}. ${cleanBody}`
        : cleanBody,
      sourceType: target.sourceType,
      sourceId: target.sourceId,
      senderId: userId,
    });

    // Put the deadline on every recipient's calendar. A failure here must
    // not undo the announcement itself.
    if (deadline) {
      try {
        await addAnnouncementDeadline(announcement.id, recipientIds, {
          title: cleanTitle,
          subject: subjectLabel,
          deadline,
          teacherName: req.user.name || null,
        });
      } catch (err) {
        console.error("Announcement deadline sync failed:", err.message);
      }
    }

    res.status(201).json({
      message: "Announcement posted.",
      recipientCount,
      announcement: toDto(announcement),
    });
  } catch (err) {
    console.error("postAnnouncement error:", err);
    res
      .status(500)
      .json({ message: "Server error while posting announcement." });
  }
}

// GET /api/announcements/mine
async function getMyAnnouncements(req, res) {
  try {
    const { id: userId, role } = req.user;

    if (role !== "teacher" && role !== "guidance") {
      return res.status(403).json({ message: "Unauthorized role." });
    }

    const rows = await announcementModel.getAnnouncementsByAuthor(userId);
    res.json({ announcements: rows.map(toDto) });
  } catch (err) {
    console.error("getMyAnnouncements error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching announcements." });
  }
}

// GET /api/announcements/session/:sessionId
// Classroom detail screen — announcements posted to this specific session.
// Teacher (owner), guidance (any), or a student who joined can read.
async function getSessionAnnouncements(req, res) {
  try {
    const { id: userId, role } = req.user;
    const sessionId = req.params.sessionId;

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (role === "teacher" && session.teacher_id !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }

    if (role === "student") {
      if (!(await studentCanAccess(session, userId))) {
        return res
          .status(403)
          .json({ message: "You are not a member of this class." });
      }
    }

    const rows = await announcementModel.getAnnouncementsBySession(sessionId);
    res.json({ announcements: rows.map(toDto) });
  } catch (err) {
    console.error("getSessionAnnouncements error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching announcements." });
  }
}

module.exports = {
  postAnnouncement,
  getMyAnnouncements,
  getSessionAnnouncements,
};
