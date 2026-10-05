//server/controllers/reportController.js
const fs = require("fs");
const {
  CATEGORIES,
  STATUSES,
  getReportById,
  createReport,
  getReportsForStudent,
  getAllReports,
  updateReport,
  getStats,
} = require("../models/accessibilityReportModel");
const { getGuidanceUserIds } = require("../models/messageModel");
const { notifyUser, notifyUsers } = require("../services/notificationService");

const RANK = { pending: 0, in_progress: 1, resolved: 2 };
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function format(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    location: r.location,
    category: r.category,
    description: r.description,
    photoUrl: r.photo_path ? `/uploads/reports/${r.photo_path}` : null,
    status: r.status,
    response: r.guidance_response || "",
    handlerName: r.handler_name || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at || null,
  };
}

function removeUpload(file) {
  if (file && file.path) fs.unlink(file.path, () => {});
}

function fail(res, file, message) {
  removeUpload(file);
  return res.status(400).json({ message });
}

// ---------- student ----------

// POST /api/reports  (multipart: location, category, description, photo?)
async function submitReport(req, res) {
  const file = req.file;
  try {
    const location = String(req.body.location || "").trim();
    const category = String(req.body.category || "");
    const description = String(req.body.description || "").trim();

    if (location.length < 2 || location.length > 150) {
      return fail(res, file, "Enter where the problem is (2-150 characters).");
    }
    if (!CATEGORIES.includes(category)) {
      return fail(res, file, "Choose a category.");
    }
    if (description.length < 5 || description.length > 1000) {
      return fail(res, file, "Describe the problem (5-1000 characters).");
    }

    const report = await createReport({
      studentId: req.user.id,
      location,
      category,
      description,
      photoPath: file ? file.filename : null,
    });

    const guidanceIds = await getGuidanceUserIds();
    await notifyUsers(guidanceIds, {
      type: "accessibility_report",
      title: "New accessibility report",
      body: `${req.user.name || "A student"} reported: ${category} at ${location}.`,
      sourceType: "accessibility_report",
      sourceId: report.id,
      senderId: req.user.id,
    });

    res
      .status(201)
      .json({ message: "Report submitted.", report: format(report) });
  } catch (err) {
    removeUpload(file);
    console.error("submitReport error:", err);
    res.status(500).json({ message: "Server error while submitting report." });
  }
}

// GET /api/reports/mine
async function getMine(req, res) {
  try {
    const rows = await getReportsForStudent(req.user.id);
    res.json({ reports: rows.map(format) });
  } catch (err) {
    console.error("getMine error:", err);
    res.status(500).json({ message: "Server error while loading reports." });
  }
}

// ---------- guidance ----------

// GET /api/reports?status=pending
async function listAll(req, res) {
  try {
    const rows = await getAllReports(req.query.status);
    res.json({ reports: rows.map(format) });
  } catch (err) {
    console.error("listAll error:", err);
    res.status(500).json({ message: "Server error while loading reports." });
  }
}

// GET /api/reports/stats?month=YYYY-MM
async function stats(req, res) {
  try {
    const now = new Date();
    const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = MONTH_RE.test(req.query.month || "")
      ? req.query.month
      : fallback;

    const [y, m] = month.split("-").map(Number);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const start = `${month}-01 00:00:00`;
    const end = `${nextY}-${String(nextM).padStart(2, "0")}-01 00:00:00`;

    const { statusRows, categoryRows } = await getStats(start, end);

    const byStatus = { pending: 0, in_progress: 0, resolved: 0 };
    statusRows.forEach((row) => {
      byStatus[row.status] = Number(row.count);
    });

    res.json({
      month,
      total: byStatus.pending + byStatus.in_progress + byStatus.resolved,
      pending: byStatus.pending,
      inProgress: byStatus.in_progress,
      resolved: byStatus.resolved,
      byCategory: categoryRows.map((row) => ({
        category: row.category,
        count: Number(row.count),
      })),
    });
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ message: "Server error while loading stats." });
  }
}

// PATCH /api/reports/:id/status   body: { status, response? }
async function updateStatus(req, res) {
  try {
    const report = await getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    const next = req.body.status;
    if (!STATUSES.includes(next)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    if (RANK[next] <= RANK[report.status]) {
      return res.status(400).json({
        message:
          report.status === "resolved"
            ? "This report is already resolved."
            : "A report can only move forward.",
      });
    }

    const response = String(req.body.response || "")
      .trim()
      .slice(0, 500);
    if (next === "resolved" && !response) {
      return res
        .status(400)
        .json({ message: "Add a short response before resolving." });
    }

    await updateReport(report.id, {
      status: next,
      response: response || report.guidance_response,
      handledBy: req.user.id,
    });

    const inProgress = next === "in_progress";
    await notifyUser(report.student_id, {
      type: "accessibility_report",
      title: inProgress
        ? "Your accessibility report is in progress"
        : "Your accessibility report was resolved",
      body:
        response ||
        `Guidance is now working on your report about ${report.location}.`,
      sourceType: "accessibility_report",
      sourceId: report.id,
      senderId: req.user.id,
    });

    const fresh = await getReportById(report.id);
    res.json({ message: "Updated.", report: format(fresh) });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ message: "Server error while updating report." });
  }
}

module.exports = { submitReport, getMine, listAll, stats, updateStatus };
