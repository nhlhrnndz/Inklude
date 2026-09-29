const pool = require("../config/db");

async function getSensorySettings(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM sensory_settings WHERE user_id = ?",
    [userId],
  );
  return rows[0] || null;
}

async function upsertSensorySettings(
  userId,
  {
    mutedColors,
    noAnimations,
    noSounds,
    simplifiedIcons,
    whatsNextReminders = true,
  },
) {
  await pool.query(
    `INSERT INTO sensory_settings
       (user_id, muted_colors, no_animations, no_sounds, simplified_icons, whats_next_reminders)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       muted_colors = VALUES(muted_colors),
       no_animations = VALUES(no_animations),
       no_sounds = VALUES(no_sounds),
       simplified_icons = VALUES(simplified_icons),
       whats_next_reminders = VALUES(whats_next_reminders)`,
    [
      userId,
      mutedColors ? 1 : 0,
      noAnimations ? 1 : 0,
      noSounds ? 1 : 0,
      simplifiedIcons ? 1 : 0,
      whatsNextReminders ? 1 : 0,
    ],
  );
  return getSensorySettings(userId);
}

module.exports = { getSensorySettings, upsertSensorySettings };
