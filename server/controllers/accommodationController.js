// server/controllers/accommodationController.js
const {
  ACCOMMODATION_TYPES,
  TYPE_LABELS,
  getRequestById,
  createRequest,
  hasOpenRequest,
  getStudentRequests,
  getClassRequests,
  respondToRequest,
  cancelRequest,
} = require("../models/accommodationModel");
const { getClassById, isClassMember } = require("../models/classModel");
const { notifyUser } = require("../services/notificationService");

const NOTE_MAX = 300;
const REASON_MAX = 200;
const DECISIONS = ["approved", "declined", "discuss"];

function mapRequest(r, withStudent = false) {
  const base = {
    id: r.id,
    classId: r.class_id,
    type: r.type,
    typeLabel: TYPE_LABELS[r.type] || r.type,
    note: r.note || "",
    status: r.status,
    teacherResponse: r.teacher_response || "",
    respondedAt: r.responded_at,
    createdAt: r.created_at,
  };
  if (withStudent) {
    base.studentName = r.student_display_name;
    base.studentInitials = r.student_initials;
  }
  return base;
}

// Notifications must never break the request itself.
async function safeNotify(recipientId, data) {
  try {
    await notifyUser(recipientId, data);
  } catch (err) {
    console.error("Accommodation notification failed:", err.message);
  }
}

// Student: send a request
async function createRequestController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can request accommodations." });
    }

    const classId = Number(req.params.classId);
    const type = String(req.body.type || "");
    const note = String(req.body.note || "").trim();

    if (!ACCOMMODATION_TYPES.includes(type)) {
      return res
        .status(400)
        .json({ message: "Choose what kind of support you need." });
    }
    if (note.length > NOTE_MAX) {
      return res
        .status(400)
        .json({ message: `Keep your note under ${NOTE_MAX} characters.` });
    }

    const cls = await getClassById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found." });
    if (cls.status !== "active") {
      return res.status(400).json({ message: "This class is archived." });
    }
    if (!(await isClassMember(classId, req.user.id))) {
      return res
        .status(403)
        .json({ message: "You are not a member of this class." });
    }

    if (await hasOpenRequest(classId, req.user.id, type)) {
      return res.status(409).json({
        message:
          "You already have an open request for this. Your teacher will respond soon.",
      });
    }

    const request = await createRequest({
      classId,
      studentId: req.user.id,
      type,
      note,
    });

    // Generic on purpose: no student name, never any support-needs info.
    // sourceType "class" + the class id lets the notification open the class.
    await safeNotify(cls.teacher_id, {
      type: "accommodation_request",
      title: "New accommodation request",
      body: `${TYPE_LABELS[type]} request in ${cls.title}`,
      sourceType: "class",
      sourceId: classId,
      senderId: req.user.id,
    });

    res.status(201).json({
      message: "Request sent to your teacher.",
      request: mapRequest(request),
    });
  } catch (err) {
    console.error("createAccommodationRequest error:", err);
    res.status(500).json({ message: "Server error while sending request." });
  }
}

// Student: my requests in one class
async function listMyRequestsController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied." });
    }
    const classId = Number(req.params.classId);
    const cls = await getClassById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found." });

    const rows = await getStudentRequests(classId, req.user.id);
    res.json({ requests: rows.map((r) => mapRequest(r)) });
  } catch (err) {
    console.error("listMyAccommodationRequests error:", err);
    res.status(500).json({ message: "Server error while fetching requests." });
  }
}

// Teacher: every request in a class they own
async function listClassRequestsController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied." });
    }
    const classId = Number(req.params.classId);
    const cls = await getClassById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found." });
    if (cls.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    const rows = await getClassRequests(classId, req.user.role);
    res.json({ requests: rows.map((r) => mapRequest(r, true)) });
  } catch (err) {
    console.error("listClassAccommodationRequests error:", err);
    res.status(500).json({ message: "Server error while fetching requests." });
  }
}

// Teacher: approve / decline / discuss, with a one-line reason
async function respondController(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can respond." });
    }

    const request = await getRequestById(Number(req.params.id));
    if (!request)
      return res.status(404).json({ message: "Request not found." });
    if (request.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    const decision = String(req.body.decision || "");
    const reason = String(req.body.reason || "").trim();

    if (!DECISIONS.includes(decision)) {
      return res
        .status(400)
        .json({ message: "Choose Approve, Decline or Discuss." });
    }
    if (reason.length > REASON_MAX) {
      return res
        .status(400)
        .json({ message: `Keep the reason under ${REASON_MAX} characters.` });
    }
    if (decision !== "approved" && !reason) {
      return res
        .status(400)
        .json({ message: "Add a short reason so the student understands." });
    }

    const ok = await respondToRequest(request.id, decision, reason);
    if (!ok) {
      return res
        .status(409)
        .json({ message: "This request was already answered or withdrawn." });
    }

    const typeLabel = TYPE_LABELS[request.type] || request.type;
    const title =
      decision === "approved"
        ? "Accommodation request approved"
        : decision === "declined"
          ? "Accommodation request declined"
          : "Your teacher wants to talk about your request";

    await safeNotify(request.student_id, {
      type: "accommodation_response",
      title,
      body: reason
        ? `${typeLabel} in ${request.class_title}: ${reason}`
        : `${typeLabel} in ${request.class_title}`,
      sourceType: "class",
      sourceId: request.class_id,
      senderId: req.user.id,
    });

    const updated = await getRequestById(request.id);
    res.json({ message: "Response sent.", request: mapRequest(updated) });
  } catch (err) {
    console.error("respondAccommodation error:", err);
    res.status(500).json({ message: "Server error while responding." });
  }
}

// Student: withdraw an open request
async function cancelController(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied." });
    }
    const ok = await cancelRequest(Number(req.params.id), req.user.id);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "This request can't be withdrawn anymore." });
    }
    res.json({ message: "Request withdrawn." });
  } catch (err) {
    console.error("cancelAccommodation error:", err);
    res
      .status(500)
      .json({ message: "Server error while withdrawing request." });
  }
}

module.exports = {
  createRequestController,
  listMyRequestsController,
  listClassRequestsController,
  respondController,
  cancelController,
};
