// server/models/belongingOverviewModel.js
const pool = require("../config/db");
const {
  PEER_SHARING_ENABLED,
  buildBelongingSnapshot,
} = require("./belongingModel");

const TREND_WEEKS = 8;
const MIN_PULSE_RESPONSES = 3;
const SNAPSHOT_BATCH = 8;
const MAX_LISTED = 10;
const INTERACTION_WINDOW_DAYS = 30;

function weekLabel(weeksAgo) {
  return weeksAgo === 0 ? "Now" : `${weeksAgo}w`;
}

function toWeekMap(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const w = Number(r.w);
    if (w >= 0 && w < TREND_WEEKS) map.set(w, r);
  });
  return map;
}

async function getTrend() {
  const days = TREND_WEEKS * 7;

  const [checkinRows] = await pool.query(
    `SELECT FLOOR(DATEDIFF(NOW(), sent_at) / 7) AS w, COUNT(*) AS n
     FROM checkins
     WHERE sent_at >= (NOW() - INTERVAL ? DAY)
     GROUP BY w`,
    [days],
  );

  // A tap counts toward the week its live run ended (or "now" if the
  // run is still going).
  const [tapRows] = await pool.query(
    `SELECT FLOOR(DATEDIFF(NOW(), COALESCE(lr.ended_at, NOW())) / 7) AS w,
            COUNT(*) AS n
     FROM presence_taps t
     JOIN live_runs lr ON lr.id = t.live_run_id
     WHERE COALESCE(lr.ended_at, NOW()) >= (NOW() - INTERVAL ? DAY)
     GROUP BY w`,
    [days],
  );

  const [pulseRows] = await pool.query(
    `SELECT FLOOR(DATEDIFF(NOW(), lr.ended_at) / 7) AS w,
            COUNT(*) AS n,
            AVG(cp.mood) AS avg_mood
     FROM class_pulse cp
     JOIN live_runs lr ON lr.id = cp.live_run_id
     WHERE lr.ended_at IS NOT NULL
       AND lr.ended_at >= (NOW() - INTERVAL ? DAY)
     GROUP BY w`,
    [days],
  );

  let peerRows = [];
  if (PEER_SHARING_ENABLED) {
    try {
      [peerRows] = await pool.query(
        `SELECT FLOOR(DATEDIFF(NOW(), created_at) / 7) AS w, COUNT(*) AS n
         FROM peer_shares
         WHERE created_at >= (NOW() - INTERVAL ? DAY)
         GROUP BY w`,
        [days],
      );
    } catch (err) {
      console.error("peer share trend query failed:", err.message);
    }
  }

  const checkinMap = toWeekMap(checkinRows);
  const tapMap = toWeekMap(tapRows);
  const pulseMap = toWeekMap(pulseRows);
  const peerMap = toWeekMap(peerRows);

  const trend = [];
  for (let weeksAgo = TREND_WEEKS - 1; weeksAgo >= 0; weeksAgo -= 1) {
    const pulse = pulseMap.get(weeksAgo);
    const pulseCount = pulse ? Number(pulse.n) || 0 : 0;

    trend.push({
      weeksAgo,
      label: weekLabel(weeksAgo),
      checkins: Number(checkinMap.get(weeksAgo)?.n) || 0,
      taps: Number(tapMap.get(weeksAgo)?.n) || 0,
      peerShares: Number(peerMap.get(weeksAgo)?.n) || 0,
      // Same anonymity rule as everywhere else: too few answers = hidden
      pulseAvg:
        pulse && pulseCount >= MIN_PULSE_RESPONSES
          ? Math.round(Number(pulse.avg_mood) * 10) / 10
          : null,
    });
  }

  return trend;
}

async function getThisWeek() {
  const [[checkins]] = await pool.query(
    `SELECT COUNT(*) AS sent,
            COALESCE(SUM(student_reply IS NOT NULL), 0) AS replied
     FROM checkins
     WHERE sent_at >= (NOW() - INTERVAL 7 DAY)`,
  );

  const [moodRows] = await pool.query(
    `SELECT cp.mood, COUNT(*) AS n
     FROM class_pulse cp
     JOIN live_runs lr ON lr.id = cp.live_run_id
     WHERE lr.ended_at IS NOT NULL
       AND lr.ended_at >= (NOW() - INTERVAL 7 DAY)
     GROUP BY cp.mood`,
  );

  const counts = { sad: 0, okay: 0, happy: 0 };
  moodRows.forEach((r) => {
    const n = Number(r.n) || 0;
    if (r.mood === 1) counts.sad = n;
    else if (r.mood === 2) counts.okay = n;
    else if (r.mood === 3) counts.happy = n;
  });

  const responded = counts.sad + counts.okay + counts.happy;
  const hidden = responded < MIN_PULSE_RESPONSES;
  const average = hidden
    ? null
    : Math.round(
        ((counts.sad * 1 + counts.okay * 2 + counts.happy * 3) / responded) *
          10,
      ) / 10;

  let peerShares = 0;
  if (PEER_SHARING_ENABLED) {
    try {
      const [[peer]] = await pool.query(
        `SELECT COUNT(*) AS n FROM peer_shares
         WHERE created_at >= (NOW() - INTERVAL 7 DAY)`,
      );
      peerShares = Number(peer.n) || 0;
    } catch (err) {
      console.error("peer share weekly query failed:", err.message);
    }
  }

  return {
    checkinsSent: Number(checkins.sent) || 0,
    checkinsReplied: Number(checkins.replied) || 0,
    peerShares,
    pulse: {
      responded,
      hidden,
      average,
      counts: hidden ? null : counts,
    },
  };
}

// Students who joined at least one classroom but had no "I'm here" tap,
// no teacher check-in (and no peer share, if that's enabled) recently.
async function countZeroInteractionStudents() {
  const peerClause = PEER_SHARING_ENABLED
    ? `AND NOT EXISTS (
         SELECT 1 FROM peer_shares ps
         WHERE (ps.from_user_id = u.id OR ps.to_user_id = u.id)
           AND ps.created_at >= (NOW() - INTERVAL ? DAY)
       )`
    : "";

  const params = [INTERACTION_WINDOW_DAYS, INTERACTION_WINDOW_DAYS];
  if (PEER_SHARING_ENABLED) params.push(INTERACTION_WINDOW_DAYS);

  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users u
     WHERE u.role = 'student'
       AND EXISTS (SELECT 1 FROM participants p WHERE p.user_id = u.id)
       AND NOT EXISTS (
         SELECT 1 FROM presence_taps t
         JOIN live_runs lr ON lr.id = t.live_run_id
         WHERE t.user_id = u.id
           AND COALESCE(lr.ended_at, NOW()) >= (NOW() - INTERVAL ? DAY)
       )
       AND NOT EXISTS (
         SELECT 1 FROM checkins c
         WHERE c.student_id = u.id
           AND c.sent_at >= (NOW() - INTERVAL ? DAY)
       )
       ${peerClause}`,
    params,
  );

  return Number(row.total) || 0;
}

async function getFlaggedStudents() {
  const [students] = await pool.query(
    `SELECT u.id, u.name, bi.course, bi.year_level
     FROM users u
     LEFT JOIN student_basic_info bi ON bi.user_id = u.id
     WHERE u.role = 'student'
     ORDER BY u.name ASC`,
  );

  const results = [];

  for (let i = 0; i < students.length; i += SNAPSHOT_BATCH) {
    const batch = students.slice(i, i + SNAPSHOT_BATCH);

    const snapshots = await Promise.all(
      batch.map(async (student) => {
        try {
          const snapshot = await buildBelongingSnapshot(student.id);
          return { student, flag: snapshot.flag };
        } catch (err) {
          console.error(
            `belonging snapshot failed for student ${student.id}:`,
            err.message,
          );
          return {
            student,
            flag: { flagged: false, level: "ok", reasons: [] },
          };
        }
      }),
    );

    results.push(...snapshots);
  }

  return results;
}

async function getCohortOverview() {
  const [trend, thisWeek, zeroInteraction, snapshots] = await Promise.all([
    getTrend(),
    getThisWeek(),
    countZeroInteractionStudents(),
    getFlaggedStudents(),
  ]);

  const flagged = snapshots.filter((s) => s.flag.flagged);
  const high = flagged.filter((s) => s.flag.level === "high").length;
  const watch = flagged.length - high;

  const listed = flagged
    .sort((a, b) => {
      if (a.flag.level !== b.flag.level) {
        return a.flag.level === "high" ? -1 : 1;
      }
      return a.student.name.localeCompare(b.student.name);
    })
    .slice(0, MAX_LISTED)
    .map((s) => ({
      id: s.student.id,
      name: s.student.name,
      course: s.student.course ?? null,
      yearLevel: s.student.year_level ?? null,
      level: s.flag.level,
      reasonCount: s.flag.reasons.length,
      topReason: s.flag.reasons[0]?.label ?? null,
    }));

  return {
    generatedAt: new Date().toISOString(),
    peerSharingEnabled: PEER_SHARING_ENABLED,
    interactionWindowDays: INTERACTION_WINDOW_DAYS,
    totals: {
      students: snapshots.length,
      flagged: flagged.length,
      high,
      watch,
      zeroInteraction,
    },
    thisWeek,
    trend,
    flaggedStudents: listed,
  };
}

module.exports = { getCohortOverview };
