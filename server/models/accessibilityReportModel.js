//server/models/accessibilityReportModel.js
const db = require("../config/db");

const CATEGORIES = [
  "Ramp / Entrance",
  "Elevator",
  "Restroom",
  "Classroom",
  "Learning Materials",
  "Transportation",
  "Other",
];

const STATUSES = ["pending", "in_progress", "resolved"];

// Creates the table the first time the server starts.
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS accessibility_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        location VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        photo_path VARCHAR(255) NULL,
        status ENUM('pending','in_progress','resolved') NOT NULL DEFAULT 'pending',
        guidance_response VARCHAR(500) NULL,
        handled_by INT NULL,
        resolved_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reports_student (student_id),
        INDEX idx_reports_status (status),
        INDEX idx_reports_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    console.error("accessibility_reports table setup failed:", err.message);
  }
})();

const BASE_SELECT = `
  SELECT r.*, s.name AS student_name, g.name AS handler_name
  FROM accessibility_reports r
  JOIN users s ON s.id = r.student_id
  LEFT JOIN users g ON g.id = r.handled_by
`;

async function getReportById(id) {
  const [rows] = await db.query(`${BASE_SELECT} WHERE r.id = ?`, [id]);
  return rows[0] || null;
}

async function createReport({
  studentId,
  location,
  category,
  description,
  photoPath,
}) {
  const [result] = await db.query(
    `INSERT INTO accessibility_reports
       (student_id, location, category, description, photo_path)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, location, category, description, photoPath || null],
  );
  return getReportById(result.insertId);
}

async function getReportsForStudent(studentId) {
  const [rows] = await db.query(
    `${BASE_SELECT} WHERE r.student_id = ? ORDER BY r.created_at DESC`,
    [studentId],
  );
  return rows;
}

async function getAllReports(status) {
  const params = [];
  let where = "";
  if (status && STATUSES.includes(status)) {
    where = "WHERE r.status = ?";
    params.push(status);
  }
  const [rows] = await db.query(
    `${BASE_SELECT} ${where}
     ORDER BY FIELD(r.status, 'pending', 'in_progress', 'resolved'), r.created_at DESC`,
    params,
  );
  return rows;
}

async function updateReport(id, { status, response, handledBy }) {
  await db.query(
    `UPDATE accessibility_reports
     SET status = ?,
         guidance_response = ?,
         handled_by = ?,
         resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END
     WHERE id = ?`,
    [status, response || null, handledBy, status, id],
  );
}

// Counts for one month. Dates are 'YYYY-MM-DD HH:MM:SS' strings.
async function getStats(start, end) {
  const [statusRows] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM accessibility_reports
     WHERE created_at >= ? AND created_at < ?
     GROUP BY status`,
    [start, end],
  );
  const [categoryRows] = await db.query(
    `SELECT category, COUNT(*) AS count
     FROM accessibility_reports
     WHERE created_at >= ? AND created_at < ?
     GROUP BY category
     ORDER BY count DESC, category ASC`,
    [start, end],
  );
  return { statusRows, categoryRows };
}

module.exports = {
  CATEGORIES,
  STATUSES,
  getReportById,
  createReport,
  getReportsForStudent,
  getAllReports,
  updateReport,
  getStats,
};
