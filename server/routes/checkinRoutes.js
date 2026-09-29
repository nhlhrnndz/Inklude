// server/routes/checkinRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getQuietStudentsController,
  createCheckinController,
  getSentController,
  getReceivedController,
  replyController,
} = require("../controllers/checkinController");

// Static paths first so ":id" never swallows them
router.get(
  "/session/:sessionId/quiet",
  verifyToken,
  getQuietStudentsController,
);
router.get("/sent", verifyToken, getSentController);
router.get("/received", verifyToken, getReceivedController);

router.post("/", verifyToken, createCheckinController);
router.post("/:id/reply", verifyToken, replyController);

module.exports = router;
