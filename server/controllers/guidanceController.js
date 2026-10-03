//guidanceController.js
const {
  getAllStudents,
  getStudentById,
  getStudentAttendance,
  getStudentTranscripts,
  getDashboardStats,
  getAppointmentSummary,
  getStudentMessageSummary,
} = require("../models/guidanceModel");
const {
  getNeedsHelpInfo,
  getNeedsHelpStudentIds,
} = require("../models/Checkin");
const { hasLowMoodStreak } = require("../models/ClassPulse");
const { getAppointmentsForStudent } = require("../models/appointmentModel");
const { getGuidanceThreads } = require("../models/messageModel");
const { getAnnouncementsByAuthor } = require("../models/announcementModel");
const { getAllStudentSIS } = require("../models/sisModel");
const {
  toDto: followupToDto,
  getFollowupsForStudent,
  getActiveFollowups,
  countActiveFollowups,
} = require("../models/followupModel");

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

const FORBIDDEN = { message: "Only guidance counselors can view this." };

function preview(text, max = 100) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

// Same shape as the appointment controller's format() so the
// frontend `Appointment` type works for both.
function mapAppointment(a) {
  return {
    id: a.id,
    studentId: a.student_id,
    studentName: a.student_name,
    studentEmail: a.student_email,
    guidanceName: a.guidance_name || null,
    reason: a.reason,
    note: a.note || "",
    status: a.status,
    preferredDate: a.preferred_date,
    preferredTime: a.preferred_time,
    confirmedDate: a.confirmed_date || null,
    confirmedTime: a.confirmed_time || null,
    guidanceNote: a.guidance_note || "",
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

// GET /api/guidance/students?disability=Autism&course=BS%20Information%20Technology&search=juan
async function getStudentsController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json(FORBIDDEN);
    }

    const { disability, search, course } = req.query;

    const students = await getAllStudents(disability, search, course);

    // Phase 2.3 Week 3 flags (yes/no only, never the underlying answers)
    const needsHelpIds = await getNeedsHelpStudentIds();
    const lowMoodFlags = await Promise.all(
      students.map((s) => hasLowMoodStreak(s.id)),
    );

    res.json({
      students: students.map((s, index) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        createdAt: s.created_at,
        disabilityTypes: s.disability_types
          ? JSON.parse(s.disability_types)
          : [],
        accessibilityPreferences: s.accessibility_preferences
          ? JSON.parse(s.accessibility_preferences)
          : {},
        course: s.course ?? null,
        yearLevel: s.year_level ?? null,
        section: s.section ?? null,
        flags: {
          needsHelp: needsHelpIds.has(s.id),
          lowMood: lowMoodFlags[index],
        },
      })),
    });
  } catch (err) {
    console.error("getStudentsController error:", err);
    res.status(500).json({ message: "Server error while fetching students." });
  }
}

// GET /api/guidance/students/:id
// Student Support Profile: identity, needs/preferences, SIS lives in its own
// endpoint, plus appointments, follow-ups and the message thread summary.
async function getStudentDetailController(req, res) {
  try {
    const studentId = req.params.id;

    if (!isGuidance(req)) {
      return res.status(403).json(FORBIDDEN);
    }

    const student = await getStudentById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const [
      attendance,
      transcripts,
      needsHelp,
      lowMood,
      appointmentRows,
      followupRows,
      thread,
    ] = await Promise.all([
      getStudentAttendance(studentId),
      getStudentTranscripts(studentId),
      getNeedsHelpInfo(student.id),
      hasLowMoodStreak(student.id),
      getAppointmentsForStudent(student.id),
      getFollowupsForStudent(student.id),
      getStudentMessageSummary(student.id),
    ]);

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        createdAt: student.created_at,
        disabilityTypes: student.disability_types
          ? JSON.parse(student.disability_types)
          : [],
        accessibilityPreferences: student.accessibility_preferences
          ? JSON.parse(student.accessibility_preferences)
          : {},
        course: student.course ?? null,
        yearLevel: student.year_level ?? null,
        section: student.section ?? null,
        age: student.age ?? null,
        dateOfBirth: student.date_of_birth ?? null,
      },
      flags: {
        needsHelp,
        lowMood,
      },
      appointments: appointmentRows.slice(0, 20).map(mapAppointment),
      followups: followupRows.map(followupToDto),
      messageThread: thread
        ? {
            id: thread.id,
            totalCount: Number(thread.total_count) || 0,
            unreadCount: Number(thread.unread_count) || 0,
            lastMessage: preview(thread.last_message, 140),
            lastSenderRole: thread.last_sender_role,
            lastMessageAt: thread.last_message_at,
          }
        : null,
      attendance: attendance.map((a) => ({
        sessionId: a.id,
        sessionCode: a.session_code,
        title: a.title,
        status: a.status,
        teacherName: a.teacher_name,
        joinedAt: a.joined_at,
        leftAt: a.left_at,
      })),
      transcripts: transcripts.map((t) => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        sessionTitle: t.session_title,
        sessionCode: t.session_code,
      })),
    });
  } catch (err) {
    console.error("getStudentDetailController error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching student detail." });
  }
}

// GET /api/guidance/stats
async function getStatsController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json(FORBIDDEN);
    }

    const stats = await getDashboardStats();
    res.json({ stats });
  } catch (err) {
    console.error("getStatsController error:", err);
    res.status(500).json({ message: "Server error while fetching stats." });
  }
}

// GET /api/guidance/dashboard
// One call for every card on the redesigned Guidance dashboard.
async function getDashboardSummaryController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json(FORBIDDEN);
    }

    const [
      stats,
      apptSummary,
      activeCount,
      activeItems,
      threads,
      announcements,
      sisRows,
    ] = await Promise.all([
      getDashboardStats(),
      getAppointmentSummary(),
      countActiveFollowups(),
      getActiveFollowups(5),
      getGuidanceThreads(),
      getAnnouncementsByAuthor(req.user.id),
      getAllStudentSIS(),
    ]);

    // Messages: only threads that actually have a message
    const liveThreads = threads.filter((t) => t.last_message);
    const unreadTotal = liveThreads.reduce(
      (sum, t) => sum + Number(t.unread_count || 0),
      0,
    );

    // SIS: anything that isn't "completed" counts as incomplete
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;
    const incompleteStudentIds = [];

    sisRows.forEach((row) => {
      if (row.status === "completed") {
        completed += 1;
        return;
      }
      if (row.status === "in_progress") inProgress += 1;
      else notStarted += 1;
      incompleteStudentIds.push(row.user_id);
    });

    const next = apptSummary.next;

    res.json({
      totalStudents: stats.totalStudents,
      appointments: {
        pendingCount: apptSummary.pendingCount,
        upcomingCount: apptSummary.upcomingCount,
        next: next
          ? {
              id: next.id,
              studentId: next.student_id,
              studentName: next.student_name,
              reason: next.reason,
              status: next.status,
              date: next.confirmed_date,
              time: next.confirmed_time,
            }
          : null,
      },
      followups: {
        activeCount: activeCount,
        items: activeItems.map(followupToDto),
      },
      messages: {
        unreadTotal,
        threads: liveThreads.slice(0, 4).map((t) => ({
          id: t.id,
          studentId: t.student_id,
          studentName: t.student_name,
          lastMessage: preview(t.last_message, 80),
          lastMessageAt: t.last_message_at,
          unreadCount: Number(t.unread_count) || 0,
        })),
      },
      announcements: announcements.slice(0, 3).map((a) => ({
        id: a.id,
        title: a.title,
        audience: a.audience,
        createdAt: a.created_at,
      })),
      sis: {
        total: sisRows.length,
        completed,
        inProgress,
        notStarted,
        incompleteStudentIds,
      },
    });
  } catch (err) {
    console.error("getDashboardSummaryController error:", err);
    res
      .status(500)
      .json({ message: "Server error while loading the dashboard." });
  }
}

module.exports = {
  getStudentsController,
  getStudentDetailController,
  getStatsController,
  getDashboardSummaryController,
};
