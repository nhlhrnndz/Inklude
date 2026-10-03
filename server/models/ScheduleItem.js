//server\models\ScheduleItem.js
const pool = require("../config/db");

async function createScheduleItem(
  userId,
  {
    title,
    subject,
    startTime,
    endTime,
    location,
    teacherName,
    type = "class",
    sourceType = null,
    sourceId = null,
  },
) {
  const [result] = await pool.query(
    `INSERT INTO schedule_items
       (user_id, title, subject, start_time, end_time, location, teacher_name,
        type, source_type, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title,
      subject || null,
      startTime,
      endTime,
      location || null,
      teacherName || null,
      type,
      sourceType,
      sourceId,
    ],
  );
  const [rows] = await pool.query("SELECT * FROM schedule_items WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function getTodayForUser(userId) {
  const [rows] = await pool.query(
    `SELECT * FROM schedule_items
     WHERE user_id = ? AND DATE(start_time) = CURDATE()
     ORDER BY start_time ASC`,
    [userId],
  );
  return rows;
}

async function getWeekForUser(userId) {
  const [rows] = await pool.query(
    `SELECT * FROM schedule_items
     WHERE user_id = ?
       AND start_time >= CURDATE()
       AND start_time < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY start_time ASC`,
    [userId],
  );
  return rows;
}

// Student-initiated delete. Items created by another module
// (appointments, later events) are managed by that module, not removed here.
async function deleteScheduleItem(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM schedule_items WHERE id = ? AND user_id = ? AND source_type IS NULL",
    [id, userId],
  );
  return result.affectedRows > 0;
}

// System delete: remove the calendar item(s) that belong to a source record.
async function deleteBySource(sourceType, sourceId) {
  const [result] = await pool.query(
    "DELETE FROM schedule_items WHERE source_type = ? AND source_id = ?",
    [sourceType, sourceId],
  );
  return result.affectedRows;
}

module.exports = {
  createScheduleItem,
  getTodayForUser,
  getWeekForUser,
  deleteScheduleItem,
  deleteBySource,
};
