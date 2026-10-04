// server/services/calendarSyncService.js
//
// Keeps students' schedule_items in step with classes.
//   - source_type 'session'      -> one row per student per scheduled class session
//   - source_type 'class_post'   -> one row per student per teacher exam/assignment
//   - source_type 'announcement' -> one row per recipient for an announcement deadline
//
// Session/post inserts are idempotent (LEFT JOIN anti-check), so calling a
// sync twice never creates duplicates.
const pool = require("../config/db");

const SESSION_INSERT = `
  INSERT INTO schedule_items
    (user_id, title, subject, start_time, end_time, location, teacher_name,
     type, source_type, source_id)
  SELECT cm.user_id,
         LEFT(c.title, 150),
         LEFT(s.title, 150),
         s.scheduled_start,
         COALESCE(s.scheduled_end, DATE_ADD(s.scheduled_start, INTERVAL 1 HOUR)),
         NULL,
         LEFT(t.name, 150),
         'class', 'session', s.id
  FROM sessions s
  JOIN classes c ON c.id = s.class_id
  JOIN users t ON t.id = c.teacher_id
  JOIN class_members cm ON cm.class_id = c.id AND cm.left_at IS NULL
  JOIN users u ON u.id = cm.user_id AND u.role = 'student'
  LEFT JOIN schedule_items ex
         ON ex.user_id = cm.user_id
        AND ex.source_type = 'session'
        AND ex.source_id = s.id
  WHERE s.scheduled_start IS NOT NULL
    AND s.status = 'active'
    AND ex.id IS NULL
`;

const POST_INSERT = `
  INSERT INTO schedule_items
    (user_id, title, subject, start_time, end_time, location, teacher_name,
     type, source_type, source_id)
  SELECT cm.user_id,
         p.title,
         LEFT(c.title, 150),
         p.start_time,
         p.end_time,
         p.location,
         LEFT(t.name, 150),
         p.type, 'class_post', p.id
  FROM class_calendar_posts p
  JOIN classes c ON c.id = p.class_id
  JOIN users t ON t.id = p.teacher_id
  JOIN class_members cm ON cm.class_id = p.class_id AND cm.left_at IS NULL
  JOIN users u ON u.id = cm.user_id AND u.role = 'student'
  LEFT JOIN schedule_items ex
         ON ex.user_id = cm.user_id
        AND ex.source_type = 'class_post'
        AND ex.source_id = p.id
  WHERE ex.id IS NULL
`;

// A new scheduled session -> every current member's calendar.
async function syncSessionForMembers(sessionId) {
  const [r] = await pool.query(`${SESSION_INSERT} AND s.id = ?`, [sessionId]);
  return r.affectedRows;
}

// A new teacher post -> every current member's calendar.
async function syncPostForMembers(postId) {
  const [r] = await pool.query(`${POST_INSERT} AND p.id = ?`, [postId]);
  return r.affectedRows;
}

// A student just joined (or re-joined) a class: give them the upcoming
// sessions and posts that already exist.
async function syncClassForUser(classId, userId) {
  const [a] = await pool.query(
    `${SESSION_INSERT}
       AND s.class_id = ? AND cm.user_id = ?
       AND s.scheduled_start >= CURDATE()`,
    [classId, userId],
  );
  const [b] = await pool.query(
    `${POST_INSERT}
       AND p.class_id = ? AND cm.user_id = ?
       AND p.start_time >= CURDATE()`,
    [classId, userId],
  );
  return a.affectedRows + b.affectedRows;
}

// A student left a class: take that class's items off their calendar.
async function removeClassForUser(classId, userId) {
  await pool.query(
    `DELETE si FROM schedule_items si
     JOIN sessions s ON s.id = si.source_id
     WHERE si.user_id = ? AND si.source_type = 'session' AND s.class_id = ?`,
    [userId, classId],
  );
  await pool.query(
    `DELETE si FROM schedule_items si
     JOIN class_calendar_posts p ON p.id = si.source_id
     WHERE si.user_id = ? AND si.source_type = 'class_post' AND p.class_id = ?`,
    [userId, classId],
  );
}

// An announcement with a deadline -> a "Due" item on every recipient's calendar.
async function addAnnouncementDeadline(
  announcementId,
  recipientIds,
  { title, subject, deadline, teacherName },
) {
  const ids = [...new Set((recipientIds || []).map(Number))].filter(Boolean);
  if (ids.length === 0) return 0;

  const values = ids.map((userId) => [
    userId,
    String(title).slice(0, 150),
    subject ? String(subject).slice(0, 150) : null,
    deadline,
    deadline, // a deadline is a single point in time
    null,
    teacherName ? String(teacherName).slice(0, 150) : null,
    "assignment",
    "announcement",
    announcementId,
  ]);

  const [r] = await pool.query(
    `INSERT INTO schedule_items
       (user_id, title, subject, start_time, end_time, location, teacher_name,
        type, source_type, source_id)
     VALUES ?`,
    [values],
  );
  return r.affectedRows;
}

module.exports = {
  syncSessionForMembers,
  syncPostForMembers,
  syncClassForUser,
  removeClassForUser,
  addAnnouncementDeadline,
};
