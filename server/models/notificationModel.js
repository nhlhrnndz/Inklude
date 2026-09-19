// server/models/notificationModel.js
const pool = require("../config/db");

// Insert one notification row per recipient, in a single query
async function createMany(recipientIds, data) {
  if (!recipientIds || recipientIds.length === 0) return 0;

  const {
    type,
    title,
    body = null,
    sourceType = null,
    sourceId = null,
    senderId = null,
  } = data;

  const values = recipientIds.map((recipientId) => [
    recipientId,
    type,
    title,
    body,
    sourceType,
    sourceId,
    senderId,
  ]);

  const [result] = await pool.query(
    `INSERT INTO notifications
       (recipient_id, type, title, body, source_type, source_id, sender_id)
     VALUES ?`,
    [values],
  );

  return result.affectedRows;
}

// Get a user's notifications, newest first
async function getForUser(
  userId,
  { limit = 30, offset = 0, unreadOnly = false } = {},
) {
  const [rows] = await pool.query(
    `SELECT id, type, title, body, source_type, source_id, sender_id,
            is_read, read_at, created_at
     FROM notifications
     WHERE recipient_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset],
  );
  return rows;
}

async function getUnreadCount(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND is_read = 0",
    [userId],
  );
  return Number(rows[0].count);
}

// Mark a single notification as read (only if it belongs to this user)
async function markAsRead(notificationId, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM notifications WHERE id = ? AND recipient_id = ?",
    [notificationId, userId],
  );
  if (rows.length === 0) return false;

  await pool.query(
    `UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND recipient_id = ?`,
    [notificationId, userId],
  );
  return true;
}

async function markAllAsRead(userId) {
  const [result] = await pool.query(
    `UPDATE notifications
     SET is_read = 1, read_at = CURRENT_TIMESTAMP
     WHERE recipient_id = ? AND is_read = 0`,
    [userId],
  );
  return result.affectedRows;
}

module.exports = {
  createMany,
  getForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
