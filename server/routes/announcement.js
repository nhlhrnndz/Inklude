// server/routes/announcement.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  postAnnouncement,
  getMyAnnouncements,
  getSessionAnnouncements,
} = require("../controllers/announcementController");

router.post("/", verifyToken, postAnnouncement);
router.get("/mine", verifyToken, getMyAnnouncements);
router.get("/session/:sessionId", verifyToken, getSessionAnnouncements);

module.exports = router;
