const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  createSessionController,
  getMySessions,
  getSessionByIdController,
  joinSessionByCode,
  endSessionController,
  leaveSessionController,
} = require("../controllers/sessionController");

// Teacher routes
router.post("/", verifyToken, createSessionController);
router.get("/", verifyToken, getMySessions);
router.get("/:id", verifyToken, getSessionByIdController);
router.delete("/:id", verifyToken, endSessionController);

// Student routes
router.get("/join/:code", verifyToken, joinSessionByCode);
router.post("/:id/leave", verifyToken, leaveSessionController);

module.exports = router;
