// server/models/transcriptModel.js
const db = require("../config/db");

async function saveTranscript(sessionId, speakerId, text) {
  const [result] = await db.query(
    "INSERT INTO transcripts (session_id, speaker_id, text) VALUES (?, ?, ?)",
    [sessionId, speakerId, text],
  );
  return result.insertId;
}

async function getTranscriptsBySession(sessionId) {
  const [rows] = await db.query(
    `SELECT t.id, t.text, t.created_at, u.name AS speaker_name
     FROM transcripts t
     JOIN users u ON t.speaker_id = u.id
     WHERE t.session_id = ?
     ORDER BY t.created_at ASC`,
    [sessionId],
  );
  return rows;
}

module.exports = { saveTranscript, getTranscriptsBySession };
