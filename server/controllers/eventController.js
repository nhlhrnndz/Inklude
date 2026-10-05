// server/controllers/eventController.js
const eventModel = require("../models/campusEventModel");
const announcementModel = require("../models/announcementModel");
const {
  createScheduleItem,
  deleteBySource,
} = require("../models/ScheduleItem");
const { notifyUsers } = require("../services/notificationService");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function format(e, inCalendar) {
  return {
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
}

function fmtWhen(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

    res.json({ events: rows.map((e) => format(e, inCalendar.has(e.id))) });
  } catch (err) {
    console.error("listEvents error:", err);
    res.status(500).json({ message: "Server error while loading events." });
  }
}

// POST /api/events   (guidance)
// { title, description?, location, date: "YYYY-MM-DD", startTime: "HH:MM", endTime: "HH:MM", tags: [] }
async function createEvent(req, res) {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const location = String(req.body.location || "").trim();
    const date = String(req.body.date || "");
    const start = String(req.body.startTime || "");
    const end = String(req.body.endTime || "");

    if (title.length < 3 || title.length > 150) {
      return res
        .status(400)
        .json({ message: "Title must be 3-150 characters." });
    }
    if (description.length > 1000) {
      return res
        .status(400)
        .json({ message: "Description is too long (max 1000)." });
    }
    if (location.length < 2 || location.length > 150) {
      return res
        .status(400)
        .json({ message: "Enter the location (2-150 characters)." });
    }
    if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) {
      return res
        .status(400)
        .json({ message: "Pick the date, start time and end time." });
    }

    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(`${date}T${end}:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date or time." });
    }
    if (endDate <= startDate) {
      return res
        .status(400)
        .json({ message: "End time must be after the start time." });
    }
    if (endDate.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Choose an event that has not ended yet." });
    }

    const tags = Array.isArray(req.body.tags)
      ? [...new Set(req.body.tags.filter((t) => eventModel.TAGS.includes(t)))]
      : [];

    const event = await eventModel.createEvent({
      title,
      description,
      location,
      startTime: `${date} ${start}:00`,
      endTime: `${date} ${end}:00`,
      tags,
      createdBy: req.user.id,
    });

    // Tell every student. A failure here must not undo the event.
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
      event: format(event, false),
    });
  } catch (err) {
    console.error("createEvent error:", err);
    res.status(500).json({ message: "Server error while creating the event." });
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
    res.json({ message: "Event cancelled.", event: format(fresh, false) });
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
  listEvents,
  createEvent,
  cancelEvent,
  addToCalendar,
  removeFromCalendar,
};
