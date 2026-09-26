//sis.js
const express = require("express");

const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const {
  getMySIS,
  saveMySIS,
  getGuidanceSISList,
  getGuidanceStudentSIS,
} = require("../controllers/sisController");

// Student: own SIS only
router.get("/me", verifyToken, getMySIS);
router.post("/me", verifyToken, saveMySIS);
router.put("/me", verifyToken, saveMySIS);

// Guidance: student SIS records
router.get("/students", verifyToken, getGuidanceSISList);
router.get("/students/:id", verifyToken, getGuidanceStudentSIS);

module.exports = router;
