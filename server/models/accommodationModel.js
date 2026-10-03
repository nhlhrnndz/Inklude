// server/models/accommodationModel.js
const pool = require("../config/db");
const { resolveDisplayInfo } = require("./sessionModel");

const ACCOMMODATION_TYPES = [
  "front_seating",
  "more_time",
  "additional_materials",
  "extra_help",
  "other",
];

const TYPE_LABELS = {
  front_seating: "Front seating",
  more_time: "More time",
  additional_materials: "Additional materials",
  extra_help: "Extra help",
  other: "Other",
};

async function getRequestById(id) {
  const [rows] = await pool.query(
    `SELECT ar.*, c.teacher_id, c.title AS class_title
     FROM accommodation_requests ar
     JOIN classes c ON c.id = ar.class_id
     WHERE ar.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function createRequest({ classId, studentId, type, note }) {
  const [result] = await pool.query(
    `INSERT INTO accommodation_requests (class_id, student_id, type, note)
     VALUES (?, ?, ?, ?)`,
    [classId, studentId, type, note || null],
  );
  return getRequestById(result.insertId);
}

// Is there already an unanswered / in-discussion request of this type?
async function hasOpenRequest(classId, studentId, type) {
  const [rows] = await pool.query(
    `SELECT id FROM accommodation_requests
     WHERE class_id = ? AND student_id = ? AND type = ?
       AND status IN ('pending', 'discuss')
     LIMIT 1`,
    [classId, studentId, type],
  );
  return rows.length > 0;
}

async function getStudentRequests(classId, studentId) {
  const [rows] = await pool.query(
    `SELECT * FROM accommodation_requests
     WHERE class_id = ? AND student_id = ?
     ORDER BY created_at DESC`,
    [classId, studentId],
  );
  return rows;
}

// Teacher view. Deliberately selects ONLY the request + the student's name.
// It never touches support-needs / disability data.
async function getClassRequests(classId, requestingRole) {
  const [rows] = await pool.query(
    `SELECT ar.*, u.name AS student_name, u.display_username AS student_display_username
     FROM accommodation_requests ar
     JOIN users u ON u.id = ar.student_id
     WHERE ar.class_id = ?
     ORDER BY ar.created_at DESC`,
    [classId],
  );
  return rows.map((r) => {
    const { displayName, initials } = resolveDisplayInfo(
      {
        id: r.student_id,
        name: r.student_name,
        display_username: r.student_display_username,
      },
      requestingRole,
    );
    return {
      ...r,
      student_display_name: displayName,
      student_initials: initials,
    };
  });
}

// Only an open request (pending / discuss) can still be answered.
async function respondToRequest(id, status, reason) {
  const [result] = await pool.query(
    `UPDATE accommodation_requests
     SET status = ?, teacher_response = ?, responded_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status IN ('pending', 'discuss')`,
    [status, reason || null, id],
  );
  return result.affectedRows > 0;
}

async function cancelRequest(id, studentId) {
  const [result] = await pool.query(
    `UPDATE accommodation_requests
     SET status = 'cancelled'
     WHERE id = ? AND student_id = ? AND status IN ('pending', 'discuss')`,
    [id, studentId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  ACCOMMODATION_TYPES,
  TYPE_LABELS,
  getRequestById,
  createRequest,
  hasOpenRequest,
  getStudentRequests,
  getClassRequests,
  respondToRequest,
  cancelRequest,
};
