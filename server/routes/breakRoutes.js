const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  setMyBreakController,
  getMyBreakController,
  getSessionBreaksController,
} = require("../controllers/breakController");

router.post("/:sessionId", verifyToken, setMyBreakController);
router.get("/:sessionId/me", verifyToken, getMyBreakController);
router.get("/:sessionId", verifyToken, getSessionBreaksController);

module.exports = router;
