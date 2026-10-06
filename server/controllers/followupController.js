// server/controllers/followupController.js
const { getStudentById } = require("../models/guidanceModel");
const {
  toDto,
  getFollowupById,
  createFollowup,
  hasActiveFollowup,
  getFollowupsForStudent,
  completeFollowup,
} = require("../models/followupModel");

const REASONS = [
  "Accessibility concern",
  "Repeated class difficulty",
  "Teacher referral",
  "Academic concern",
  "Adjustment",
  "Personal concern",
  "Other",
];

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

const FORBIDDEN = { message: "Only guidance counselors can do this." };

// GET /api/guidance/students/:id/followups
async function listStudentFollowupsController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(FORBIDDEN);

    const rows = await getFollowupsForStudent(req.params.id);
    res.json({ followups: rows.map(toDto) });
  } catch (err) {
    console.error("listStudentFollowups error:", err);
    res.status(500).json({ message: "Server error while loading follow-ups." });
  }
}

// POST /api/guidance/students/:id/followups   body: { reason, note? }
async function createFollowupController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(FORBIDDEN);

    const { reason } = req.body;
    const note = req.body.note
      ? String(req.body.note).trim().slice(0, 500)
      : "";

    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Choose a reason." });
    }

    const student = await getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (await hasActiveFollowup(student.id, reason)) {
      return res.status(400).json({
        message:
          "This student already has an active follow-up for that reason.",
      });
    }

    const followup = await createFollowup({
      studentId: student.id,
      createdBy: req.user.id,
      reason,
      note,
    });

    res
      .status(201)
      .json({ message: "Follow-up added.", followup: toDto(followup) });
  } catch (err) {
    console.error("createFollowup error:", err);
    res.status(500).json({ message: "Server error while adding follow-up." });
  }
}

// PATCH /api/guidance/followups/:id/complete   body: { note? }
async function completeFollowupController(req, res) {
  try {
    if (!isGuidance(req)) return res.status(403).json(FORBIDDEN);

    const existing = await getFollowupById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Follow-up not found." });
    }
    if (existing.status !== "active") {
      return res
        .status(400)
        .json({ message: "This follow-up is already completed." });
    }

    const note = req.body.note
      ? String(req.body.note).trim().slice(0, 255)
      : "";
    await completeFollowup(existing.id, req.user.id, note);

    const fresh = await getFollowupById(existing.id);
    res.json({ message: "Follow-up completed.", followup: toDto(fresh) });
  } catch (err) {
    console.error("completeFollowup error:", err);
    res
      .status(500)
      .json({ message: "Server error while completing follow-up." });
  }
}

module.exports = {
  listStudentFollowupsController,
  createFollowupController,
  completeFollowupController,
};
