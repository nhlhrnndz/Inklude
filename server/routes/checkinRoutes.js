// server/routes/checkinRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
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
  requireRole("teacher"),
  getQuietStudentsController,
);
router.get("/sent", verifyToken, requireRole("teacher"), getSentController);
router.get(
  "/received",
  verifyToken,
  requireRole("student"),
  getReceivedController,
);

router.post("/", verifyToken, requireRole("teacher"), createCheckinController);
router.post("/:id/reply", verifyToken, requireRole("student"), replyController);

module.exports = router;
