// server/models/referralModel.js
const pool = require("../config/db");

const SELECT_BASE = `
  SELECT r.id, r.student_id, r.class_id, r.guidance_id, r.teacher_id,
         r.direction, r.concern, r.note, r.already_spoke, r.status,
         r.acknowledged_at, r.teacher_response, r.responded_at,
         r.guidance_note, r.completed_at, r.created_at, r.updated_at,
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

// Full view (Guidance, and the old Guidance -> Teacher screens)
function toDto(r) {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    classId: r.class_id,
    classTitle: r.class_title,
    classCode: r.class_code,
    direction: r.direction,
    concern: r.concern,
    note: r.note || "",
    alreadySpoke:
      r.already_spoke === null || r.already_spoke === undefined
        ? null
        : Number(r.already_spoke) === 1,
    status: r.status,
    guidanceName: r.guidance_name || null,
    teacherName: r.teacher_name || null,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at || null,
    teacherResponse: r.teacher_response || "",
    respondedAt: r.responded_at || null,
    guidanceNote: r.guidance_note || "",
    completedAt: r.completed_at || null,
  };
}

// What a TEACHER sees about a referral they sent: status only.
// No Guidance notes, no Guidance name, and only 3 statuses.
function toTeacherSentDto(r) {
  let status = "sent";
  if (r.status === "acknowledged" || r.status === "in_progress") {
    status = "acknowledged";
  } else if (r.status === "completed") {
    status = "completed";
  }
  return {
    id: r.id,
    studentId: r.student_id,
    classId: r.class_id,
    classTitle: r.class_title,
    concern: r.concern,
    note: r.note || "",
    alreadySpoke:
      r.already_spoke === null || r.already_spoke === undefined
        ? null
        : Number(r.already_spoke) === 1,
    status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function getReferralById(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE r.id = ?`, [id]);
  return rows[0] || null;
}

async function createReferral({
  studentId,
  classId,
  guidanceId = null,
  teacherId,
  concern,
  note,
  direction = "guidance_to_teacher",
  alreadySpoke = null,
}) {
  const [result] = await pool.query(
    `INSERT INTO support_referrals
       (student_id, class_id, guidance_id, teacher_id, direction,
        concern, note, already_spoke)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      classId,
      guidanceId,
      teacherId,
      direction,
      concern,
      note || null,
      alreadySpoke === null ? null : alreadySpoke ? 1 : 0,
    ],
  );
  return getReferralById(result.insertId);
}

// "Open" = not finished yet, for the given direction.
async function hasOpenReferral(
  studentId,
  classId,
  concern,
  direction = "guidance_to_teacher",
) {
  const [rows] = await pool.query(
    `SELECT id FROM support_referrals
     WHERE student_id = ? AND class_id = ? AND concern = ? AND direction = ?
       AND status IN ('sent', 'acknowledged', 'in_progress')
     LIMIT 1`,
    [studentId, classId, concern, direction],
  );
  return rows.length > 0;
}

// Guidance's view of one student: both directions
async function getReferralsForStudent(studentId) {
  const [rows] = await pool.query(
    `${SELECT_BASE} WHERE r.student_id = ? ORDER BY r.created_at DESC`,
    [studentId],
  );
  return rows;
}

// Referrals Guidance sent TO this teacher
async function getReferralsForTeacher(teacherId) {
  const [rows] = await pool.query(
    `${SELECT_BASE}
     WHERE r.teacher_id = ? AND r.direction = 'guidance_to_teacher'
     ORDER BY r.created_at DESC LIMIT 200`,
    [teacherId],
  );
  return rows;
}

// Referrals this teacher sent TO Guidance
async function getReferralsSentByTeacher(teacherId) {
  const [rows] = await pool.query(
    `${SELECT_BASE}
     WHERE r.teacher_id = ? AND r.direction = 'teacher_to_guidance'
     ORDER BY r.created_at DESC LIMIT 200`,
    [teacherId],
  );
  return rows;
}

// Guidance: all teacher referrals (optionally filtered by status)
async function getTeacherReferrals(status) {
  const params = [];
  let where = "WHERE r.direction = 'teacher_to_guidance'";
  if (status) {
    where += " AND r.status = ?";
    params.push(status);
  }
  const [rows] = await pool.query(
    `${SELECT_BASE} ${where} ORDER BY r.created_at DESC LIMIT 200`,
    params,
  );
  return rows;
}

// true only if it was "sent" and is now "acknowledged"
async function acknowledgeReferral(id) {
  const [result] = await pool.query(
    `UPDATE support_referrals
     SET status = 'acknowledged', acknowledged_at = NOW()
     WHERE id = ? AND status = 'sent' AND direction = 'guidance_to_teacher'`,
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
     WHERE id = ? AND status IN ('sent', 'acknowledged')
       AND direction = 'guidance_to_teacher'`,
    [message, id],
  );
  return result.affectedRows > 0;
}

// Guidance moves a TEACHER referral forward:
// sent -> acknowledged -> in_progress -> completed
async function updateGuidanceStatus(id, status, guidanceId, note) {
  const [result] = await pool.query(
    `UPDATE support_referrals
     SET status = ?,
         guidance_id = ?,
         acknowledged_at = COALESCE(acknowledged_at, NOW()),
         completed_at = IF(? = 'completed', NOW(), completed_at),
         guidance_note = COALESCE(?, guidance_note)
     WHERE id = ? AND direction = 'teacher_to_guidance'
       AND status <> 'completed'`,
    [status, guidanceId, status, note || null, id],
  );
  return result.affectedRows > 0;
}

module.exports = {
  toDto,
  toTeacherSentDto,
  getReferralById,
  createReferral,
  hasOpenReferral,
  getReferralsForStudent,
  getReferralsForTeacher,
  getReferralsSentByTeacher,
  getTeacherReferrals,
  acknowledgeReferral,
  respondToReferral,
  updateGuidanceStatus,
};
