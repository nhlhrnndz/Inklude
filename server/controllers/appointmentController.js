//server/controllers/appointmentController.js
const {
  getAppointmentById,
  createAppointment,
  getAppointmentsForStudent,
  getAllAppointments,
  countPendingForStudent,
  hasActiveAtSlot,
  updateAppointment,
} = require("../models/appointmentModel");
const {
  createScheduleItem,
  deleteBySource,
} = require("../models/ScheduleItem");
const { getGuidanceUserIds } = require("../models/messageModel");
const { notifyUser, notifyUsers } = require("../services/notificationService");

const REASONS = [
  "Academic",
  "Social",
  "Adjustment",
  "Accessibility",
  "Personal",
  "Other",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_PENDING_PER_STUDENT = 3;
const DURATION_MINUTES = 30;

const pad = (n) => String(n).padStart(2, "0");

function format(a) {
  return {
    id: a.id,
    studentId: a.student_id,
    studentName: a.student_name,
    studentEmail: a.student_email,
    guidanceName: a.guidance_name || null,
    reason: a.reason,
    note: a.note || "",
    status: a.status,
    preferredDate: a.preferred_date,
    preferredTime: a.preferred_time,
    confirmedDate: a.confirmed_date || null,
    confirmedTime: a.confirmed_time || null,
    guidanceNote: a.guidance_note || "",
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

function isValidSlot(date, time) {
  return (
    typeof date === "string" &&
    DATE_RE.test(date) &&
    typeof time === "string" &&
    TIME_RE.test(time)
  );
}

function isFuture(date, time) {
  const t = Date.parse(`${date}T${time}:00`);
  return Number.isFinite(t) && t > Date.now();
}

function fmtWhen(date, time) {
  return new Date(`${date}T${time}:00`).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function endString(date, time) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + DURATION_MINUTES, 23 * 60 + 59);
  return `${date} ${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`;
}

// Puts (or moves) the appointment on the student's calendar.
async function syncCalendar(appt, date, time, guidanceName) {
  await deleteBySource("appointment", appt.id);
  await createScheduleItem(appt.student_id, {
    title: "Guidance appointment",
    subject: appt.reason,
    startTime: `${date} ${time}:00`,
    endTime: endString(date, time),
    location: "Guidance Office",
    teacherName: guidanceName || null,
    type: "appointment",
    sourceType: "appointment",
    sourceId: appt.id,
  });
}

// ---------- student ----------

// POST /api/appointments
async function createRequest(req, res) {
  try {
    const { reason, note, preferredDate, preferredTime } = req.body;

    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Choose a reason." });
    }
    if (!isValidSlot(preferredDate, preferredTime)) {
      return res.status(400).json({ message: "Choose a valid date and time." });
    }
    if (!isFuture(preferredDate, preferredTime)) {
      return res.status(400).json({ message: "Choose a time in the future." });
    }

    if (await hasActiveAtSlot(req.user.id, preferredDate, preferredTime)) {
      return res.status(400).json({
        message:
          "You already have a request or appointment at that date and time.",
      });
    }

    const pending = await countPendingForStudent(req.user.id);
    if (pending >= MAX_PENDING_PER_STUDENT) {
      return res.status(400).json({
        message: `You already have ${MAX_PENDING_PER_STUDENT} requests waiting. Please wait for Guidance to respond.`,
      });
    }

    const appt = await createAppointment({
      studentId: req.user.id,
      reason,
      note: note ? String(note).trim().slice(0, 500) : null,
      preferredDate,
      preferredTime,
    });

    const guidanceIds = await getGuidanceUserIds();
    await notifyUsers(guidanceIds, {
      type: "appointment",
      title: "New appointment request",
      body: `${req.user.name || "A student"} requested a ${reason} appointment for ${fmtWhen(preferredDate, preferredTime)}.`,
      sourceType: "appointment",
      sourceId: appt.id,
      senderId: req.user.id,
    });

    res.status(201).json({
      message: "Appointment requested.",
      appointment: format(appt),
    });
  } catch (err) {
    console.error("createRequest error:", err);
    res
      .status(500)
      .json({ message: "Server error while requesting appointment." });
  }
}

// GET /api/appointments/mine
async function getMine(req, res) {
  try {
    const rows = await getAppointmentsForStudent(req.user.id);
    res.json({ appointments: rows.map(format) });
  } catch (err) {
    console.error("getMine error:", err);
    res
      .status(500)
      .json({ message: "Server error while loading appointments." });
  }
}

// PATCH /api/appointments/:id/cancel
async function cancelMine(req, res) {
  try {
    const appt = await getAppointmentById(req.params.id);
    if (!appt || appt.student_id !== req.user.id) {
      return res.status(404).json({ message: "Appointment not found." });
    }
    if (!["pending", "confirmed", "rescheduled"].includes(appt.status)) {
      return res
        .status(400)
        .json({ message: "This appointment can't be cancelled." });
    }

    await updateAppointment(appt.id, { status: "cancelled" });
    await deleteBySource("appointment", appt.id);

    const guidanceIds = await getGuidanceUserIds();
    await notifyUsers(guidanceIds, {
      type: "appointment",
      title: "Appointment cancelled",
      body: `${req.user.name || "A student"} cancelled their ${appt.reason} appointment.`,
      sourceType: "appointment",
      sourceId: appt.id,
      senderId: req.user.id,
    });

    res.json({ message: "Appointment cancelled." });
  } catch (err) {
    console.error("cancelMine error:", err);
    res.status(500).json({ message: "Server error while cancelling." });
  }
}

// ---------- guidance ----------

// GET /api/appointments
async function listAll(req, res) {
  try {
    const rows = await getAllAppointments();
    res.json({ appointments: rows.map(format) });
  } catch (err) {
    console.error("listAll error:", err);
    res
      .status(500)
      .json({ message: "Server error while loading appointments." });
  }
}

// PATCH /api/appointments/:id/respond
// body: { action: "confirm" | "decline" | "cancel" | "complete", date?, time?, note? }
async function respond(req, res) {
  try {
    const appt = await getAppointmentById(req.params.id);
    if (!appt) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    const { action } = req.body;
    const note = (req.body.note || "").trim().slice(0, 255);
    const open = ["confirmed", "rescheduled"];

    if (action === "confirm") {
      if (!["pending", ...open].includes(appt.status)) {
        return res
          .status(400)
          .json({ message: "This request is already closed." });
      }

      const date = req.body.date || appt.confirmed_date || appt.preferred_date;
      const time = req.body.time || appt.confirmed_time || appt.preferred_time;

      if (!isValidSlot(date, time)) {
        return res
          .status(400)
          .json({ message: "Choose a valid date and time." });
      }
      if (!isFuture(date, time)) {
        return res
          .status(400)
          .json({ message: "Choose a time in the future." });
      }

      const changed =
        date !== appt.preferred_date || time !== appt.preferred_time;
      const status = changed ? "rescheduled" : "confirmed";

      await updateAppointment(appt.id, {
        status,
        guidanceId: req.user.id,
        confirmedDate: date,
        confirmedTime: time,
        guidanceNote: note || null,
      });
      await syncCalendar(appt, date, time, req.user.name);

      await notifyUser(appt.student_id, {
        type: "appointment",
        title: changed ? "Appointment rescheduled" : "Appointment confirmed",
        body: changed
          ? `Guidance set a new time: ${fmtWhen(date, time)}.`
          : `Your appointment is confirmed for ${fmtWhen(date, time)}.`,
        sourceType: "appointment",
        sourceId: appt.id,
        senderId: req.user.id,
      });
    } else if (action === "decline") {
      if (appt.status !== "pending") {
        return res
          .status(400)
          .json({ message: "Only pending requests can be declined." });
      }
      if (!note) {
        return res.status(400).json({ message: "Add a short reason." });
      }

      await updateAppointment(appt.id, {
        status: "declined",
        guidanceId: req.user.id,
        guidanceNote: note,
      });

      await notifyUser(appt.student_id, {
        type: "appointment",
        title: "Appointment request declined",
        body: note,
        sourceType: "appointment",
        sourceId: appt.id,
        senderId: req.user.id,
      });
    } else if (action === "cancel") {
      if (!open.includes(appt.status)) {
        return res
          .status(400)
          .json({ message: "Only booked appointments can be cancelled." });
      }
      if (!note) {
        return res.status(400).json({ message: "Add a short reason." });
      }

      await updateAppointment(appt.id, {
        status: "cancelled",
        guidanceId: req.user.id,
        guidanceNote: note,
      });
      await deleteBySource("appointment", appt.id);

      await notifyUser(appt.student_id, {
        type: "appointment",
        title: "Appointment cancelled by Guidance",
        body: note,
        sourceType: "appointment",
        sourceId: appt.id,
        senderId: req.user.id,
      });
    } else if (action === "complete") {
      if (!open.includes(appt.status)) {
        return res
          .status(400)
          .json({ message: "Only booked appointments can be completed." });
      }
      await updateAppointment(appt.id, {
        status: "completed",
        guidanceId: req.user.id,
      });
    } else {
      return res.status(400).json({ message: "Invalid action." });
    }

    const fresh = await getAppointmentById(appt.id);
    res.json({ message: "Updated.", appointment: format(fresh) });
  } catch (err) {
    console.error("respond error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating appointment." });
  }
}

module.exports = { createRequest, getMine, cancelMine, listAll, respond };
