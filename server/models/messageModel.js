const pool = require("../config/db");

// Find (or create) the single thread for a student. Each student has
// exactly one thread that's reused across all their conversations
// with guidance — a resolved thread simply reopens if they message again.
async function getOrCreateThreadForStudent(studentId, category, urgent) {
  const [existing] = await pool.query(
    "SELECT * FROM message_threads WHERE student_id = ? LIMIT 1",
    [studentId],
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const [result] = await pool.query(
    `INSERT INTO message_threads (student_id, category, urgent, status)
     VALUES (?, ?, ?, 'open')`,
    [studentId, category || "help", urgent ? 1 : 0],
  );

  const [rows] = await pool.query(
    "SELECT * FROM message_threads WHERE id = ?",
    [result.insertId],
  );

  return rows[0];
}

async function getThreadByStudentId(studentId) {
  const [rows] = await pool.query(
    "SELECT * FROM message_threads WHERE student_id = ? LIMIT 1",
    [studentId],
  );
  return rows[0] || null;
}

async function getThreadById(threadId) {
  const [rows] = await pool.query(
    `SELECT mt.*, u.name AS student_name, u.email AS student_email
     FROM message_threads mt
     JOIN users u ON u.id = mt.student_id
     WHERE mt.id = ?`,
    [threadId],
  );
  return rows[0] || null;
}

// Only updates fields that are actually passed in.
async function updateThreadMeta(threadId, { category, urgent, status } = {}) {
  const fields = [];
  const params = [];

  if (category) {
    fields.push("category = ?");
    params.push(category);
  }
  if (typeof urgent === "boolean") {
    fields.push("urgent = ?");
    params.push(urgent ? 1 : 0);
  }
  if (status) {
    fields.push("status = ?");
    params.push(status);
  }

  if (fields.length === 0) return;

  params.push(threadId);
  await pool.query(
    `UPDATE message_threads SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );
}

async function addMessage(threadId, senderId, senderRole, body) {
  const [result] = await pool.query(
    `INSERT INTO messages (thread_id, sender_id, sender_role, body)
     VALUES (?, ?, ?, ?)`,
    [threadId, senderId, senderRole, body],
  );

  // Bumps the thread so guidance's inbox sorts by latest activity
  await pool.query(
    "UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [threadId],
  );

  const [rows] = await pool.query("SELECT * FROM messages WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function getMessagesForThread(threadId) {
  const [rows] = await pool.query(
    `SELECT m.*, u.name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.thread_id = ?
     ORDER BY m.created_at ASC`,
    [threadId],
  );
  return rows;
}

// Marks every message NOT sent by readerRole as read — so a student
// reading marks guidance's replies read, and vice versa.
async function markMessagesRead(threadId, readerRole) {
  await pool.query(
    `UPDATE messages
     SET read_at = CURRENT_TIMESTAMP
     WHERE thread_id = ? AND sender_role != ? AND read_at IS NULL`,
    [threadId, readerRole],
  );
}

// Guidance inbox: one row per thread with the student's info, latest
// message preview, and how many of the student's messages are unread.
async function getGuidanceThreads({ category, urgent, status, search } = {}) {
  let query = `
    SELECT
      mt.id, mt.student_id, mt.category, mt.urgent, mt.status,
      mt.created_at, mt.updated_at,
      u.name AS student_name, u.email AS student_email,
      (SELECT body FROM messages
        WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages
        WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM messages
        WHERE thread_id = mt.id AND sender_role = 'student' AND read_at IS NULL) AS unread_count
    FROM message_threads mt
    JOIN users u ON u.id = mt.student_id
    WHERE 1 = 1
  `;
  const params = [];

  if (category) {
    query += " AND mt.category = ?";
    params.push(category);
  }
  if (typeof urgent === "boolean") {
    query += " AND mt.urgent = ?";
    params.push(urgent ? 1 : 0);
  }
  if (status) {
    query += " AND mt.status = ?";
    params.push(status);
  }
  if (search) {
    query += " AND (u.name LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY mt.urgent DESC, last_message_at DESC";

  const [rows] = await pool.query(query, params);
  return rows;
}

// All guidance/admin user ids, used to fan out a notification whenever
// a student sends a message.
async function getGuidanceUserIds() {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE role IN ('guidance', 'admin')",
  );
  return rows.map((r) => r.id);
}

module.exports = {
  getOrCreateThreadForStudent,
  getThreadByStudentId,
  getThreadById,
  updateThreadMeta,
  addMessage,
  getMessagesForThread,
  markMessagesRead,
  getGuidanceThreads,
  getGuidanceUserIds,
};
