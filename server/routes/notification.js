// server/routes/notification.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  getUnreadCountController,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getMyNotifications);
router.get("/unread-count", verifyToken, getUnreadCountController);
router.patch("/read-all", verifyToken, markAllNotificationsRead);
router.patch("/:id/read", verifyToken, markNotificationRead);

module.exports = router;
