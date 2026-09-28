const pool = require("../config/db");

async function getMotorSettings(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM motor_settings WHERE user_id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function upsertMotorSettings(
  userId,
  { largeTargets, voiceNav, switchAccess, autoSpeak },
) {
  await pool.query(
    `INSERT INTO motor_settings (user_id, large_targets, voice_nav, switch_access, auto_speak)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       large_targets = VALUES(large_targets),
       voice_nav = VALUES(voice_nav),
       switch_access = VALUES(switch_access),
       auto_speak = VALUES(auto_speak)`,
    [
      userId,
      largeTargets ? 1 : 0,
      voiceNav ? 1 : 0,
      switchAccess ? 1 : 0,
      autoSpeak ? 1 : 0,
    ],
  );
  return getMotorSettings(userId);
}

module.exports = { getMotorSettings, upsertMotorSettings };
