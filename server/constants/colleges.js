const COLLEGES = {
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

function getCollegeCodeForCourse(course) {
  if (!course) return "Other";
  for (const [code, courses] of Object.entries(COLLEGES)) {
    if (courses.includes(course)) return code;
  }
  return "Other";
}

module.exports = { COLLEGES, getCollegeCodeForCourse };