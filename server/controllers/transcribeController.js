// server/controllers/transcribeController.js
const OpenAI = require("openai");
const { toFile } = require("openai/uploads");

// Only create the client if a key is present — prevents server crash on startup
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function transcribeAudio(req, res) {
  try {
    if (!openai) {
      return res.status(503).json({
        message:
          "Transcription is not configured yet (missing OPENAI_API_KEY).",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    const file = await toFile(req.file.buffer, "audio.m4a", {
      type: req.file.mimetype || "audio/m4a",
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error("❌ Transcription error:", err.message);
    res.status(500).json({
      message: "Transcription failed",
      error: err.message,
    });
  }
}

module.exports = { transcribeAudio };
