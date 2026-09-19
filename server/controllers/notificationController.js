// server/controllers/notificationController.js
const notificationModel = require("../models/notificationModel");

function toDto(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    sourceType: n.source_type,
    sourceId: n.source_id,
    senderId: n.sender_id,
    isRead: Boolean(n.is_read),
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

// GET /api/notifications?limit=30&offset=0&unreadOnly=false
async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 30, 1),
      100,
    );
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const unreadOnly = req.query.unreadOnly === "true";

    const [rows, unreadCount] = await Promise.all([
      notificationModel.getForUser(userId, { limit, offset, unreadOnly }),
      notificationModel.getUnreadCount(userId),
    ]);

    res.json({ notifications: rows.map(toDto), unreadCount });
  } catch (err) {
    console.error("getMyNotifications error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching notifications." });
  }
}

// GET /api/notifications/unread-count
async function getUnreadCountController(req, res) {
  try {
    const unreadCount = await notificationModel.getUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching unread count." });
  }
}

// PATCH /api/notifications/:id/read
async function markNotificationRead(req, res) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification id." });
    }

    const found = await notificationModel.markAsRead(
      notificationId,
      req.user.id,
    );
    if (!found) {
      return res.status(404).json({ message: "Notification not found." });
    }

    const unreadCount = await notificationModel.getUnreadCount(req.user.id);
    res.json({ message: "Marked as read.", unreadCount });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating notification." });
  }
}

// PATCH /api/notifications/read-all
async function markAllNotificationsRead(req, res) {
  try {
    const updated = await notificationModel.markAllAsRead(req.user.id);
    res.json({
      message: "All notifications marked as read.",
      updated,
      unreadCount: 0,
    });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating notifications." });
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCountController,
  markNotificationRead,
  markAllNotificationsRead,
};
