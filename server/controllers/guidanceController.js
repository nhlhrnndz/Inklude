const {
  getAllStudents,
  getStudentById,
  getStudentAttendance,
  getStudentTranscripts,
  getDashboardStats,
} = require("../models/guidanceModel");

// GET /api/guidance/students?disability=Autism&search=juan
async function getStudentsController(req, res) {
  try {
    const userRole = req.user.role;

    if (userRole !== "guidance" && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const { disability, search } = req.query;

    const students = await getAllStudents(disability, search);

    res.json({
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        createdAt: s.created_at,
        disabilityTypes: s.disability_types
          ? JSON.parse(s.disability_types)
          : [],
        accessibilityPreferences: s.accessibility_preferences
          ? JSON.parse(s.accessibility_preferences)
          : {},
      })),
    });
  } catch (err) {
    console.error("getStudentsController error:", err);
    res.status(500).json({ message: "Server error while fetching students." });
  }
}

// GET /api/guidance/students/:id
async function getStudentDetailController(req, res) {
  try {
    const userRole = req.user.role;
    const studentId = req.params.id;

    if (userRole !== "guidance" && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const student = await getStudentById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const attendance = await getStudentAttendance(studentId);
    const transcripts = await getStudentTranscripts(studentId);

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        createdAt: student.created_at,
        disabilityTypes: student.disability_types
          ? JSON.parse(student.disability_types)
          : [],
        accessibilityPreferences: student.accessibility_preferences
          ? JSON.parse(student.accessibility_preferences)
          : {},
      },
      attendance: attendance.map((a) => ({
        sessionId: a.id,
        sessionCode: a.session_code,
        title: a.title,
        status: a.status,
        teacherName: a.teacher_name,
        joinedAt: a.joined_at,
        leftAt: a.left_at,
      })),
      transcripts: transcripts.map((t) => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        sessionTitle: t.session_title,
        sessionCode: t.session_code,
      })),
    });
  } catch (err) {
    console.error("getStudentDetailController error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching student detail." });
  }
}

// GET /api/guidance/stats
async function getStatsController(req, res) {
  try {
    const userRole = req.user.role;

    if (userRole !== "guidance" && userRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const stats = await getDashboardStats();
    res.json({ stats });
  } catch (err) {
    console.error("getStatsController error:", err);
    res.status(500).json({ message: "Server error while fetching stats." });
  }
}

module.exports = {
  getStudentsController,
  getStudentDetailController,
  getStatsController,
};
