const pool = require("../config/db");

async function createDocument(
  uploaderId,
  sessionId,
  filename,
  mimeType,
  extractedText,
) {
  const [result] = await pool.query(
    `INSERT INTO documents (uploader_id, session_id, filename, mime_type, extracted_text)
     VALUES (?, ?, ?, ?, ?)`,
    [uploaderId, sessionId || null, filename, mimeType, extractedText || null],
  );
  const [rows] = await pool.query("SELECT * FROM documents WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function getDocumentById(id) {
  const [rows] = await pool.query("SELECT * FROM documents WHERE id = ?", [id]);
  return rows[0] || null;
}

async function getDocumentsBySession(sessionId) {
  const [rows] = await pool.query(
    "SELECT * FROM documents WHERE session_id = ? ORDER BY created_at DESC",
    [sessionId],
  );
  return rows;
}

module.exports = { createDocument, getDocumentById, getDocumentsBySession };
