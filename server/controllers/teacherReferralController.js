// server/controllers/teacherReferralController.js
// Teacher -> Guidance referrals. Silent: the student is NOT notified.
// Every referral keeps who sent it and when (teacher_id + created_at).
const pool = require("../config/db");
const { getClassById, isClassMember } = require("../models/classModel");
const {
  toDto,
  toTeacherSentDto,
  getReferralById,
  createReferral,
  hasOpenReferral,
  getReferralsSentByTeacher,
  getTeacherReferrals,
  updateGuidanceStatus,
} = require("../models/referralModel");
const {
  hasActiveFollowup,
  createFollowup,
} = require("../models/followupModel");
const { notifyUsers, notifyUser } = require("../services/notificationService");

// Categories only. No free-text mental-health labels.
const CATEGORIES = [
  "Struggling academically",
  "Attendance concerns",
  "Seems withdrawn or distressed",
  "Communication difficulty",
  "Accessibility barrier in class",
  "Other",
];

const GUIDANCE_STATUSES = ["acknowledged", "in_progress", "completed"];
const NOTE_MAX = 300;
const FOLLOWUP_REASON = "Teacher referral";

// POST /api/referrals/to-guidance  (teacher)
// body: { studentId, classId, concern, note?, alreadySpoke }
async function createTeacherReferralController(req, res) {
  try {
    const studentId = Number(req.body.studentId);
    const classId = Number(req.body.classId);
    const concern = String(req.body.concern || "");
    const note = req.body.note
      ? String(req.body.note).trim().slice(0, NOTE_MAX)
      : "";
    const alreadySpoke = req.body.alreadySpoke === true;

    if (!studentId || !classId || !CATEGORIES.includes(concern)) {
      return res
        .status(400)
        .json({ message: "Choose a student, a class and a concern." });
    }

    const cls = await getClassById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found." });
    if (cls.teacher_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only refer students in your own class." });
    }
    if (!(await isClassMember(classId, studentId))) {
      return res
        .status(403)
        .json({ message: "That student is not in this class." });
    }

    if (
      await hasOpenReferral(studentId, classId, concern, "teacher_to_guidance")
    ) {
      return res.status(400).json({
        message:
          "You already have an open referral for this student and concern.",
      });
    }

    const referral = await createReferral({
      studentId,
      classId,
      guidanceId: null,
      teacherId: req.user.id,
      concern,
      note,
      direction: "teacher_to_guidance",
      alreadySpoke,
    });

    // Show it in Guidance's Active Follow-Ups (never blocks the referral)
    try {
      if (!(await hasActiveFollowup(studentId, FOLLOWUP_REASON))) {
        await createFollowup({
          studentId,
          createdBy: null,
          reason: FOLLOWUP_REASON,
          note: `Added automatically from a teacher referral (${concern}) in ${referral.class_title}.`,
        });
      }
    } catch (err) {
      console.error("teacher referral follow-up error:", err);
    }

    // Notify Guidance only. The student is deliberately NOT notified.
    try {
      const [rows] = await pool.query(
        "SELECT id FROM users WHERE role IN ('guidance', 'admin')",
      );
      await notifyUsers(
        rows.map((r) => r.id),
        {
          type: "support_referral",
          title: "New teacher referral",
          body: `A teacher referred a student in ${referral.class_title}: ${concern}.`,
          sourceType: "support_referral",
          sourceId: referral.id,
          senderId: req.user.id,
        },
      );
    } catch (err) {
      console.error("teacher referral notify error:", err);
    }

    res.status(201).json({
      message: "Referral sent to Guidance.",
      referral: toTeacherSentDto(referral),
    });
  } catch (err) {
    console.error("createTeacherReferral error:", err);
    res.status(500).json({ message: "Server error while sending referral." });
  }
}

// GET /api/referrals/sent  (teacher) status only, no Guidance notes
async function listSentController(req, res) {
  try {
    const rows = await getReferralsSentByTeacher(req.user.id);
    res.json({ referrals: rows.map(toTeacherSentDto) });
  } catch (err) {
    console.error("listSent error:", err);
    res.status(500).json({ message: "Server error while loading referrals." });
  }
}

// GET /api/referrals/teacher-referrals?status=sent  (guidance)
async function listTeacherReferralsController(req, res) {
  try {
    const status = req.query.status ? String(req.query.status) : "";
    const rows = await getTeacherReferrals(status || null);
    res.json({ referrals: rows.map(toDto) });
  } catch (err) {
    console.error("listTeacherReferrals error:", err);
    res.status(500).json({ message: "Server error while loading referrals." });
  }
}

// PATCH /api/referrals/:id/guidance-status  (guidance)
// body: { status: "acknowledged" | "in_progress" | "completed", note? }
async function updateGuidanceStatusController(req, res) {
  try {
    const status = String(req.body.status || "");
    const note = req.body.note
      ? String(req.body.note).trim().slice(0, 500)
      : "";

    if (!GUIDANCE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Choose a valid status." });
    }

    const existing = await getReferralById(Number(req.params.id));
    if (!existing || existing.direction !== "teacher_to_guidance") {
      return res.status(404).json({ message: "Referral not found." });
    }
    if (existing.status === "completed") {
      return res
        .status(400)
        .json({ message: "This referral is already completed." });
    }

    const ok = await updateGuidanceStatus(
      existing.id,
      status,
      req.user.id,
      note,
    );
    if (!ok) {
      return res.status(400).json({ message: "Could not update referral." });
    }

    // Tell the teacher the status only (never the note)
    try {
      if (status === "acknowledged" || status === "completed") {
        await notifyUser(existing.teacher_id, {
          type: "support_referral",
          title: "Guidance update",
          body:
            status === "completed"
              ? "Guidance marked your referral as completed."
              : "Guidance acknowledged your referral.",
          sourceType: "support_referral",
          sourceId: existing.id,
          senderId: req.user.id,
        });
      }
    } catch (err) {
      console.error("referral status notify error:", err);
    }

    const fresh = await getReferralById(existing.id);
    res.json({ message: "Referral updated.", referral: toDto(fresh) });
  } catch (err) {
    console.error("updateGuidanceStatus error:", err);
    res.status(500).json({ message: "Server error while updating referral." });
  }
}

module.exports = {
  CATEGORIES,
  createTeacherReferralController,
  listSentController,
  listTeacherReferralsController,
  updateGuidanceStatusController,
};
