//server\routes\message.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  postMyMessage,
  getMyMessages,
  getInbox,
  getThreadDetail,
  postReply,
} = require("../controllers/messageController");

// Student's own thread, declared before "/:id" so "mine" isn't
// swallowed as a route param
router.post("/mine", verifyToken, postMyMessage);
router.get("/mine", verifyToken, getMyMessages);

// Guidance inbox
router.get("/", verifyToken, getInbox);
router.get("/:id", verifyToken, getThreadDetail);
router.post("/:id/reply", verifyToken, postReply);

module.exports = router;
