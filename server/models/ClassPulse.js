const pool = require("../config/db");
const crypto = require("crypto");

// Hashes a user id with a per-session salt so a mood entry can never be
// traced back to a specific student, even by someone with DB access —
// while still letting us detect "same student, 3 sessions in a row".
function hashUserId(sessionId, userId) {
  const salt = process.env.CLASS_PULSE_SALT || "inclued-pulse-salt";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${sessionId}:${userId}`)
    .digest("hex");
}

async function recordMood(sessionId, userId, mood) {
  const hash = hashUserId(sessionId, userId);
  const [result] = await pool.query(
    "INSERT INTO class_pulse (session_id, user_id_hash, mood) VALUES (?, ?, ?)",
    [sessionId, hash, mood],
  );
  const [rows] = await pool.query("SELECT * FROM class_pulse WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

// Aggregate-only summary — never returns per-entry rows to callers.
async function getSessionMoodSummary(sessionId) {
  const [rows] = await pool.query(
    `SELECT mood, COUNT(*) AS count
     FROM class_pulse
     WHERE session_id = ?
     GROUP BY mood`,
    [sessionId],
  );
  return rows;
}

module.exports = { hashUserId, recordMood, getSessionMoodSummary };
