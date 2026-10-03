// server/models/referralModel.js
const pool = require("../config/db");

const SELECT_BASE = `
  SELECT r.id, r.student_id, r.class_id, r.guidance_id, r.teacher_id,
         r.concern, r.note, r.status, r.acknowledged_at,
         r.teacher_response, r.responded_at, r.created_at,
         su.name AS student_name,
         c.title AS class_title,
         c.class_code AS class_code,
         gu.name AS guidance_name,
         tu.name AS teacher_name
  FROM support_referrals r
  JOIN users su ON su.id = r.student_id
  JOIN classes c ON c.id = r.class_id
  LEFT JOIN users gu ON gu.id = r.guidance_id
  LEFT JOIN users tu ON tu.id = r.teacher_id
`;

function toDto(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    classId: r.class_id,
    classTitle: r.class_title,
    classCode: r.class_code,
    concern: r.concern,
    note: r.note || "",
    status: r.status,
    guidanceName: r.guidance_name || null,
    teacherName: r.teacher_name || null,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at || null,
    teacherResponse: r.teacher_response || "",
    respondedAt: r.responded_at || null,
  };
}

async function getReferralById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE r.id = ?`, [id]);
  return rows[0] || null;
}

async function createReferral({
  studentId,
  classId,
  guidanceId,
  teacherId,
  concern,
  note,
}) {
  const [result] = await pool.query(
    `INSERT INTO support_referrals
       (student_id, class_id, guidance_id, teacher_id, concern, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [studentId, classId, guidanceId, teacherId, concern, note || null],
  );
  return getReferralById(result.insertId);
}

// A referral is "open" until the teacher has replied.
async function hasOpenReferral(studentId, classId, concern) {
  const [rows] = await pool.query(
    `SELECT id FROM support_referrals
     WHERE student_id = ? AND class_id = ? AND concern = ?
       AND status IN ('sent', 'acknowledged')
     LIMIT 1`,
    [studentId, classId, concern],
  );
  return rows.length > 0;
}

async function getReferralsForStudent(studentId) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE r.student_id = ? ORDER BY r.created_at DESC`,
    [studentId],
  );
  return rows;
}

async function getReferralsForTeacher(teacherId) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE r.teacher_id = ? ORDER BY r.created_at DESC LIMIT 200`,
    [teacherId],
  );
  return rows;
}

// true only if it was "sent" and is now "acknowledged"
async function acknowledgeReferral(id) {
  const [result] = await pool.query(
    `UPDATE support_referrals
     SET status = 'acknowledged', acknowledged_at = NOW()
     WHERE id = ? AND status = 'sent'`,
    [id],
  );
  return result.affectedRows > 0;
}

// true only if it was open and is now "responded"
async function respondToReferral(id, message) {
  const [result] = await pool.query(
    `UPDATE support_referrals
     SET status = 'responded',
         teacher_response = ?,
         responded_at = NOW(),
         acknowledged_at = COALESCE(acknowledged_at, NOW())
     WHERE id = ? AND status IN ('sent', 'acknowledged')`,
    [message, id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  toDto,
  getReferralById,
  createReferral,
  hasOpenReferral,
  getReferralsForStudent,
  getReferralsForTeacher,
  acknowledgeReferral,
  respondToReferral,
};
