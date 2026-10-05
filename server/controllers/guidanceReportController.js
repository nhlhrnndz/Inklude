// server/controllers/guidanceReportController.js
const { getStats } = require("../models/accessibilityReportModel");
const { getTopReportLocations } = require("../models/guidanceModel");
const {
  getAccessibilityReportRows,
  getAvgResolutionHours,
  countReportsBetween,
} = require("../models/guidanceReportModel");

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const pad = (n) => String(n).padStart(2, "0");

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

const FORBIDDEN = { message: "Only guidance counselors can view this." };

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

// 'YYYY-MM' -> SQL bounds [start, end)
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;

  return {
    start: `${month}-01 00:00:00`,
    end: `${nextY}-${pad(nextM)}-01 00:00:00`,
  };
}

function previousMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  return `${prevY}-${pad(prevM)}`;
}

// GET /api/guidance/reports/accessibility?month=YYYY-MM
async function getAccessibilityReportController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res.status(403).json(FORBIDDEN);
    }

    const month = MONTH_RE.test(req.query.month || "")
      ? req.query.month
      : currentMonth();

    const { start, end } = monthBounds(month);
    const prev = monthBounds(previousMonth(month));

    const [stats, topLocations, rows, avgHours, previousMonthTotal] =
      await Promise.all([
        getStats(start, end),
        getTopReportLocations(start, end, 10),
        getAccessibilityReportRows(start, end),
        getAvgResolutionHours(start, end),
        countReportsBetween(prev.start, prev.end),
      ]);

    const byStatus = { pending: 0, in_progress: 0, resolved: 0 };
    stats.statusRows.forEach((row) => {
      byStatus[row.status] = Number(row.count);
    });

    const total = byStatus.pending + byStatus.in_progress + byStatus.resolved;

    res.json({
      month,
      generatedAt: new Date().toISOString(),
      total,
      pending: byStatus.pending,
      inProgress: byStatus.in_progress,
      resolved: byStatus.resolved,
      resolutionRate:
        total > 0 ? Math.round((byStatus.resolved / total) * 100) : 0,
      avgResolutionHours: avgHours,
      previousMonthTotal,
      byCategory: stats.categoryRows.map((row) => ({
        category: row.category,
        count: Number(row.count),
      })),
      topLocations,
      reports: rows.map((r) => ({
        id: r.id,
        location: r.location,
        category: r.category,
        description: r.description,
        status: r.status,
        response: r.guidance_response || "",
        studentName: r.student_name,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at || null,
      })),
    });
  } catch (err) {
    console.error("getAccessibilityReportController error:", err);
    res
      .status(500)
      .json({ message: "Server error while building the report." });
  }
}

module.exports = { getAccessibilityReportController };
