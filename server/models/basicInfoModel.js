//basicInfoModel.js
const pool = require("../config/db");

async function getBasicInfoByUserId(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM student_basic_info WHERE user_id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function upsertBasicInfo(userId, data) {
  await pool.query(
    `INSERT INTO student_basic_info
      (user_id, year_level, age, date_of_birth, course, section)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       year_level = VALUES(year_level),
       age = VALUES(age),
       date_of_birth = VALUES(date_of_birth),
       course = VALUES(course),
       section = VALUES(section)`,
    [
      userId,
      data.yearLevel,
      data.age,
      data.dateOfBirth,
      data.course,
      data.section,
    ],
  );

  return getBasicInfoByUserId(userId);
}

module.exports = { getBasicInfoByUserId, upsertBasicInfo };
