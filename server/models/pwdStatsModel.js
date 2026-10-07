// server/models/pwdStatsModel.js
// PWD statistics for the Guidance dashboard and exports.
// Source: student_support_needs (onboarding) + student_basic_info (course).
const pool = require("../config/db");

// Keep in sync with constants/courses.ts
const COLLEGE_COURSES = {
  CABEIHM: [
    "BS Accountancy",
    "BS Management Accounting",
    "BS Business Administration - Financial Management",
    "BS Business Administration - HR Management",
    "BS Business Administration - Marketing Management",
    "BS Hospitality Management",
    "BS Tourism Management",
  ],
  CAS: [
    "BA Communication",
    "BS Psychology",
    "BS Fisheries and Aquatic Sciences",
    "BS Food Technology",
  ],
  CCJE: ["BS Criminology"],
  CHS: ["BS Nursing", "BS Nutrition and Dietetics"],
  CICS: ["BS Information Technology"],
  CTE: [
    "BEEd",
    "BPEd",
    "BSEd - English",
    "BSEd - Science",
    "BSEd - Mathematics",
    "BSEd - Filipino",
    "BSEd - Social Studies",
  ],
};

const COLLEGE_ORDER = ["CABEIHM", "CAS", "CCJE", "CHS", "CICS", "CTE"];
const NO_COLLEGE = "No course yet";

function collegeForCourse(course) {
  if (!course) return NO_COLLEGE;
  const code = COLLEGE_ORDER.find((c) => COLLEGE_COURSES[c].includes(course));
  return code || NO_COLLEGE;
}

// totalPwd          distinct students with at least one support need
// byCollege         distinct students per college (each student counted once)
// byCategory        selections per support need (a student with two needs
//                   counts once in each, so the total can exceed totalPwd)
// byCollegeAndCategory  same selections split by college (for exports)
async function getPwdStats() {
  const [rows] = await pool.query(
    `SELECT n.user_id, n.need, bi.course
     FROM student_support_needs n
     JOIN users u ON u.id = n.user_id AND u.role = 'student'
     LEFT JOIN student_basic_info bi ON bi.user_id = n.user_id`,
  );

  // One entry per student: their college and their set of needs
  const students = new Map();
  rows.forEach((r) => {
    if (!students.has(r.user_id)) {
      students.set(r.user_id, {
        college: collegeForCourse(r.course),
        needs: new Set(),
      });
    }
    students.get(r.user_id).needs.add(r.need);
  });

  const collegeTotals = new Map(COLLEGE_ORDER.map((c) => [c, 0]));
  const needTotals = new Map();
  const pairTotals = new Map();

  students.forEach((s) => {
    collegeTotals.set(s.college, (collegeTotals.get(s.college) || 0) + 1);

    s.needs.forEach((need) => {
      needTotals.set(need, (needTotals.get(need) || 0) + 1);
      const key = `${s.college}||${need}`;
      pairTotals.set(key, (pairTotals.get(key) || 0) + 1);
    });
  });

  const byCollege = [...collegeTotals.entries()]
    .filter(([college, total]) => COLLEGE_ORDER.includes(college) || total > 0)
    .map(([college, total]) => ({ college, total }));

  const byCategory = [...needTotals.entries()]
    .map(([need, count]) => ({ need, count }))
    .sort((a, b) => b.count - a.count || a.need.localeCompare(b.need));

  const byCollegeAndCategory = [...pairTotals.entries()].map(([key, count]) => {
    const [college, need] = key.split("||");
    return { college, need, count };
  });

  return {
    totalPwd: students.size,
    byCollege,
    byCategory,
    byCollegeAndCategory,
  };
}

module.exports = { getPwdStats };
