// server/models/classModel.js
const pool = require("../config/db");
const {
  resolveDisplayInfo,
  avatarColorForId,
  createSession,
} = require("./sessionModel");

function generateClassCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const CLASS_SELECT = `
  SELECT c.*, u.name AS teacher_name,
    (SELECT COUNT(*) FROM class_members cm
       WHERE cm.class_id = c.id AND cm.left_at IS NULL) AS member_count,
    (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id) AS session_count,
    (SELECT COUNT(*) FROM sessions s
       WHERE s.class_id = c.id AND s.is_live = 1 AND s.status = 'active') AS live_count
  FROM classes c
  JOIN users u ON u.id = c.teacher_id
`;

async function createClass(teacherId, title, description = "") {
  let code = generateClassCode();
  let unique = false;
  let attempts = 0;

  while (!unique && attempts < 5) {
    const [existing] = await pool.query(
      "SELECT id FROM classes WHERE class_code = ?",
      [code],
    );
    if (existing.length === 0) unique = true;
    else {
      code = generateClassCode();
      attempts++;
    }
  }
  if (!unique) throw new Error("Failed to generate unique class code");

  const [result] = await pool.query(
    `INSERT INTO classes (teacher_id, class_code, title, description, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [teacherId, code, title, description],
  );
  return getClassById(result.insertId);
}

async function getClassById(classId) {
  const [rows] = await pool.query(`${CLASS_SELECT} WHERE c.id = ?`, [classId]);
  return rows[0] || null;
}

async function getClassByCode(code) {
  const [rows] = await pool.query(
    `${CLASS_SELECT} WHERE c.class_code = ? AND c.status = 'active'`,
    [code],
  );
  return rows[0] || null;
}

async function getTeacherClasses(teacherId) {
  const [rows] = await pool.query(
    `${CLASS_SELECT} WHERE c.teacher_id = ? ORDER BY c.created_at DESC`,
    [teacherId],
  );
  return rows;
}

async function getStudentClasses(studentId) {
  const [rows] = await pool.query(
    `${CLASS_SELECT}
     JOIN class_members me ON me.class_id = c.id
     WHERE me.user_id = ? AND me.left_at IS NULL
     ORDER BY c.created_at DESC`,
    [studentId],
  );
  return rows;
}

async function joinClass(classId, userId) {
  await pool.query(
    `INSERT INTO class_members (class_id, user_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE left_at = NULL`,
    [classId, userId],
  );
  return true;
}

async function leaveClass(classId, userId) {
  const [result] = await pool.query(
    `UPDATE class_members SET left_at = CURRENT_TIMESTAMP
     WHERE class_id = ? AND user_id = ? AND left_at IS NULL`,
    [classId, userId],
  );
  return result.affectedRows > 0;
}

async function isClassMember(classId, userId) {
  const [rows] = await pool.query(
    `SELECT id FROM class_members
     WHERE class_id = ? AND user_id = ? AND left_at IS NULL`,
    [classId, userId],
  );
  return rows.length > 0;
}

async function getClassSessions(classId) {
  const [rows] = await pool.query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM participants p
          WHERE p.session_id = s.id AND p.left_at IS NULL) AS participant_count
     FROM sessions s
     WHERE s.class_id = ?
     ORDER BY COALESCE(s.scheduled_start, s.created_at) DESC`,
    [classId],
  );
  return rows;
}

// Role-aware: teachers/guidance see real names, students see display names.
async function getClassMembers(classId, requestingRole) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.display_username, cm.joined_at
     FROM class_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.class_id = ? AND cm.left_at IS NULL
     ORDER BY cm.joined_at ASC`,
    [classId],
  );
  return rows.map((m) => {
    const { displayName, initials } = resolveDisplayInfo(m, requestingRole);
    return {
      id: m.id,
      displayName,
      initials,
      avatarColor: avatarColorForId(m.id),
      joinedAt: m.joined_at,
    };
  });
}

// Adds one session (meeting) to a class.
async function createClassSession(
  cls,
  { title, scheduledStart = null, scheduledEnd = null },
) {
  const [[countRow]] = await pool.query(
    "SELECT COUNT(*) AS total FROM sessions WHERE class_id = ?",
    [cls.id],
  );
  const finalTitle =
    title && title.trim()
      ? title.trim()
      : `Session ${Number(countRow.total) + 1}`;

  return createSession(cls.teacher_id, finalTitle, cls.description || "", {
    classId: cls.id,
    scheduledStart,
    scheduledEnd,
  });
}

module.exports = {
  createClass,
  getClassById,
  getClassByCode,
  getTeacherClasses,
  getStudentClasses,
  joinClass,
  leaveClass,
  isClassMember,
  getClassSessions,
  getClassMembers,
  createClassSession,
};
