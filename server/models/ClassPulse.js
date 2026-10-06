// server/models/ClassPulse.js
// Class Experience: an anonymous check-in that a student answers once BEFORE
// and once AFTER each class session. Six plain, non-clinical reactions.
const pool = require("../config/db");
const crypto = require("crypto");

// Stored values (tinyint). 1-3 keep their old numbers so old rows stay valid:
// the old "Difficult" (1) is now "Overwhelmed".
const MOOD = {
  OVERWHELMED: 1,
  OKAY: 2,
  GOOD: 3,
  GREAT: 4,
  TIRED: 5,
  CONFUSED: 6,
};

// Keys used in API responses, in display order.
const MOOD_KEYS = ["great", "good", "okay", "tired", "confused", "overwhelmed"];

const MOOD_TO_KEY = {
  [MOOD.GREAT]: "great",
  [MOOD.GOOD]: "good",
  [MOOD.OKAY]: "okay",
  [MOOD.TIRED]: "tired",
  [MOOD.CONFUSED]: "confused",
  [MOOD.OVERWHELMED]: "overwhelmed",
};

// Moods that count as "class felt hard" for the Guidance repeated-difficulty flag.
const DIFFICULT_MOODS = [MOOD.OVERWHELMED, MOOD.CONFUSED];

const PHASES = ["before", "after"];
// A breakdown stays hidden below this. Set CLASS_PULSE_MIN_RESPONSES=2 in .env for demos.
const MIN_RESPONSES = Number(process.env.CLASS_PULSE_MIN_RESPONSES) || 5;
const LOW_MOOD_STREAK = 3;

function moodKey(mood) {
  return MOOD_TO_KEY[mood] || null;
}

// One hash per (session, phase, student). It can't be reversed to a user id
// without the salt, and it is different for every session and phase.
function hashFor(sessionId, phase, userId) {
  const salt = process.env.CLASS_PULSE_SALT || "inclued-pulse-salt";
  return crypto
    .createHash("sha256")
    .update(`${salt}:exp:${Number(sessionId)}:${phase}:${Number(userId)}`)
    .digest("hex");
}

// All "is it time yet?" comparisons happen in SQL (NOW()) so they use the same
// clock and timezone as the scheduled_start / scheduled_end the teacher typed.
const TIMING_SELECT = `
  SELECT s.id, s.title, s.class_id, s.teacher_id, s.status, s.is_live,
         s.scheduled_start, s.scheduled_end, s.live_ended_at,
         (s.scheduled_start IS NOT NULL
            AND s.scheduled_start <= NOW()
            AND s.live_ended_at IS NULL
            AND ( (s.scheduled_end IS NOT NULL AND s.scheduled_end > NOW())
               OR (s.scheduled_end IS NULL
                   AND s.scheduled_start >= NOW() - INTERVAL 3 HOUR) )
         ) AS before_open,
         (s.scheduled_end IS NOT NULL
            AND s.scheduled_end <= NOW()
            AND s.scheduled_end >= NOW() - INTERVAL 24 HOUR
         ) AS clock_after_open,
         (s.live_ended_at IS NOT NULL
            AND s.live_ended_at >= NOW() - INTERVAL 24 HOUR
         ) AS live_after_open
  FROM sessions s
`;

async function getTiming(sessionId) {
  const [rows] = await pool.query(`${TIMING_SELECT} WHERE s.id = ?`, [
    sessionId,
  ]);
  return rows[0] || null;
}

// Recent sessions of a class that could have a check-in open.
async function getClassTimings(classId) {
  const [rows] = await pool.query(
    `${TIMING_SELECT}
     WHERE s.class_id = ?
       AND (s.scheduled_start IS NOT NULL OR s.live_ended_at IS NOT NULL)
     ORDER BY COALESCE(s.live_ended_at, s.scheduled_end, s.scheduled_start) DESC,
              s.id DESC
     LIMIT 15`,
    [classId],
  );
  return rows;
}

// Which of these sessions did this student join (tap Join Session)?
async function getParticipantSessionIds(sessionIds, userId) {
  if (sessionIds.length === 0) return new Set();
  const [rows] = await pool.query(
    "SELECT DISTINCT session_id FROM participants WHERE user_id = ? AND session_id IN (?)",
    [userId, sessionIds],
  );
  return new Set(rows.map((r) => r.session_id));
}

// Has this student already answered each phase of each session?
async function getAnsweredMap(sessionIds, userId) {
  const map = new Map(
    sessionIds.map((id) => [id, { before: false, after: false }]),
  );
  if (sessionIds.length === 0) return map;

  const lookup = new Map();
  sessionIds.forEach((id) =>
    PHASES.forEach((phase) =>
      lookup.set(hashFor(id, phase, userId), { id, phase }),
    ),
  );

  const [rows] = await pool.query(
    "SELECT user_id_hash FROM class_experience WHERE user_id_hash IN (?)",
    [[...lookup.keys()]],
  );
  rows.forEach((r) => {
    const hit = lookup.get(r.user_id_hash);
    if (hit) map.get(hit.id)[hit.phase] = true;
  });
  return map;
}

// Which check-in (if any) is due right now for this student and session?
//
// AFTER is due when:
//   - the student joined the live session and the teacher has ended it
//     (End Session), OR
//   - the scheduled end time has passed, unless the student is in the live
//     session and it is still live (they wait for End Session instead).
// BEFORE is due from the scheduled start until the class is over.
// Anyone who already answered a phase is never asked for it again.
function decidePhase(row, isParticipant, answered) {
  const live = Number(row.is_live) === 1;

  const afterOpen =
    (isParticipant && !live && !!Number(row.live_after_open)) ||
    (!!Number(row.clock_after_open) && (!isParticipant || !live));

  if (afterOpen) return answered.after ? null : "after";
  if (!!Number(row.before_open)) return answered.before ? null : "before";
  return null;
}

// Returns true if saved, false if this student already answered this phase.
async function recordExperience(sessionId, phase, userId, mood) {
  try {
    await pool.query(
      "INSERT INTO class_experience (session_id, phase, user_id_hash, mood) VALUES (?, ?, ?, ?)",
      [sessionId, phase, hashFor(sessionId, phase, userId), mood],
    );
    return true;
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return false;
    throw err;
  }
}

function emptyCounts() {
  const counts = {};
  MOOD_KEYS.forEach((k) => {
    counts[k] = 0;
  });
  return counts;
}

function sumCounts(counts) {
  return MOOD_KEYS.reduce((sum, k) => sum + counts[k], 0);
}

function toPhaseSummary(counts) {
  const responded = sumCounts(counts);
  const hidden = responded < MIN_RESPONSES;
  return { responded, hidden, counts: hidden ? null : { ...counts } };
}

// Aggregate-only summary for one session (both phases).
async function getSessionExperience(sessionId) {
  const [rows] = await pool.query(
    `SELECT phase, mood, COUNT(*) AS n
     FROM class_experience
     WHERE session_id = ?
     GROUP BY phase, mood`,
    [sessionId],
  );

  const raw = { before: emptyCounts(), after: emptyCounts() };
  rows.forEach((r) => {
    const key = moodKey(Number(r.mood));
    if (key && raw[r.phase]) raw[r.phase][key] = Number(r.n) || 0;
  });

  return {
    before: toPhaseSummary(raw.before),
    after: toPhaseSummary(raw.after),
  };
}

// Aggregate-only insights for a whole class.
// The overview pools ONLY sessions that individually reach the minimum, so a
// teacher can never subtract visible sessions from the total to recover a
// hidden one.
async function getClassExperience(classId) {
  const [sessions] = await pool.query(
    `SELECT id, title, scheduled_start
     FROM sessions
     WHERE class_id = ?
     ORDER BY COALESCE(scheduled_start, created_at) DESC, id DESC
     LIMIT 30`,
    [classId],
  );

  const [rows] = await pool.query(
    `SELECT e.session_id, e.phase, e.mood, COUNT(*) AS n
     FROM class_experience e
     JOIN sessions s ON s.id = e.session_id
     WHERE s.class_id = ?
     GROUP BY e.session_id, e.phase, e.mood`,
    [classId],
  );

  const raw = new Map();
  rows.forEach((r) => {
    if (!raw.has(r.session_id)) {
      raw.set(r.session_id, { before: emptyCounts(), after: emptyCounts() });
    }
    const key = moodKey(Number(r.mood));
    const bucket = raw.get(r.session_id)[r.phase];
    if (key && bucket) bucket[key] = Number(r.n) || 0;
  });

  const pooled = { before: emptyCounts(), after: emptyCounts() };
  const qualifying = { before: 0, after: 0 };
  const totals = { before: 0, after: 0 };

  const sessionRows = sessions.map((s) => {
    const r = raw.get(s.id) || { before: emptyCounts(), after: emptyCounts() };
    const summaries = {
      before: toPhaseSummary(r.before),
      after: toPhaseSummary(r.after),
    };

    PHASES.forEach((p) => {
      totals[p] += summaries[p].responded;
      if (!summaries[p].hidden) {
        qualifying[p] += 1;
        MOOD_KEYS.forEach((k) => {
          pooled[p][k] += summaries[p].counts[k];
        });
      }
    });

    return {
      id: s.id,
      title: s.title,
      scheduledStart: s.scheduled_start,
      before: summaries.before,
      after: summaries.after,
    };
  });

  const overviewFor = (p) =>
    qualifying[p] > 0
      ? {
          responded: sumCounts(pooled[p]),
          hidden: false,
          counts: pooled[p],
        }
      : { responded: totals[p], hidden: true, counts: null };

  return {
    minResponses: MIN_RESPONSES,
    overview: { before: overviewFor("before"), after: overviewFor("after") },
    sessions: sessionRows,
  };
}

// True when the student answered a "difficult" mood (Overwhelmed or Confused)
// after each of their last N finished sessions. (Kept so existing Guidance
// code that calls it still works.)
async function hasLowMoodStreak(userId) {
  const [sessions] = await pool.query(
    `SELECT s.id
     FROM sessions s
     JOIN class_members cm
       ON cm.class_id = s.class_id AND cm.user_id = ? AND cm.left_at IS NULL
     WHERE COALESCE(s.live_ended_at, s.scheduled_end) IS NOT NULL
       AND COALESCE(s.live_ended_at, s.scheduled_end) <= NOW()
     ORDER BY COALESCE(s.live_ended_at, s.scheduled_end) DESC, s.id DESC
     LIMIT ?`,
    [userId, LOW_MOOD_STREAK],
  );

  if (sessions.length < LOW_MOOD_STREAK) return false;

  const hashes = sessions.map((s) => hashFor(s.id, "after", userId));
  const [rows] = await pool.query(
    "SELECT mood FROM class_experience WHERE user_id_hash IN (?)",
    [hashes],
  );

  return (
    rows.length === LOW_MOOD_STREAK &&
    rows.every((r) => DIFFICULT_MOODS.includes(Number(r.mood)))
  );
}

module.exports = {
  MOOD,
  MOOD_KEYS,
  DIFFICULT_MOODS,
  PHASES,
  MIN_RESPONSES,
  getTiming,
  getClassTimings,
  getParticipantSessionIds,
  getAnsweredMap,
  decidePhase,
  recordExperience,
  getSessionExperience,
  getClassExperience,
  hasLowMoodStreak,
};
