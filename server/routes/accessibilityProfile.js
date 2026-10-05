//accessibilityProfile.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  getMyAccessibility,
  saveSupportNeeds,
  savePreferences,
  markOnboarded,
  getStudentSupportNeeds,
} = require("../controllers/accessibilityProfileController");

// Student: own data only
router.get("/me", verifyToken, requireRole("student"), getMyAccessibility);
router.put(
  "/support-needs",
  verifyToken,
  requireRole("student"),
  saveSupportNeeds,
);
router.put(
  "/preferences",
  verifyToken,
  requireRole("student"),
  savePreferences,
);
router.patch("/onboarded", verifyToken, requireRole("student"), markOnboarded);

// Guidance only. Teachers get 403 here by design.
router.get(
  "/students/:id/support-needs",
  verifyToken,
  requireRole("guidance"),
  getStudentSupportNeeds,
);

module.exports = router;
