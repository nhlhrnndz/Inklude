// server/models/classModel.js
const pool = require("../config/db");
const {
  resolveDisplayInfo,
  avatarColorForId,
  createSession,
} = require("./sessionModel");

const MAX_MEETINGS = 120;

function generateClassCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const pad = (n) => String(n).padStart(2, "0");

const CLASS_SELECT = `
  SELECT c.*, u.name AS teacher_name,
    (SELECT COUNT(*) FROM class_members cm
       WHERE cm.class_id = c.id AND cm.left_at IS NULL) AS member_count,
    (SELECT COUNT(*) FROM sessions s WHERE s.class_id = c.id) AS session_count,
    (SELECT COUNT(*) FROM sessions s
       WHERE s.class_id = c.id AND s.is_live = 1 AND s.status = 'active') AS live_count,
    (SELECT s.id FROM sessions s
       WHERE s.class_id = c.id AND s.is_live = 1 AND s.status = 'active'
       ORDER BY s.id DESC LIMIT 1) AS live_session_id,
    (SELECT COUNT(*) FROM accommodation_requests ar
       WHERE ar.class_id = c.id AND ar.status = 'pending') AS accommodation_count,
    DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date_str,
    DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date_str,
    TIME_FORMAT(c.start_time, '%H:%i') AS start_time_str,
    TIME_FORMAT(c.end_time, '%H:%i') AS end_time_str
  FROM classes c
  JOIN users u ON u.id = c.teacher_id
`;

// Every date between startDate and endDate that falls on one of `days`
// (0 = Sunday ... 6 = Saturday). Throws if there are too many.
function buildMeetingDates({ days, startDate, endDate }) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const out = [];

  while (cur <= end) {
    if (days.includes(cur.getDay())) {
      out.push(
        `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`,
      );
      if (out.length > MAX_MEETINGS) {
        throw new Error(
          `That is more than ${MAX_MEETINGS} meetings. Choose a shorter date range.`,
        );
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function createClass(
  teacherId,
  title,
  description = "",
  schedule = null,
) {
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
    `INSERT INTO classes
       (teacher_id, class_code, title, description, status,
        meeting_days, start_time, end_time, start_date, end_date)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [
      teacherId,
      code,
      title,
      description,
      schedule ? schedule.days.join(",") : null,
      schedule ? `${schedule.startTime}:00` : null,
      schedule ? `${schedule.endTime}:00` : null,
      schedule ? schedule.startDate : null,
      schedule ? schedule.endDate : null,
    ],
  );
  return getClassById(result.insertId);
}

// One session row per weekly meeting.
async function generateClassSessions(cls, schedule, dates) {
  for (const date of dates) {
    const [y, m, d] = date.split("-").map(Number);
    const title = new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    await createSession(cls.teacher_id, title, cls.description || "", {
      classId: cls.id,
      scheduledStart: `${date} ${schedule.startTime}:00`,
      scheduledEnd: `${date} ${schedule.endTime}:00`,
    });
  }
  return dates.length;
}

const toSql = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// Go Live from the class front: use the live session, else today's meeting,
// else start an unscheduled one right now.
async function getOrCreateTodaySession(cls) {
  const [rows] = await pool.query(
    `SELECT id FROM sessions
     WHERE class_id = ? AND status = 'active'
       AND (is_live = 1 OR DATE(scheduled_start) = CURDATE())
     ORDER BY is_live DESC, scheduled_start ASC
     LIMIT 1`,
    [cls.id],
  );
  if (rows[0]) return rows[0].id;

  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const label = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const s = await createSession(
    cls.teacher_id,
    `Live class · ${label}`,
    cls.description || "",
    { classId: cls.id, scheduledStart: toSql(now), scheduledEnd: toSql(end) },
  );
  return s.id;
}

// Documents belong to the class. They are stored against one "anchor"
// session of the class so the existing documents table keeps working.
async function getMaterialsSession(cls) {
  const [rows] = await pool.query(
    `SELECT id FROM sessions
     WHERE class_id = ? AND status = 'active'
     ORDER BY COALESCE(scheduled_start, created_at) DESC
     LIMIT 1`,
    [cls.id],
  );
  if (rows[0]) return rows[0].id;
  const s = await createSession(
    cls.teacher_id,
    "Class materials",
    cls.description || "",
    { classId: cls.id },
  );
  return s.id;
}

async function getClassDocuments(classId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.filename, d.mime_type, d.session_id, d.created_at,
            CHAR_LENGTH(d.extracted_text) AS text_length
     FROM documents d
     JOIN sessions s ON s.id = d.session_id
     WHERE s.class_id = ?
     ORDER BY d.created_at DESC`,
    [classId],
  );
  return rows;
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

// Adds one extra session (kept for the API; the app no longer shows a button).
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
  buildMeetingDates,
  createClass,
  generateClassSessions,
  getOrCreateTodaySession,
  getMaterialsSession,
  getClassDocuments,
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
