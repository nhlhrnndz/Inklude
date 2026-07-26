const pool = require("../config/db");

// Get all students with their disability profiles, optional filter + search
async function getAllStudents(disabilityFilter, searchTerm) {
  let query = `
    SELECT u.id, u.name, u.email, u.created_at,
           dp.disability_types, dp.accessibility_preferences
    FROM users u
    LEFT JOIN disability_profiles dp ON dp.user_id = u.id
    WHERE u.role = 'student'
  `;
  const params = [];

  if (disabilityFilter) {
    query += " AND JSON_CONTAINS(dp.disability_types, JSON_QUOTE(?))";
    params.push(disabilityFilter);
  }

  if (searchTerm) {
    query += " AND (u.name LIKE ? OR u.email LIKE ?)";
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  query += " ORDER BY u.name ASC";

  const [rows] = await pool.query(query, params);
  return rows;
}

// Get a single student's full profile
async function getStudentById(studentId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at,
            dp.disability_types, dp.accessibility_preferences
     FROM users u
     LEFT JOIN disability_profiles dp ON dp.user_id = u.id
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

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentAttendance,
  getStudentTranscripts,
  getDashboardStats,
};
