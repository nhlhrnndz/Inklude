// server/models/PresenceTap.js
const pool = require("../config/db");

// Persist an "I'm here" tap against the classroom's CURRENT live run, so
// quiet-student detection resets each time the teacher goes live again
// instead of remembering taps forever.
async function recordTap(sessionId, userId) {
  const [[session]] = await pool.query(
    "SELECT current_live_run_id FROM sessions WHERE id = ?",
    [sessionId],
  );
  const liveRunId = session?.current_live_run_id;
  if (!liveRunId) return;

  await pool.query(
    "INSERT INTO presence_taps (session_id, live_run_id, user_id) VALUES (?, ?, ?)",
    [sessionId, liveRunId, userId],
  );
}

// Students who joined the classroom but never tapped "I'm here" during
// THIS specific live run.
async function getQuietStudentsForLiveRun(sessionId, liveRunId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM participants p
     JOIN users u ON u.id = p.user_id
     WHERE p.session_id = ?
       AND u.role = 'student'
       AND NOT EXISTS (
         SELECT 1 FROM presence_taps t
         WHERE t.live_run_id = ? AND t.user_id = p.user_id
       )
     ORDER BY u.name ASC`,
    [sessionId, liveRunId],
  );
  return rows;
}

// How many of this teacher's most recent ended live runs (up to and
// including `uptoLiveRunId`), across any of the teacher's classrooms,
// the student was quiet in, in a row.
async function getQuietStreak(teacherId, studentId, uptoLiveRunId) {
  const [rows] = await pool.query(
    `SELECT lr.id,
            (SELECT COUNT(*) FROM presence_taps t
             WHERE t.live_run_id = lr.id AND t.user_id = ?) AS taps
     FROM live_runs lr
     JOIN sessions s ON s.id = lr.session_id
     JOIN participants p ON p.session_id = s.id AND p.user_id = ?
     WHERE s.teacher_id = ? AND lr.ended_at IS NOT NULL AND lr.id <= ?
     ORDER BY lr.id DESC
     LIMIT 10`,
    [studentId, studentId, teacherId, uptoLiveRunId],
  );

  let streak = 0;
  for (const row of rows) {
    if (Number(row.taps) === 0) streak += 1;
    else break;
  }
  return streak;
}

async function getParticipantCount(sessionId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM participants WHERE session_id = ?",
    [sessionId],
  );
  return Number(rows[0].total) || 0;
}

module.exports = {
  recordTap,
  getQuietStudentsForLiveRun,
  getQuietStreak,
  getParticipantCount,
};
