// server/models/announcementModel.js
const pool = require("../config/db");

async function createAnnouncement({
  authorId,
  audience,
  sessionId = null,
  title,
  body,
}) {
  const [result] = await pool.query(
    `INSERT INTO announcements (author_id, audience, session_id, title, body)
     VALUES (?, ?, ?, ?, ?)`,
    [authorId, audience, sessionId, title, body],
  );

  const [rows] = await pool.query("SELECT * FROM announcements WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

// Announcements posted by one author (teacher/guidance), newest first
async function getAnnouncementsByAuthor(authorId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.title AS session_title
     FROM announcements a
     LEFT JOIN sessions s ON a.session_id = s.id
     WHERE a.author_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [authorId],
  );
  return rows;
}

// Announcements for one specific session/classroom, newest first.
// Used by the classroom detail screen.
async function getAnnouncementsBySession(sessionId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.title AS session_title
     FROM announcements a
     LEFT JOIN sessions s ON a.session_id = s.id
     WHERE a.session_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [sessionId],
  );
  return rows;
}

// Recipients for a teacher announcement.
// If the session belongs to a class: every current member of that class.
// Otherwise (old sessions with no class): students who joined the session.
async function getSessionStudentIds(sessionId) {
  const [[session]] = await pool.query(
    "SELECT class_id FROM sessions WHERE id = ?",
    [sessionId],
  );

  if (session && session.class_id) {
    const [rows] = await pool.query(
      `SELECT DISTINCT cm.user_id AS id
       FROM class_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.class_id = ? AND cm.left_at IS NULL AND u.role = 'student'`,
      [session.class_id],
    );
    return rows.map((r) => r.id);
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

module.exports = {
  createAnnouncement,
  getAnnouncementsByAuthor,
  getAnnouncementsBySession,
  getSessionStudentIds,
  getAllStudentIds,
};
