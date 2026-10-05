//guidanceModel.js
const pool = require("../config/db");

// Get all students with their disability profiles and basic info
// (course/year level/section), with optional filters (disability, course) + search
async function getAllStudents(disabilityFilter, searchTerm, courseFilter) {
  let query = `
    SELECT u.id, u.name, u.email, u.created_at,
           dp.disability_types, dp.accessibility_preferences,
           bi.course, bi.year_level, bi.section
    FROM users u
    LEFT JOIN disability_profiles dp ON dp.user_id = u.id
    LEFT JOIN student_basic_info bi ON bi.user_id = u.id
    WHERE u.role = 'student'
  `;
  const params = [];

  if (disabilityFilter) {
    query += " AND JSON_CONTAINS(dp.disability_types, JSON_QUOTE(?))";
    params.push(disabilityFilter);
  }

  if (courseFilter) {
    query += " AND bi.course = ?";
    params.push(courseFilter);
  }

  if (searchTerm) {
    query += " AND (u.name LIKE ? OR u.email LIKE ?)";
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  query += " ORDER BY bi.course ASC, u.name ASC";

  const [rows] = await pool.query(query, params);
  return rows;
}

// Get a single student's full profile, including basic info
async function getStudentById(studentId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at,
            dp.disability_types, dp.accessibility_preferences,
            bi.course, bi.year_level, bi.section, bi.age, bi.date_of_birth
     FROM users u
     LEFT JOIN disability_profiles dp ON dp.user_id = u.id
     LEFT JOIN student_basic_info bi ON bi.user_id = u.id
     WHERE u.id = ? AND u.role = 'student'`,
    [studentId],
  );
  return rows[0] || null;
}

// Get a student's session attendance history
async function getStudentAttendance(studentId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.session_code, s.title, s.status,
            p.joined_at, p.left_at, u.name AS teacher_name
     FROM participants p
     JOIN sessions s ON p.session_id = s.id
     JOIN users u ON s.teacher_id = u.id
     WHERE p.user_id = ?
     ORDER BY p.joined_at DESC`,
    [studentId],
  );
  return rows;
}

// Get a student's transcript history (things said/captioned for them)
async function getStudentTranscripts(studentId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.text, t.created_at, s.title AS session_title, s.session_code
     FROM transcripts t
     JOIN sessions s ON t.session_id = s.id
     JOIN participants p ON p.session_id = s.id AND p.user_id = ?
     ORDER BY t.created_at DESC`,
    [studentId],
  );
  return rows;
}

// Dashboard summary stats
async function getDashboardStats() {
  const [[studentCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'student'",
  );

  const [[sessionCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM sessions",
  );

  const [[activeSessionCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM sessions WHERE status = 'active'",
  );

  const [[participantCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM participants",
  );

  const [[profileCount]] = await pool.query(
    "SELECT COUNT(*) AS total FROM disability_profiles",
  );

  const participationRate =
    studentCount.total > 0
      ? Math.round((profileCount.total / studentCount.total) * 100)
      : 0;

  return {
    totalStudents: studentCount.total,
    totalSessions: sessionCount.total,
    activeSessions: activeSessionCount.total,
    totalParticipations: participantCount.total,
    profileCompletionRate: participationRate,
  };
}

// Week 7: numbers for the dashboard's Appointments card.
// Dates/times are formatted in SQL so they never shift by timezone.
async function getAppointmentSummary() {
  const [[counts]] = await pool.query(
    `SELECT
       SUM(status = 'pending') AS pending_count,
       SUM(
         status IN ('confirmed', 'rescheduled')
         AND confirmed_date IS NOT NULL
         AND confirmed_time IS NOT NULL
         AND TIMESTAMP(confirmed_date, confirmed_time) >= NOW()
       ) AS upcoming_count
     FROM guidance_appointments`,
  );

  const [nextRows] = await pool.query(
    `SELECT a.id, a.student_id, a.reason, a.status,
            DATE_FORMAT(a.confirmed_date, '%Y-%m-%d') AS confirmed_date,
            TIME_FORMAT(a.confirmed_time, '%H:%i') AS confirmed_time,
            u.name AS student_name
     FROM guidance_appointments a
     JOIN users u ON u.id = a.student_id
     WHERE a.status IN ('confirmed', 'rescheduled')
       AND a.confirmed_date IS NOT NULL
       AND a.confirmed_time IS NOT NULL
       AND TIMESTAMP(a.confirmed_date, a.confirmed_time) >= NOW()
     ORDER BY TIMESTAMP(a.confirmed_date, a.confirmed_time) ASC
     LIMIT 1`,
  );

  return {
    pendingCount: Number(counts.pending_count) || 0,
    upcomingCount: Number(counts.upcoming_count) || 0,
    next: nextRows[0] || null,
  };
}

// Week 7: one-line picture of a student's thread with Guidance.
// Returns null when the student has never messaged.
async function getStudentMessageSummary(studentId) {
  const [rows] = await pool.query(
    `SELECT
       mt.id,
       (SELECT COUNT(*) FROM messages WHERE thread_id = mt.id) AS total_count,
       (SELECT COUNT(*) FROM messages
         WHERE thread_id = mt.id AND sender_role = 'student' AND read_at IS NULL) AS unread_count,
       (SELECT body FROM messages
         WHERE thread_id = mt.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_message,
       (SELECT sender_role FROM messages
         WHERE thread_id = mt.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_sender_role,
       (SELECT created_at FROM messages
         WHERE thread_id = mt.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_message_at
     FROM message_threads mt
     WHERE mt.student_id = ?
     LIMIT 1`,
    [studentId],
  );

  const row = rows[0];
  if (!row || Number(row.total_count) === 0) return null;
  return row;
}

/* ------------------------------------------------------------------ */
/* Dashboard redesign: visual summary helpers                          */
/* ------------------------------------------------------------------ */

// Each student is counted once, by priority:
// follow-up needed > appointment pending > awaiting reply > no open items.
// awaitingReplyTotal counts every student whose last message is unanswered,
// regardless of priority (used by the "Needs attention" box).
async function getSupportStatusBreakdown() {
  const [rows] = await pool.query(
    `SELECT u.id,
       EXISTS(
         SELECT 1 FROM guidance_followups f
         WHERE f.student_id = u.id AND f.status = 'active'
       ) AS has_followup,
       EXISTS(
         SELECT 1 FROM guidance_appointments a
         WHERE a.student_id = u.id AND a.status = 'pending'
       ) AS has_pending_appt,
       (
         (SELECT m.sender_role
            FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            WHERE mt.student_id = u.id
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1) = 'student'
       ) AS awaiting_reply
     FROM users u
     WHERE u.role = 'student'`,
  );

  const result = {
    total: rows.length,
    followUp: 0,
    appointmentPending: 0,
    awaitingReply: 0,
    noOpenItems: 0,
    awaitingReplyTotal: 0,
  };

  rows.forEach((row) => {
    const hasFollowup = Number(row.has_followup) === 1;
    const hasAppt = Number(row.has_pending_appt) === 1;
    const awaiting = Number(row.awaiting_reply) === 1;

    if (awaiting) result.awaitingReplyTotal += 1;

    if (hasFollowup) result.followUp += 1;
    else if (hasAppt) result.appointmentPending += 1;
    else if (awaiting) result.awaitingReply += 1;
    else result.noOpenItems += 1;
  });

  return result;
}

// Confirmed / rescheduled appointments happening today.
async function getTodayAppointments() {
  const [rows] = await pool.query(
    `SELECT a.id, a.student_id, a.reason, a.status,
            TIME_FORMAT(a.confirmed_time, '%H:%i') AS confirmed_time,
            u.name AS student_name
     FROM guidance_appointments a
     JOIN users u ON u.id = a.student_id
     WHERE a.status IN ('confirmed', 'rescheduled')
       AND a.confirmed_date = CURDATE()
     ORDER BY a.confirmed_time ASC`,
  );
  return rows;
}

// Accessibility reports still waiting for Guidance (all time, not just this month).
async function getPendingReportCount() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM accessibility_reports WHERE status = 'pending'",
  );
  return Number(rows[0].count) || 0;
}

// Most reported locations for one month. Location is free text, so
// "Library" and "library " are grouped together.
async function getTopReportLocations(start, end, limit = 5) {
  const [rows] = await pool.query(
    `SELECT MIN(TRIM(location)) AS location, COUNT(*) AS count
     FROM accessibility_reports
     WHERE created_at >= ? AND created_at < ?
     GROUP BY LOWER(TRIM(location))
     ORDER BY count DESC, location ASC
     LIMIT ?`,
    [start, end, limit],
  );
  return rows.map((r) => ({
    location: r.location,
    count: Number(r.count),
  }));
}

// Support activity over the last `weeks` rolling 7-day windows:
// appointment requests + messages from students + accessibility reports.
async function getWeeklyActivity(weeks = 4) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const origin = now - weeks * WEEK_MS;
  const days = weeks * 7;

  const [[appointments], [messages], [reports]] = await Promise.all([
    pool.query(
      "SELECT created_at FROM guidance_appointments WHERE created_at >= NOW() - INTERVAL ? DAY",
      [days],
    ),
    pool.query(
      `SELECT created_at FROM messages
       WHERE sender_role = 'student' AND created_at >= NOW() - INTERVAL ? DAY`,
      [days],
    ),
    pool.query(
      "SELECT created_at FROM accessibility_reports WHERE created_at >= NOW() - INTERVAL ? DAY",
      [days],
    ),
  ]);

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    start: new Date(origin + i * WEEK_MS).toISOString(),
    appointments: 0,
    messages: 0,
    reports: 0,
    total: 0,
  }));

  const add = (rows, key) => {
    rows.forEach((row) => {
      const t = new Date(row.created_at).getTime();
      let idx = Math.floor((t - origin) / WEEK_MS);
      if (Number.isNaN(idx) || idx < 0) return;
      if (idx >= weeks) idx = weeks - 1;
      buckets[idx][key] += 1;
      buckets[idx].total += 1;
    });
  };

  add(appointments, "appointments");
  add(messages, "messages");
  add(reports, "reports");

  return buckets;
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentAttendance,
  getStudentTranscripts,
  getDashboardStats,
  getAppointmentSummary,
  getStudentMessageSummary,
  getSupportStatusBreakdown,
  getTodayAppointments,
  getPendingReportCount,
  getTopReportLocations,
  getWeeklyActivity,
};
