// server/routes/referrals.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  listStudentClassesController,
  listForStudentController,
  createReferralController,
  listMineController,
  acknowledgeController,
  respondController,
} = require("../controllers/referralController");
const {
  createTeacherReferralController,
  listSentController,
  listTeacherReferralsController,
  updateGuidanceStatusController,
} = require("../controllers/teacherReferralController");

// ===== Teacher -> Guidance (new) =====
router.post(
  "/to-guidance",
  verifyToken,
  requireRole("teacher"),
  createTeacherReferralController,
);
router.get("/sent", verifyToken, requireRole("teacher"), listSentController);

// ===== Guidance: manage teacher referrals (new) =====
router.get(
  "/teacher-referrals",
  verifyToken,
  requireRole("guidance", "admin"),
  listTeacherReferralsController,
);
router.patch(
  "/:id/guidance-status",
  verifyToken,
  requireRole("guidance", "admin"),
  updateGuidanceStatusController,
);

// ===== Guidance -> Teacher (existing) =====
// Teacher
router.get("/mine", verifyToken, requireRole("teacher"), listMineController);
router.patch(
  "/:id/acknowledge",
  verifyToken,
  requireRole("teacher"),
  acknowledgeController,
);
router.patch(
  "/:id/respond",
  verifyToken,
  requireRole("teacher"),
  respondController,
);

// Guidance
router.get(
  "/student/:studentId/classes",
  verifyToken,
  requireRole("guidance", "admin"),
  listStudentClassesController,
);
router.get(
  "/student/:studentId",
  verifyToken,
  requireRole("guidance", "admin"),
  listForStudentController,
);
router.post(
  "/",
  verifyToken,
  requireRole("guidance", "admin"),
  createReferralController,
);

module.exports = router;
