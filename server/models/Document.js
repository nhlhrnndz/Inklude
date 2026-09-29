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

// Same as above but WITHOUT the big extracted_text column, for list screens.
async function getDocumentsBySessionMeta(sessionId) {
  const [rows] = await pool.query(
    `SELECT id, uploader_id, session_id, filename, mime_type, created_at,
            CHAR_LENGTH(extracted_text) AS text_length
     FROM documents
     WHERE session_id = ?
     ORDER BY created_at DESC`,
    [sessionId],
  );
  return rows;
}

// Students: every document from every classroom they have joined.
// Teachers: every document they uploaded.
async function getDocumentsForUser(userId, role) {
  const where =
    role === "teacher"
      ? "d.uploader_id = ?"
      : "d.session_id IN (SELECT session_id FROM participants WHERE user_id = ?)";

  const [rows] = await pool.query(
    `SELECT d.id, d.uploader_id, d.session_id, d.filename, d.mime_type,
            d.created_at, CHAR_LENGTH(d.extracted_text) AS text_length,
            s.title AS session_title, u.name AS teacher_name
     FROM documents d
     JOIN sessions s ON s.id = d.session_id
     JOIN users u ON u.id = s.teacher_id
     WHERE ${where}
     ORDER BY d.created_at DESC`,
    [userId],
  );
  return rows;
}

async function deleteDocumentById(id) {
  const [result] = await pool.query("DELETE FROM documents WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createDocument,
  getDocumentById,
  getDocumentsBySession,
  getDocumentsBySessionMeta,
  getDocumentsForUser,
  deleteDocumentById,
};
