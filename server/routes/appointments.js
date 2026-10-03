//server\routes\appointments.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  createRequest,
  getMine,
  cancelMine,
  listAll,
  respond,
} = require("../controllers/appointmentController");

// Student
router.post("/", verifyToken, requireRole("student"), createRequest);
router.get("/mine", verifyToken, requireRole("student"), getMine);
router.patch("/:id/cancel", verifyToken, requireRole("student"), cancelMine);

// Guidance
router.get("/", verifyToken, requireRole("guidance", "admin"), listAll);
router.patch(
  "/:id/respond",
  verifyToken,
  requireRole("guidance", "admin"),
  respond,
);

module.exports = router;
