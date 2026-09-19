// server/routes/announcement.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  postAnnouncement,
  getMyAnnouncements,
} = require("../controllers/announcementController");

router.post("/", verifyToken, postAnnouncement);
router.get("/mine", verifyToken, getMyAnnouncements);

module.exports = router;
