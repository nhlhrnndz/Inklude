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
