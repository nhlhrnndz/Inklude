// server/routes/events.js
const express = require("express");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  listEvents,
  createEvent,
  cancelEvent,
  addToCalendar,
  removeFromCalendar,
} = require("../controllers/eventController");

const router = express.Router();

router.get("/", verifyToken, listEvents);

router.post("/", verifyToken, requireRole("guidance", "admin"), createEvent);
router.patch(
  "/:id/cancel",
  verifyToken,
  requireRole("guidance", "admin"),
  cancelEvent,
);

router.post(
  "/:id/calendar",
  verifyToken,
  requireRole("student"),
  addToCalendar,
);
router.delete(
  "/:id/calendar",
  verifyToken,
  requireRole("student"),
  removeFromCalendar,
);

module.exports = router;
