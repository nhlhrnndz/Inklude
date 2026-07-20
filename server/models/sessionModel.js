const pool = require("../config/db");

// Generate a unique 6-character session code
function generateSessionCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Create a new session
async function createSession(teacherId, title, description = "") {
  const code = generateSessionCode();

  // Ensure code is unique (retry if collision)
  let unique = false;
  let attempts = 0;
  let finalCode = code;

  while (!unique && attempts < 5) {
    const [existing] = await pool.query(
      "SELECT id FROM sessions WHERE session_code = ?",
      [finalCode],
    );
    if (existing.length === 0) {
      unique = true;
    } else {
      finalCode = generateSessionCode();
      attempts++;
    }
  }

  if (!unique) {
    throw new Error("Failed to generate unique session code");
  }

  const [result] = await pool.query(
    `INSERT INTO sessions (teacher_id, session_code, title, description, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [teacherId, finalCode, title, description],
  );

  return getSessionById(result.insertId);
}

// Get session by ID
async function getSessionById(sessionId) {
  const [rows] = await pool.query(
    `SELECT s.*, u.name as teacher_name 
     FROM sessions s 
     JOIN users u ON s.teacher_id = u.id 
     WHERE s.id = ?`,
    [sessionId],
  );
  return rows[0] || null;
}

// Get session by code
async function getSessionByCode(code) {
  const [rows] = await pool.query(
    `SELECT s.*, u.name as teacher_name 
     FROM sessions s 
     JOIN users u ON s.teacher_id = u.id 
     WHERE s.session_code = ? AND s.status = 'active'`,
    [code],
  );
  return rows[0] || null;
}

// Get all sessions for a teacher
async function getTeacherSessions(teacherId) {
  const [rows] = await pool.query(
    `SELECT s.*, 
     (SELECT COUNT(*) FROM participants WHERE session_id = s.id AND left_at IS NULL) as participant_count
     FROM sessions s 
     WHERE s.teacher_id = ? 
     ORDER BY s.created_at DESC`,
    [teacherId],
  );
  return rows;
}

// End a session
async function endSession(sessionId, teacherId) {
  console.log("endSession called with:", { sessionId, teacherId });

  const [result] = await pool.query(
    `UPDATE sessions 
     SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND teacher_id = ? AND status = 'active'`,
    [sessionId, teacherId],
  );

  console.log("Update result:", result);
  return result.affectedRows > 0;
}

// Add participant to session
async function addParticipant(sessionId, userId) {
  try {
    await pool.query(
      `INSERT INTO participants (session_id, user_id, joined_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [sessionId, userId],
    );
    return true;
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      // User already exists - update left_at to NULL (rejoin)
      await pool.query(
        `UPDATE participants 
         SET left_at = NULL 
         WHERE session_id = ? AND user_id = ?`,
        [sessionId, userId],
      );
      return true;
    }
    throw error;
  }
}

// Check if user is in session
async function isParticipant(sessionId, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM participants WHERE session_id = ? AND user_id = ? AND left_at IS NULL",
    [sessionId, userId],
  );
  return rows.length > 0;
}

// Get session participants (active ones only)
async function getParticipants(sessionId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, p.joined_at
     FROM participants p
     JOIN users u ON p.user_id = u.id
     WHERE p.session_id = ? AND p.left_at IS NULL
     ORDER BY p.joined_at ASC`,
    [sessionId],
  );
  return rows;
}

// Leave a session (soft delete)
async function leaveSession(sessionId, userId) {
  const [result] = await pool.query(
    `UPDATE participants 
     SET left_at = CURRENT_TIMESTAMP 
     WHERE session_id = ? AND user_id = ? AND left_at IS NULL`,
    [sessionId, userId],
  );
  return result.affectedRows > 0;
}

module.exports = {
  createSession,
  getSessionById,
  getSessionByCode,
  getTeacherSessions,
  endSession,
  addParticipant,
  isParticipant,
  getParticipants,
  leaveSession,
};
