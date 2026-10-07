// server/models/followupModel.js
const pool = require("../config/db");

const SELECT_BASE = `
  SELECT f.id, f.student_id, f.reason, f.note, f.status, f.created_at,
         f.completed_at, f.completion_note,
         su.name AS student_name,
         cu.name AS created_by_name,
         du.name AS completed_by_name
  FROM guidance_followups f
  JOIN users su ON su.id = f.student_id
  LEFT JOIN users cu ON cu.id = f.created_by
  LEFT JOIN users du ON du.id = f.completed_by
`;

function toDto(f) {
  return {
    id: f.id,
    studentId: f.student_id,
    studentName: f.student_name,
    reason: f.reason,
    note: f.note || "",
    status: f.status,
    createdAt: f.created_at,
    createdByName: f.created_by_name || null,
    completedAt: f.completed_at || null,
    completedByName: f.completed_by_name || null,
    completionNote: f.completion_note || "",
  };
}

async function getFollowupById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE f.id = ?`, [id]);
  return rows[0] || null;
}

async function createFollowup({ studentId, createdBy, reason, note }) {
  const [result] = await pool.query(
    `INSERT INTO guidance_followups (student_id, created_by, reason, note)
     VALUES (?, ?, ?, ?)`,
    [studentId, createdBy, reason, note || null],
  );
  return getFollowupById(result.insertId);
}

async function hasActiveFollowup(studentId, reason) {
  const [rows] = await pool.query(
    `SELECT id FROM guidance_followups
     WHERE student_id = ? AND reason = ? AND status = 'active'
     LIMIT 1`,
    [studentId, reason],
  );
  return rows.length > 0;
}

// Active first, then history (newest first). Nothing is ever deleted.
async function getFollowupsForStudent(studentId) {
  const [rows] = await pool.query(
    `${SELECT_BASE}
     WHERE f.student_id = ?
     ORDER BY (f.status = 'active') DESC, f.created_at DESC`,
    [studentId],
  );
  return rows;
}

// Oldest first, so follow-ups that have been waiting longest stay on top.
async function getActiveFollowups(limit = 5) {
  const [rows] = await pool.query(
    `${SELECT_BASE}
     WHERE f.status = 'active'
     ORDER BY f.created_at ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function countActiveFollowups() {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM guidance_followups WHERE status = 'active'",
  );
  return Number(rows[0].count);
}

// Returns true only if it was active and is now completed.
async function completeFollowup(id, userId, note) {
  const [result] = await pool.query(
    `UPDATE guidance_followups
     SET status = 'completed',
         completed_by = ?,
         completed_at = NOW(),
         completion_note = ?
     WHERE id = ? AND status = 'active'`,
    [userId, note || null, id],
  );
  return result.affectedRows > 0;
}

// Closes every ACTIVE follow-up of one student with the given reason.
// Used when a teacher referral is completed. Rows are kept as history.
// Returns how many follow-ups were closed.
async function completeActiveFollowupsByReason(
  studentId,
  reason,
  userId,
  note,
) {
  const [result] = await pool.query(
    `UPDATE guidance_followups
     SET status = 'completed',
         completed_by = ?,
         completed_at = NOW(),
         completion_note = ?
     WHERE student_id = ? AND reason = ? AND status = 'active'`,
    [userId, note || null, studentId, reason],
  );
  return result.affectedRows;
}

module.exports = {
  toDto,
  getFollowupById,
  createFollowup,
  hasActiveFollowup,
  getFollowupsForStudent,
  getActiveFollowups,
  countActiveFollowups,
  completeFollowup,
  completeActiveFollowupsByReason,
};
