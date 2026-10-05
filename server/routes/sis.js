// server/routes/sis.js
const express = require("express");

const router = express.Router();

const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const {
  getMySIS,
  saveMySIS,
  getGuidanceSISList,
  getGuidanceStudentSIS,
} = require("../controllers/sisController");

// Student: own SIS only
router.get("/me", verifyToken, requireRole("student"), getMySIS);
router.post("/me", verifyToken, requireRole("student"), saveMySIS);
router.put("/me", verifyToken, requireRole("student"), saveMySIS);

// Guidance: student SIS records
router.get(
  "/students",
  verifyToken,
  requireRole("guidance", "admin"),
  getGuidanceSISList,
);
router.get(
  "/students/:id",
  verifyToken,
  requireRole("guidance", "admin"),
  getGuidanceStudentSIS,
);

module.exports = router;
