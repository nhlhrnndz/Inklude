// server/models/guidanceReportModel.js
const pool = require("../config/db");

// Individual accessibility reports created in [start, end).
// Dates are 'YYYY-MM-DD HH:MM:SS' strings.
async function getAccessibilityReportRows(start, end) {
  const [rows] = await pool.query(
    `SELECT r.id, r.location, r.category, r.description, r.status,
            r.guidance_response, r.created_at, r.resolved_at,
            s.name AS student_name
     FROM accessibility_reports r
     JOIN users s ON s.id = r.student_id
     WHERE r.created_at >= ? AND r.created_at < ?
     ORDER BY FIELD(r.status, 'pending', 'in_progress', 'resolved'),
              r.created_at DESC
     LIMIT 500`,
    [start, end],
  );
  return rows;
}

// Average hours between a report being filed and being resolved,
// for reports filed in [start, end). Null when none are resolved yet.
async function getAvgResolutionHours(start, end) {
  const [rows] = await pool.query(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) / 60 AS avg_hours
     FROM accessibility_reports
     WHERE status = 'resolved'
       AND resolved_at IS NOT NULL
       AND created_at >= ? AND created_at < ?`,
    [start, end],
  );

  const value = rows[0] ? rows[0].avg_hours : null;
  return value === null || value === undefined ? null : Number(value);
}

async function countReportsBetween(start, end) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM accessibility_reports
     WHERE created_at >= ? AND created_at < ?`,
    [start, end],
  );
  return Number(rows[0].count) || 0;
}

module.exports = {
  getAccessibilityReportRows,
  getAvgResolutionHours,
  countReportsBetween,
};
