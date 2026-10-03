//server\controllers\scheduleController.js
const {
  createScheduleItem,
  getTodayForUser,
  getWeekForUser,
  deleteScheduleItem,
} = require("../models/ScheduleItem");

// Times arrive from the app as local "YYYY-MM-DD HH:MM[:SS]" strings.
const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const MAX_REPEAT_WEEKS = 12;

function pad(n) {
  return String(n).padStart(2, "0");
}

function normalize(dt) {
  return dt.length === 16 ? `${dt}:00` : dt;
}

function isValidDateTime(dt) {
  return (
    typeof dt === "string" &&
    DATETIME_RE.test(dt) &&
    Number.isFinite(Date.parse(dt.replace(" ", "T")))
  );
}

// Shift a "YYYY-MM-DD HH:MM:SS" string forward by whole weeks.
function shiftWeeks(dt, weeks) {
  const [datePart, timePart] = dt.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )} ${timePart}`;
}

function toDto(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    teacherName: row.teacher_name,
    type: row.type,
    sourceType: row.source_type,
    sourceId: row.source_id,
  };
}

function studentOnly(req, res) {
  if (req.user.role !== "student") {
    res.status(403).json({ message: "Only students have a visual schedule." });
    return false;
  }
  return true;
}

async function createItem(req, res) {
  try {
    if (!studentOnly(req, res)) return;

    const { title, subject, startTime, endTime, location, teacherName } =
      req.body;
    const repeatWeeks = Math.min(
      Math.max(parseInt(req.body.repeatWeeks, 10) || 1, 1),
      MAX_REPEAT_WEEKS,
    );

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "A class title is required." });
    }
    if (!isValidDateTime(startTime) || !isValidDateTime(endTime)) {
      return res
        .status(400)
        .json({ message: "Start and end time must be valid." });
    }

    const start = normalize(startTime);
    const end = normalize(endTime);
    if (
      Date.parse(end.replace(" ", "T")) <= Date.parse(start.replace(" ", "T"))
    ) {
      return res
        .status(400)
        .json({ message: "End time must be after the start time." });
    }

    const created = [];
    for (let i = 0; i < repeatWeeks; i++) {
      const item = await createScheduleItem(req.user.id, {
        title: String(title).trim().slice(0, 150),
        subject: subject ? String(subject).trim().slice(0, 100) : null,
        startTime: shiftWeeks(start, i),
        endTime: shiftWeeks(end, i),
        location: location ? String(location).trim().slice(0, 100) : null,
        teacherName: teacherName
          ? String(teacherName).trim().slice(0, 100)
          : null,
      });
      created.push(toDto(item));
    }

    res.status(201).json({ message: "Schedule saved.", items: created });
  } catch (err) {
    console.error("createItem error:", err);
    res.status(500).json({ message: "Server error while saving schedule." });
  }
}

async function getToday(req, res) {
  try {
    if (!studentOnly(req, res)) return;
    const rows = await getTodayForUser(req.user.id);
    res.json({ items: rows.map(toDto) });
  } catch (err) {
    console.error("getToday error:", err);
    res.status(500).json({ message: "Server error while loading schedule." });
  }
}

async function getWeek(req, res) {
  try {
    if (!studentOnly(req, res)) return;
    const rows = await getWeekForUser(req.user.id);
    res.json({ items: rows.map(toDto) });
  } catch (err) {
    console.error("getWeek error:", err);
    res.status(500).json({ message: "Server error while loading schedule." });
  }
}

async function removeItem(req, res) {
  try {
    if (!studentOnly(req, res)) return;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid item id." });

    const deleted = await deleteScheduleItem(id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: "Schedule item not found." });
    }
    res.json({ message: "Removed." });
  } catch (err) {
    console.error("removeItem error:", err);
    res.status(500).json({ message: "Server error while removing item." });
  }
}

module.exports = { createItem, getToday, getWeek, removeItem };
