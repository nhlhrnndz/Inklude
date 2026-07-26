// server/routes/transcript.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getSessionTranscripts,
} = require("../controllers/transcriptController");

router.get("/:sessionId", verifyToken, getSessionTranscripts);

module.exports = router;
