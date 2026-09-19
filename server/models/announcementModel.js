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

// Recipients for a teacher announcement: every student who has joined this session.
// If you later rework sessions into Google Classroom-style enrollment,
// this is the ONLY function that needs to change.
async function getSessionStudentIds(sessionId) {
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
  getSessionStudentIds,
  getAllStudentIds,
};
