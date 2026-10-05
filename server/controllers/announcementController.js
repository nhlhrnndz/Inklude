// server/controllers/announcementController.js
const announcementModel = require("../models/announcementModel");
const { getSessionById, isParticipant } = require("../models/sessionModel");
const { isClassMember } = require("../models/classModel");
const { notifyUsers } = require("../services/notificationService");
const { addAnnouncementDeadline } = require("../services/calendarSyncService");

const TITLE_MAX = 150;
const BODY_MAX = 2000;
const DEADLINE_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/;

// Legacy sessions with no class fall back to "joined the session".
async function studentCanAccess(session, userId) {
  if (session.class_id) return isClassMember(session.class_id, userId);
  return isParticipant(session.id, userId);
}

function parseDeadline(value) {
  if (value === undefined || value === null || value === "") return null;
  const m = String(value).trim().match(DEADLINE_RE);
  if (!m) throw new Error("Invalid deadline.");
  return `${m[1]} ${m[2]}:${m[3] || "00"}`;
}

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
    // Class announcements are stored with audience "session"; report "class".
    audience: a.class_id ? "class" : a.audience,
    audienceLabel: a.audience_label ?? null,
    classId: a.class_id ?? null,
    classTitle: a.class_title ?? null,
    sessionId: a.session_id,
    sessionTitle: a.session_title ?? null,
    title: a.title,
    body: a.body,
    deadline: a.deadline ?? null,
    createdAt: a.created_at,
  };
}

// POST /api/announcements
// Teacher:  { classId, title, body, deadline? }  -> students in that class
//           (legacy: { sessionId, ... } is resolved to its class)
// Guidance: { title, body, deadline? }           -> all students
//           { audience: "college", colleges, courses, title, body }
async function postAnnouncement(req, res) {
  try {
    const { id: userId, role } = req.user;
    const { title, body, classId, sessionId } = req.body;

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
    let resolvedClassId = null;
    let resolvedSessionId = null;
    let recipientIds;
    let notifTitle;
    let subjectLabel = "Guidance";
    let target = { sourceType: "announcement", sourceId: null };

    if (role === "teacher") {
      let cls = null;
      let session = null;

      if (classId) {
        cls = await announcementModel.getClassById(classId);
        if (!cls) {
          return res.status(404).json({ message: "Class not found." });
        }
        if (cls.teacher_id !== userId) {
          return res
            .status(403)
            .json({ message: "You can only post to your own classes." });
        }
      } else if (sessionId) {
        session = await getSessionById(sessionId);
        if (!session) {
          return res.status(404).json({ message: "Session not found." });
        }
        if (session.teacher_id !== userId) {
          return res
            .status(403)
            .json({ message: "You can only post to your own sessions." });
        }
        if (session.class_id) {
          cls = await announcementModel.getClassById(session.class_id);
        }
      } else {
        return res
          .status(400)
          .json({ message: "Please choose a class for this announcement." });
      }

      audience = "session";

      if (cls) {
        resolvedClassId = cls.id;
        recipientIds = await announcementModel.getClassStudentIds(cls.id);
        notifTitle = `${cls.title}: ${cleanTitle}`.slice(0, TITLE_MAX);
        subjectLabel = cls.title;
        target = { sourceType: "class", sourceId: cls.id };
      } else {
        // Legacy session with no class
        resolvedSessionId = session.id;
        recipientIds = await announcementModel.getSessionStudentIds(session.id);
        notifTitle = `${session.title}: ${cleanTitle}`.slice(0, TITLE_MAX);
        subjectLabel = session.title;
        target = { sourceType: "session", sourceId: session.id };
      }
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
      classId: resolvedClassId,
      sessionId: resolvedSessionId,
      title: cleanTitle,
      body: cleanBody,
      deadline,
    });

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

// GET /api/announcements/class/:classId
// Teacher (owner), guidance (any), or a current class member.
async function getClassAnnouncements(req, res) {
  try {
    const { id: userId, role } = req.user;
    const classId = Number(req.params.classId);

    const cls = await announcementModel.getClassById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found." });
    }

    if (role === "teacher" && cls.teacher_id !== userId) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (role === "student" && !(await isClassMember(classId, userId))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this class." });
    }

    const rows = await announcementModel.getAnnouncementsByClass(classId);
    res.json({ announcements: rows.map(toDto) });
  } catch (err) {
    console.error("getClassAnnouncements error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching announcements." });
  }
}

// GET /api/announcements/session/:sessionId  (legacy)
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

    // Sessions that belong to a class show the class's announcements.
    const rows = session.class_id
      ? await announcementModel.getAnnouncementsByClass(session.class_id)
      : await announcementModel.getAnnouncementsBySession(sessionId);
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
  getClassAnnouncements,
  getSessionAnnouncements,
};
