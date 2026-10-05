// server/models/needsHelpModel.js
const pool = require("../config/db");
const { NEEDS_HELP_REPLY } = require("./Checkin");

// Keep in sync with NEEDS_HELP_WINDOW_DAYS in Checkin.js
const NEEDS_HELP_WINDOW_DAYS = 14;

// Students who replied "I need help" to a teacher check-in recently,
// newest first. Yes/no information only: it never returns the check-in text.
async function getNeedsHelpStudents() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name,
            COUNT(*) AS reply_count,
            MAX(c.replied_at) AS latest_at
     FROM checkins c
     JOIN users u ON u.id = c.student_id
     WHERE c.student_reply = ?
       AND c.replied_at >= (NOW() - INTERVAL ? DAY)
     GROUP BY u.id, u.name
     ORDER BY latest_at DESC
     LIMIT 100`,
    [NEEDS_HELP_REPLY, NEEDS_HELP_WINDOW_DAYS],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    count: Number(r.reply_count) || 0,
    latestAt: r.latest_at || null,
  }));
}

module.exports = { getNeedsHelpStudents };
