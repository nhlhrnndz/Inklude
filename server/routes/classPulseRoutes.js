// server/routes/classPulseRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  dueForSessionController,
  dueForClassController,
  submitExperienceController,
  sessionSummaryController,
  classInsightsController,
} = require("../controllers/classPulseController");

router.post("/", verifyToken, submitExperienceController);
router.get("/session/:sessionId/due", verifyToken, dueForSessionController);
router.get("/class/:classId/due", verifyToken, dueForClassController);
router.get(
  "/session/:sessionId/summary",
  verifyToken,
  sessionSummaryController,
);
router.get("/class/:classId/insights", verifyToken, classInsightsController);

module.exports = router;
