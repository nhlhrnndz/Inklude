const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getStudentsController,
  getStudentDetailController,
  getStatsController,
} = require("../controllers/guidanceController");

router.get("/students", verifyToken, getStudentsController);
router.get("/students/:id", verifyToken, getStudentDetailController);
router.get("/stats", verifyToken, getStatsController);

module.exports = router;
