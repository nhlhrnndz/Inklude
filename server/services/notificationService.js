// server/services/notificationService.js
const notificationModel = require("../models/notificationModel");

let io = null;

// Called once from index.js so the service can push real-time events
function setIO(ioInstance) {
  io = ioInstance;
}

/**
 * Create a notification for several users at once.
 *
 * data = {
 *   type:       "announcement" | "message" | "sis_reminder" | ...
 *   title:      string (max 150)
 *   body?:      string
 *   sourceType? string  (e.g. "announcement")
 *   sourceId?:  number
 *   senderId?:  number  (sender is automatically excluded from recipients)
 * }
 *
 * Returns the number of notifications created.
 */
async function notifyUsers(recipientIds, data) {
  const ids = [...new Set((recipientIds || []).map(Number))].filter(
    (id) => id && id !== data.senderId,
  );

  if (ids.length === 0) return 0;

  const count = await notificationModel.createMany(ids, data);

  // Real-time push to anyone currently connected
  if (io) {
    const payload = {
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      sourceType: data.sourceType ?? null,
      sourceId: data.sourceId ?? null,
    };
    ids.forEach((id) => io.to(`user-${id}`).emit("notification:new", payload));
  }

  return count;
}

async function notifyUser(recipientId, data) {
  return notifyUsers([recipientId], data);
}

module.exports = { setIO, notifyUsers, notifyUser };
