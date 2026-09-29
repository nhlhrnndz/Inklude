const pool = require("../config/db");

// A break flag that was never cleared expires on its own after an hour,
// so nobody stays "on a break" in the teacher's roster the next day.
const BREAK_EXPIRY_MINUTES = 60;

async function setBreak(sessionId, userId, onBreak) {
  await pool.query(
    `INSERT INTO session_breaks (session_id, user_id, on_break)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       on_break = VALUES(on_break),
       updated_at = CURRENT_TIMESTAMP`,
    [sessionId, userId, onBreak ? 1 : 0],
  );
}

async function isOnBreak(sessionId, userId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM session_breaks
     WHERE session_id = ? AND user_id = ? AND on_break = 1
       AND updated_at > DATE_SUB(NOW(), INTERVAL ${BREAK_EXPIRY_MINUTES} MINUTE)`,
    [sessionId, userId],
  );
  return rows.length > 0;
}

async function getOnBreakUserIds(sessionId) {
  const [rows] = await pool.query(
    `SELECT user_id FROM session_breaks
     WHERE session_id = ? AND on_break = 1
       AND updated_at > DATE_SUB(NOW(), INTERVAL ${BREAK_EXPIRY_MINUTES} MINUTE)`,
    [sessionId],
  );
  return rows.map((r) => r.user_id);
}

module.exports = { setBreak, isOnBreak, getOnBreakUserIds };
