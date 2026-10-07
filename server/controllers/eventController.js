// server/controllers/eventController.js
const fs = require("fs");
const path = require("path");
const eventModel = require("../models/campusEventModel");
const announcementModel = require("../models/announcementModel");
const {
  createScheduleItem,
  deleteBySource,
} = require("../models/ScheduleItem");
const { notifyUsers } = require("../services/notificationService");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// Set to false to make the supporting document optional.
// (Also change DOCUMENT_REQUIRED in app/(app)/events.tsx.)
const DOCUMENT_REQUIRED = true;

// NOT inside server/uploads: index.js serves that whole folder publicly.
// Files here can only be read through GET /api/events/:id/document (Guidance).
const EVENT_DOC_DIR = path.join(__dirname, "..", "private_uploads", "events");
fs.mkdirSync(EVENT_DOC_DIR, { recursive: true });

// `doc` is only passed for Guidance. When it is undefined the "document"
// key is left out entirely, so students never receive it.
function format(e, inCalendar, doc) {
  const out = {
    id: e.id,
    title: e.title,
    description: e.description || "",
    location: e.location,
    startTime: e.start_time,
    endTime: e.end_time,
    status: e.status,
    tags: e.tags || [],
    inCalendar: !!inCalendar,
    createdAt: e.created_at,
  };

  if (doc !== undefined) {
    out.document = doc
      ? {
          name: doc.original_name,
          type: doc.file_type,
          size: doc.file_size,
        }
      : null;
  }

  return out;
}

function fmtWhen(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// multipart sends tags as a JSON string; plain JSON sends an array.
function parseTags(raw) {
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list)
    ? [...new Set(list.filter((t) => eventModel.TAGS.includes(t)))]
    : [];
}

// GET /api/events
async function listEvents(req, res) {
  try {
    const isGuidance =
      req.user.role === "guidance" || req.user.role === "admin";
    const rows = await eventModel.listEvents(isGuidance);

    let inCalendar = new Set();
    if (req.user.role === "student") {
      inCalendar = new Set(await eventModel.getCalendarEventIds(req.user.id));
    }

    if (isGuidance) {
      const docs = await eventModel.getDocumentsForEvents(
        rows.map((r) => r.id),
      );
      return res.json({
        events: rows.map((e) => format(e, false, docs.get(e.id) || null)),
      });
    }

    res.json({ events: rows.map((e) => format(e, inCalendar.has(e.id))) });
  } catch (err) {
    console.error("listEvents error:", err);
    res.status(500).json({ message: "Server error while loading events." });
  }
}

// POST /api/events   (guidance)  multipart/form-data
// fields: title, description?, location, date, startTime, endTime, tags (JSON string)
// file:   document (PDF, JPG or PNG, max 5 MB)
async function createEvent(req, res) {
  const file = req.file || null;

  // Throw the uploaded file away whenever the event is not created.
  const discard = () => {
    if (file) fs.unlink(file.path, () => {});
  };
  const fail = (status, message) => {
    discard();
    return res.status(status).json({ message });
  };

  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const location = String(req.body.location || "").trim();
    const date = String(req.body.date || "");
    const start = String(req.body.startTime || "");
    const end = String(req.body.endTime || "");

    if (title.length < 3 || title.length > 150) {
      return fail(400, "Title must be 3-150 characters.");
    }
    if (description.length > 1000) {
      return fail(400, "Description is too long (max 1000).");
    }
    if (location.length < 2 || location.length > 150) {
      return fail(400, "Enter the location (2-150 characters).");
    }
    if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) {
      return fail(400, "Pick the date, start time and end time.");
    }

    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(`${date}T${end}:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return fail(400, "Invalid date or time.");
    }
    if (endDate <= startDate) {
      return fail(400, "End time must be after the start time.");
    }
    if (endDate.getTime() <= Date.now()) {
      return fail(400, "Choose an event that has not ended yet.");
    }

    if (DOCUMENT_REQUIRED && !file) {
      return fail(
        400,
        "Attach a supporting document (letter or photo) to prove the event is legitimate.",
      );
    }

    const tags = parseTags(req.body.tags);

    const event = await eventModel.createEvent({
      title,
      description,
      location,
      startTime: `${date} ${start}:00`,
      endTime: `${date} ${end}:00`,
      tags,
      createdBy: req.user.id,
    });

    // Save the document. If that fails, undo the event so there is never an
    // event without the document that was supposed to prove it.
    let doc = null;
    if (file) {
      try {
        doc = await eventModel.addEventDocument({
          eventId: event.id,
          storedName: file.filename,
          originalName: String(file.originalname || "document").slice(0, 200),
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedBy: req.user.id,
        });
      } catch (err) {
        console.error("event document save failed:", err.message);
        await eventModel.deleteEvent(event.id).catch(() => {});
        return fail(
          500,
          "Could not save the supporting document, so the event was not created.",
        );
      }
    }

    // Tell every student. A failure here must not undo the event.
    // The document is never mentioned or linked in the notification.
    let recipientCount = 0;
    try {
      const studentIds = await announcementModel.getAllStudentIds();
      recipientCount = await notifyUsers(studentIds, {
        type: "campus_event",
        title: `New event: ${title}`.slice(0, 150),
        body: `${fmtWhen(startDate)} at ${location}`,
        sourceType: "campus_event",
        sourceId: event.id,
        senderId: req.user.id,
      });
    } catch (err) {
      console.error("Event notification failed:", err.message);
    }

    res.status(201).json({
      message: "Event created.",
      recipientCount,
      event: format(event, false, doc),
    });
  } catch (err) {
    console.error("createEvent error:", err);
    discard();
    res.status(500).json({ message: "Server error while creating the event." });
  }
}

// GET /api/events/:id/document   (guidance only)
// Streams the supporting document. Requires a valid Guidance token, so the
// file is never reachable by a plain link or by students.
async function downloadDocument(req, res) {
  try {
    const event = await eventModel.getEventById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });

    const doc = await eventModel.getEventDocument(event.id);
    if (!doc) {
      return res
        .status(404)
        .json({ message: "This event has no supporting document." });
    }

    // basename() so a stored name can never point outside the folder
    const filePath = path.join(EVENT_DOC_DIR, path.basename(doc.stored_name));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "The file is missing." });
    }

    res.setHeader("Content-Type", doc.file_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(filePath);
  } catch (err) {
    console.error("downloadDocument error:", err);
    res.status(500).json({ message: "Server error while opening the file." });
  }
}

// PATCH /api/events/:id/cancel   (guidance)
async function cancelEvent(req, res) {
  try {
    const event = await eventModel.getEventById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (event.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "This event is already cancelled." });
    }

    // Students who put it on their calendar get told, then it comes off.
    const affected = await eventModel.getUserIdsWithEventInCalendar(event.id);

    await eventModel.cancelEvent(event.id);
    await deleteBySource("campus_event", event.id);

    if (affected.length > 0) {
      try {
        await notifyUsers(affected, {
          type: "campus_event",
          title: `Event cancelled: ${event.title}`.slice(0, 150),
          body: "This event was cancelled and removed from your calendar.",
          sourceType: "campus_event",
          sourceId: event.id,
          senderId: req.user.id,
        });
      } catch (err) {
        console.error("Cancel notification failed:", err.message);
      }
    }

    const fresh = await eventModel.getEventById(event.id);
    const doc = await eventModel.getEventDocument(event.id);
    res.json({ message: "Event cancelled.", event: format(fresh, false, doc) });
  } catch (err) {
    console.error("cancelEvent error:", err);
    res
      .status(500)
      .json({ message: "Server error while cancelling the event." });
  }
}

// POST /api/events/:id/calendar   (student)
async function addToCalendar(req, res) {
  try {
    const event = await eventModel.getEventById(req.params.id);
    if (!event || event.status !== "active") {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!(await eventModel.isInCalendar(req.user.id, event.id))) {
      await createScheduleItem(req.user.id, {
        title: event.title,
        subject: "Campus event",
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        teacherName: null,
        type: "event",
        sourceType: "campus_event",
        sourceId: event.id,
      });
    }

    res.status(201).json({ message: "Added to your calendar." });
  } catch (err) {
    console.error("addToCalendar error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating your calendar." });
  }
}

// DELETE /api/events/:id/calendar   (student)
async function removeFromCalendar(req, res) {
  try {
    await eventModel.removeFromCalendar(req.user.id, Number(req.params.id));
    res.json({ message: "Removed from your calendar." });
  } catch (err) {
    console.error("removeFromCalendar error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating your calendar." });
  }
}

module.exports = {
  EVENT_DOC_DIR,
  listEvents,
  createEvent,
  downloadDocument,
  cancelEvent,
  addToCalendar,
  removeFromCalendar,
};
