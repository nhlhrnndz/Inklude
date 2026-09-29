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

// Get all sessions a student has ever joined (active or ended, past or present)
async function getJoinedSessions(studentId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT s.*, u.name as teacher_name,
     (SELECT COUNT(*) FROM participants WHERE session_id = s.id AND left_at IS NULL) as participant_count
     FROM sessions s
     JOIN participants p ON p.session_id = s.id
     JOIN users u ON s.teacher_id = u.id
     WHERE p.user_id = ?
     ORDER BY s.created_at DESC`,
    [studentId],
  );
  return rows;
}

// Disable a classroom permanently
async function endSession(sessionId, teacherId) {
  const [result] = await pool.query(
    `UPDATE sessions 
     SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND teacher_id = ? AND status = 'active'`,
    [sessionId, teacherId],
  );
  return result.affectedRows > 0;
}

// Start a live captioning run — creates a fresh "live_runs" row, so each
// run gets its own quiet-student list, check-ins, and class pulse answers.
async function goLive(sessionId, teacherId) {
  const session = await getSessionById(sessionId);
  if (
    !session ||
    session.teacher_id !== teacherId ||
    session.status !== "active"
  ) {
    return null;
  }

  const [result] = await pool.query(
    "INSERT INTO live_runs (session_id, started_at) VALUES (?, CURRENT_TIMESTAMP)",
    [sessionId],
  );
  const runId = result.insertId;

  await pool.query(
    "UPDATE sessions SET is_live = 1, current_live_run_id = ? WHERE id = ?",
    [runId, sessionId],
  );

  return runId;
}

// End the current live run — the classroom stays open/reusable, but this
// run is now closed and its pulse/check-in/presence data is locked in.
async function endLive(sessionId, teacherId) {
  const session = await getSessionById(sessionId);
  if (
    !session ||
    session.teacher_id !== teacherId ||
    session.status !== "active"
  ) {
    return false;
  }
  if (!session.current_live_run_id) return false;

  await pool.query(
    "UPDATE live_runs SET ended_at = CURRENT_TIMESTAMP WHERE id = ? AND ended_at IS NULL",
    [session.current_live_run_id],
  );

  await pool.query(
    "UPDATE sessions SET is_live = 0, live_ended_at = CURRENT_TIMESTAMP WHERE id = ?",
    [sessionId],
  );

  return true;
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
    `SELECT u.id, u.name, u.email, u.display_username, p.joined_at
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

// --- Phase 2.3 Week 1: Session Roster helpers ---

const AVATAR_COLORS = [
  "#F94144",
  "#F3722C",
  "#F8961E",
  "#F9C74F",
  "#90BE6D",
  "#43AA8B",
  "#577590",
  "#277DA1",
  "#9D4EDD",
  "#FF5D8F",
];

function toDisplayName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Student";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

function toInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function avatarColorForId(userId) {
  const index = Number(userId) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index >= 0 ? index : 0];
}

const IDENTITY_VISIBLE_ROLES = new Set(["teacher", "guidance", "admin"]);

function resolveDisplayInfo(participant, requestingRole) {
  if (IDENTITY_VISIBLE_ROLES.has(requestingRole)) {
    return {
      displayName: participant.name,
      initials: toInitials(participant.name),
    };
  }

  const username = (participant.display_username || "").trim();
  if (username) {
    return {
      displayName: username,
      initials: toInitials(username),
    };
  }

  return {
    displayName: toDisplayName(participant.name),
    initials: toInitials(participant.name),
  };
}

async function getRosterForSession(sessionId, requestingRole) {
  const rows = await getParticipants(sessionId);
  return rows.map((p) => {
    const { displayName, initials } = resolveDisplayInfo(p, requestingRole);
    return {
      id: p.id,
      displayName,
      initials,
      avatarColor: avatarColorForId(p.id),
      isHere: false,
    };
  });
}

module.exports = {
  createSession,
  getSessionById,
  getSessionByCode,
  getTeacherSessions,
  getJoinedSessions,
  endSession,
  goLive,
  endLive,
  addParticipant,
  isParticipant,
  getParticipants,
  leaveSession,
  getRosterForSession,
};
