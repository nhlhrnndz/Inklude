// constants/courses.ts

export type College = {
  code: string;
  name: string;
  courses: string[];
};

export const COLLEGES: College[] = [
  {
    code: "CABEIHM",
    name: "College of Accountancy, Business, Economics, Innkeeping, and Hospitality Management",
    courses: [
      "BS Accountancy",
      "BS Management Accounting",
      "BS Business Administration - Financial Management",
      "BS Business Administration - HR Management",
      "BS Business Administration - Marketing Management",
      "BS Hospitality Management",
      "BS Tourism Management",
    ],
  },
  {
    code: "CAS",
    name: "College of Arts and Sciences",
    courses: [
      "BA Communication",
      "BS Psychology",
      "BS Fisheries and Aquatic Sciences",
      "BS Food Technology",
    ],
  },
  {
    code: "CCJE",
    name: "College of Criminal Justice Education",
    courses: ["BS Criminology"],
  },
  {
    code: "CHS",
    name: "College of Health Sciences",
    courses: ["BS Nursing", "BS Nutrition and Dietetics"],
  },
  {
    code: "CICS",
    name: "College of Informatics and Computing Sciences",
    courses: ["BS Information Technology"],
  },
  {
    code: "CTE",
    name: "College of Teacher Education",
    courses: [
      "BEEd",
      "BPEd",
      "BSEd - English",
      "BSEd - Science",
      "BSEd - Mathematics",
      "BSEd - Filipino",
      "BSEd - Social Studies",
    ],
  },
];

export const ALL_COURSES: string[] = COLLEGES.reduce<string[]>(
  (all, college) => [...all, ...college.courses],
  [],
);

export function getCollegeForCourse(course?: string | null): College | null {
  if (!course) return null;
  return COLLEGES.find((c) => c.courses.includes(course)) ?? null;
}

export function getCollegeCodeForCourse(course?: string | null): string {
  return getCollegeForCourse(course)?.code ?? "Other";
}
