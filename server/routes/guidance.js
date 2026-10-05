// server/routes/guidance.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
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
const {
  getAccessibilityReportController,
} = require("../controllers/guidanceReportController");

// Every route in this file is Guidance only.
router.use(verifyToken, requireRole("guidance", "admin"));

router.get("/dashboard", getDashboardSummaryController);

router.get("/students", getStudentsController);
router.get("/students/:id", getStudentDetailController);

// Follow-ups
router.get("/students/:id/followups", listStudentFollowupsController);
router.post("/students/:id/followups", createFollowupController);
router.patch("/followups/:id/complete", completeFollowupController);

// Guidance reports (exportable)
router.get("/reports/accessibility", getAccessibilityReportController);

// Old Belonging / reach-out routes: kept until Phase F cleanup
router.get("/students/:id/belonging", getStudentBelongingController);
router.post("/students/:id/reach-out", postReachOutController);
router.get("/belonging/overview", getBelongingOverviewController);

router.get("/stats", getStatsController);

module.exports = router;
