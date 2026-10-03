// server/routes/accommodationRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  createRequestController,
  listMyRequestsController,
  listClassRequestsController,
  respondController,
  cancelController,
} = require("../controllers/accommodationController");

// Student
router.post(
  "/classes/:classId",
  verifyToken,
  requireRole("student"),
  createRequestController,
);
router.get(
  "/classes/:classId/mine",
  verifyToken,
  requireRole("student"),
  listMyRequestsController,
);
router.patch(
  "/:id/cancel",
  verifyToken,
  requireRole("student"),
  cancelController,
);

// Teacher
router.get(
  "/classes/:classId",
  verifyToken,
  requireRole("teacher"),
  listClassRequestsController,
);
router.patch(
  "/:id/respond",
  verifyToken,
  requireRole("teacher"),
  respondController,
);

module.exports = router;
