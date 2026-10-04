// server/models/classPostModel.js
// Teacher-posted exams and assignments. Each post is copied onto every
// enrolled student's calendar by services/calendarSyncService.js.
const pool = require("../config/db");

const POST_SELECT = `
  SELECT p.*, c.title AS class_title
  FROM class_calendar_posts p
  JOIN classes c ON c.id = p.class_id
`;

async function getPostById(id) {
  const [rows] = await pool.query(`${POST_SELECT} WHERE p.id = ?`, [id]);
  return rows[0] || null;
}

async function createPost({
  classId,
  teacherId,
  type,
  title,
  location = null,
  startTime,
  endTime,
}) {
  const [result] = await pool.query(
    `INSERT INTO class_calendar_posts
       (class_id, teacher_id, type, title, location, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [classId, teacherId, type, title, location, startTime, endTime],
  );
  return getPostById(result.insertId);
}

async function getPostsForClass(classId) {
  const [rows] = await pool.query(
    `${POST_SELECT} WHERE p.class_id = ? ORDER BY p.start_time DESC LIMIT 100`,
    [classId],
  );
  return rows;
}

async function deletePost(id) {
  const [result] = await pool.query(
    "DELETE FROM class_calendar_posts WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
}

// Current student members of a class (for notifications).
async function getMemberIds(classId) {
  const [rows] = await pool.query(
    `SELECT cm.user_id AS id
     FROM class_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.class_id = ? AND cm.left_at IS NULL AND u.role = 'student'`,
    [classId],
  );
  return rows.map((r) => r.id);
}

module.exports = {
  getPostById,
  createPost,
  getPostsForClass,
  deletePost,
  getMemberIds,
};
