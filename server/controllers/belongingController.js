// server/controllers/belongingController.js
const { getStudentById } = require("../models/guidanceModel");
const {
  getOrCreateThreadForStudent,
  addMessage,
  updateThreadMeta,
} = require("../models/messageModel");
const {
  buildBelongingSnapshot,
  logOutreach,
  getOutreachHistory,
} = require("../models/belongingModel");
const { notifyUser } = require("../services/notificationService");

const OUTREACH_MODES = ["template", "edited", "custom"];
const MAX_MESSAGE_LENGTH = 1000;

function isGuidance(req) {
  return req.user.role === "guidance" || req.user.role === "admin";
}

function formatOutreach(o) {
  return {
    id: o.id,
    mode: o.mode,
    templateKey: o.template_key,
    sentAt: o.created_at,
    guidanceName: o.guidance_name,
    body: o.body ?? null,
  };
}

// GET /api/guidance/students/:id/belonging
async function getStudentBelongingController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const student = await getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const [belonging, outreach] = await Promise.all([
      buildBelongingSnapshot(student.id),
      getOutreachHistory(student.id, 5),
    ]);

    res.json({
      belonging,
      outreach: outreach.map(formatOutreach),
    });
  } catch (err) {
    console.error("getStudentBelongingController error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching belonging data." });
  }
}

// POST /api/guidance/students/:id/reach-out
// body: { body: string, mode?: "template" | "edited" | "custom", templateKey?: string }
async function postReachOutController(req, res) {
  try {
    if (!isGuidance(req)) {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can do this." });
    }

    const student = await getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const text = typeof req.body.body === "string" ? req.body.body.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
      });
    }

    const mode = OUTREACH_MODES.includes(req.body.mode)
      ? req.body.mode
      : "custom";

    const templateKey =
      typeof req.body.templateKey === "string" && req.body.templateKey
        ? req.body.templateKey.slice(0, 40)
        : null;

    // Reuse the student's single guidance thread so this shows up in
    // their normal Messages screen and the guidance inbox.
    const thread = await getOrCreateThreadForStudent(
      student.id,
      "concern",
      false,
    );

    if (thread.status !== "in_progress") {
      await updateThreadMeta(thread.id, { status: "in_progress" });
    }

    const message = await addMessage(thread.id, req.user.id, "guidance", text);

    // Logging must never block delivery of the message itself.
    try {
      await logOutreach({
        studentId: student.id,
        guidanceId: req.user.id,
        threadId: thread.id,
        messageId: message.id,
        mode,
        templateKey,
      });
    } catch (logErr) {
      console.error("logOutreach failed (message was still sent):", logErr);
    }

    await notifyUser(student.id, {
      type: "message",
      title: "Message from Guidance",
      body: text.slice(0, 120),
      sourceType: "message_thread",
      sourceId: thread.id,
      senderId: req.user.id,
    });

    const outreach = await getOutreachHistory(student.id, 5);

    res.json({
      message: "Message sent.",
      threadId: thread.id,
      outreach: outreach.map(formatOutreach),
    });
  } catch (err) {
    console.error("postReachOutController error:", err);
    res.status(500).json({ message: "Server error while sending message." });
  }
}

module.exports = {
  getStudentBelongingController,
  postReachOutController,
};
