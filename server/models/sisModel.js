//sisModel.js
const pool = require("../config/db");

async function getSISByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT
      id,
      user_id,
      student_id,
      full_name,
      date_of_birth,
      sex,
      civil_status,
      nationality,
      email,
      mobile_number,
      current_address,
      permanent_address,
      program_course,
      year_level,
      section_block,
      academic_year,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_number,
      emergency_contact_address,
      parent_guardian_name,
      parent_guardian_relationship,
      parent_guardian_contact,
      parent_guardian_occupation,
      preferred_communication_method,
      learning_communication_preferences,
      additional_support_notes,
      status,
      created_at,
      updated_at
    FROM student_sis
    WHERE user_id = ?`,
    [userId],
  );

  return rows[0] || null;
}

async function createSIS(userId, data) {
  const [result] = await pool.query(
    `INSERT INTO student_sis (
      user_id,
      student_id,
      full_name,
      date_of_birth,
      sex,
      civil_status,
      nationality,
      email,
      mobile_number,
      current_address,
      permanent_address,
      program_course,
      year_level,
      section_block,
      academic_year,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_number,
      emergency_contact_address,
      parent_guardian_name,
      parent_guardian_relationship,
      parent_guardian_contact,
      parent_guardian_occupation,
      preferred_communication_method,
      learning_communication_preferences,
      additional_support_notes,
      status
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )`,
    [
      userId,
      data.studentId || null,
      data.fullName,
      data.dateOfBirth || null,
      data.sex || null,
      data.civilStatus || null,
      data.nationality || null,
      data.email || null,
      data.mobileNumber || null,
      data.currentAddress || null,
      data.permanentAddress || null,
      data.programCourse || null,
      data.yearLevel || null,
      data.sectionBlock || null,
      data.academicYear || null,
      data.emergencyContactName || null,
      data.emergencyContactRelationship || null,
      data.emergencyContactNumber || null,
      data.emergencyContactAddress || null,
      data.parentGuardianName || null,
      data.parentGuardianRelationship || null,
      data.parentGuardianContact || null,
      data.parentGuardianOccupation || null,
      data.preferredCommunicationMethod || null,
      data.learningCommunicationPreferences || null,
      data.additionalSupportNotes || null,
      data.status || "in_progress",
    ],
  );

  return getSISById(result.insertId);
}

async function updateSIS(userId, data) {
  await pool.query(
    `UPDATE student_sis
     SET
       student_id = ?,
       full_name = ?,
       date_of_birth = ?,
       sex = ?,
       civil_status = ?,
       nationality = ?,
       email = ?,
       mobile_number = ?,
       current_address = ?,
       permanent_address = ?,
       program_course = ?,
       year_level = ?,
       section_block = ?,
       academic_year = ?,
       emergency_contact_name = ?,
       emergency_contact_relationship = ?,
       emergency_contact_number = ?,
       emergency_contact_address = ?,
       parent_guardian_name = ?,
       parent_guardian_relationship = ?,
       parent_guardian_contact = ?,
       parent_guardian_occupation = ?,
       preferred_communication_method = ?,
       learning_communication_preferences = ?,
       additional_support_notes = ?,
       status = ?
     WHERE user_id = ?`,
    [
      data.studentId || null,
      data.fullName,
      data.dateOfBirth || null,
      data.sex || null,
      data.civilStatus || null,
      data.nationality || null,
      data.email || null,
      data.mobileNumber || null,
      data.currentAddress || null,
      data.permanentAddress || null,
      data.programCourse || null,
      data.yearLevel || null,
      data.sectionBlock || null,
      data.academicYear || null,
      data.emergencyContactName || null,
      data.emergencyContactRelationship || null,
      data.emergencyContactNumber || null,
      data.emergencyContactAddress || null,
      data.parentGuardianName || null,
      data.parentGuardianRelationship || null,
      data.parentGuardianContact || null,
      data.parentGuardianOccupation || null,
      data.preferredCommunicationMethod || null,
      data.learningCommunicationPreferences || null,
      data.additionalSupportNotes || null,
      data.status || "in_progress",
      userId,
    ],
  );

  return getSISByUserId(userId);
}

async function getSISById(sisId) {
  const [rows] = await pool.query(
    `SELECT
      id,
      user_id,
      student_id,
      full_name,
      date_of_birth,
      sex,
      civil_status,
      nationality,
      email,
      mobile_number,
      current_address,
      permanent_address,
      program_course,
      year_level,
      section_block,
      academic_year,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_number,
      emergency_contact_address,
      parent_guardian_name,
      parent_guardian_relationship,
      parent_guardian_contact,
      parent_guardian_occupation,
      preferred_communication_method,
      learning_communication_preferences,
      additional_support_notes,
      status,
      created_at,
      updated_at
    FROM student_sis
    WHERE id = ?`,
    [sisId],
  );

  return rows[0] || null;
}

async function getAllStudentSIS(status, searchTerm) {
  let query = `
    SELECT * FROM (
      SELECT
        u.id AS user_id,
        sis.id,
        sis.student_id,
        COALESCE(sis.full_name, u.name) AS full_name,
        COALESCE(sis.email, u.email) AS email,
        sis.mobile_number,
        sis.program_course,
        sis.year_level,
        sis.section_block,
        sis.academic_year,
        CASE
          WHEN sis.status = 'completed' THEN 'completed'
          WHEN sis.id IS NOT NULL THEN 'in_progress'
          WHEN bi.id IS NOT NULL THEN 'in_progress'
          ELSE 'not_started'
        END AS status,
        COALESCE(sis.updated_at, bi.updated_at) AS updated_at,
        sis.created_at
      FROM users u
      LEFT JOIN student_sis sis ON sis.user_id = u.id
      LEFT JOIN student_basic_info bi ON bi.user_id = u.id
      WHERE u.role = 'student'
    ) t
    WHERE 1 = 1
  `;

  const params = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  if (searchTerm) {
    query += " AND (full_name LIKE ? OR email LIKE ?)";
    params.push(`%${searchTerm}%`, `%${searchTerm}%`);
  }

  query += " ORDER BY updated_at DESC";

  const [rows] = await pool.query(query, params);

  return rows;
}

async function getStudentSISByUserId(userId) {
  return getSISByUserId(userId);
}

async function markSISRemindersRead(userId) {
  await pool.query(
    `UPDATE notifications
     SET is_read = 1,
         read_at = CURRENT_TIMESTAMP
     WHERE recipient_id = ?
       AND type = 'sis_reminder'
       AND is_read = 0`,
    [userId],
  );
}

async function hasUnreadSISReminder(userId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE recipient_id = ?
       AND type = 'sis_reminder'
       AND is_read = 0`,
    [userId],
  );

  return Number(row.count) > 0;
}

module.exports = {
  getSISByUserId,
  createSIS,
  updateSIS,
  getSISById,
  getAllStudentSIS,
  getStudentSISByUserId,
  markSISRemindersRead,
  hasUnreadSISReminder,
};
