// server/routes/transcribe.js
const express = require("express");
const multer = require("multer");
const { transcribeAudio } = require("../controllers/transcribeController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Keep audio in memory briefly, cap at 10MB per chunk (plenty for a few seconds of speech)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", verifyToken, upload.single("audio"), transcribeAudio);

module.exports = router;
