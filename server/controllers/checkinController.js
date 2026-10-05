// server/controllers/checkinController.js
const { getSessionById } = require("../models/sessionModel");
const {
  NEEDS_HELP_REPLY,
  createCheckin,
  getCheckinById,
  getSentByTeacher,
  getReceivedByStudent,
  replyToCheckin,
  getCheckedInStudentIds,
  wasParticipant,
  getGuidanceUserIds,
  getUserName,
} = require("../models/Checkin");
const {
  getQuietStudentsForLiveRun,
  getQuietStreak,
  getParticipantCount,
} = require("../models/PresenceTap");
const { notifyUser, notifyUsers } = require("../services/notificationService");

// 1 = flag anyone quiet in this run; 2 = only quiet 2+ runs in a row
const MIN_QUIET_STREAK = 0;

const MESSAGE_MAX = 500;
const REPLY_MAX = 200;

function mapCheckin(c) {
  return {
    id: c.id,
    teacherId: c.teacher_id,
    studentId: c.student_id,
    sessionId: c.session_id,
    message: c.message,
    reply: c.student_reply,
    sentAt: c.sent_at,
    repliedAt: c.replied_at,
    teacherName: c.teacher_name,
    studentName: c.student_name,
  };
}

// GET /api/checkins/session/:sessionId/quiet — summary for the classroom's
// CURRENT (most recently ended) live run.
async function getQuietStudentsController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can view this summary." });
    }

    const sessionId = Number(req.params.sessionId);
    const session = await getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (session.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (!session.current_live_run_id || !session.live_ended_at) {
      return res.status(400).json({
        message: "End the live session first to see who was quiet.",
      });
    }

    const liveRunId = session.current_live_run_id;

    const [quiet, checkedInIds, participantCount] = await Promise.all([
      getQuietStudentsForLiveRun(sessionId, liveRunId),
      getCheckedInStudentIds(req.user.id, liveRunId),
      getParticipantCount(sessionId),
    ]);

    const withStreaks = await Promise.all(
      quiet.map(async (s) => ({
        id: s.id,
        name: s.name,
        quietStreak: await getQuietStreak(req.user.id, s.id, liveRunId),
        checkedIn: checkedInIds.has(s.id),
      })),
    );

    res.json({
      session: {
        id: session.id,
        title: session.title,
        endedAt: session.live_ended_at,
      },
      participantCount,
      minStreak: MIN_QUIET_STREAK,
      quietStudents: withStreaks.filter(
        (s) => s.quietStreak >= MIN_QUIET_STREAK,
      ),
    });
  } catch (err) {
    console.error("getQuietStudentsController error:", err);
    res.status(500).json({ message: "Server error while loading summary." });
  }
}

// POST /api/checkins  { studentId, sessionId, message } — always attaches
// to the classroom's CURRENT live run.
async function createCheckinController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ message: "Only teachers can send check-ins." });
    }

    const teacherId = req.user.id;
    const studentId = Number(req.body.studentId);
    const sessionId = Number(req.body.sessionId);
    const message = (req.body.message || "").trim();

    if (!studentId || !sessionId) {
      return res
        .status(400)
        .json({ message: "studentId and sessionId are required." });
    }
    if (!message) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }
    if (message.length > MESSAGE_MAX) {
      return res.status(400).json({
        message: `Message must be ${MESSAGE_MAX} characters or fewer.`,
      });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (session.teacher_id !== teacherId) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (!session.current_live_run_id) {
      return res
        .status(400)
        .json({ message: "There is no session to check in for yet." });
    }
    if (!(await wasParticipant(sessionId, studentId))) {
      return res
        .status(400)
        .json({ message: "That student was not in this session." });
    }

    const liveRunId = session.current_live_run_id;

    const alreadySent = await getCheckedInStudentIds(teacherId, liveRunId);
    if (alreadySent.has(studentId)) {
      return res.status(409).json({
        message: "You already checked in with this student for this session.",
      });
    }

    const checkin = await createCheckin(
      teacherId,
      studentId,
      sessionId,
      liveRunId,
      message,
    );

    const teacherName = await getUserName(teacherId);
    await notifyUser(studentId, {
      type: "checkin",
      title: `${teacherName} checked in on you`,
      body: message,
      sourceType: "checkin",
      sourceId: checkin.id,
      senderId: teacherId,
    });

    res.status(201).json({
      message: "Check-in sent.",
      checkin: mapCheckin(checkin),
    });
  } catch (err) {
    console.error("createCheckinController error:", err);
    res.status(500).json({ message: "Server error while sending check-in." });
  }
}

async function getSentController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can view this." });
    }
    const rows = await getSentByTeacher(req.user.id);
    res.json({ checkins: rows.map(mapCheckin) });
  } catch (err) {
    console.error("getSentController error:", err);
    res.status(500).json({ message: "Server error while loading check-ins." });
  }
}

async function getReceivedController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this." });
    }
    const rows = await getReceivedByStudent(req.user.id);
    res.json({ checkins: rows.map(mapCheckin) });
  } catch (err) {
    console.error("getReceivedController error:", err);
    res.status(500).json({ message: "Server error while loading check-ins." });
  }
}

async function replyController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can reply to check-ins." });
    }

    const id = Number(req.params.id);
    const reply = (req.body.reply || "").trim();

    if (!reply) {
      return res.status(400).json({ message: "Reply cannot be empty." });
    }
    if (reply.length > REPLY_MAX) {
      return res.status(400).json({
        message: `Reply must be ${REPLY_MAX} characters or fewer.`,
      });
    }

    const checkin = await getCheckinById(id);
    if (!checkin || checkin.student_id !== req.user.id) {
      return res.status(404).json({ message: "Check-in not found." });
    }
    if (checkin.student_reply) {
      return res
        .status(409)
        .json({ message: "You already replied to this check-in." });
    }

    const updated = await replyToCheckin(id, reply);
    const studentName = await getUserName(req.user.id);

    await notifyUser(checkin.teacher_id, {
      type: "checkin_reply",
      title: `${studentName} replied to your check-in`,
      body: reply,
      sourceType: "checkin",
      sourceId: id,
      senderId: req.user.id,
    });

    if (reply === NEEDS_HELP_REPLY) {
      const guidanceIds = await getGuidanceUserIds();
      await notifyUsers(guidanceIds, {
        type: "checkin_help",
        title: "A student asked for help",
        body: `${studentName} replied "${NEEDS_HELP_REPLY}" to a teacher check-in.`,
        sourceType: "checkin_help",
        sourceId: id,
        senderId: req.user.id,
      });
    }

    res.json({ message: "Reply sent.", checkin: mapCheckin(updated) });
  } catch (err) {
    console.error("replyController error:", err);
    res.status(500).json({ message: "Server error while sending reply." });
  }
}

module.exports = {
  getQuietStudentsController,
  createCheckinController,
  getSentController,
  getReceivedController,
  replyController,
};
