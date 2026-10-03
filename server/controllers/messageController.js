//server\controllers\messageController.js
const {
  getOrCreateThreadForStudent,
  getThreadByStudentId,
  getThreadById,
  addMessage,
  getMessagesForThread,
  markMessagesRead,
  getGuidanceThreads,
  getGuidanceUserIds,
} = require("../models/messageModel");
const { notifyUser, notifyUsers } = require("../services/notificationService");

const isGuidance = (req) =>
  req.user.role === "guidance" || req.user.role === "admin";

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
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

async function threadPayload(threadId) {
  const thread = await getThreadById(threadId);
  const messages = await getMessagesForThread(threadId);
  return {
    thread: formatThread(thread),
    messages: messages.map(formatMessage),
  };
}

// POST /api/messages/mine: student sends a message
async function postMyMessage(req, res) {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can send messages here." });
    }

    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const studentId = req.user.id;
    const thread = await getOrCreateThreadForStudent(studentId);

    await addMessage(thread.id, studentId, "student", body.trim());

    const guidanceIds = await getGuidanceUserIds();
    await notifyUsers(guidanceIds, {
      type: "message",
      title: "New message from a student",
      body: `${req.user.name || "A student"}: ${body.trim().slice(0, 120)}`,
      sourceType: "message_thread",
      sourceId: thread.id,
      senderId: studentId,
    });

    res.json(await threadPayload(thread.id));
  } catch (err) {
    console.error("postMyMessage error:", err);
    res.status(500).json({ message: "Server error while sending message." });
  }
}

// GET /api/messages/mine: student views their own thread
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
    res.json(await threadPayload(thread.id));
  } catch (err) {
    console.error("getMyMessages error:", err);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
}

// GET /api/messages?search=: guidance inbox
async function getInbox(req, res) {
  try {
    if (!isGuidance(req)) {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const threads = await getGuidanceThreads({
      search: req.query.search || undefined,
    });

    res.json({
      threads: threads.map((t) => ({
        id: t.id,
        studentId: t.student_id,
        studentName: t.student_name,
        studentEmail: t.student_email,
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

// GET /api/messages/:id: guidance opens a thread
async function getThreadDetail(req, res) {
  try {
    if (!isGuidance(req)) {
      return res
        .status(403)
        .json({ message: "Only guidance counselors can view this." });
    }

    const thread = await getThreadById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    await markMessagesRead(thread.id, "guidance");
    res.json(await threadPayload(thread.id));
  } catch (err) {
    console.error("getThreadDetail error:", err);
    res.status(500).json({ message: "Server error while fetching thread." });
  }
}

// POST /api/messages/:id/reply: guidance replies
async function postReply(req, res) {
  try {
    if (!isGuidance(req)) {
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

    await notifyUser(thread.student_id, {
      type: "message",
      title: "Guidance replied to your message",
      body: body.trim().slice(0, 120),
      sourceType: "message_thread",
      sourceId: thread.id,
      senderId: req.user.id,
    });

    res.json(await threadPayload(thread.id));
  } catch (err) {
    console.error("postReply error:", err);
    res.status(500).json({ message: "Server error while sending reply." });
  }
}

module.exports = {
  postMyMessage,
  getMyMessages,
  getInbox,
  getThreadDetail,
  postReply,
};
