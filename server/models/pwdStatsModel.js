const db = require("../config/db");
const { getCollegeCodeForCourse } = require("../constants/colleges");

const FROM_NEEDS = `
  FROM student_support_needs n
  JOIN users u ON u.id = n.user_id AND u.role = 'student'
`;

async function getPwdStats() {
  // Get the number of students with support needs per course.
  // A student is counted only once per course.
  const [courseRows] = await db.query(
    `SELECT b.course AS course, COUNT(DISTINCT n.user_id) AS total
     ${FROM_NEEDS}
     LEFT JOIN student_basic_info b ON b.user_id = n.user_id
     GROUP BY b.course`,
  );

  // Count support-needs categories.
  const [needRows] = await db.query(
    `SELECT n.need AS need, COUNT(*) AS count
     ${FROM_NEEDS}
     GROUP BY n.need
     ORDER BY count DESC`,
  );

  // Total number of distinct students with support needs.
  const [totalRows] = await db.query(
    `SELECT COUNT(DISTINCT n.user_id) AS total
     ${FROM_NEEDS}`,
  );

  // Convert each course into its corresponding college.
  // A student has one course, so summing the distinct student counts
  // by course produces the college totals.
  const collegeTotals = {};

  courseRows.forEach((row) => {
    const college = getCollegeCodeForCourse(row.course);

    collegeTotals[college] =
      (collegeTotals[college] || 0) + Number(row.total);
  });

  return {
    totalPwd: Number(totalRows[0]?.total) || 0,

    byCollege: Object.entries(collegeTotals)
      .map(([college, total]) => ({
        college,
        total,
      }))
      .sort((a, b) => b.total - a.total),

    byCategory: needRows.map((row) => ({
      need: row.need,
      count: Number(row.count),
    })),
  };
}

module.exports = {
  getPwdStats,
};