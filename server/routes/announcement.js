// server/routes/announcement.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  postAnnouncement,
  getMyAnnouncements,
  getClassAnnouncements,
  getSessionAnnouncements,
} = require("../controllers/announcementController");

// Only staff can post
router.post(
  "/",
  verifyToken,
  requireRole("teacher", "guidance", "admin"),
  postAnnouncement,
);

// Reading stays open to any logged-in user (the controller scopes what they see)
router.get("/mine", verifyToken, getMyAnnouncements);
router.get("/class/:classId", verifyToken, getClassAnnouncements);
router.get("/session/:sessionId", verifyToken, getSessionAnnouncements);

module.exports = router;
