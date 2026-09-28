const pool = require("../config/db");

async function createScheduleItem(
  userId,
  { title, subject, startTime, endTime, location, teacherName },
) {
  const [result] = await pool.query(
    `INSERT INTO schedule_items (user_id, title, subject, start_time, end_time, location, teacher_name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title,
      subject || null,
      startTime,
      endTime,
      location || null,
      teacherName || null,
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

async function deleteScheduleItem(id, userId) {
  await pool.query("DELETE FROM schedule_items WHERE id = ? AND user_id = ?", [
    id,
    userId,
  ]);
}

module.exports = {
  createScheduleItem,
  getTodayForUser,
  getWeekForUser,
  deleteScheduleItem,
};
