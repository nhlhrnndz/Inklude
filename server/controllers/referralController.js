// server/controllers/referralController.js
const {
  toDto,
  getReferralById,
  createReferral,
  hasOpenReferral,
  getReferralsForStudent,
  getReferralsForTeacher,
  acknowledgeReferral,
  respondToReferral,
} = require("../models/referralModel");
const {
  getClassById,
  getStudentClasses,
  isClassMember,
} = require("../models/classModel");
const { getStudentById } = require("../models/guidanceModel");
const { notifyUser } = require("../services/notificationService");

const CONCERNS = [
  "Accessibility concern",
  "Class participation",
  "Academic difficulty",
  "Communication support",
  "Other",
];

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

const GUIDANCE_ONLY = { message: "Only guidance counselors can do this." };
const TEACHER_ONLY = { message: "Only teachers can do this." };

function preview(text, max = 120) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

// ---------- guidance ----------

// GET /api/referrals/student/:studentId/classes
// The student's active classes, so Guidance can pick the related class.
async function listStudentClassesController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(GUIDANCE_ONLY);

    const student = await getStudentById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const rows = await getStudentClasses(student.id);
    res.json({
      classes: rows
        .filter((c) => c.status === "active")
        .map((c) => ({
          id: c.id,
          title: c.title,
          code: c.class_code,
          teacherName: c.teacher_name,
        })),
    });
  } catch (err) {
    console.error("listStudentClasses error:", err);
    res.status(500).json({ message: "Server error while loading classes." });
  }
}

// GET /api/referrals/student/:studentId
async function listForStudentController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(GUIDANCE_ONLY);

    const rows = await getReferralsForStudent(req.params.studentId);
    res.json({ referrals: rows.map(toDto) });
  } catch (err) {
    console.error("listForStudent error:", err);
    res.status(500).json({ message: "Server error while loading referrals." });
  }
}

// POST /api/referrals   body: { studentId, classId, concern, note? }
async function createReferralController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(GUIDANCE_ONLY);

    const { studentId, classId, concern } = req.body;
    const note = req.body.note
      ? String(req.body.note).trim().slice(0, 500)
      : "";

    if (!CONCERNS.includes(concern)) {
      return res.status(400).json({ message: "Choose a concern." });
    }

    const student = await getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const cls = await getClassById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found." });
    }
    if (cls.status !== "active") {
      return res.status(400).json({ message: "This class is archived." });
    }
    if (!(await isClassMember(cls.id, student.id))) {
      return res
        .status(400)
        .json({ message: "That student is not enrolled in this class." });
    }

    if (await hasOpenReferral(student.id, cls.id, concern)) {
      return res.status(400).json({
        message:
          "There is already an open referral for this student, class and concern.",
      });
    }

    const referral = await createReferral({
      studentId: student.id,
      classId: cls.id,
      guidanceId: req.user.id,
      teacherId: cls.teacher_id,
      concern,
      note,
    });

    // Teacher: sees the class, concern and Guidance's note.
    await notifyUser(cls.teacher_id, {
      type: "support_referral",
      title: "New Guidance support referral",
      body: `${student.name} • ${cls.title}: ${concern}`,
      sourceType: "support_referral",
      sourceId: referral.id,
      senderId: req.user.id,
    });

    // Student: informed that a referral was sent. The note is not included.
    await notifyUser(student.id, {
      type: "support_referral_notice",
      title: "Guidance sent a support referral",
      body: `Guidance asked your teacher for ${cls.title} to follow up about: ${concern}. You can message Guidance if you have questions.`,
      sourceType: "support_referral_notice",
      sourceId: referral.id,
      senderId: req.user.id,
    });

    res
      .status(201)
      .json({ message: "Referral sent.", referral: toDto(referral) });
  } catch (err) {
    console.error("createReferral error:", err);
    res.status(500).json({ message: "Server error while sending referral." });
  }
}

// ---------- teacher ----------

// GET /api/referrals/mine
async function listMineController(req, res) {
  try {
    if (req.user.role !== "teacher") return res.status(403).json(TEACHER_ONLY);

    const rows = await getReferralsForTeacher(req.user.id);
    res.json({ referrals: rows.map(toDto) });
  } catch (err) {
    console.error("listMine error:", err);
    res.status(500).json({ message: "Server error while loading referrals." });
  }
}

async function loadOwnReferral(req, res) {
  const referral = await getReferralById(req.params.id);
  if (!referral || referral.teacher_id !== req.user.id) {
    res.status(404).json({ message: "Referral not found." });
    return null;
  }
  return referral;
}

// PATCH /api/referrals/:id/acknowledge
async function acknowledgeController(req, res) {
  try {
    if (req.user.role !== "teacher") return res.status(403).json(TEACHER_ONLY);

    const referral = await loadOwnReferral(req, res);
    if (!referral) return;

    if (referral.status !== "sent") {
      return res
        .status(400)
        .json({ message: "This referral was already acknowledged." });
    }

    await acknowledgeReferral(referral.id);

    await notifyUser(referral.guidance_id, {
      type: "support_referral",
      title: "Referral acknowledged",
      body: `${req.user.name || "The teacher"} acknowledged the referral for ${referral.student_name} (${referral.class_title}).`,
      sourceType: "support_referral",
      sourceId: referral.id,
      senderId: req.user.id,
    });

    const fresh = await getReferralById(referral.id);
    res.json({ message: "Acknowledged.", referral: toDto(fresh) });
  } catch (err) {
    console.error("acknowledge error:", err);
    res.status(500).json({ message: "Server error while acknowledging." });
  }
}

// PATCH /api/referrals/:id/respond   body: { message }
async function respondController(req, res) {
  try {
    if (req.user.role !== "teacher") return res.status(403).json(TEACHER_ONLY);

    const referral = await loadOwnReferral(req, res);
    if (!referral) return;

    const message = String(req.body.message || "")
      .trim()
      .slice(0, 500);
    if (!message) {
      return res.status(400).json({ message: "Write a short reply." });
    }
    if (referral.status === "responded") {
      return res
        .status(400)
        .json({ message: "You already replied to this referral." });
    }

    await respondToReferral(referral.id, message);

    await notifyUser(referral.guidance_id, {
      type: "support_referral",
      title: "Teacher replied to a referral",
      body: `${referral.student_name} (${referral.class_title}): ${preview(message)}`,
      sourceType: "support_referral",
      sourceId: referral.id,
      senderId: req.user.id,
    });

    const fresh = await getReferralById(referral.id);
    res.json({ message: "Reply sent.", referral: toDto(fresh) });
  } catch (err) {
    console.error("respond error:", err);
    res.status(500).json({ message: "Server error while replying." });
  }
}

module.exports = {
  listStudentClassesController,
  listForStudentController,
  createReferralController,
  listMineController,
  acknowledgeController,
  respondController,
};
