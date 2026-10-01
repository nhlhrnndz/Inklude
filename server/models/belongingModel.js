// server/models/belongingModel.js
const pool = require("../config/db");
const { MOOD, hashUserId, hasLowMoodStreak } = require("./ClassPulse");
const { getNeedsHelpInfo } = require("./Checkin");

// Flip to true once Phase 2.3 Week 2 (peer caption sharing) is built.
const PEER_SHARING_ENABLED = false;

const WINDOW_DAYS = 30;
const RECENT_RUNS = 5;
const MIN_RUNS_FOR_QUIET_FLAG = 3;

// The student's most recent ended live runs (across every classroom they
// joined), with how many "I'm here" taps they made in each.
async function getRecentRuns(studentId) {
  const [rows] = await pool.query(
    `SELECT lr.id, lr.ended_at,
            (SELECT COUNT(*) FROM presence_taps t
              WHERE t.live_run_id = lr.id AND t.user_id = ?) AS taps
     FROM live_runs lr
     JOIN sessions s ON s.id = lr.session_id
     WHERE lr.ended_at IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM participants p
         WHERE p.session_id = s.id AND p.user_id = ?
       )
     ORDER BY lr.ended_at DESC, lr.id DESC
     LIMIT ?`,
    [studentId, studentId, RECENT_RUNS],
  );
  return rows;
}

// Summary counts only — never a per-session breakdown, because the
// class pulse is promised to students as anonymous.
async function getPulseCounts(studentId, runIds) {
  const counts = { answered: 0, sad: 0, okay: 0, happy: 0 };
  if (runIds.length === 0) return counts;

  const hashes = runIds.map((id) => hashUserId(id, studentId));
  const [rows] = await pool.query(
    "SELECT mood FROM class_pulse WHERE user_id_hash IN (?)",
    [hashes],
  );

  rows.forEach((r) => {
    counts.answered += 1;
    if (r.mood === MOOD.SAD) counts.sad += 1;
    else if (r.mood === MOOD.OKAY) counts.okay += 1;
    else if (r.mood === MOOD.HAPPY) counts.happy += 1;
  });

  return counts;
}

async function getPeerShareCounts(studentId) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(from_user_id = ?), 0) AS sent,
            COALESCE(SUM(to_user_id = ?), 0) AS received
     FROM peer_shares
     WHERE (from_user_id = ? OR to_user_id = ?)
       AND created_at >= (NOW() - INTERVAL ? DAY)`,
    [studentId, studentId, studentId, studentId, WINDOW_DAYS],
  );
  return {
    sent: Number(rows[0].sent) || 0,
    received: Number(rows[0].received) || 0,
  };
}

async function getCheckinCounts(studentId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS received,
            COALESCE(SUM(student_reply IS NOT NULL), 0) AS replied,
            MAX(sent_at) AS latest
     FROM checkins
     WHERE student_id = ?
       AND sent_at >= (NOW() - INTERVAL ? DAY)`,
    [studentId, WINDOW_DAYS],
  );
  return {
    received: Number(rows[0].received) || 0,
    replied: Number(rows[0].replied) || 0,
    latestAt: rows[0].latest || null,
  };
}

// Strong signals flag a student on their own. Weak signals need to
// stack up (2+) before a student is flagged.
function evaluateFlags({
  needsHelp,
  lowMoodStreak,
  runsAttended,
  tapRuns,
  pulse,
  checkins,
  peer,
}) {
  const strong = [];
  const weak = [];

  if (needsHelp) {
    strong.push({
      key: "needs_help",
      label: "Replied “I need help” to a teacher check-in",
    });
  }

  if (lowMoodStreak) {
    strong.push({
      key: "low_mood_streak",
      label: "Marked 😞 in their last 3 sessions in a row",
    });
  }

  if (runsAttended >= MIN_RUNS_FOR_QUIET_FLAG && tapRuns === 0) {
    weak.push({
      key: "quiet",
      label: `No “I'm here” taps in their last ${runsAttended} sessions`,
    });
  }

  if (pulse.answered >= 2 && pulse.sad >= 2 && pulse.sad > pulse.happy) {
    weak.push({
      key: "low_mood_trend",
      label: "Mood has been mostly 😞 in recent sessions",
    });
  }

  if (runsAttended >= MIN_RUNS_FOR_QUIET_FLAG && checkins.received === 0) {
    weak.push({
      key: "no_checkins",
      label: `No teacher check-ins in the last ${WINDOW_DAYS} days`,
    });
  }

  if (PEER_SHARING_ENABLED && peer.sent + peer.received === 0) {
    weak.push({
      key: "no_peer_shares",
      label: `No peer shares in the last ${WINDOW_DAYS} days`,
    });
  }

  const flagged = strong.length > 0 || weak.length >= 2;
  const level = strong.length > 0 ? "high" : weak.length >= 2 ? "watch" : "ok";

  return {
    flagged,
    level,
    reasons: flagged ? [...strong, ...weak] : [],
  };
}

async function buildBelongingSnapshot(studentId) {
  const runs = await getRecentRuns(studentId);
  const runIds = runs.map((r) => r.id);

  const [pulse, peer, checkins, needsHelpInfo, lowMoodStreak] =
    await Promise.all([
      getPulseCounts(studentId, runIds),
      getPeerShareCounts(studentId),
      getCheckinCounts(studentId),
      getNeedsHelpInfo(studentId),
      hasLowMoodStreak(studentId),
    ]);

  const tapRuns = runs.filter((r) => Number(r.taps) > 0).length;
  const totalTaps = runs.reduce((sum, r) => sum + (Number(r.taps) || 0), 0);

  const flag = evaluateFlags({
    needsHelp: needsHelpInfo.active,
    lowMoodStreak,
    runsAttended: runs.length,
    tapRuns,
    pulse,
    checkins,
    peer,
  });

  return {
    studentId: Number(studentId),
    windowDays: WINDOW_DAYS,
    recentSessions: {
      attended: runs.length,
      withPresenceTap: tapRuns,
      totalTaps,
    },
    pulse,
    peerShares: {
      enabled: PEER_SHARING_ENABLED,
      sent: peer.sent,
      received: peer.received,
    },
    checkins,
    flag,
  };
}

// ---------- Outreach log ----------

async function logOutreach({
  studentId,
  guidanceId,
  threadId,
  messageId,
  mode,
  templateKey,
}) {
  const [result] = await pool.query(
    `INSERT INTO guidance_outreach
       (student_id, guidance_id, thread_id, message_id, mode, template_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [studentId, guidanceId, threadId, messageId, mode, templateKey || null],
  );
  return result.insertId;
}

async function getOutreachHistory(studentId, limit = 5) {
  const [rows] = await pool.query(
    `SELECT o.id, o.mode, o.template_key, o.created_at,
            u.name AS guidance_name, m.body
     FROM guidance_outreach o
     JOIN users u ON u.id = o.guidance_id
     LEFT JOIN messages m ON m.id = o.message_id
     WHERE o.student_id = ?
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT ?`,
    [studentId, limit],
  );
  return rows;
}

module.exports = {
  PEER_SHARING_ENABLED,
  buildBelongingSnapshot,
  logOutreach,
  getOutreachHistory,
};
