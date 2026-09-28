const pool = require("../config/db");

async function createCheckin(teacherId, studentId, sessionId, message) {
  const [result] = await pool.query(
    `INSERT INTO checkins (teacher_id, student_id, session_id, message)
     VALUES (?, ?, ?, ?)`,
    [teacherId, studentId, sessionId || null, message],
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

module.exports = {
  createCheckin,
  getCheckinById,
  getSentByTeacher,
  getReceivedByStudent,
  replyToCheckin,
};
