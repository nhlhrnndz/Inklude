// server/models/Checkin.js
const pool = require("../config/db");

const NEEDS_HELP_REPLY = "I need help";
const NEEDS_HELP_WINDOW_DAYS = 14;

async function createCheckin(
  teacherId,
  studentId,
  sessionId,
  liveRunId,
  message,
) {
  const [result] = await pool.query(
    `INSERT INTO checkins (teacher_id, student_id, session_id, live_run_id, message)
     VALUES (?, ?, ?, ?, ?)`,
    [teacherId, studentId, sessionId || null, liveRunId || null, message],
  );
  const [rows] = await pool.query("SELECT * FROM checkins WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function getCheckinById(id) {
  const [rows] = await pool.query("SELECT * FROM checkins WHERE id = ?", [id]);
  return rows[0] || null;
}

async function getSentByTeacher(teacherId) {
  const [rows] = await pool.query(
    `SELECT c.*, u.name AS student_name
     FROM checkins c
     JOIN users u ON u.id = c.student_id
     WHERE c.teacher_id = ?
     ORDER BY c.sent_at DESC`,
    [teacherId],
  );
  return rows;
}

async function getReceivedByStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT c.*, u.name AS teacher_name
     FROM checkins c
     JOIN users u ON u.id = c.teacher_id
     WHERE c.student_id = ?
     ORDER BY c.sent_at DESC`,
    [studentId],
  );
  return rows;
}

async function replyToCheckin(id, reply) {
  await pool.query(
    "UPDATE checkins SET student_reply = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?",
    [reply, id],
  );
  return getCheckinById(id);
}

// Which students this teacher already checked in on for THIS live run.
async function getCheckedInStudentIds(teacherId, liveRunId) {
  const [rows] = await pool.query(
    "SELECT DISTINCT student_id FROM checkins WHERE teacher_id = ? AND live_run_id = ?",
    [teacherId, liveRunId],
  );
  return new Set(rows.map((r) => r.student_id));
}

async function wasParticipant(sessionId, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM participants WHERE session_id = ? AND user_id = ? LIMIT 1",
    [sessionId, userId],
  );
  return rows.length > 0;
}

async function getGuidanceUserIds() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role = 'guidance'",
  );
  return rows.map((r) => r.id);
}

async function getUserName(userId) {
  const [rows] = await pool.query("SELECT name FROM users WHERE id = ?", [
    userId,
  ]);
  return rows[0]?.name || "Someone";
}

async function getNeedsHelpInfo(studentId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count, MAX(replied_at) AS latest
     FROM checkins
     WHERE student_id = ?
       AND student_reply = ?
       AND replied_at >= (NOW() - INTERVAL ? DAY)`,
    [studentId, NEEDS_HELP_REPLY, NEEDS_HELP_WINDOW_DAYS],
  );
  const count = Number(rows[0].count) || 0;
  return { active: count > 0, count, latestAt: rows[0].latest || null };
}

async function getNeedsHelpStudentIds() {
  const [rows] = await pool.query(
    `SELECT DISTINCT student_id
     FROM checkins
     WHERE student_reply = ?
       AND replied_at >= (NOW() - INTERVAL ? DAY)`,
    [NEEDS_HELP_REPLY, NEEDS_HELP_WINDOW_DAYS],
  );
  return new Set(rows.map((r) => r.student_id));
}

module.exports = {
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
  getNeedsHelpInfo,
  getNeedsHelpStudentIds,
};
