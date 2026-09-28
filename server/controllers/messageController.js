const {
  getOrCreateThreadForStudent,
  getThreadByStudentId,
  getThreadById,
  updateThreadMeta,
  addMessage,
  getMessagesForThread,
  markMessagesRead,
  getGuidanceThreads,
  getGuidanceUserIds,
} = require("../models/messageModel");
const { notifyUser, notifyUsers } = require("../services/notificationService");

const CATEGORIES = ["help", "complaint", "concern"];
const STATUSES = ["open", "in_progress", "resolved"];

function formatMessage(m) {
  return {
    id: m.id,
    senderId: m.sender_id,
    senderRole: m.sender_role,
    senderName: m.sender_name,
    body: m.body,
    readAt: m.read_at,
    createdAt: m.created_at,
  };
}

function formatThread(t) {
  return {
    id: t.id,
    studentId: t.student_id,
    studentName: t.student_name,
    studentEmail: t.student_email,
    category: t.category,
    urgent: !!t.urgent,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// POST /api/messages/mine — student sends a message (creates or continues their thread)
async function postMyMessage(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can send messages here." });
    }

    const { body, category, urgent } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const studentId = req.user.id;
    const thread = await getOrCreateThreadForStudent(
      studentId,
      category,
      urgent,
    );

    // Apply any category/urgent change the student made, and reopen
    // the thread if it had already been resolved.
    await updateThreadMeta(thread.id, {
      category,
      urgent,
      status: thread.status === "resolved" ? "open" : undefined,
    });

    await addMessage(thread.id, studentId, "student", body.trim());

    const guidanceIds = await getGuidanceUserIds();
    await notifyUsers(guidanceIds, {
      type: "message",
      title: `New ${category || thread.category} message`,
      body: `${req.user.name || "A student"}: ${body.trim().slice(0, 120)}`,
      sourceType: "message_thread",
      sourceId: thread.id,
      senderId: studentId,
    });

    const freshThread = await getThreadById(thread.id);
    const messages = await getMessagesForThread(thread.id);

    res.json({
      thread: formatThread(freshThread),
      messages: messages.map(formatMessage),
    });
  } catch (err) {
    console.error("postMyMessage error:", err);
    res.status(500).json({ message: "Server error while sending message." });
  }
}

// GET /api/messages/mine — student views their own thread
async function getMyMessages(req, res) {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this." });
    }

    const thread = await getThreadByStudentId(req.user.id);

    if (!thread) {
      return res.json({ thread: null, messages: [] });
    }

    await markMessagesRead(thread.id, "student");

    const freshThread = await getThreadById(thread.id);
    const messages = await getMessagesForThread(thread.id);

    res.json({
      thread: formatThread(freshThread),
      messages: messages.map(formatMessage),
    });
  } catch (err) {
    console.error("getMyMessages error:", err);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
}

// GET /api/messages — guidance inbox with filters
async function getInbox(req, res) {
  try {
    if (req.user.role !== "guidance" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const { category, urgent, status, search } = req.query;

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category filter." });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status filter." });
    }

    const threads = await getGuidanceThreads({
      category: category || undefined,
      urgent: urgent === undefined ? undefined : urgent === "true",
      status: status || undefined,
      search: search || undefined,
    });

    res.json({
      threads: threads.map((t) => ({
        id: t.id,
        studentId: t.student_id,
        studentName: t.student_name,
        studentEmail: t.student_email,
        category: t.category,
        urgent: !!t.urgent,
        status: t.status,
        lastMessage: t.last_message,
        lastMessageAt: t.last_message_at,
        unreadCount: t.unread_count,
      })),
    });
  } catch (err) {
    console.error("getInbox error:", err);
    res.status(500).json({ message: "Server error while fetching inbox." });
  }
}

// GET /api/messages/:id — guidance opens a thread
async function getThreadDetail(req, res) {
  try {
    if (req.user.role !== "guidance" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const thread = await getThreadById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    await markMessagesRead(thread.id, "guidance");

    const freshThread = await getThreadById(thread.id);
    const messages = await getMessagesForThread(thread.id);

    res.json({
      thread: formatThread(freshThread),
      messages: messages.map(formatMessage),
    });
  } catch (err) {
    console.error("getThreadDetail error:", err);
    res.status(500).json({ message: "Server error while fetching thread." });
  }
}

// POST /api/messages/:id/reply — guidance replies in a thread
async function postReply(req, res) {
  try {
    if (req.user.role !== "guidance" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can reply here." });
    }

    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ message: "Reply cannot be empty." });
    }

    const thread = await getThreadById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    await addMessage(thread.id, req.user.id, "guidance", body.trim());

    // A reply means someone is on it — auto-advance a fresh "open"
    // thread to "in_progress". Resolved threads stay resolved unless
    // guidance explicitly changes the status.
    if (thread.status === "open") {
      await updateThreadMeta(thread.id, { status: "in_progress" });
    }

    await notifyUser(thread.student_id, {
      type: "message",
      title: "Guidance replied to your message",
      body: body.trim().slice(0, 120),
      sourceType: "message_thread",
      sourceId: thread.id,
      senderId: req.user.id,
    });

    const freshThread = await getThreadById(thread.id);
    const messages = await getMessagesForThread(thread.id);

    res.json({
      thread: formatThread(freshThread),
      messages: messages.map(formatMessage),
    });
  } catch (err) {
    console.error("postReply error:", err);
    res.status(500).json({ message: "Server error while sending reply." });
  }
}

// PATCH /api/messages/:id/status — guidance updates thread status
async function updateStatus(req, res) {
  try {
    if (req.user.role !== "guidance" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can do this." });
    }

    const { status } = req.body;
    if (!status || !STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const thread = await getThreadById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    await updateThreadMeta(thread.id, { status });

    res.json({ message: "Status updated.", status });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ message: "Server error while updating status." });
  }
}

module.exports = {
  postMyMessage,
  getMyMessages,
  getInbox,
  getThreadDetail,
  postReply,
  updateStatus,
};
