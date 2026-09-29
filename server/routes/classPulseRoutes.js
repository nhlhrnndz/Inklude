// server/routes/classPulseRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  submitPulseController,
  myPulseStatusController,
  pulseSummaryController,
} = require("../controllers/classPulseController");

router.post("/", verifyToken, submitPulseController);
router.get("/:sessionId/mine", verifyToken, myPulseStatusController);
router.get("/:sessionId/summary", verifyToken, pulseSummaryController);

module.exports = router;
