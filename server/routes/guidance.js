//guidance.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getStudentsController,
  getStudentDetailController,
  getStatsController,
  getDashboardSummaryController,
} = require("../controllers/guidanceController");
const {
  listStudentFollowupsController,
  createFollowupController,
  completeFollowupController,
} = require("../controllers/followupController");
const {
  getStudentBelongingController,
  postReachOutController,
} = require("../controllers/belongingController");
const {
  getBelongingOverviewController,
} = require("../controllers/belongingOverviewController");

router.get("/dashboard", verifyToken, getDashboardSummaryController);

router.get("/students", verifyToken, getStudentsController);
router.get("/students/:id", verifyToken, getStudentDetailController);

// Follow-ups (Week 7)
router.get(
  "/students/:id/followups",
  verifyToken,
  listStudentFollowupsController,
);
router.post("/students/:id/followups", verifyToken, createFollowupController);
router.patch(
  "/followups/:id/complete",
  verifyToken,
  completeFollowupController,
);

// Old Belonging / reach-out routes: kept until Phase F cleanup
router.get(
  "/students/:id/belonging",
  verifyToken,
  getStudentBelongingController,
);
router.post("/students/:id/reach-out", verifyToken, postReachOutController);
router.get("/belonging/overview", verifyToken, getBelongingOverviewController);

router.get("/stats", verifyToken, getStatsController);

module.exports = router;
