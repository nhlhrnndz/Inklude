// server/controllers/transcriptController.js
const { getTranscriptsBySession } = require("../models/transcriptModel");

async function getSessionTranscripts(req, res) {
  try {
    const { sessionId } = req.params;
    const transcripts = await getTranscriptsBySession(sessionId);
    res.json({ transcripts });
  } catch (err) {
    console.error("❌ Error fetching transcripts:", err.message);
    res.status(500).json({ message: "Failed to fetch transcripts" });
  }
}

module.exports = { getSessionTranscripts };
