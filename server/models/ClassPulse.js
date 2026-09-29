// server/models/ClassPulse.js
const pool = require("../config/db");
const crypto = require("crypto");

// 1 = 😞, 2 = 😐, 3 = 😀
const MOOD = { SAD: 1, OKAY: 2, HAPPY: 3 };
const MIN_RESPONSES_FOR_BREAKDOWN = 3;
const LOW_MOOD_STREAK = 3;

// Hashes a user id with a per-LIVE-RUN salt (not per classroom), so a
// mood entry can't be traced to a student, and so answering once doesn't
// lock the student out of ever answering again for that classroom — each
// time the teacher goes live and ends again, it's a fresh run.
function hashUserId(liveRunId, userId) {
  const salt = process.env.CLASS_PULSE_SALT || "inclued-pulse-salt";
  return crypto
    .createHash("sha256")
    .update(`${salt}:run:${liveRunId}:${userId}`)
    .digest("hex");
}

// Returns the saved row, or null if this student already answered THIS run.
async function recordMood(sessionId, liveRunId, userId, mood) {
  const hash = hashUserId(liveRunId, userId);
  try {
    const [result] = await pool.query(
      "INSERT INTO class_pulse (session_id, live_run_id, user_id_hash, mood) VALUES (?, ?, ?, ?)",
      [sessionId, liveRunId, hash, mood],
    );
    const [rows] = await pool.query("SELECT * FROM class_pulse WHERE id = ?", [
      result.insertId,
    ]);
    return rows[0];
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return null;
    throw err;
  }
}

// Only tells a student whether THEY answered this run — never what.
async function hasSubmitted(liveRunId, userId) {
  const hash = hashUserId(liveRunId, userId);
  const [rows] = await pool.query(
    "SELECT id FROM class_pulse WHERE live_run_id = ? AND user_id_hash = ? LIMIT 1",
    [liveRunId, hash],
  );
  return rows.length > 0;
}

// Aggregate-only summary for one live run.
async function getLiveRunMoodSummary(liveRunId) {
  const [rows] = await pool.query(
    `SELECT mood, COUNT(*) AS count
     FROM class_pulse
     WHERE live_run_id = ?
     GROUP BY mood`,
    [liveRunId],
  );

  const counts = { sad: 0, okay: 0, happy: 0 };
  rows.forEach((r) => {
    const n = Number(r.count) || 0;
    if (r.mood === MOOD.SAD) counts.sad = n;
    else if (r.mood === MOOD.OKAY) counts.okay = n;
    else if (r.mood === MOOD.HAPPY) counts.happy = n;
  });

  const responded = counts.sad + counts.okay + counts.happy;
  const hidden = responded < MIN_RESPONSES_FOR_BREAKDOWN;

  return { responded, hidden, counts: hidden ? null : counts };
}

// True when the student answered 😞 in each of their last N ended live
// runs, across any classroom they were part of.
async function hasLowMoodStreak(userId) {
  const [runs] = await pool.query(
    `SELECT lr.id
     FROM live_runs lr
     JOIN sessions s ON s.id = lr.session_id
     JOIN participants p ON p.session_id = s.id AND p.user_id = ?
     WHERE lr.ended_at IS NOT NULL
     ORDER BY lr.ended_at DESC, lr.id DESC
     LIMIT ?`,
    [userId, LOW_MOOD_STREAK],
  );

  if (runs.length < LOW_MOOD_STREAK) return false;

  const hashes = runs.map((r) => hashUserId(r.id, userId));
  const [rows] = await pool.query(
    "SELECT mood FROM class_pulse WHERE user_id_hash IN (?)",
    [hashes],
  );

  return (
    rows.length === LOW_MOOD_STREAK && rows.every((r) => r.mood === MOOD.SAD)
  );
}

module.exports = {
  MOOD,
  hashUserId,
  recordMood,
  hasSubmitted,
  getLiveRunMoodSummary,
  hasLowMoodStreak,
};
