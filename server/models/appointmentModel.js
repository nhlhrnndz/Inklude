//server/models/appointmentModel.js
const pool = require("../config/db");

// Dates/times are formatted in SQL so mysql2 never turns a DATE into a
// JS Date object (which shifts by timezone).
const SELECT_BASE = `
  SELECT a.id, a.student_id, a.guidance_id, a.reason, a.note, a.status,
         DATE_FORMAT(a.preferred_date, '%Y-%m-%d') AS preferred_date,
         TIME_FORMAT(a.preferred_time, '%H:%i') AS preferred_time,
         DATE_FORMAT(a.confirmed_date, '%Y-%m-%d') AS confirmed_date,
         TIME_FORMAT(a.confirmed_time, '%H:%i') AS confirmed_time,
         a.guidance_note, a.created_at, a.updated_at,
         su.name AS student_name, su.email AS student_email,
         gu.name AS guidance_name
  FROM guidance_appointments a
  JOIN users su ON su.id = a.student_id
  LEFT JOIN users gu ON gu.id = a.guidance_id
`;

async function getAppointmentById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE a.id = ?`, [id]);
  return rows[0] || null;
}

async function createAppointment({
  studentId,
  reason,
  note,
  preferredDate,
  preferredTime,
}) {
  const [result] = await pool.query(
    `INSERT INTO guidance_appointments
       (student_id, reason, note, preferred_date, preferred_time)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, reason, note || null, preferredDate, preferredTime],
  );
  return getAppointmentById(result.insertId);
}

async function getAppointmentsForStudent(studentId) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE a.student_id = ? ORDER BY a.created_at DESC`,
    [studentId],
  );
  return rows;
}

async function getAllAppointments() {
  const [rows] = await pool.query(
    `${SELECT_BASE} ORDER BY a.created_at DESC LIMIT 300`,
  );
  return rows;
}

// True if the student already has an open request/booking at this exact slot.
async function hasActiveAtSlot(studentId, date, time) {
  const [rows] = await pool.query(
    `SELECT id FROM guidance_appointments
     WHERE student_id = ?
       AND status IN ('pending', 'confirmed', 'rescheduled')
       AND (
         (preferred_date = ? AND preferred_time = ?)
         OR (confirmed_date = ? AND confirmed_time = ?)
       )
     LIMIT 1`,
    [studentId, date, time, date, time],
  );
  return rows.length > 0;
}

async function countPendingForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM guidance_appointments
     WHERE student_id = ? AND status = 'pending'`,
    [studentId],
  );
  return rows[0].total;
}

// Only updates the fields that are passed in.
async function updateAppointment(id, fields) {
  const map = {
    status: "status",
    guidanceId: "guidance_id",
    confirmedDate: "confirmed_date",
    confirmedTime: "confirmed_time",
    guidanceNote: "guidance_note",
  };

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(map)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }
  if (sets.length === 0) return;

  params.push(id);
  await pool.query(
    `UPDATE guidance_appointments SET ${sets.join(", ")} WHERE id = ?`,
    params,
  );
}

module.exports = {
  getAppointmentById,
  createAppointment,
  getAppointmentsForStudent,
  getAllAppointments,
  countPendingForStudent,
  hasActiveAtSlot,
  updateAppointment,
};
