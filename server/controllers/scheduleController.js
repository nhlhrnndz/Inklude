//server\controllers\scheduleController.js
const {
  createScheduleItem,
  getTodayForUser,
  getWeekForUser,
  getUpcomingForUser,
  deleteScheduleItem,
  deleteBySource,
} = require("../models/ScheduleItem");
const classPostModel = require("../models/classPostModel");
const { getClassById } = require("../models/classModel");
const { syncPostForMembers } = require("../services/calendarSyncService");
const { notifyUsers } = require("../services/notificationService");

// Times arrive from the app as local "YYYY-MM-DD HH:MM[:SS]" strings.
const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const MAX_REPEAT_WEEKS = 12;
const POST_TYPES = ["exam", "assignment"];

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

function toMs(dt) {
  return Date.parse(dt.replace(" ", "T"));
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

function fmtWhen(dt) {
  return new Date(dt.replace(" ", "T")).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function postToDto(p) {
  return {
    id: p.id,
    classId: p.class_id,
    classTitle: p.class_title,
    type: p.type,
    title: p.title,
    location: p.location,
    startTime: p.start_time,
    endTime: p.end_time,
    createdAt: p.created_at,
  };
}

function studentOnly(req, res) {
  if (req.user.role !== "student") {
    res.status(403).json({ message: "Only students have a visual schedule." });
    return false;
  }
  return true;
}

// ---------- student calendar ----------

async function createItem(req, res) {
  try {
    if (!studentOnly(req, res)) return;

    const { title, subject, startTime, endTime, location, teacherName } =
      req.body;
    // A student can add their own class or a personal reminder.
    const isReminder = req.body.type === "reminder";
    const repeatWeeks = isReminder
      ? 1
      : Math.min(
          Math.max(parseInt(req.body.repeatWeeks, 10) || 1, 1),
          MAX_REPEAT_WEEKS,
        );

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        message: isReminder
          ? "Add something to remember."
          : "A class title is required.",
      });
    }

    let start;
    let end;

    if (isReminder) {
      if (!isValidDateTime(startTime)) {
        return res
          .status(400)
          .json({ message: "Choose a valid date and time." });
      }
      start = normalize(startTime);
      end = start; // a reminder is a single point in time
      if (toMs(start) <= Date.now()) {
        return res
          .status(400)
          .json({ message: "Choose a time in the future." });
      }
    } else {
      if (!isValidDateTime(startTime) || !isValidDateTime(endTime)) {
        return res
          .status(400)
          .json({ message: "Start and end time must be valid." });
      }
      start = normalize(startTime);
      end = normalize(endTime);
      if (toMs(end) <= toMs(start)) {
        return res
          .status(400)
          .json({ message: "End time must be after the start time." });
      }
    }

    const created = [];
    for (let i = 0; i < repeatWeeks; i++) {
      const item = await createScheduleItem(req.user.id, {
        title: String(title).trim().slice(0, 150),
        subject:
          !isReminder && subject ? String(subject).trim().slice(0, 100) : null,
        startTime: shiftWeeks(start, i),
        endTime: shiftWeeks(end, i),
        location:
          !isReminder && location
            ? String(location).trim().slice(0, 100)
            : null,
        teacherName:
          !isReminder && teacherName
            ? String(teacherName).trim().slice(0, 100)
            : null,
        type: isReminder ? "reminder" : "class",
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

// GET /api/schedule/upcoming?days=45
async function getUpcoming(req, res) {
  try {
    if (!studentOnly(req, res)) return;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 45, 1), 120);
    const rows = await getUpcomingForUser(req.user.id, days);
    res.json({ items: rows.map(toDto) });
  } catch (err) {
    console.error("getUpcoming error:", err);
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

// ---------- teacher: exams and assignments ----------

// Loads a class and checks the caller owns it. Sends the error itself.
async function loadOwnedClass(req, res) {
  if (req.user.role !== "teacher") {
    res.status(403).json({ message: "Only teachers can do this." });
    return null;
  }
  const classId = Number(req.params.classId);
  if (!classId) {
    res.status(400).json({ message: "Invalid class id." });
    return null;
  }
  const cls = await getClassById(classId);
  if (!cls) {
    res.status(404).json({ message: "Class not found." });
    return null;
  }
  if (cls.teacher_id !== req.user.id) {
    res.status(403).json({ message: "Access denied." });
    return null;
  }
  return cls;
}

// GET /api/schedule/class/:classId/posts
async function listClassPosts(req, res) {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;
    const rows = await classPostModel.getPostsForClass(cls.id);
    res.json({ posts: rows.map(postToDto) });
  } catch (err) {
    console.error("listClassPosts error:", err);
    res.status(500).json({ message: "Server error while loading posts." });
  }
}

// POST /api/schedule/class/:classId/posts
// body: { type: "exam" | "assignment", title, startTime, endTime?, location? }
// Assignment: startTime is the due time (endTime is ignored).
async function createClassPost(req, res) {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;
    if (cls.status !== "active") {
      return res.status(400).json({ message: "This class is archived." });
    }

    const type = String(req.body.type || "");
    const title = String(req.body.title || "").trim();
    const location = req.body.location
      ? String(req.body.location).trim().slice(0, 150)
      : null;

    if (!POST_TYPES.includes(type)) {
      return res.status(400).json({ message: "Choose Exam or Assignment." });
    }
    if (!title) {
      return res.status(400).json({ message: "A title is required." });
    }
    if (title.length > 150) {
      return res
        .status(400)
        .json({ message: "Keep the title under 150 characters." });
    }
    if (!isValidDateTime(req.body.startTime)) {
      return res.status(400).json({ message: "Choose a valid date and time." });
    }

    const start = normalize(req.body.startTime);
    let end = start;

    if (type === "exam") {
      if (!isValidDateTime(req.body.endTime)) {
        return res.status(400).json({ message: "Add a valid end time." });
      }
      end = normalize(req.body.endTime);
      if (toMs(end) <= toMs(start)) {
        return res
          .status(400)
          .json({ message: "End time must be after the start time." });
      }
    }

    if (toMs(start) <= Date.now()) {
      return res.status(400).json({ message: "Choose a time in the future." });
    }

    const post = await classPostModel.createPost({
      classId: cls.id,
      teacherId: req.user.id,
      type,
      title,
      location: type === "exam" ? location : null,
      startTime: start,
      endTime: end,
    });

    // Copy onto every enrolled student's calendar.
    await syncPostForMembers(post.id);

    // Notifications must never break the post itself.
    let recipientCount = 0;
    try {
      const memberIds = await classPostModel.getMemberIds(cls.id);
      recipientCount = await notifyUsers(memberIds, {
        type: "class_post",
        title: `${cls.title}: new ${type}`.slice(0, 150),
        body: `${title} · ${type === "assignment" ? "Due " : ""}${fmtWhen(start)}`,
        sourceType: "class_post",
        sourceId: post.id,
        senderId: req.user.id,
      });
    } catch (err) {
      console.error("Class post notification failed:", err.message);
    }

    res.status(201).json({
      message: "Posted to your students' calendars.",
      recipientCount,
      post: postToDto(post),
    });
  } catch (err) {
    console.error("createClassPost error:", err);
    res.status(500).json({ message: "Server error while posting." });
  }
}

// DELETE /api/schedule/class/posts/:id
async function deleteClassPost(req, res) {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can do this." });
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid post id." });

    const post = await classPostModel.getPostById(id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (post.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied." });
    }

    await deleteBySource("class_post", id);
    await classPostModel.deletePost(id);

    res.json({ message: "Removed from every student's calendar." });
  } catch (err) {
    console.error("deleteClassPost error:", err);
    res.status(500).json({ message: "Server error while removing post." });
  }
}

module.exports = {
  createItem,
  getToday,
  getWeek,
  getUpcoming,
  removeItem,
  listClassPosts,
  createClassPost,
  deleteClassPost,
};
