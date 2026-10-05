// server/models/announcementModel.js
const pool = require("../config/db");

async function createAnnouncement({
  authorId,
  audience,
  audienceLabel = null,
  classId = null,
  sessionId = null,
  title,
  body,
  deadline = null,
}) {
  const [result] = await pool.query(
    `INSERT INTO announcements
       (author_id, audience, audience_label, class_id, session_id, title, body, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      authorId,
      audience,
      audienceLabel,
      classId,
      sessionId,
      title,
      body,
      deadline,
    ],
  );

  const [rows] = await pool.query("SELECT * FROM announcements WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

// Minimal class lookup (ownership checks + labels)
async function getClassById(classId) {
  const [rows] = await pool.query(
    "SELECT id, title, teacher_id FROM classes WHERE id = ?",
    [classId],
  );
  return rows[0] || null;
}

// Announcements posted by one author (teacher/guidance), newest first
async function getAnnouncementsByAuthor(authorId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.title AS session_title, c.title AS class_title
     FROM announcements a
     LEFT JOIN sessions s ON a.session_id = s.id
     LEFT JOIN classes c ON a.class_id = c.id
     WHERE a.author_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [authorId],
  );
  return rows;
}

// Announcements for one class, newest first (class page Announcements tab)
async function getAnnouncementsByClass(classId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.title AS session_title, c.title AS class_title
     FROM announcements a
     LEFT JOIN sessions s ON a.session_id = s.id
     LEFT JOIN classes c ON a.class_id = c.id
     WHERE a.class_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [classId],
  );
  return rows;
}

// Legacy: announcements for one session (old sessions with no class)
async function getAnnouncementsBySession(sessionId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.title AS session_title, c.title AS class_title
     FROM announcements a
     LEFT JOIN sessions s ON a.session_id = s.id
     LEFT JOIN classes c ON a.class_id = c.id
     WHERE a.session_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [sessionId],
  );
  return rows;
}

// Recipients for a class announcement: every current student member
async function getClassStudentIds(classId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT cm.user_id AS id
     FROM class_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.class_id = ? AND cm.left_at IS NULL AND u.role = 'student'`,
    [classId],
  );
  return rows.map((r) => r.id);
}

// Recipients for a legacy session announcement (session with no class):
// students who joined the session.
async function getSessionStudentIds(sessionId) {
  const [[session]] = await pool.query(
    "SELECT class_id FROM sessions WHERE id = ?",
    [sessionId],
  );

  if (session && session.class_id) {
    return getClassStudentIds(session.class_id);
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT p.user_id AS id
     FROM participants p
     JOIN users u ON u.id = p.user_id
     WHERE p.session_id = ? AND u.role = 'student'`,
    [sessionId],
  );
  return rows.map((r) => r.id);
}

// Recipients for a guidance announcement: every student
async function getAllStudentIds() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role = 'student'",
  );
  return rows.map((r) => r.id);
}

// Recipients for a college announcement
async function getStudentIdsByCourses(courses) {
  if (!courses || courses.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT DISTINCT u.id
     FROM users u
     JOIN student_basic_info b ON b.user_id = u.id
     WHERE u.role = 'student' AND b.course IN (?)`,
    [courses],
  );
  return rows.map((r) => r.id);
}

module.exports = {
  createAnnouncement,
  getClassById,
  getAnnouncementsByAuthor,
  getAnnouncementsByClass,
  getAnnouncementsBySession,
  getClassStudentIds,
  getSessionStudentIds,
  getAllStudentIds,
  getStudentIdsByCourses,
};
