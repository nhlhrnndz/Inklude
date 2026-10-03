// server/routes/referrals.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  listStudentClassesController,
  listForStudentController,
  createReferralController,
  listMineController,
  acknowledgeController,
  respondController,
} = require("../controllers/referralController");

// Teacher
router.get("/mine", verifyToken, listMineController);
router.patch("/:id/acknowledge", verifyToken, acknowledgeController);
router.patch("/:id/respond", verifyToken, respondController);

// Guidance
router.get(
  "/student/:studentId/classes",
  verifyToken,
  listStudentClassesController,
);
router.get("/student/:studentId", verifyToken, listForStudentController);
router.post("/", verifyToken, createReferralController);

module.exports = router;
