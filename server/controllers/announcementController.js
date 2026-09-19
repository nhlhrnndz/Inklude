// server/controllers/announcementController.js
const announcementModel = require("../models/announcementModel");
const { getSessionById } = require("../models/sessionModel");
const { notifyUsers } = require("../services/notificationService");

const TITLE_MAX = 150;
const BODY_MAX = 2000;

function preview(text, max = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function toDto(a) {
  return {
    id: a.id,
    audience: a.audience,
    sessionId: a.session_id,
    sessionTitle: a.session_title ?? null,
    title: a.title,
    body: a.body,
    createdAt: a.created_at,
  };
}

// POST /api/announcements
// Teacher: { sessionId, title, body }  -> students who joined that session
// Guidance: { title, body }            -> all students
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

    let audience;
    let resolvedSessionId = null;
    let recipientIds;
    let notifTitle;

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
    } else {
      audience = "all_students";
      recipientIds = await announcementModel.getAllStudentIds();
      notifTitle = `Guidance: ${cleanTitle}`.slice(0, TITLE_MAX);
    }

    const announcement = await announcementModel.createAnnouncement({
      authorId: userId,
      audience,
      sessionId: resolvedSessionId,
      title: cleanTitle,
      body: cleanBody,
    });

    const recipientCount = await notifyUsers(recipientIds, {
      type: "announcement",
      title: notifTitle,
      body: cleanBody,
      sourceType: "announcement",
      sourceId: announcement.id,
      senderId: userId,
    });

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

module.exports = { postAnnouncement, getMyAnnouncements };
