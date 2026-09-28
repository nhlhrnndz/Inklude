const pool = require("../config/db");

async function createShare(
  sessionId,
  fromUserId,
  toUserId,
  transcriptId,
  message,
) {
  const [result] = await pool.query(
    `INSERT INTO peer_shares (session_id, from_user_id, to_user_id, transcript_id, message)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, fromUserId, toUserId, transcriptId || null, message || null],
  );
  const [rows] = await pool.query("SELECT * FROM peer_shares WHERE id = ?", [
    result.insertId,
  ]);
  return rows[0];
}

async function getShareById(id) {
  const [rows] = await pool.query(
    `SELECT ps.*, u.name AS from_name
     FROM peer_shares ps
     JOIN users u ON u.id = ps.from_user_id
     WHERE ps.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function getReceivedShares(userId) {
  const [rows] = await pool.query(
    `SELECT ps.*, u.name AS from_name
     FROM peer_shares ps
     JOIN users u ON u.id = ps.from_user_id
     WHERE ps.to_user_id = ?
     ORDER BY ps.created_at DESC`,
    [userId],
  );
  return rows;
}

async function getSentShares(userId) {
  const [rows] = await pool.query(
    `SELECT ps.*, u.name AS to_name
     FROM peer_shares ps
     JOIN users u ON u.id = ps.to_user_id
     WHERE ps.from_user_id = ?
     ORDER BY ps.created_at DESC`,
    [userId],
  );
  return rows;
}

async function markShareRead(id) {
  await pool.query(
    "UPDATE peer_shares SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND read_at IS NULL",
    [id],
  );
  return getShareById(id);
}

module.exports = {
  createShare,
  getShareById,
  getReceivedShares,
  getSentShares,
  markShareRead,
};
