//guidance.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getStudentsController,
  getStudentDetailController,
  getStatsController,
} = require("../controllers/guidanceController");
const {
  getStudentBelongingController,
  postReachOutController,
} = require("../controllers/belongingController");
const {
  getBelongingOverviewController,
} = require("../controllers/belongingOverviewController");

router.get("/students", verifyToken, getStudentsController);
router.get("/students/:id", verifyToken, getStudentDetailController);
router.get(
  "/students/:id/belonging",
  verifyToken,
  getStudentBelongingController,
);
router.post("/students/:id/reach-out", verifyToken, postReachOutController);
router.get("/belonging/overview", verifyToken, getBelongingOverviewController);
router.get("/stats", verifyToken, getStatsController);

module.exports = router;
